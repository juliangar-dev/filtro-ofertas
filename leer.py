import re
import sqlite3
from pathlib import Path

# ---------- 1. Separar el texto en ofertas ----------

# Encabezado de WhatsApp: [13:16, 18/11/2026] Ofertas Laborales:
ENCABEZADO = re.compile(r"\[(\d{1,2}:\d{2}), (\d{2}/\d{2}/\d{4})\] ([^:\n]+): ")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
LINK = re.compile(r"https?://\S+")

# Frases con las que suele empezar una oferta nueva
INICIOS = ("📢", "🚀", "🔎", "✨", "💼", "🎬", "📦", "☀️", "🔍", "🔹",
           "Búsqueda", "BÚSQUEDA", "Nueva oportunidad", "NUEVA", "Desde el CUIL")


def separar_whatsapp(texto):
    """Devuelve una lista de (fecha, fuente, texto_de_la_oferta)."""
    # Si un mail queda pegado al comienzo de otra oferta (ej: gmail.com✨),
    # agregamos un salto de línea entre los dos.
    texto = re.sub(r"(@[\w-]+\.[a-z.]+?)(?=[^\w.\s])", r"\1\n", texto)

    ofertas = []
    partes = ENCABEZADO.split(texto)
    # split devuelve: [antes, hora, fecha, fuente, mensaje, hora, fecha, ...]
    bloques = [(None, "sin encabezado", partes[0])]
    for i in range(1, len(partes), 4):
        bloques.append((partes[i + 1], partes[i + 2].strip(), partes[i + 3]))

    for fecha, fuente, mensaje in bloques:
        actual = []
        for linea in mensaje.splitlines():
            ya_completa = EMAIL.search("\n".join(actual)) or LINK.search("\n".join(actual))
            if linea.strip().startswith(INICIOS) and ya_completa:
                ofertas.append((fecha, fuente, "\n".join(actual)))
                actual = []
            actual.append(linea)
        ofertas.append((fecha, fuente, "\n".join(actual)))

    return [o for o in ofertas if len(o[2].strip()) > 40]


def separar_boletin(texto):
    """En el boletín cada línea numerada es una oferta: '12. Empresa busca X: link'.
    Las de la sección Europa se marcan como exterior."""
    ofertas = []
    seccion = "Exterior"
    for linea in texto.splitlines():
        if "LATAM" in linea and not re.match(r"\d+\.", linea):
            seccion = "LATAM"
        if re.match(r"\d+\.\s", linea) and LINK.search(linea):
            if seccion == "Exterior":
                linea += " (Europa)"
            ofertas.append((None, "JuniorJobs", linea))
    return ofertas


# ---------- 2. Detectar datos con reglas ----------

ZONAS = {
    "CABA": ["caba", "capital federal", "microcentro", "belgrano", "palermo", "núñez",
             "villa urquiza", "recoleta", "retiro", "balvanera", "caballito", "almagro",
             "parque patricios", "constitución", "monserrat", "flores", "villa del parque",
             "chacarita", "san nicolás", "aeroparque"],
    "GBA": ["pilar", "fatima", "tortuguitas", "el talar", "pacheco", "ezeiza", "jose c paz",
            "san justo", "lomas de zamora", "banfield", "lanús", "berazategui", "hudson",
            "vicente lópez", "florida oeste", "olivos", "florencio varela", "ciudadela",
            "grand bourg", "san miguel", "bernal", "zárate", "la plata", "zona sur"],
    "Interior": ["pergamino", "mar del plata", "neuquén", "mendoza", "córdoba", "rosario",
                 "posadas", "tucumán", "trelew", "bahía blanca", "barda del medio"],
    "Exterior": ["🇪🇸", "🇫🇷", "🇬🇧", "🇩🇪", "🇵🇱", "🇨🇭", "🇮🇪", "🇨🇿", "🇩🇰", "🇳🇱",
                 "🇧🇪", "🇵🇹", "🇸🇪", "🇮🇹", "🇳🇴", "🇫🇮", "🇬🇷", "🇦🇹", "🇷🇴", "🇨🇱",
                 "🇲🇽", "🇨🇴", "🇧🇷", "🇺🇾", "(europa)", "spain", "madrid", "providencia"],
}

HABILIDADES = {
    "Excel": ["excel"], "SQL": ["sql"], "Python": ["python"],
    "Inglés": ["inglés", "ingles", "english"], "SAP": ["sap"], "Power BI": ["power bi"],
    "Office": ["office"], "CRM": ["crm", "salesforce"], "Java": ["java "],
    ".NET": [".net"], "React": ["react"], "Linux": ["linux"], "AWS": ["aws"],
    "Carnet de conducir": ["carnet de conducir", "licencia de conducir", "registro de conducir"],
    "Movilidad propia": ["movilidad propia"],
}


