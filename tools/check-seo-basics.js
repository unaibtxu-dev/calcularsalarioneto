"use strict";
/**
 * Lint de SEO técnico: title, meta description, canonical, robots
 * indexable, Open Graph, JSON-LD, jerarquía de encabezados, IDs
 * duplicados, enlaces internos rotos, sitemap.xml y robots.txt. Piensa en
 * esto como el "gate" de CI — falla (exit 1) solo ante errores objetivos
 * de implementación, nunca por advertencias editoriales (longitud de
 * title/meta, huérfanas, etc.), que se muestran aparte sin romper nada.
 *
 * Todas las reglas viven en tools/seo-lib.js (única fuente de verdad,
 * compartida con tools/seo-audit.js) — este archivo solo las ejecuta y
 * da el formato de salida breve tradicional de check-seo-basics.
 *
 * Uso:
 *   node tools/check-seo-basics.js            → validación rápida (CI)
 *   node tools/check-seo-basics.js --report   → informe completo tipo
 *                                                Yoast (alias de
 *                                                tools/seo-audit.js)
 */
const lib = require("./seo-lib.js");

function main() {
  if (process.argv.includes("--report")) {
    const { runAudit, imprimirInforme } = require("./seo-audit.js");
    const { ctx, findings } = runAudit();
    imprimirInforme(ctx, findings);
    process.exitCode = findings.some((f) => f.severity === "error") ? 1 : 0;
    return;
  }

  const ctx = lib.cargarTodo();
  const findings = lib.checkTecnico(ctx);
  const errores = findings.filter((f) => f.severity === "error");
  const advertencias = findings.filter((f) => f.severity === "warning");

  if (errores.length) {
    console.error("check-seo-basics: " + errores.length + " problema(s):");
    for (const e of errores) console.error("  - " + (e.page ? e.page + ": " : "") + e.message);
    if (advertencias.length) console.error("(además, " + advertencias.length + " advertencia(s) no bloqueante(s) — usa --report para verlas)");
    process.exit(1);
  }

  let mensaje = "check-seo-basics: OK (" + ctx.facts.length + " páginas, sitemap y robots.txt consistentes)";
  if (advertencias.length) mensaje += " — " + advertencias.length + " advertencia(s) no bloqueante(s), usa --report para el detalle";
  console.log(mensaje);
}

main();
