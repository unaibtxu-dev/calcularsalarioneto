"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const TaxEngine = require("../lib/tax-engine.js");
const Constants2026 = require("../lib/constants-2026.js");

const GUIA_PATH = path.join(__dirname, "..", "guias", "cuanto-cuesta-un-trabajador-a-la-empresa-2026.html");
const CALCULADORA_PATH = path.join(__dirname, "..", "coste-empresa.html");
const GUIAS_INDEX_PATH = path.join(__dirname, "..", "guias.html");
const SITEMAP_PATH = path.join(__dirname, "..", "sitemap.xml");
const guiaHtml = fs.readFileSync(GUIA_PATH, "utf8");
const calculadoraHtml = fs.readFileSync(CALCULADORA_PATH, "utf8");
const guiasIndexHtml = fs.readFileSync(GUIAS_INDEX_PATH, "utf8");
const sitemapXml = fs.readFileSync(SITEMAP_PATH, "utf8");

const CLEAN_URL = "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026";
const CANONICAL = "https://calcularsalarioneto.es" + CLEAN_URL;

describe("guía /guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026: SEO técnico básico", () => {
  test("canonical apunta a la URL pública esperada", () => {
    assert.ok(guiaHtml.includes('<link rel="canonical" href="' + CANONICAL + '">'));
  });

  test("title cumple longitud (15-70) y contiene el año 2026", () => {
    const m = guiaHtml.match(/<title>([^<]+)<\/title>/);
    assert.ok(m, "no se encontró <title>");
    assert.ok(m[1].length >= 15 && m[1].length <= 70, "title fuera de rango: " + m[1].length);
    assert.match(m[1], /2026/);
  });

  test("meta description cumple longitud (50-165)", () => {
    const m = guiaHtml.match(/<meta name="description" content="([^"]+)">/);
    assert.ok(m, "no se encontró meta description");
    assert.ok(m[1].length >= 50 && m[1].length <= 165, "description fuera de rango: " + m[1].length);
  });

  test("un único H1", () => {
    const h1s = guiaHtml.match(/<h1[^>]*>/g) || [];
    assert.equal(h1s.length, 1);
  });

  test("indexable: robots index,follow", () => {
    assert.ok(guiaHtml.includes('<meta name="robots" content="index, follow">'));
  });

  test("JSON-LD de tipo WebPage (patrón editorial, no WebApplication)", () => {
    assert.match(guiaHtml, /"@type":\s*"WebPage"/);
  });

  test("está incluida en sitemap.xml", () => {
    assert.ok(sitemapXml.includes("<loc>" + CANONICAL + "</loc>"), "falta en sitemap.xml");
  });

  test("está listada en /guias", () => {
    assert.ok(guiasIndexHtml.includes('href="' + CLEAN_URL + '"'), "falta el enlace en guias.html");
  });
});

