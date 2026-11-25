// Separa el texto pegado en ofertas y detecta datos con reglas (sin IA).
// Es la misma lógica que leer.py, pasada a JavaScript para que funcione en el navegador.

const ENCABEZADO = /\[(\d{1,2}:\d{2}), (\d{2}\/\d{2}\/\d{4})\] ([^:\n]+): /g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const LINK = /https?:\/\/\S+/;
const INICIOS = ["📢", "🚀", "🔎", "✨", "💼", "🎬", "📦", "☀️", "🔍", "🔹",
  "Búsqueda", "BÚSQUEDA", "Nueva oportunidad", "NUEVA", "Desde el CUIL"];

function separarWhatsapp(texto) {
  // Si un mail queda pegado al comienzo de otra oferta (ej: gmail.com✨), los separamos
  texto = texto.replace(/(@[\w-]+\.[a-z.]+?)(?=[^\w.\s])/g, "$1\n");

  const bloques = [];
  let ultimo = 0, m, actualInfo = { fecha: null, fuente: "sin encabezado" };
  ENCABEZADO.lastIndex = 0;
  while ((m = ENCABEZADO.exec(texto)) !== null) {
    bloques.push({ ...actualInfo, mensaje: texto.slice(ultimo, m.index) });
    actualInfo = { fecha: m[2], fuente: m[3].trim() };
    ultimo = ENCABEZADO.lastIndex;
  }
  bloques.push({ ...actualInfo, mensaje: texto.slice(ultimo) });

  const ofertas = [];
  for (const b of bloques) {
    let actual = [];
    for (const linea of b.mensaje.split("\n")) {
      const junto = actual.join("\n");
      const completa = EMAIL.test(junto) || LINK.test(junto);
      if (INICIOS.some(i => linea.trim().startsWith(i)) && completa) {
        ofertas.push({ fecha: b.fecha, fuente: b.fuente, texto: junto });
        actual = [];
      }
      actual.push(linea);
    }
    ofertas.push({ fecha: b.fecha, fuente: b.fuente, texto: actual.join("\n") });
  }
  return ofertas.filter(o => o.texto.trim().length > 40);
}

function separarBoletin(texto) {
  // En un boletín cada línea numerada es una oferta: "12. Empresa busca X: link"
  const ofertas = [];
  let seccion = "Exterior";
  for (let linea of texto.split("\n")) {
    if (linea.includes("LATAM") && !/^\d+\./.test(linea)) seccion = "LATAM";
    if (/^\d+\.\s/.test(linea) && LINK.test(linea)) {
      if (seccion === "Exterior") linea += " (Europa)";
      ofertas.push({ fecha: null, fuente: "Boletín", texto: linea });
    }
  }
  return ofertas;
}

const ZONAS = {
  "CABA": ["caba", "capital federal", "microcentro", "belgrano", "palermo", "núñez",
    "villa urquiza", "recoleta", "retiro", "balvanera", "caballito", "almagro",
    "parque patricios", "constitución", "monserrat", "flores", "villa del parque",
    "chacarita", "san nicolás", "aeroparque", "villa crespo", "colegiales", "san telmo"],
  "GBA": ["pilar", "fatima", "tortuguitas", "el talar", "pacheco", "ezeiza", "jose c paz",
    "san justo", "lomas de zamora", "banfield", "lanús", "berazategui", "hudson",
    "vicente lópez", "florida oeste", "olivos", "florencio varela", "ciudadela",
    "grand bourg", "san miguel", "bernal", "zárate", "la plata", "zona sur", "zona norte",
    "san isidro", "tigre", "quilmes", "morón", "avellaneda"],
  "Interior": ["pergamino", "mar del plata", "neuquén", "mendoza", "córdoba", "rosario",
    "posadas", "tucumán", "trelew", "bahía blanca", "barda del medio", "salta", "santa fe"],
  "Exterior": ["🇪🇸", "🇫🇷", "🇬🇧", "🇩🇪", "🇵🇱", "🇨🇭", "🇮🇪", "🇨🇿", "🇩🇰", "🇳🇱",
    "🇧🇪", "🇵🇹", "🇸🇪", "🇮🇹", "🇳🇴", "🇫🇮", "🇬🇷", "🇦🇹", "🇷🇴", "🇨🇱",
    "🇲🇽", "🇨🇴", "🇧🇷", "🇺🇾", "(europa)", "spain", "madrid", "providencia"],
};

const HABILIDADES = {
  "Excel": ["excel"], "SQL": ["sql"], "Python": ["python"],
  "Inglés": ["inglés", "ingles", "english"], "SAP": ["sap"], "Power BI": ["power bi"],
  "Office": ["office"], "CRM": ["crm", "salesforce"], "Java": ["java "],
  ".NET": [".net"], "React": ["react"], "Linux": ["linux"], "AWS": ["aws"],
  "Git": ["git "], "JavaScript": ["javascript"],
  "Carnet de conducir": ["carnet de conducir", "licencia de conducir", "registro de conducir"],
  "Movilidad propia": ["movilidad propia"],
};

