"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RenderTablaRetencion = require("../lib/render-tabla-retencion.js");
const ConstantsGipuzkoa2026 = require("../lib/constants-gipuzkoa-2026.js");
const TaxEngine = require("../lib/tax-engine.js");
const Constants2026 = require("../lib/constants-2026.js");
const TaxEngineBizkaia = require("../lib/tax-engine-bizkaia.js");

const GUIA_PATH = path.join(__dirname, "..", "guias", "tabla-retenciones-irpf-gipuzkoa-2026.html");
const CALCULADORA_PATH = path.join(__dirname, "..", "calculadora-sueldo-neto-gipuzkoa.html");
const guiaHtml = fs.readFileSync(GUIA_PATH, "utf8");
const calculadoraHtml = fs.readFileSync(CALCULADORA_PATH, "utf8");

// Replica exacta de App.brutoToNetoGipuzkoa (assets/js/components.js), que no
// es requireable en Node por ser un script de navegador — se usa aquí solo
// para verificar independientemente los números que la propia guía calcula
// en el navegador con la misma función real.
function brutoToNetoGipuzkoa(datos) {
  const ss = TaxEngine.calcularSegSocialTrabajador(
    TaxEngine.normalizarInput({ brutoAnual: datos.salario, numPagas: datos.numPagas, tipoContrato: datos.tipoContrato }),
    Constants2026
  );
  const gipuzkoa = TaxEngineBizkaia.calcularTipoRetencion(
    { retribucionFija: datos.salario, retribucionVariablePrevisible: 0, numDescendientes: datos.numHijos, discapacidad: datos.discapacidadPropia },
    ConstantsGipuzkoa2026
  );
  const brutoAnual = TaxEngine.round(datos.salario);
  const retencionAnual = TaxEngine.round(datos.salario * (gipuzkoa.tipoRetencion / 100));
  const netoAnual = TaxEngine.round(datos.salario - ss.anual - retencionAnual);
  return { brutoAnual, segSocial: ss, irpf: { tipoRetencion: gipuzkoa.tipoRetencion, retencionAnual }, netoAnual };
}

describe("tabla de retenciones renderizada: coincide exactamente con las constantes del motor", () => {
  test("el número de filas coincide con ConstantsGipuzkoa2026.tablaRetencion", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsGipuzkoa2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    const filas = html.match(/<tr>/g) || [];
    assert.equal(filas.length, ConstantsGipuzkoa2026.tablaRetencion.length + 1);
  });

  test("no inventa tramos: cada porcentaje de la tabla renderizada procede literalmente de la constante", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsGipuzkoa2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    for (const tramo of ConstantsGipuzkoa2026.tablaRetencion) {
      for (const tipo of tramo.tipos) {
        assert.ok(html.includes(">" + tipo + " %<"), `falta el tipo ${tipo}% en el HTML renderizado`);
      }
    }
  });

  test("primera y última fila usan la etiqueta esperada (Hasta.../Más de...)", () => {
    const primera = ConstantsGipuzkoa2026.tablaRetencion[0];
    const ultima = ConstantsGipuzkoa2026.tablaRetencion[ConstantsGipuzkoa2026.tablaRetencion.length - 1];
    assert.equal(RenderTablaRetencion.etiquetaTramo(primera), "Hasta 20.000 €");
    assert.equal(RenderTablaRetencion.etiquetaTramo(ultima), "Más de 236.060 €");
  });
});

