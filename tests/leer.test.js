// Pruebas de las reglas que separan y clasifican las ofertas (docs/leer.js).
// Se corren con: node --test
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const codigo = fs.readFileSync(path.join(__dirname, "..", "docs", "leer.js"), "utf8");
const leerOfertas = new Function(codigo + "; return leerOfertas;")();
const ejemplo = fs.readFileSync(path.join(__dirname, "..", "docs", "ejemplo.txt"), "utf8");

test("separa cada mensaje de WhatsApp en una oferta", () => {
  assert.strictEqual(leerOfertas(ejemplo).length, 7);
});

test("detecta zona, nivel y experiencia", () => {
  const [soporte, datos, pasantia, administrativo] = leerOfertas(ejemplo);
  assert.strictEqual(soporte.zona, "CABA");
  assert.strictEqual(soporte.nivel, "jr");
  assert.strictEqual(datos.nivel, "ssr");
  assert.strictEqual(datos.anios_exp, 3);
  assert.strictEqual(datos.exp_excluyente, 1);
  assert.strictEqual(pasantia.nivel, "pasantía");
  assert.strictEqual(administrativo.zona, "GBA");
});

test("saca mail, asunto y habilidades", () => {
  const [soporte, datos] = leerOfertas(ejemplo);
  assert.strictEqual(soporte.email, "seleccion@empresa-ejemplo.com.ar");
  assert.strictEqual(soporte.asunto, "Soporte Jr");
  assert.deepStrictEqual(datos.habilidades, ["SQL", "Python", "Power BI"]);
});

test("detecta modalidad remota", () => {
  const remota = leerOfertas(ejemplo).find(o => o.puesto.includes("Python"));
  assert.strictEqual(remota.modalidad, "remoto");
});

test("en un boletín cada línea numerada es una oferta", () => {
  const boletin = [
    "Empezamos con Europa:",
    "1. 🇫🇷 Empresa busca a un Software Engineer Intern: https://ejemplo.com/a",
    "🌎 Es el turno de LATAM:",
    "1. 🇦🇷 Empresa Argentina busca a un Analista Jr: https://ejemplo.com/b",
  ].join("\n");
  const ofertas = leerOfertas(boletin);
  assert.strictEqual(ofertas.length, 2);
  assert.strictEqual(ofertas[0].zona, "Exterior");
  assert.strictEqual(ofertas[1].zona, "Argentina");
});

test("no confunde un mail con un cargo (jefedefront@... no es 'jefe')", () => {
  const [o] = leerOfertas("[10:00, 01/11/2026] Canal: Recepcionista para hotel en Microcentro, CABA\nEnviar CV a jefedefront@hotel-ejemplo.com");
  assert.strictEqual(o.nivel, null);
});
