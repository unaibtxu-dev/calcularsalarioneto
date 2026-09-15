"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RenderTablaRetencion = require("../lib/render-tabla-retencion.js");
const ConstantsAlava2026 = require("../lib/constants-alava-2026.js");

const GUIA_PATH = path.join(__dirname, "..", "guias", "tabla-retenciones-irpf-alava-2026.html");
const CALCULADORA_PATH = path.join(__dirname, "..", "calculadora-sueldo-neto-alava.html");
const guiaHtml = fs.readFileSync(GUIA_PATH, "utf8");
const calculadoraHtml = fs.readFileSync(CALCULADORA_PATH, "utf8");

describe("tabla de retenciones renderizada: coincide exactamente con las constantes del motor", () => {
  test("el número de filas coincide con ConstantsAlava2026.tablaRetencion", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsAlava2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    const filas = html.match(/<tr>/g) || [];
    // +1 por la fila de cabecera <thead><tr>...
    assert.equal(filas.length, ConstantsAlava2026.tablaRetencion.length + 1);
  });

  test("no inventa tramos: cada porcentaje de la tabla renderizada procede literalmente de la constante", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsAlava2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    for (const tramo of ConstantsAlava2026.tablaRetencion) {
      for (const tipo of tramo.tipos) {
        assert.ok(html.includes(">" + tipo + " %<"), `falta el tipo ${tipo}% en el HTML renderizado`);
      }
    }
  });

  test("primera y última fila usan la etiqueta esperada (Hasta.../Más de...)", () => {
    // Intl.NumberFormat("es-ES", {style:"currency",...}) separa el importe
    // del símbolo € con un espacio de no separación (U+00A0), no un espacio
    // normal — igual que assets/js/format.js.
    const primera = ConstantsAlava2026.tablaRetencion[0];
    const ultima = ConstantsAlava2026.tablaRetencion[ConstantsAlava2026.tablaRetencion.length - 1];
    assert.equal(RenderTablaRetencion.etiquetaTramo(primera), "Hasta 20.000 €");
    assert.equal(RenderTablaRetencion.etiquetaTramo(ultima), "Más de 236.060 €");
  });
});

describe("guía /guias/tabla-retenciones-irpf-alava-2026: no mantiene una segunda tabla fiscal independiente", () => {
  test("la guía carga las constantes reales de Álava y el renderizador compartido, no una tabla escrita a mano", () => {
    assert.ok(guiaHtml.includes('src="/lib/constants-alava-2026.js'), "la guía debe cargar lib/constants-alava-2026.js");
    assert.ok(guiaHtml.includes('src="/lib/render-tabla-retencion.js'), "la guía debe cargar lib/render-tabla-retencion.js");
    assert.ok(
      guiaHtml.includes("RenderTablaRetencion.tablaRetencionHTML(ConstantsAlava2026.tablaRetencion"),
      "la guía debe renderizar la tabla a partir de ConstantsAlava2026.tablaRetencion, no de datos hardcodeados"
    );
  });

  test("la guía no contiene una tabla de porcentajes hardcodeada en el HTML estático", () => {
    // La única tabla debe ser el contenedor vacío que rellena JS en tiempo de
    // carga; no debe haber ya filas <td> con "%" escritas a mano en el body.
    assert.ok(!/<td>\d+ ?%<\/td>/.test(guiaHtml), "no debería haber celdas de porcentaje ya escritas en el HTML de la guía");
  });

  test("los ejemplos de retención se calculan con App.brutoToNetoAlava, no con cifras escritas a mano", () => {
    assert.ok(guiaHtml.includes("App.brutoToNetoAlava("), "los ejemplos deben usar el motor real (App.brutoToNetoAlava)");
  });
});

describe("enlazado interno bidireccional guía <-> calculadora", () => {
  const enlacesMinimos = ["/calculadora-sueldo-neto-alava", "/fiscalidad-foral", "/retencion-irpf-vs-renta", "/metodologia"];

  for (const href of enlacesMinimos) {
    test(`la guía enlaza a ${href}`, () => {
      assert.ok(guiaHtml.includes('href="' + href + '"'), `falta el enlace a ${href} en la guía`);
    });
  }

  test("la guía enlaza fuentes oficiales (Diputación Foral de Álava y BOTHA)", () => {
    assert.ok(guiaHtml.includes("https://web.araba.eus/es/hacienda/retenciones"));
    assert.ok(guiaHtml.includes("https://www.araba.eus/BOTHA/Boletines/2025/147/2025_147_03919_C.pdf"));
  });

  test("la calculadora de Álava enlaza de vuelta a la nueva guía", () => {
    assert.ok(
      calculadoraHtml.includes('href="/guias/tabla-retenciones-irpf-alava-2026"'),
      "la calculadora de Álava debe enlazar a la nueva guía"
    );
  });

  test("la calculadora de Álava mantiene su title y H1 originales (no se ha canibalizado su foco)", () => {
    assert.match(calculadoraHtml, /<title>Tabla de retenciones IRPF Álava 2026 \| Calculadora sueldo neto<\/title>/);
    assert.match(calculadoraHtml, /<h1 class="hero-title">Calculadora de sueldo neto en Álava<\/h1>/);
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
});
