"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RenderTablaRetencion = require("../lib/render-tabla-retencion.js");
const ConstantsAlava2026 = require("../lib/constants-alava-2026.js");
const ConstantsBizkaia2026 = require("../lib/constants-bizkaia-2026.js");
const ConstantsGipuzkoa2026 = require("../lib/constants-gipuzkoa-2026.js");

const GUIA_PATH = path.join(__dirname, "..", "guias", "tabla-retenciones-irpf-pais-vasco-2026.html");
const CALCULADORA_PATH = path.join(__dirname, "..", "calculadora-sueldo-neto-pais-vasco.html");
const guiaHtml = fs.readFileSync(GUIA_PATH, "utf8");
const calculadoraHtml = fs.readFileSync(CALCULADORA_PATH, "utf8");

describe("guía consolidada País Vasco: las tres tablas siguen siendo la misma tabla (si esto fallara, la guía mostraría una sola tabla incorrecta para alguno de los tres)", () => {
  test("Álava, Bizkaia y Gipuzkoa siguen teniendo exactamente la misma tablaRetencion", () => {
    assert.deepEqual(ConstantsAlava2026.tablaRetencion, ConstantsBizkaia2026.tablaRetencion);
    assert.deepEqual(ConstantsGipuzkoa2026.tablaRetencion, ConstantsBizkaia2026.tablaRetencion);
  });

  test("Álava, Bizkaia y Gipuzkoa siguen teniendo exactamente la misma minoración por discapacidad", () => {
    assert.deepEqual(ConstantsAlava2026.minoracionDiscapacidad, ConstantsBizkaia2026.minoracionDiscapacidad);
    assert.deepEqual(ConstantsGipuzkoa2026.minoracionDiscapacidad, ConstantsBizkaia2026.minoracionDiscapacidad);
  });

  test("la guía renderiza la tabla con ConstantsBizkaia2026 (el renderer usa una fuente real de constantes, no datos hardcodeados)", () => {
    assert.ok(
      guiaHtml.includes("RenderTablaRetencion.tablaRetencionHTML(ConstantsBizkaia2026.tablaRetencion"),
      "la guía debe renderizar la tabla a partir de una de las constantes reales del País Vasco"
    );
  });

  test("el número de filas de la tabla renderizada coincide con la de las tres constantes (siguen siendo la misma tabla)", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsBizkaia2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    const filas = html.match(/<tr>/g) || [];
    assert.equal(filas.length, ConstantsAlava2026.tablaRetencion.length + 1);
    assert.equal(filas.length, ConstantsGipuzkoa2026.tablaRetencion.length + 1);
  });

  test("no inventa tramos: cada porcentaje de la tabla renderizada procede literalmente de la constante", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsBizkaia2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    for (const tramo of ConstantsBizkaia2026.tablaRetencion) {
      for (const tipo of tramo.tipos) {
        assert.ok(html.includes(">" + tipo + " %<"), `falta el tipo ${tipo}% en el HTML renderizado`);
      }
    }
  });

  test("carga las tres constantes territoriales (Álava, Bizkaia, Gipuzkoa), no solo la que usa para renderizar la tabla principal", () => {
    assert.ok(guiaHtml.includes('src="/lib/constants-alava-2026.js'));
    assert.ok(guiaHtml.includes('src="/lib/constants-bizkaia-2026.js'));
    assert.ok(guiaHtml.includes('src="/lib/constants-gipuzkoa-2026.js'));
  });
});

describe("guía consolidada País Vasco: ejemplos calculados con el motor real", () => {
  test("los ejemplos de retención se calculan con App.brutoToNetoBizkaia, no con cifras escritas a mano", () => {
    assert.ok(guiaHtml.includes("App.brutoToNetoBizkaia("), "los ejemplos deben usar el motor real (App.brutoToNetoBizkaia)");
  });

  test("no hay una tabla de ejemplos por territorio (un único contenedor de ejemplos, no uno por territorio)", () => {
    const contenedoresEjemplos = guiaHtml.match(/id="ejemplos-[a-z-]+"/g) || [];
    assert.equal(contenedoresEjemplos.length, 1, "debe existir un único contenedor de ejemplos, no uno por territorio");
  });

  test("ya no duplica la tabla comparativa común/Álava/Bizkaia/Gipuzkoa de la calculadora (vive solo en /calculadora-sueldo-neto-pais-vasco)", () => {
    assert.ok(!guiaHtml.includes('id="comparativa-tabla-body"'), "la guía no debe recalcular la tabla comparativa que ya muestra la calculadora");
    assert.ok(
      guiaHtml.includes("Para comparar cuánto cambia el sueldo neto frente al régimen común"),
      "debe indicar al lector que use la calculadora para esa comparación"
    );
  });
});