def detectar_zona(t):
    if "🇦🇷" in t:
        return "Argentina"
    for zona, palabras in ZONAS.items():
        if any(p in t for p in palabras):
            return zona
    return None


def detectar_modalidad(t):
    if "híbrid" in t or "hibrid" in t:
        return "híbrido"
    if "remoto" in t or "remote" in t:
        return "remoto"
    if "presencial" in t:
        return "presencial"
    return None


def detectar_nivel(t):
    if re.search(r"pasant|trainee|intern|práctica|beca", t):
        return "pasantía"
    if re.search(r"\bjr\b|junior|júnior", t):
        return "jr"
    if re.search(r"\bssr\b|semi ?s(enio)?r", t):
        return "ssr"
    if re.search(r"\bsr\b|senior|supervisor|jefe|líder|lider|responsable|staff", t):
        return "sr"
    return None


def detectar_anios(t):
    """Busca '3 años', '+2 años', '1 a 2 años'... y devuelve el mínimo."""
    numeros = [int(n) for n in re.findall(r"(\d+)\s*(?:-|a)?\s*\d*\s*años(?! de trayectoria)", t)]
    if not numeros and re.search(r"\d+\s*meses de experiencia|experiencia mínima de \d+ meses", t):
        return 0
    return min(numeros) if numeros else None


def detectar_excluyente(t):
    for linea in t.splitlines():
        if "experiencia" in linea and "excluyente" in linea and "no excluyente" not in linea:
            return 1
    return 0


GENERICAS = re.compile(r"(?i)^(búsqueda laboral|buen|hola|nueva oportunidad|nueva búsqueda|qué buscamos|"
                       r"tenemos nuevas oportunidades|esta puede ser tu oportunidad|áreas de trabajo|"
                       r"hiring|wearehiring|requisitos)\W*$")


def detectar_puesto(texto):
    """Primera línea con letras, sin emojis ni frases genéricas."""
    for linea in LINK.sub("", texto).splitlines():
        limpia = re.sub(r"[^\w\s/()áéíóúñÁÉÍÓÚÑ.,–-]", "", linea).strip()
        limpia = re.sub(r"^(\d+\.\s*)", "", limpia)
        if len(limpia) > 5 and not GENERICAS.search(limpia):
            return limpia[:90]
    return None


# ---------- 3. Guardar en la base ----------

con = sqlite3.connect("ofertas.db")
nuevas = 0

# Si tenés tus propias ofertas en datos-privados/ usa esas; si no, las de ejemplo
carpeta = Path("datos-privados") if any(Path("datos-privados").glob("*.txt")) else Path("datos-ejemplo")
print(f"Leyendo ofertas de: {carpeta}")

for archivo in carpeta.glob("*.txt"):
    contenido = archivo.read_text(encoding="utf-8")
    if "JuniorJobs" in contenido[:300]:
        ofertas = separar_boletin(contenido)
    else:
        ofertas = separar_whatsapp(contenido)

    for fecha, fuente, texto in ofertas:
        email = EMAIL.search(texto)
        # Para detectar, sacamos mails y links (si no, "jefedefront@..." parece "jefe")
        t = LINK.sub(" ", EMAIL.sub(" ", texto)).lower()
        link = LINK.search(texto)
        cur = con.execute(
            """INSERT OR IGNORE INTO ofertas
               (fecha, fuente, puesto, zona, modalidad, nivel, anios_exp, exp_excluyente, email, link, texto)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (fecha, fuente, detectar_puesto(texto), detectar_zona(t), detectar_modalidad(t),
             detectar_nivel(t) or ("jr" if fuente == "JuniorJobs" else None), detectar_anios(t), detectar_excluyente(t),
             email.group().rstrip(".") if email else None, link.group() if link else None, texto.strip()),
        )
        if cur.rowcount == 1:  # es nueva (si ya estaba, INSERT OR IGNORE no hace nada)
            nuevas += 1
            for habilidad, palabras in HABILIDADES.items():
                if any(p in t for p in palabras):
                    con.execute("INSERT INTO habilidades VALUES (?, ?)", (cur.lastrowid, habilidad))

con.commit()
total = con.execute("SELECT COUNT(*) FROM ofertas").fetchone()[0]
con.close()
print(f"Ofertas nuevas: {nuevas} · Total en la base: {total}")
