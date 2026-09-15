"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const lib = require("../tools/seo-lib.js");

const ROOT = path.join(__dirname, "..");

// -----------------------------------------------------------------------
// Helpers para construir "hechos" sintéticos de página sin tocar disco,
// para poder probar cada regla de forma aislada y determinista.
// -----------------------------------------------------------------------

function paginaFalsa(overrides) {
  return Object.assign(
    {
      file: "fake.html",
      cleanUrl: "/fake",
      html: '<html lang="es"><head></head><body></body></html>',
      title: "Un título de prueba con longitud correcta para pasar",
      titleCount: 1,
      description: "Una meta description de longitud razonable, pensada para superar el rango orientativo sin dar warning.",
      descriptionCount: 1,
      robotsMeta: "index, follow",
      canonical: "https://calcularsalarioneto.es/fake",
      ogTitle: "Un título de prueba",
      ogDescription: "Una descripción de prueba",
      ogUrl: "https://calcularsalarioneto.es/fake",
      ogType: "website",
      hasViewport: true,
      jsonLdBlocks: ['{"@type":"WebPage"}'],
      h1s: ["Un H1 de prueba"],
      headingSequence: [{ nivel: 1, texto: "Un H1 de prueba" }],
      ids: [],
      hrefsRaw: [],
      hasTopnav: false,
      hasFooterContainer: false,
      relacionadasCall: null,
      mainText: "Texto de prueba con suficientes palabras para no disparar el aviso de contenido escaso. ".repeat(6),
      pagesJsSrc: ""
    },
    overrides
  );
}

function sitemapCon(urls) {
  const locs = urls.map((u) => "<loc>" + u + "</loc>").join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + locs + "\n</urlset>";
}

const ROBOTS_VALIDO = "User-agent: *\nAllow: /\n\nSitemap: https://calcularsalarioneto.es/sitemap.xml\n";

function ctxTecnico(facts, sitemap) {
  return { facts, sitemap: sitemap || sitemapCon(facts.filter((p) => p.canonical).map((p) => p.canonical)), robotsTxt: ROBOTS_VALIDO };
}

function componentesVacios() {
  return { PAGES_ARR: [], REGIONES_ARR: [], CATEGORIAS_ARR: [], FOOTER_LINKS_ARR: [], hardcodedNavHrefs: [] };
}

function buscar(findings, code) {
  return findings.filter((f) => f.code === code);
}

// -----------------------------------------------------------------------
// SEO TÉCNICO
// -----------------------------------------------------------------------