describe("guía consolidada País Vasco: contenido único, no tres miniartículos pegados", () => {
  test("no repite tres veces la explicación de por qué se calcula distinto (una sola sección conceptual)", () => {
    const ocurrencias = (guiaHtml.match(/tienen la misma tabla/gi) || []).length;
    assert.ok(ocurrencias <= 2, "la explicación central no debería repetirse más de una vez en H2 y FAQ");
  });

  test("explica que la coincidencia de tabla no implica el mismo sistema fiscal en todos los aspectos", () => {
    assert.match(guiaHtml, /no significa que los tres territorios tengan el mismo sistema fiscal en todos los aspectos/i);
  });

  test("menciona las tres normas forales por separado (Álava, Bizkaia y Gipuzkoa no comparten legislador)", () => {
    assert.match(guiaHtml, /Decreto Foral 42\/2025/);
    assert.match(guiaHtml, /Decreto Foral 134\/2025/);
    assert.match(guiaHtml, /Norma Foral 3\/2014/);
  });

  test("máximo 4 preguntas en el FAQ, ninguna específica de un solo territorio", () => {
    const preguntas = Array.from(guiaHtml.matchAll(/<summary>([^<]+)</g)).map((m) => m[1]);
    assert.ok(preguntas.length <= 4, "no debe haber más de 4 preguntas frecuentes");
    for (const p of preguntas) {
      assert.ok(!/\b(Álava|Bizkaia|Gipuzkoa)\b/.test(p) || /Álava, Bizkaia y Gipuzkoa/.test(p), `pregunta específica de un territorio: ${p}`);
    }
  });
});

describe("guía consolidada País Vasco: enlazado", () => {
  const enlacesMinimos = [
    "/calculadora-sueldo-neto-pais-vasco",
    "/guias/tabla-retenciones-irpf-navarra-2026",
    "/calculadora-sueldo-neto-navarra",
    "/retencion-irpf-vs-renta",
    "/metodologia"
  ];

  for (const href of enlacesMinimos) {
    test(`la guía enlaza a ${href}`, () => {
      assert.ok(guiaHtml.includes('href="' + href + '"'), `falta el enlace a ${href} en la guía`);
    });
  }

  test("la guía enlaza fuentes oficiales de los tres territorios (Álava, Bizkaia, Gipuzkoa)", () => {
    assert.ok(guiaHtml.includes("https://web.araba.eus/es/hacienda/retenciones"));
    assert.ok(guiaHtml.includes("https://www.araba.eus/BOTHA/Boletines/2025/147/2025_147_03919_C.pdf"));
    assert.ok(guiaHtml.includes("https://www.bizkaia.eus/es/normativa-tributaria/retenciones-de-trabajo"));
    assert.ok(guiaHtml.includes("https://www.bizkaia.eus/documents/880307/15229563/ca_47_2014.pdf"));
    assert.ok(guiaHtml.includes("https://www.gipuzkoa.eus/es/web/ogasuna/impuestos/retenciones/tabla-retenciones-rendimientos-trabajo-2026"));
    assert.ok(guiaHtml.includes("https://www.gipuzkoa.eus/es/web/ogasuna/impuestos/retenciones/retenciones-aplicables-trabajadores-activos-discapacitados-2026"));
  });

  test("no enlaza a ninguna de las tres URLs antiguas de guía por territorio", () => {
    assert.ok(!guiaHtml.includes("/guias/tabla-retenciones-irpf-alava-2026"));
    assert.ok(!guiaHtml.includes("/guias/tabla-retenciones-irpf-bizkaia-2026"));
    assert.ok(!guiaHtml.includes("/guias/tabla-retenciones-irpf-gipuzkoa-2026"));
  });

  test("la calculadora consolidada enlaza de vuelta a la nueva guía", () => {
    assert.ok(
      calculadoraHtml.includes('href="/guias/tabla-retenciones-irpf-pais-vasco-2026"'),
      "la calculadora de País Vasco debe enlazar a la guía consolidada"
    );
    assert.ok(!calculadoraHtml.includes("/guias/tabla-retenciones-irpf-alava-2026"));
    assert.ok(!calculadoraHtml.includes("/guias/tabla-retenciones-irpf-bizkaia-2026"));
    assert.ok(!calculadoraHtml.includes("/guias/tabla-retenciones-irpf-gipuzkoa-2026"));
  });
});

describe("guía consolidada País Vasco: SEO básico", () => {
  test("title, meta description y canonical", () => {
    assert.match(guiaHtml, /<title>Tabla de retenciones IRPF País Vasco 2026 \| SueldoClaro<\/title>/);
    const meta = guiaHtml.match(/<meta name="description" content="([^"]+)">/);
    assert.ok(meta);
    assert.match(meta[1], /Álava/);
    assert.match(meta[1], /Bizkaia/);
    assert.match(meta[1], /Gipuzkoa/);
    assert.ok(calculadoraHtml || true);
    assert.ok(guiaHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-pais-vasco-2026">'));
  });

  test("un único H1 con el texto orientativo pedido", () => {
    const h1s = guiaHtml.match(/<h1[^>]*>/g) || [];
    assert.equal(h1s.length, 1);
    assert.match(guiaHtml, /<h1 class="hero-title">Tabla de retenciones IRPF del País Vasco 2026: Álava, Bizkaia y Gipuzkoa<\/h1>/);
  });

  test("JSON-LD es WebPage (sin FAQPage, igual que el resto de guías forales)", () => {
    const bloques = Array.from(guiaHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g));
    assert.equal(bloques.length, 1);
    const data = JSON.parse(bloques[0][1]);
    assert.equal(data["@type"], "WebPage");
  });

  test("sin placeholders ni enlaces vacíos", () => {
    assert.ok(!/Calculando(\.\.\.|…)/.test(guiaHtml));
    assert.ok(!/\bTODO\b/.test(guiaHtml));
    assert.ok(!/Lorem/i.test(guiaHtml));
    assert.ok(!/href="\s*"/.test(guiaHtml));
    assert.ok(!/href="#"/.test(guiaHtml));
  });
});