describe("guía /guias/tabla-retenciones-irpf-gipuzkoa-2026: no mantiene una segunda tabla fiscal independiente", () => {
  test("la guía carga las constantes reales de Gipuzkoa y el renderizador compartido, no una tabla escrita a mano", () => {
    assert.ok(guiaHtml.includes('src="/lib/constants-gipuzkoa-2026.js'), "la guía debe cargar lib/constants-gipuzkoa-2026.js");
    assert.ok(guiaHtml.includes('src="/lib/render-tabla-retencion.js'), "la guía debe cargar lib/render-tabla-retencion.js");
    assert.ok(
      guiaHtml.includes("RenderTablaRetencion.tablaRetencionHTML(ConstantsGipuzkoa2026.tablaRetencion"),
      "la guía debe renderizar la tabla a partir de ConstantsGipuzkoa2026.tablaRetencion, no de datos hardcodeados"
    );
  });

  test("la guía no contiene una tabla de porcentajes hardcodeada en el HTML estático", () => {
    assert.ok(!/<td>\d+ ?%<\/td>/.test(guiaHtml), "no debería haber celdas de porcentaje ya escritas en el HTML de la guía");
  });

  test("los ejemplos y la comparativa se calculan con el motor real (App.brutoToNetoGipuzkoa / TaxEngine.brutoToNeto), no con cifras escritas a mano", () => {
    assert.ok(guiaHtml.includes("App.brutoToNetoGipuzkoa("), "los ejemplos deben usar el motor real (App.brutoToNetoGipuzkoa)");
    assert.ok(guiaHtml.includes("TaxEngine.brutoToNeto("), "la comparativa con el régimen común debe usar el motor real (TaxEngine.brutoToNeto)");
  });

  test("el script usa exactamente los salarios 25k/30k/35k/40k, los mismos que produce el motor real sin errores", () => {
    assert.match(guiaHtml, /var SALARIOS_EJEMPLO = \[25000, 30000, 35000, 40000\];/);
    const supuestos = { numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" };
    for (const salario of [25000, 30000, 35000, 40000]) {
      const r = brutoToNetoGipuzkoa(Object.assign({ salario }, supuestos));
      assert.ok(Number.isFinite(r.irpf.tipoRetencion) && r.irpf.tipoRetencion >= 0);
      assert.ok(Number.isFinite(r.netoAnual) && r.netoAnual > 0 && r.netoAnual < salario);
    }
  });

  test("el ejemplo de 30.000 € coincide exactamente con el motor (Gipuzkoa 15% / común 16,42%)", () => {
    const gipuzkoa = brutoToNetoGipuzkoa({ salario: 30000, numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" });
    const comun = TaxEngine.brutoToNeto({ brutoAnual: 30000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, Constants2026);
    assert.equal(gipuzkoa.irpf.tipoRetencion, 15);
    assert.equal(comun.irpf.tipoRetencion, 16.42);
    assert.equal(gipuzkoa.netoAnual, 23550);
    assert.equal(comun.netoAnual, 23124);
  });
});

describe("guía: no confunde retención con IRPF final, ni presenta reglas universales", () => {
  test("distingue explícitamente retención de nómina y declaración de la renta", () => {
    assert.match(guiaHtml, /pago a cuenta/i);
    assert.match(guiaHtml, /declaración de la renta/i);
  });

  test("no afirma que en Gipuzkoa 'se pagan menos impuestos' de forma genérica", () => {
    assert.ok(!/en gipuzkoa se pagan? menos impuestos/i.test(guiaHtml));
  });

  test("la comparación con el régimen común indica el supuesto exacto usado", () => {
    assert.match(guiaHtml, /30\.000\s*€/);
    assert.match(guiaHtml, /sin hijos/i);
    assert.match(guiaHtml, /único supuesto concreto/i);
  });
});

describe("enlazado interno bidireccional guía <-> calculadora de Gipuzkoa", () => {
  const enlacesMinimos = ["/calculadora-sueldo-neto-gipuzkoa", "/retencion-irpf-vs-renta", "/fiscalidad-foral", "/metodologia"];

  for (const href of enlacesMinimos) {
    test(`la guía enlaza a ${href}`, () => {
      assert.ok(guiaHtml.includes('href="' + href + '"'), `falta el enlace a ${href} en la guía`);
    });
  }

  test("la guía enlaza fuentes oficiales de Gipuzkoa (Hacienda Foral)", () => {
    assert.ok(guiaHtml.includes("https://www.gipuzkoa.eus/es/web/ogasuna/impuestos/retenciones/tabla-retenciones-rendimientos-trabajo-2026"));
    assert.ok(guiaHtml.includes("https://www.gipuzkoa.eus/es/web/ogasuna/impuestos/retenciones/retenciones-aplicables-trabajadores-activos-discapacitados-2026"));
  });

  test("la calculadora de Gipuzkoa enlaza de vuelta a la nueva guía", () => {
    assert.ok(
      calculadoraHtml.includes('href="/guias/tabla-retenciones-irpf-gipuzkoa-2026"'),
      "la calculadora de Gipuzkoa debe enlazar a la nueva guía"
    );
  });

  test("la calculadora de Gipuzkoa mantiene su H1, title y canonical (no se ha canibalizado su contenido)", () => {
    assert.match(calculadoraHtml, /<title>Calculadora de Sueldo Neto Gipuzkoa 2026 \| SueldoClaro<\/title>/);
    assert.match(calculadoraHtml, /<h1 class="hero-title">Calculadora de sueldo neto en Gipuzkoa<\/h1>/);
    assert.ok(calculadoraHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/calculadora-sueldo-neto-gipuzkoa">'));
  });
});

describe("guía: SEO básico", () => {
  test("title, meta description y canonical", () => {
    assert.match(guiaHtml, /<title>Tabla de retenciones IRPF de Gipuzkoa 2026 \| SueldoClaro<\/title>/);
    const meta = guiaHtml.match(/<meta name="description" content="([^"]+)">/);
    assert.ok(meta && meta[1].length >= 50 && meta[1].length <= 165);
    assert.ok(guiaHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-gipuzkoa-2026">'));
  });

  test("un único H1 con el texto pedido", () => {
    const h1s = guiaHtml.match(/<h1[^>]*>([^<]*)<\/h1>/g) || [];
    assert.equal(h1s.length, 1);
    assert.match(guiaHtml, /<h1 class="hero-title">Tabla de retenciones IRPF de Gipuzkoa 2026<\/h1>/);
  });

  test("indexable y JSON-LD WebPage (sin FAQPage inventado)", () => {
    assert.ok(guiaHtml.includes('<meta name="robots" content="index, follow">'));
    const bloques = Array.from(guiaHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g));
    assert.equal(bloques.length, 1);
    assert.equal(JSON.parse(bloques[0][1])["@type"], "WebPage");
  });

  test("está en sitemap.xml", () => {
    const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes("<loc>https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-gipuzkoa-2026</loc>"));
  });

  test("AdSense presente, sin tocar", () => {
    assert.ok(guiaHtml.includes('src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4073412446458032"'));
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

  test("no inventa autores, credenciales ni validaciones oficiales inexistentes", () => {
    assert.ok(!/validad[oa] por (la )?hacienda/i.test(guiaHtml));
    assert.ok(!/aprobado por hacienda/i.test(guiaHtml));
    assert.ok(!/certificad[oa]/i.test(guiaHtml));
  });
});

describe("/guias: tarjeta de Gipuzkoa presente en Fiscalidad foral, con imagen propia", () => {
  const guiasHtml = fs.readFileSync(path.join(__dirname, "..", "guias.html"), "utf8");

  test("existe la tarjeta de Gipuzkoa con la categoría correcta y su imagen optimizada", () => {
    assert.match(
      guiasHtml,
      /<article class="guia-card" data-categoria="Fiscalidad foral">\s*<div class="guia-card-media">\s*<img src="\/assets\/img\/guias\/tabla-retenciones-irpf-gipuzkoa-2026\.webp" alt="[^"]+" width="720" height="405" loading="lazy">\s*<\/div>\s*<div class="guia-card-body">\s*<span class="guia-card-categoria">Fiscalidad foral<\/span>\s*<h2 class="guia-card-title"><a class="guia-card-link" href="\/guias\/tabla-retenciones-irpf-gipuzkoa-2026">/
    );
  });

  test("la imagen optimizada existe en assets/img/guias, junto al PNG original conservado", () => {
    const dir = path.join(__dirname, "..", "assets", "img", "guias");
    assert.ok(fs.existsSync(path.join(dir, "tabla-retenciones-irpf-gipuzkoa-2026.webp")), "falta el .webp de Gipuzkoa");
    assert.ok(fs.existsSync(path.join(dir, "tabla-retenciones-irpf-gipuzkoa-2026.png")), "falta conservar el .png original de Gipuzkoa");
  });

  test("la tarjeta de Gipuzkoa ya no usa el tratamiento neutro sin imagen", () => {
    const inicio = guiasHtml.indexOf('href="/guias/tabla-retenciones-irpf-gipuzkoa-2026"');
    const bloqueAnterior = guiasHtml.slice(Math.max(0, inicio - 400), inicio);
    assert.ok(!bloqueAnterior.includes("sin-imagen"), "la tarjeta de Gipuzkoa ya no debería usar el tratamiento sin-imagen");
  });
});