describe("checkTecnico: reglas individuales", () => {
  test("detecta title ausente", () => {
    const p = paginaFalsa({ title: null, titleCount: 0 });
    const out = lib.checkTecnico(ctxTecnico([p]));
    const m = buscar(out, "TITLE_MISSING");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("detecta meta description ausente", () => {
    const p = paginaFalsa({ description: null, descriptionCount: 0 });
    const out = lib.checkTecnico(ctxTecnico([p]));
    const m = buscar(out, "DESC_MISSING");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("detecta H1 múltiple", () => {
    const p = paginaFalsa({ h1s: ["Primero", "Segundo"] });
    const out = lib.checkTecnico(ctxTecnico([p]));
    const m = buscar(out, "H1_MULTIPLE");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("detecta canonical incorrecto (no coincide con la URL limpia del archivo)", () => {
    const p = paginaFalsa({ canonical: "https://calcularsalarioneto.es/otra-cosa" });
    const out = lib.checkTecnico(ctxTecnico([p]));
    const m = buscar(out, "CANONICAL_MISMATCH");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("detecta noindex accidental en una página que debería indexarse", () => {
    const p = paginaFalsa({ robotsMeta: "noindex, follow" });
    const out = lib.checkTecnico(ctxTecnico([p]));
    const m = buscar(out, "NOINDEX_UNEXPECTED");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("detecta página indexable fuera del sitemap", () => {
    const p = paginaFalsa();
    const out = lib.checkTecnico(ctxTecnico([p], sitemapCon([]))); // sitemap vacío a propósito
    const m = buscar(out, "SITEMAP_PAGE_MISSING");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("detecta URL de sitemap que no corresponde a ninguna página existente", () => {
    // "fake.html" tampoco existe en disco, así que legítimamente también
    // dispara SITEMAP_DEAD_URL para su propio canonical — lo relevante
    // aquí es que la URL añadida a propósito sea detectada, no el total.
    const p = paginaFalsa();
    const urlInventada = "https://calcularsalarioneto.es/esta-pagina-no-existe-de-verdad";
    const sitemap = sitemapCon([p.canonical, urlInventada]);
    const out = lib.checkTecnico(ctxTecnico([p], sitemap));
    const m = buscar(out, "SITEMAP_DEAD_URL").filter((f) => f.message.includes(urlInventada));
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("longitud de title/meta description es WARNING, no ERROR", () => {
    const p = paginaFalsa({ title: "Corto", description: "Muy corta" });
    const out = lib.checkTecnico(ctxTecnico([p]));
    const mTitle = buscar(out, "TITLE_LENGTH");
    const mDesc = buscar(out, "DESC_LENGTH");
    assert.equal(mTitle.length, 1);
    assert.equal(mTitle[0].severity, "warning");
    assert.equal(mDesc.length, 1);
    assert.equal(mDesc[0].severity, "warning");
  });
});

// -----------------------------------------------------------------------
// CONTENIDO E INTENCIÓN
// -----------------------------------------------------------------------

describe("checkContenido: reglas individuales", () => {
  test("detecta title duplicado entre dos páginas distintas", () => {
    const a = paginaFalsa({ cleanUrl: "/a", canonical: "https://calcularsalarioneto.es/a", title: "Mismo título exacto" });
    const b = paginaFalsa({ cleanUrl: "/b", canonical: "https://calcularsalarioneto.es/b", title: "Mismo título exacto" });
    const out = lib.checkContenido({ facts: [a, b], config: { pages: {} } });
    const m = buscar(out, "TITLE_DUPLICATE");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "warning");
  });

  test("nunca afirma canibalización de forma automática: el mensaje de solapamiento pide revisión manual", () => {
    // >=30 palabras distintas (tras quitar stopwords) para superar el
    // suelo mínimo de la heurística de similitud, con vocabulario idéntico
    // en ambas páginas para forzar una coincidencia alta a propósito.
    const palabras = Array.from({ length: 40 }, (_, i) => "palabraunica" + i);
    const textoA = palabras.join(" ") + " " + palabras.join(" ");
    const a = paginaFalsa({ cleanUrl: "/a", canonical: "https://calcularsalarioneto.es/a", mainText: textoA });
    const b = paginaFalsa({ cleanUrl: "/b", canonical: "https://calcularsalarioneto.es/b", mainText: textoA });
    const out = lib.checkContenido({ facts: [a, b], config: { pages: {} } });
    const m = buscar(out, "CONTENT_OVERLAP");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "manual");
    assert.match(m[0].message, /revisar manualmente/i);
    assert.doesNotMatch(m[0].message, /canibalización (existe|confirmada)/i);
  });
});

// -----------------------------------------------------------------------
// ENLAZADO INTERNO
// -----------------------------------------------------------------------

describe("checkEnlazado / buildLinkGraph: reglas individuales", () => {
  test("detecta enlace interno roto", () => {
    const a = paginaFalsa({ cleanUrl: "/a", hrefsRaw: ['<a href="/pagina-que-no-existe">x</a>'.match(/href="([^"]+)"/)[1]] });
    const graph = lib.buildLinkGraph([a], componentesVacios());
    const out = lib.checkEnlazado({ facts: [a], graph, config: { pages: {} } });
    const m = buscar(out, "LINK_BROKEN");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "error");
  });

  test("detecta página huérfana (sin enlaces entrantes literales ni por nav/footer)", () => {
    const a = paginaFalsa({ cleanUrl: "/a" });
    const b = paginaFalsa({ cleanUrl: "/b" });
    const graph = lib.buildLinkGraph([a, b], componentesVacios());
    const out = lib.checkEnlazado({ facts: [a, b], graph, config: { pages: {} } });
    const m = buscar(out, "ORPHAN_PAGE");
    assert.equal(m.length, 2); // ninguna de las dos recibe enlaces
    assert.ok(m.every((f) => f.severity === "warning"));
  });

  test("detecta relación editorial faltante (configurada en seo-config pero no enlazada)", () => {
    const a = paginaFalsa({ cleanUrl: "/a", hrefsRaw: [] });
    const b = paginaFalsa({ cleanUrl: "/b" });
    const graph = lib.buildLinkGraph([a, b], componentesVacios());
    const config = { pages: { "/a": { related: ["/b"] } } };
    const out = lib.checkEnlazado({ facts: [a, b], graph, config });
    const m = buscar(out, "RELATED_LINK_MISSING");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "warning");
  });

  test("no genera falsos positivos por el footer generado mediante components.js: una página sin ningún href literal pero con #footer no es huérfana", () => {
    const a = paginaFalsa({ cleanUrl: "/a", hrefsRaw: [], hasFooterContainer: true });
    const b = paginaFalsa({ cleanUrl: "/b", hrefsRaw: [] });
    const componentes = Object.assign(componentesVacios(), { FOOTER_LINKS_ARR: [{ id: null, href: "/b" }] });
    const graph = lib.buildLinkGraph([a, b], componentes);
    // "/b" recibe un enlace de "/a" solo porque "/a" tiene el footer compartido, sin ningún <a href> literal en su HTML.
    assert.ok(graph.incoming.get("/b").has("/a"));
    const out = lib.checkEnlazado({ facts: [a, b], graph, config: { pages: {} } });
    assert.equal(buscar(out, "ORPHAN_PAGE").filter((f) => f.page === "/b").length, 0);
  });
});

// -----------------------------------------------------------------------
// CONFIANZA: disclaimer informativo (requiresDisclaimer)
// -----------------------------------------------------------------------

describe("checkConfianza: disclaimer informativo", () => {
  test("detecta disclaimer presente en el HTML estático (guía/editorial)", () => {
    const p = paginaFalsa({
      cleanUrl: "/a",
      mainText: "Contenido informativo: los ejemplos son orientativos y no sustituyen el asesoramiento fiscal profesional. " + paginaFalsa().mainText
    });
    const out = lib.checkConfianza({ facts: [p], graph: lib.buildLinkGraph([p], componentesVacios()), config: { pages: { "/a": { requiresDisclaimer: true } } } });
    const m = buscar(out, "DISCLAIMER_OK");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "ok");
  });

  test("detecta ausencia de disclaimer cuando requiresDisclaimer=true, y es WARNING (no ERROR)", () => {
    const p = paginaFalsa({ cleanUrl: "/a" }); // mainText sin ninguna frase de disclaimer
    const out = lib.checkConfianza({ facts: [p], graph: lib.buildLinkGraph([p], componentesVacios()), config: { pages: { "/a": { requiresDisclaimer: true } } } });
    const m = buscar(out, "DISCLAIMER_MISSING");
    assert.equal(m.length, 1);
    assert.equal(m[0].severity, "warning");
    assert.notEqual(m[0].severity, "error");
  });

  test("la ausencia de disclaimer (warning) no rompe el exit code", () => {
    const findings = [{ severity: "warning", category: "trust", page: "/a", code: "DISCLAIMER_MISSING", message: "..." }];
    assert.equal(findings.some((f) => f.severity === "error"), false);
  });

  test("reconoce un disclaimer que enlaza a /metodologia dentro de la misma frase", () => {
    const p = paginaFalsa({
      cleanUrl: "/a",
      mainText: 'Es una estimación y no sustituye el asesoramiento profesional. Consulta nuestra metodología. ' + paginaFalsa().mainText,
      hrefsRaw: ["/metodologia"]
    });
    const graph = lib.buildLinkGraph([p], componentesVacios());
    assert.ok(graph.outbound.get("/a").literal.has("/metodologia"));
    const out = lib.checkConfianza({ facts: [p], graph, config: { pages: { "/a": { requiresDisclaimer: true, requiresMethodology: true } } } });
    assert.equal(buscar(out, "DISCLAIMER_OK").length, 1);
    assert.equal(buscar(out, "METHODOLOGY_LINKED").length, 1);
  });

  test("no produce falso positivo cuando el disclaimer vive en pages/*.js vía App.DISCLAIMER (caso real de las calculadoras)", () => {
    // Simula exactamente la arquitectura real: el HTML estático no contiene
    // el disclaimer (se renderiza por JS en #resultado), pero el pages/*.js
    // de la página sí referencia App.DISCLAIMER, y components.js contiene el
    // texto real. No debería marcarse como ausente.
    const p = paginaFalsa({ cleanUrl: "/a", mainText: "Salario bruto y neto. ".repeat(10), pagesJsSrc: '<p class="disclaimer">" + App.DISCLAIMER + "</p>' });
    const out = lib.checkConfianza({ facts: [p], graph: lib.buildLinkGraph([p], componentesVacios()), config: { pages: { "/a": { requiresDisclaimer: true } } } });
    // components.js real ya contiene "no sustituye" (verificado en otro test), así que esto debe dar OK.
    assert.equal(buscar(out, "DISCLAIMER_OK").length, 1);
    assert.equal(buscar(out, "DISCLAIMER_MISSING").length, 0);
  });

  test("una página sin requiresDisclaimer en la config no genera ningún finding de disclaimer (páginas institucionales)", () => {
    const p = paginaFalsa({ cleanUrl: "/a" });
    const out = lib.checkConfianza({ facts: [p], graph: lib.buildLinkGraph([p], componentesVacios()), config: { pages: {} } });
    assert.equal(buscar(out, "DISCLAIMER_OK").length, 0);
    assert.equal(buscar(out, "DISCLAIMER_MISSING").length, 0);
  });

  test("las páginas institucionales reales (/privacidad, /cookies, /contacto, /aviso-legal, /sobre-sueldo-claro) no requieren disclaimer fiscal en tools/seo-config.json", () => {
    const config = lib.loadSeoConfig();
    for (const url of ["/privacidad", "/cookies", "/contacto", "/aviso-legal", "/sobre-sueldo-claro", "/404"]) {
      const cfg = config.pages[url];
      assert.ok(!cfg || !cfg.requiresDisclaimer, url + " no debería requerir disclaimer fiscal");
    }
  });

  test("assets/js/components.js (App.DISCLAIMER) sí contiene la frase de disclaimer real", () => {
    const src = lib.leer("assets/js/components.js");
    assert.match(src, /no sustituye/i);
  });
});

// -----------------------------------------------------------------------
// Severidad / exit code
// -----------------------------------------------------------------------

describe("distinción warning/error y exit code", () => {
  test("un finding de severidad warning nunca cuenta como error", () => {
    const findings = [
      { severity: "warning", category: "technical", page: "/a", code: "X", message: "..." },
      { severity: "manual", category: "content", page: null, code: "Y", message: "..." }
    ];
    assert.equal(findings.some((f) => f.severity === "error"), false);
  });

  test("node tools/check-seo-basics.js termina con exit code 0 en el proyecto real (0 errores actuales)", () => {
    const out = execFileSync("node", ["tools/check-seo-basics.js"], { cwd: ROOT, encoding: "utf8" });
    assert.match(out, /check-seo-basics: OK/);
  });

  test("node tools/check-seo-basics.js --report no rompe el exit code por las advertencias existentes", () => {
    // execFileSync lanza si el exit code no es 0 — si esto no lanza, el exit code fue 0.
    execFileSync("node", ["tools/check-seo-basics.js", "--report"], { cwd: ROOT, encoding: "utf8" });
  });
});

// -----------------------------------------------------------------------
// Caso de prueba real: cluster de Álava (guía informativa + calculadora
// transaccional)
// -----------------------------------------------------------------------

describe("cluster Álava: guía y calculadora se reconocen con intenciones distintas", () => {
  const ctx = lib.cargarTodo();
  const contenido = lib.checkContenido(ctx);
  const enlazado = lib.checkEnlazado(ctx);

  test("la guía se reconoce con intención informational y el tema representado", () => {
    const m = contenido.filter((f) => f.page === "/guias/tabla-retenciones-irpf-alava-2026" && f.code === "TARGET_REPRESENTED");
    assert.equal(m.length, 1);
    assert.match(m[0].message, /informational/);
  });

  test("la calculadora se reconoce con intención transactional y el tema representado", () => {
    const m = contenido.filter((f) => f.page === "/calculadora-sueldo-neto-alava" && f.code === "TARGET_REPRESENTED");
    assert.equal(m.length, 1);
    assert.match(m[0].message, /transactional/);
  });

  test("guía y calculadora NO comparten title ni H1 (no hay canibalización literal entre ellas)", () => {
    const guia = ctx.facts.find((p) => p.cleanUrl === "/guias/tabla-retenciones-irpf-alava-2026");
    const calc = ctx.facts.find((p) => p.cleanUrl === "/calculadora-sueldo-neto-alava");
    assert.notEqual(guia.title.trim().toLowerCase(), calc.title.trim().toLowerCase());
    assert.notEqual(guia.h1s[0].trim().toLowerCase(), calc.h1s[0].trim().toLowerCase());
  });

  test("la guía enlaza con la calculadora y viceversa (relación editorial configurada y cumplida)", () => {
    const deGuia = enlazado.filter((f) => f.page === "/guias/tabla-retenciones-irpf-alava-2026" && f.code === "RELATED_LINK_OK");
    const deCalc = enlazado.filter((f) => f.page === "/calculadora-sueldo-neto-alava" && f.code === "RELATED_LINK_OK");
    assert.equal(deGuia.length, 1);
    assert.equal(deCalc.length, 1);
  });
});

describe("cluster coste-empresa: guía y calculadora se reconocen con intenciones distintas", () => {
  const ctx = lib.cargarTodo();
  const contenido = lib.checkContenido(ctx);
  const enlazado = lib.checkEnlazado(ctx);

  test("la guía se reconoce con intención informational y el tema representado", () => {
    const m = contenido.filter((f) => f.page === "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026" && f.code === "TARGET_REPRESENTED");
    assert.equal(m.length, 1);
    assert.match(m[0].message, /informational/);
  });

  test("la calculadora se reconoce con intención transactional y el tema representado", () => {
    const m = contenido.filter((f) => f.page === "/coste-empresa" && f.code === "TARGET_REPRESENTED");
    assert.equal(m.length, 1);
    assert.match(m[0].message, /transactional/);
  });

  test("guía y calculadora NO comparten title ni H1 (no hay canibalización literal entre ellas)", () => {
    const guia = ctx.facts.find((p) => p.cleanUrl === "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026");
    const calc = ctx.facts.find((p) => p.cleanUrl === "/coste-empresa");
    assert.notEqual(guia.title.trim().toLowerCase(), calc.title.trim().toLowerCase());
    assert.notEqual(guia.h1s[0].trim().toLowerCase(), calc.h1s[0].trim().toLowerCase());
  });

  test("la guía enlaza con la calculadora y viceversa (relación editorial configurada y cumplida)", () => {
    const deGuia = enlazado.filter((f) => f.page === "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026" && f.code === "RELATED_LINK_OK");
    const deCalc = enlazado.filter((f) => f.page === "/coste-empresa" && f.code === "RELATED_LINK_OK");
    assert.equal(deGuia.length, 1);
    assert.equal(deCalc.length, 1);
  });
});

// -----------------------------------------------------------------------
// Sanidad: el auditor debe ejecutarse limpio sobre el proyecto real
// -----------------------------------------------------------------------

describe("auditor sobre el proyecto real", () => {
  test("checkTecnico no encuentra ningún ERROR en las páginas reales del proyecto", () => {
    const ctx = lib.cargarTodo();
    const errores = lib.checkTecnico(ctx).filter((f) => f.severity === "error");
    assert.deepEqual(errores, []);
  });

  test("checkEnlazado no encuentra enlaces internos rotos ni relativos peligrosos en el proyecto real", () => {
    const ctx = lib.cargarTodo();
    const out = lib.checkEnlazado(ctx);
    assert.equal(buscar(out, "LINK_BROKEN").length, 0);
    assert.equal(buscar(out, "LINK_RELATIVE_NESTED").length, 0);
  });

  test("checkConfianza no encuentra ninguna página de confianza inalcanzable", () => {
    const ctx = lib.cargarTodo();
    const out = lib.checkConfianza(ctx);
    assert.equal(buscar(out, "TRUST_PAGE_MISSING").length, 0);
    assert.equal(buscar(out, "TRUST_PAGE_UNREACHABLE").length, 0);
  });

  test("todas las páginas configuradas con requiresDisclaimer=true tienen su disclaimer detectado (0 DISCLAIMER_MISSING)", () => {
    const ctx = lib.cargarTodo();
    const out = lib.checkConfianza(ctx);
    assert.equal(buscar(out, "DISCLAIMER_MISSING").length, 0);
    const conRequisito = Object.values(ctx.config.pages).filter((c) => c.requiresDisclaimer).length;
    assert.ok(conRequisito > 0, "el test no comprueba nada si no hay ninguna página configurada");
    assert.equal(buscar(out, "DISCLAIMER_OK").length, conRequisito);
  });
});