describe("guía: no duplica manualmente la fórmula/constantes fiscales", () => {
  test("carga el motor real (lib/constants-2026.js y lib/tax-engine.js)", () => {
    assert.ok(guiaHtml.includes('src="/lib/constants-2026.js'));
    assert.ok(guiaHtml.includes('src="/lib/tax-engine.js'));
  });

  test("los ejemplos se calculan en runtime con TaxEngine.calcularSegSocialEmpresa/brutoToNeto, no con cifras ya escritas", () => {
    assert.ok(guiaHtml.includes("TaxEngine.calcularSegSocialEmpresa("), "debe invocar el motor real de coste de empresa");
    assert.ok(guiaHtml.includes("TaxEngine.brutoToNeto("), "debe invocar el motor real de neto del trabajador");
  });

  test("la tabla de tipos de cotización se rellena desde Constants2026.segSocial, no hay una tabla de porcentajes hardcodeada en el HTML estático", () => {
    assert.ok(guiaHtml.includes("Constants2026.segSocial.trabajador"));
    assert.ok(guiaHtml.includes("Constants2026.segSocial.empresa"));
    assert.ok(!/<td>\d+,\d\d ?%<\/td>/.test(guiaHtml), "no debería haber celdas de porcentaje ya escritas en el HTML de la guía");
  });

  test("las cifras narrativas (30.000 € de ejemplo) coinciden exactamente con lo que produce el motor real", () => {
    const atep = Constants2026.segSocial.atEpRangoOrientativo.oficinasAdministrativo;
    const normalizado = TaxEngine.normalizarInput({ brutoAnual: 30000, numPagas: 12, tipoContrato: "general" });
    const empresa = TaxEngine.calcularSegSocialEmpresa(normalizado, Constants2026, atep);
    const costeTotal = TaxEngine.round(30000 + empresa.anual);
    assert.equal(empresa.anual, 9645);
    assert.equal(costeTotal, 39645);
    const neto = TaxEngine.brutoToNeto({ brutoAnual: 30000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, Constants2026);
    assert.equal(neto.netoAnual, 23124);
  });
});

describe("enlazado interno bidireccional guía <-> calculadora de coste de empresa", () => {
  test("la guía enlaza varias veces a /coste-empresa", () => {
    const ocurrencias = (guiaHtml.match(/href="\/coste-empresa"/g) || []).length;
    assert.ok(ocurrencias >= 2, "la guía debe enlazar repetidamente a /coste-empresa, encontradas: " + ocurrencias);
  });

  test("la calculadora /coste-empresa enlaza de vuelta a la nueva guía", () => {
    assert.ok(calculadoraHtml.includes('href="' + CLEAN_URL + '"'), "la calculadora debe enlazar a la nueva guía");
  });

  test("la calculadora mantiene su objetivo transaccional: mismo H1, title y canonical de siempre", () => {
    assert.match(calculadoraHtml, /<title>Calculadora de Coste de Empresa de un Trabajador 2026 \| SueldoClaro<\/title>/);
    assert.match(calculadoraHtml, /<h1 class="hero-title">Calculadora del coste de un trabajador para la empresa<\/h1>/);
    assert.ok(calculadoraHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/coste-empresa">'));
  });
});

describe("guía: fuentes oficiales y metodología", () => {
  test("enlaza al BOE (Orden PJC/297/2026)", () => {
    assert.ok(guiaHtml.includes("https://www.boe.es/eli/es/o/2026/03/30/pjc297"));
  });

  test("enlaza a la Seguridad Social (bases de cotización 2026)", () => {
    assert.ok(guiaHtml.includes("https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/10721/10957/9932/4327"));
  });

  test("enlaza a /metodologia", () => {
    assert.ok(guiaHtml.includes('href="/metodologia"'));
  });
});

describe("guía: disclaimer y ausencia de reglas fiscales universales prohibidas", () => {
  test("incluye un disclaimer explícito de que no sustituye asesoramiento profesional", () => {
    assert.match(guiaHtml, /no sustituye[n]?|no constituye asesoramiento/i);
  });

  test("no presenta un porcentaje universal fijo como coste añadido exacto ('siempre', 'exactamente + X%')", () => {
    assert.ok(!/siempre\s+paga\s+un\s+\d/i.test(guiaHtml));
    assert.ok(!/cuesta\s+exactamente\s+su\s+salario/i.test(guiaHtml));
  });

  test("explica que el IRPF es una retención del trabajador y no un coste adicional para la empresa", () => {
    assert.match(guiaHtml, /IRPF.{0,400}(trabajador|remuneración)/is);
  });
});

describe("guía: sin placeholders ni enlaces vacíos", () => {
  test("no contiene 'Calculando', 'TODO', 'Lorem' ni href vacío/#", () => {
    assert.ok(!/Calculando(\.\.\.|…)/.test(guiaHtml));
    assert.ok(!/\bTODO\b/.test(guiaHtml));
    assert.ok(!/Lorem/i.test(guiaHtml));
    assert.ok(!/href="\s*"/.test(guiaHtml));
    assert.ok(!/href="#"/.test(guiaHtml));
  });

  test("todos los enlaces internos absolutos apuntan a archivos existentes", () => {
    const ROOT = path.join(__dirname, "..");
    const hrefs = [...guiaHtml.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      const clean = href.split("#")[0].split("?")[0];
      if (clean === "/" || clean === "") continue;
      const candidatos = [path.join(ROOT, clean + ".html"), path.join(ROOT, clean, "index.html"), path.join(ROOT, clean)];
      const existe = candidatos.some((c) => fs.existsSync(c));
      assert.ok(existe, "enlace interno roto: " + href);
    }
  });
});
