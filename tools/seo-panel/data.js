"use strict";
/**
 * Capa de datos del panel SEO local — SOLO LECTURA, sin estado ni caché.
 *
 * No implementa ninguna regla propia: reutiliza tools/seo-audit.js
 * (runAudit) y tools/seo-lib.js como única fuente de verdad de reglas y
 * hechos. Este módulo únicamente reorganiza esos mismos resultados en un
 * JSON pensado para el panel visual (tools/seo-panel/index.html) — no
 * decide qué es un error/warning, solo agrupa lo que seo-lib.js ya decidió.
 *
 * Cada llamada a buildPanelData() vuelve a ejecutar el auditor desde cero
 * (que a su vez relee los HTML del proyecto desde disco), así que no hay
 * copia manual de titles/metas/H1 que pueda quedarse desactualizada: un
 * cambio en cualquier página, o una página nueva añadida a
 * tools/seo-lib.js (PAGES), aparece en la siguiente carga del panel sin
 * tocar nada aquí.
 */
const lib = require("../seo-lib.js");
const { runAudit } = require("../seo-audit.js");

const CATEGORIAS = ["technical", "content", "links", "trust"];

// Mismo criterio de precedencia que ya usa seo-audit.js para el badge de
// página en el informe de consola (error > warning > ok); aquí se añade
// "manual" en el hueco intermedio para poder distinguir visualmente 🔎 de
// 🟢 en el panel — no es una severidad nueva, las 4 ("error", "warning",
// "manual", "ok") ya existen en los findings que produce seo-lib.js.
function badgeDeSeveridades(findings) {
  if (findings.some((f) => f.severity === "error")) return "error";
  if (findings.some((f) => f.severity === "warning")) return "warning";
  if (findings.some((f) => f.severity === "manual")) return "manual";
  return "ok";
}

function jsonLdTypeDe(pageFacts) {
  if (pageFacts.jsonLdBlocks.length === 0) return null;
  try {
    const data = JSON.parse(pageFacts.jsonLdBlocks[0]);
    return data["@type"] || null;
  } catch (e) {
    return "invalido";
  }
}

// Mismo hecho que ya usa SITEMAP_PAGE_MISSING dentro de checkTecnico
// (seo-lib.js) — se re-lee aquí el <loc> de sitemap.xml solo para poder
// mostrar un sí/no por página en el panel; no es una regla nueva, es el
// mismo dato ya disponible en ctx.sitemap.
function locsDeSitemap(sitemapXml) {
  return Array.from(sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);
}

// Algunos findings son "globales" (page: null) porque afectan a más de una
// página a la vez (duplicados de title/H1, solapamiento de contenido,
// entradas de sitemap.xml) — el mensaje siempre nombra las URLs afectadas
// literalmente, así que para mostrarlas en el detalle de una página basta
// con buscar esa URL dentro del mensaje. Se excluye deliberadamente la
// home ("/" y su canonical "https://.../") de esta búsqueda: al terminar
// en "/", son prefijo literal de CUALQUIER otra URL del mismo origen
// (p. ej. "https://.../" es prefijo de "https://.../foo"), lo que
// generaría falsos positivos con casi cualquier hallazgo global.
function globalesQueMencionan(cleanUrl, canonical, globalFindings) {
  if (cleanUrl === "/") return [];
  return globalFindings.filter((f) => {
    if (canonical && f.message.includes(canonical)) return true;
    if (f.message.includes(cleanUrl)) return true;
    return false;
  });
}

function buildPanelData() {
  const { ctx, findings } = runAudit();
  const locs = locsDeSitemap(ctx.sitemap);
  const globalFindings = findings.filter((f) => f.page === null);

  const pages = ctx.facts.map((p) => {
    const cfg = ctx.config.pages[p.cleanUrl] || null;
    const propias = findings.filter((f) => f.page === p.cleanUrl);
    const relevantesGlobales = globalesQueMencionan(p.cleanUrl, p.canonical, globalFindings);
    const todasLasQueLeAfectan = propias.concat(relevantesGlobales);

    const categories = {};
    for (const cat of CATEGORIAS) {
      const deCat = todasLasQueLeAfectan.filter((f) => f.category === cat);
      categories[cat] = { badge: badgeDeSeveridades(deCat), findings: deCat };
    }

    const outbound = ctx.graph.outbound.get(p.cleanUrl) || { literal: new Set(), virtual: new Set() };
    const incoming = ctx.graph.incoming.get(p.cleanUrl) || new Set();

    const bloqueadaEnRobots = propias.some((f) => f.code === "ROBOTS_BLOCKS_PAGE");
    const noindex = !!(p.robotsMeta && /noindex/i.test(p.robotsMeta));

    return {
      cleanUrl: p.cleanUrl,
      file: p.file,
      title: p.title,
      titleLength: p.title ? p.title.length : 0,
      description: p.description,
      descriptionLength: p.description ? p.description.length : 0,
      canonical: p.canonical,
      h1: p.h1s[0] || null,
      h1Count: p.h1s.length,
      robotsMeta: p.robotsMeta,
      indexable: !noindex && !bloqueadaEnRobots,
      jsonLdType: jsonLdTypeDe(p),
      ogTitle: p.ogTitle,
      ogDescription: p.ogDescription,
      ogUrl: p.ogUrl,
      editorial: cfg
        ? {
            target: cfg.target || null,
            intent: cfg.intent || null,
            related: cfg.related || [],
            requiresOfficialSource: !!cfg.requiresOfficialSource,
            requiresMethodology: !!cfg.requiresMethodology,
            requiresDateContext: !!cfg.requiresDateContext,
            requiresDisclaimer: !!cfg.requiresDisclaimer,
            disclaimerType: cfg.disclaimerType || null
          }
        : null,
      inSitemap: !!p.canonical && locs.includes(p.canonical),
      links: {
        outboundLiteral: Array.from(outbound.literal).sort(),
        outboundVirtual: Array.from(outbound.virtual).sort(),
        inbound: Array.from(incoming).sort()
      },
      categories: categories,
      badge: badgeDeSeveridades(todasLasQueLeAfectan),
      errorCount: todasLasQueLeAfectan.filter((f) => f.severity === "error").length,
      warningCount: todasLasQueLeAfectan.filter((f) => f.severity === "warning").length,
      manualCount: todasLasQueLeAfectan.filter((f) => f.severity === "manual").length
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    siteOrigin: lib.SITE_ORIGIN,
    siteName: "SueldoClaro",
    pages: pages,
    globalFindings: globalFindings,
    summary: {
      totalPages: pages.length,
      errors: findings.filter((f) => f.severity === "error").length,
      warnings: findings.filter((f) => f.severity === "warning").length,
      manual: findings.filter((f) => f.severity === "manual").length
    }
  };
}

module.exports = { buildPanelData, badgeDeSeveridades, jsonLdTypeDe, locsDeSitemap, globalesQueMencionan };
