/**
 * Lint dev-only: cada bloque de datos en Constants2026 debe declarar su
 * fuente en Constants2026.FUENTES (norma, articulo, url, anio, estado).
 * Uso: node tools/check-constants-sources.js
 */
"use strict";

const assert = require("node:assert/strict");
const Constants2026 = require("../lib/constants-2026.js");

const REQUIRED_FIELDS = ["norma", "articulo", "url", "anio", "estado"];
const EXEMPT_KEYS = new Set(["TAX_YEAR", "FUENTES"]);

function main() {
  const dataKeys = Object.keys(Constants2026).filter((k) => !EXEMPT_KEYS.has(k));
  const fuentes = Constants2026.FUENTES || {};
  const problems = [];

  for (const key of dataKeys) {
    const fuente = fuentes[key];
    if (!fuente) {
      problems.push(`Falta fuente para "${key}"`);
      continue;
    }
    for (const field of REQUIRED_FIELDS) {
      if (fuente[field] === undefined || fuente[field] === "") {
        problems.push(`Fuente de "${key}" no tiene el campo "${field}"`);
      }
    }
    if (fuente.url && !/^https:\/\//.test(fuente.url)) {
      problems.push(`Fuente de "${key}" tiene una URL que no empieza por https:// ("${fuente.url}")`);
    }
  }

  for (const key of Object.keys(fuentes)) {
    if (!dataKeys.includes(key)) {
      problems.push(`FUENTES tiene una entrada huérfana "${key}" que no existe en Constants2026`);
    }
  }

  if (problems.length > 0) {
    console.error("check-constants-sources: FALLÓ\n");
    for (const p of problems) console.error("  - " + p);
    process.exitCode = 1;
    return;
  }

  console.log(`check-constants-sources: OK (${dataKeys.length} bloques de datos, todos con fuente)`);
}

main();
