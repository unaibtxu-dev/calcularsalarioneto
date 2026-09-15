"use strict";
/**
 * Auditor SEO de SueldoClaro — informe tipo Yoast, adaptado a un sitio
 * estático en Cloudflare Pages.
 *
 * Todas las reglas (SEO técnico, contenido/intención, enlazado interno,
 * confianza/transparencia) viven en tools/seo-lib.js — única fuente de
 * verdad, compartida con tools/check-seo-basics.js. Este archivo solo
 * orquesta la ejecución y da formato al informe legible en consola.
 *
 * Deliberadamente NO implementa mitos SEO: sin densidad de keywords, sin
 * mínimo de palabras obligatorio, sin exigir la keyword en cada H2. Las
 * reglas de contenido/intención son orientativas (WARNING) o de revisión
 * manual, nunca "errores" automáticos.
 *
 * Uso:
 *   node tools/seo-audit.js                 → informe completo (modo Yoast)
 *   node tools/check-seo-basics.js --report → mismo informe (alias)
 *
 * Exit code: 0 salvo que existan errores objetivos. Los WARNING y las
 * revisiones manuales nunca rompen el exit code, para no bloquear CI por
 * opiniones editoriales.
 */
const lib = require("./seo-lib.js");

const ICONOS = { error: "🔴", warning: "🟠", ok: "🟢", manual: "🔎" };

function runAudit() {
  const ctx = lib.cargarTodo();
  const findings = [
    ...lib.checkTecnico(ctx),
    ...lib.checkContenido(ctx),
    ...lib.checkEnlazado(ctx),
    ...lib.checkConfianza(ctx)
  ];
  return { ctx, findings };
}

function badgeDePagina(findingsDePagina) {
  if (findingsDePagina.some((f) => f.severity === "error")) return "error";
  if (findingsDePagina.some((f) => f.severity === "warning")) return "warning";
  return "ok";
}

function iconoDe(severity) {
  return ICONOS[severity] || "•";
}

function imprimirInforme(ctx, findings) {
  console.log("SEO AUDIT — SueldoClaro");
  console.log("=======================\n");

  const CATEGORIAS = [
    { key: "technical", titulo: "SEO TÉCNICO" },
    { key: "content", titulo: "CONTENIDO / INTENCIÓN" },
    { key: "links", titulo: "ENLAZADO" },
    { key: "trust", titulo: "CONFIANZA" }
  ];

  for (const p of ctx.facts) {
    console.log(p.cleanUrl);
    console.log("");
    const propias = findings.filter((f) => f.page === p.cleanUrl);
    for (const cat of CATEGORIAS) {
      const deCat = propias.filter((f) => f.category === cat.key);
      console.log(cat.titulo);
      if (deCat.length === 0) {
        console.log(ICONOS.ok + " Sin incidencias relevantes");
      } else {
        for (const f of deCat) console.log(iconoDe(f.severity) + " " + f.message);
      }
      console.log("");
    }
    const badge = badgeDePagina(propias);
    const etiqueta = badge === "error" ? "ERROR" : badge === "warning" ? "MEJORABLE" : "BIEN";
    console.log("RESULTADO");
    console.log(iconoDe(badge) + " " + etiqueta);
    console.log("\n---\n");
  }

  const globales = findings.filter((f) => f.page === null);
  if (globales.length > 0) {
    console.log("HALLAZGOS GLOBALES (sitemap / duplicados entre páginas / similitud de contenido)\n");
    for (const f of globales) console.log(iconoDe(f.severity) + " [" + f.category + "] " + f.message);
    console.log("\n---\n");
  }

  const nErrores = findings.filter((f) => f.severity === "error").length;
  const nWarnings = findings.filter((f) => f.severity === "warning").length;
  const nManual = findings.filter((f) => f.severity === "manual").length;
  console.log("Resumen global:\n");
  console.log(ctx.facts.length + " páginas analizadas");
  console.log(nErrores + " errores");
  console.log(nWarnings + " advertencias");
  console.log(nManual + " revisiones manuales");
}

function main() {
  const { ctx, findings } = runAudit();
  imprimirInforme(ctx, findings);
  const nErrores = findings.filter((f) => f.severity === "error").length;
  process.exitCode = nErrores > 0 ? 1 : 0;
}

if (require.main === module) main();

module.exports = { runAudit, imprimirInforme };
