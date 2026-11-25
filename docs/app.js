// Conecta la página con la base de datos SQLite (sql.js) que corre en el navegador.

let SQL;
const $ = id => document.getElementById(id);

initSqlJs({ locateFile: f => "vendor/" + f }).then(s => { SQL = s; });

function crearBase(ofertas) {
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE ofertas (
      id INTEGER PRIMARY KEY, fecha TEXT, fuente TEXT, puesto TEXT, zona TEXT,
      modalidad TEXT, nivel TEXT, anios_exp INTEGER, exp_excluyente INTEGER,
      email TEXT, link TEXT, texto TEXT UNIQUE,
      clave TEXT, postulado INTEGER DEFAULT 0, asunto TEXT
    );
    CREATE TABLE habilidades (oferta_id INTEGER REFERENCES ofertas(id), habilidad TEXT);
  `);
  const insertar = db.prepare(`INSERT OR IGNORE INTO ofertas
    (fecha, fuente, puesto, zona, modalidad, nivel, anios_exp, exp_excluyente, email, link, texto, clave, asunto)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const o of ofertas) {
    insertar.run([o.fecha, o.fuente, o.puesto, o.zona, o.modalidad, o.nivel,
      o.anios_exp, o.exp_excluyente, o.email, o.link, o.texto, claveDe(o.texto), o.asunto]);
    if (db.getRowsModified() === 1) {
      const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      for (const h of o.habilidades) db.run("INSERT INTO habilidades VALUES (?, ?)", [id, h]);
    }
  }
  insertar.free();

  // Marcar las que ya estaban guardadas como postuladas en este navegador
  const guardadas = leerPostuladas();
  if (guardadas.length) {
    db.run(`UPDATE ofertas SET postulado = 1 WHERE clave IN (${guardadas.map(() => "?").join(", ")})`, guardadas);
  }
  return db;
}

// ---------- Postulaciones guardadas en el navegador ----------