function detectarZona(t) {
  if (t.includes("🇦🇷")) return "Argentina";
  for (const [zona, palabras] of Object.entries(ZONAS)) {
    if (palabras.some(p => t.includes(p))) return zona;
  }
  return null;
}

function detectarModalidad(t) {
  if (t.includes("híbrid") || t.includes("hibrid")) return "híbrido";
  if (t.includes("remoto") || t.includes("remote")) return "remoto";
  if (t.includes("presencial")) return "presencial";
  return null;
}

function detectarNivel(t) {
  if (/pasant|trainee|intern|práctica|beca/.test(t)) return "pasantía";
  if (/\bjr\b|junior|júnior/.test(t)) return "jr";
  if (/\bssr\b|semi ?s(enio)?r/.test(t)) return "ssr";
  if (/\bsr\b|senior|supervisor|jefe|líder|lider|responsable|staff/.test(t)) return "sr";
  return null;
}

function detectarAnios(t) {
  const numeros = [...t.matchAll(/(\d+)\s*(?:-|a)?\s*\d*\s*años(?! de trayectoria)/g)].map(m => +m[1]);
  if (!numeros.length && /\d+\s*meses de experiencia|experiencia mínima de \d+ meses/.test(t)) return 0;
  return numeros.length ? Math.min(...numeros) : null;
}

function detectarExcluyente(t) {
  return t.split("\n").some(l => l.includes("experiencia") && l.includes("excluyente") && !l.includes("no excluyente")) ? 1 : 0;
}

const GENERICAS = /^(búsqueda laboral|buen|hola|nueva oportunidad|nueva búsqueda|qué buscamos|tenemos nuevas oportunidades|esta puede ser tu oportunidad|áreas de trabajo|hiring|wearehiring|requisitos)\W*$/i;

function detectarPuesto(texto) {
  for (const linea of texto.replace(new RegExp(LINK, "g"), "").split("\n")) {
    let limpia = linea.replace(/[^\w\s/()áéíóúñÁÉÍÓÚÑ.,–-]/g, "").trim().replace(/^\d+\.\s*/, "");
    if (limpia.length > 5 && !GENERICAS.test(limpia)) return limpia.slice(0, 90);
  }
  return null;
}

// Busca el asunto que pide la oferta: "Asunto: Soporte Jr", "REF: ASISTENTE FRONT"...
function detectarAsunto(texto) {
  const m = texto.match(/\b(?:asunto(?: sugerido)?|referencia|ref\.?)(?:\s+del\s+(?:correo|mail))?\s*:?\s*(?:pone\s+)?["“']?([^"”'\n|]{3,70})/i);
  if (!m) return null;
  // Cortamos en el primer emoji o símbolo raro, y descartamos instrucciones ("la posición y tu remuneración")
  let asunto = m[1].replace(/[^\w\s\/()áéíóúñÁÉÍÓÚÑüÜ.,:–+-].*$/, "").replace(/[).,;:]+$/, "").trim();
  if (/^(la posición|nombre de la vacante|y remuner|el puesto|puesto y|con asunto)/i.test(asunto) || asunto.length < 3) return null;
  return asunto;
}

function leerOfertas(texto) {
  // Las líneas numeradas con link son de un boletín; el resto, mensajes de WhatsApp
  const esBoletin = l => /^\d+\.\s/.test(l) && LINK.test(l);
  const resto = texto.split("\n").filter(l => !esBoletin(l)).join("\n");
  const lista = [...separarBoletin(texto), ...separarWhatsapp(resto)];

  return lista.map(o => {
    const email = o.texto.match(EMAIL);
    const link = o.texto.match(LINK);
    // Para detectar sacamos mails y links (si no, "jefedefront@..." parece "jefe")
    const t = o.texto.replace(new RegExp(EMAIL, "g"), " ").replace(new RegExp(LINK, "g"), " ").toLowerCase();
    return {
      fecha: o.fecha, fuente: o.fuente, puesto: detectarPuesto(o.texto),
      zona: detectarZona(t), modalidad: detectarModalidad(t),
      nivel: detectarNivel(t) || (o.fuente === "Boletín" ? "jr" : null),
      anios_exp: detectarAnios(t), exp_excluyente: detectarExcluyente(t),
      email: email ? email[0].replace(/\.$/, "") : null, link: link ? link[0] : null,
      asunto: detectarAsunto(o.texto),
      texto: o.texto.trim(),
      habilidades: Object.entries(HABILIDADES).filter(([, ps]) => ps.some(p => t.includes(p))).map(([h]) => h),
    };
  });
}