// Una "clave" corta que identifica cada oferta a partir de su texto
function claveDe(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function leerPostuladas() {
  try { return JSON.parse(localStorage.getItem("postuladas") || "[]"); } catch { return []; }
}

function guardarPostuladas(lista) {
  try { localStorage.setItem("postuladas", JSON.stringify(lista)); } catch { /* sin almacenamiento: queda solo en esta sesión */ }
}

function alternarPostulada(clave) {
  const lista = leerPostuladas();
  const ya = lista.includes(clave);
  guardarPostuladas(ya ? lista.filter(c => c !== clave) : [...lista, clave]);
  const sql = `UPDATE ofertas SET postulado = ${ya ? 0 : 1} WHERE clave = '${clave}';`;
  db.run(sql);
  $("sqlUpdate").textContent = sql;
  mostrar();
}

// Arma el WHERE de la consulta según lo que se tildó en el perfil
function armarFiltro() {
  const marcados = name => [...document.querySelectorAll(`input[name=${name}]:checked`)].map(i => `'${i.value}'`);
  const zonas = marcados("zona");
  const niveles = marcados("nivel");
  const condiciones = [];

  const zona = [];
  if (zonas.length) zona.push(`zona IN (${zonas.join(", ")})`);
  if ($("remoto").checked) zona.push(`modalidad = 'remoto'`);
  condiciones.push(zona.length ? `(${zona.join(" OR ")})` : "0");

  const nivel = [];
  if (niveles.length) nivel.push(`nivel IN (${niveles.join(", ")})`);
  if ($("sinNivel").checked) nivel.push("nivel IS NULL");
  condiciones.push(nivel.length ? `(${nivel.join(" OR ")})` : "0");

  const anios = Math.max(0, parseInt($("anios").value) || 0);
  condiciones.push(`(anios_exp IS NULL OR anios_exp <= ${anios})`);
  if ($("excluyente").checked) condiciones.push("exp_excluyente = 0");
  if ($("ocultarPostuladas").checked) condiciones.push("postulado = 0");

  return condiciones.join("\n  AND ");
}

function tabla(resultado, conTexto) {
  if (!resultado.length) return `<p class="vacio">No hay resultados.</p>`;
  const { columns, values } = resultado[0];
  const visibles = columns.filter(c => !["texto", "clave", "asunto"].includes(c));
  let html = `<div class="scroll"><table><thead><tr>${visibles.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
  for (const fila of values) {
    const dato = Object.fromEntries(columns.map((c, i) => [c, fila[i]]));
    html += "<tr>" + visibles.map(c => `<td>${
      c === "postulado" && dato.clave ? botonPostulado(dato)
      : c === "contacto" && dato.clave ? contacto(dato)
      : formatear(c, dato[c])}</td>`).join("") + "</tr>";
    if (conTexto && dato.texto) {
      html += `<tr class="detalle"><td colspan="${visibles.length}"><details><summary>Ver oferta completa</summary><pre>${escapar(dato.texto)}</pre></details></td></tr>`;
    }
  }
  return html + "</tbody></table></div>";
}

// ---------- Mail de postulación ----------

const MENSAJE_INICIAL = `Hola, buenas tardes. Les envío mi CV para la búsqueda de {puesto}.

Quedo a disposición.
Saludos,
[Tu nombre]`;

function leerMensaje() {
  try { return localStorage.getItem("mensaje") || MENSAJE_INICIAL; } catch { return MENSAJE_INICIAL; }
}

function contacto(dato) {
  const v = dato.contacto;
  if (!v) return formatear("contacto", v);
  if (!v.includes("@")) return formatear("contacto", v);
  const puesto = (dato.puesto || "el puesto").replace(/^(búsqueda laboral|nueva búsqueda)\W*/i, "").replace(/[.\s]+$/, "");
  const asunto = dato.asunto || puesto;
  const cuerpo = leerMensaje().replaceAll("{puesto}", puesto);
  const gmail = "https://mail.google.com/mail/?view=cm&fs=1"
    + "&to=" + encodeURIComponent(v) + "&su=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
  return `<a class="mail" href="${gmail}" target="_blank" rel="noopener">Escribir mail</a>
    <div class="sub">${escapar(v)}<br>Asunto: ${escapar(asunto)}</div>`;
}

function botonPostulado(dato) {
  return dato.postulado
    ? `<button class="marca hecha" data-clave="${dato.clave}">✓ Postulada</button>`
    : `<button class="marca" data-clave="${dato.clave}">Marcar</button>`;
}

function formatear(columna, valor) {
  if (valor === null || valor === undefined) return `<span class="nulo">—</span>`;
  const v = escapar(String(valor));
  if (columna === "contacto" && v.includes("@")) return `<a href="mailto:${v}">${v}</a>`;
  if (columna === "contacto" && v.startsWith("http")) return `<a href="${v}" target="_blank" rel="noopener">Abrir link</a>`;
  return v;
}

function escapar(s) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

let db;

$("analizar").onclick = () => {
  if (!SQL) return alerta("Cargando la base de datos, probá de nuevo en un segundo.");
  const ofertas = leerOfertas($("texto").value);
  if (!ofertas.length) return alerta("No se encontraron ofertas. Pegá el texto o cargá el ejemplo.");
  db = crearBase(ofertas);
  mostrar();
  for (const id of ["resultados", "seccionHabilidades", "seccionSql"]) $(id).classList.remove("oculto");
  $("resultados").scrollIntoView({ behavior: "smooth" });
};

function mostrar() {
  const total = db.exec("SELECT COUNT(*) FROM ofertas")[0].values[0][0];
  const postuladas = db.exec("SELECT COUNT(*) FROM ofertas WHERE postulado = 1")[0].values[0][0];
  const where = armarFiltro();

  const sqlFiltro = `SELECT puesto, zona, modalidad, nivel, anios_exp,
       COALESCE(email, link) AS contacto, postulado, clave, asunto, texto
FROM ofertas
WHERE ${where}
ORDER BY id;`;
  const res = db.exec(sqlFiltro);
  const cantidad = res.length ? res[0].values.length : 0;
  $("conteo").textContent = `· ${cantidad} de ${total}` + (postuladas ? ` · ${postuladas} postulada${postuladas === 1 ? "" : "s"}` : "");
  $("tabla").innerHTML = tabla(res, true);
  $("sqlFiltro").textContent = sqlFiltro;

  const sqlHab = `SELECT h.habilidad, COUNT(*) AS ofertas
FROM habilidades h
JOIN ofertas o ON o.id = h.oferta_id
WHERE ${where.replace(/\b(zona|modalidad|nivel|anios_exp|exp_excluyente|postulado)\b/g, "o.$1")}
GROUP BY h.habilidad
ORDER BY ofertas DESC;`;
  const hab = db.exec(sqlHab);
  $("habilidades").innerHTML = barras(hab);
  $("sqlHabilidades").textContent = sqlHab;
}

$("tabla").addEventListener("click", e => {
  const boton = e.target.closest("button.marca");
  if (boton) alternarPostulada(boton.dataset.clave);
});

$("ocultarPostuladas").onchange = () => { if (db) mostrar(); };

$("mensaje").value = leerMensaje();
$("mensaje").oninput = () => {
  try { localStorage.setItem("mensaje", $("mensaje").value); } catch { /* sin almacenamiento */ }
  if (db) mostrar();
};

function barras(resultado) {
  if (!resultado.length) return `<p class="vacio">Las ofertas filtradas no mencionan habilidades conocidas.</p>`;
  const filas = resultado[0].values;
  const max = filas[0][1];
  return filas.map(([nombre, n]) =>
    `<div class="barra"><span>${escapar(nombre)}</span><div><i style="width:${(n / max) * 100}%"></i></div><b>${n}</b></div>`
  ).join("");
}

$("ejecutar").onclick = () => {
  try {
    $("resultadoSql").innerHTML = tabla(db.exec($("consulta").value), false);
  } catch (e) {
    $("resultadoSql").innerHTML = `<p class="error">Error en la consulta: ${escapar(e.message)}</p>`;
  }
};

$("ejemplo").onclick = async () => {
  $("texto").value = await (await fetch("ejemplo.txt")).text();
};
$("limpiar").onclick = () => { $("texto").value = ""; };

function alerta(msg) {
  $("texto").setCustomValidity(msg);
  $("texto").reportValidity();
  setTimeout(() => $("texto").setCustomValidity(""), 2000);
}
