"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RenderTablaRetencion = require("../lib/render-tabla-retencion.js");
const ConstantsNavarra2026 = require("../lib/constants-navarra-2026.js");
const TaxEngine = require("../lib/tax-engine.js");
const Constants2026 = require("../lib/constants-2026.js");
const TaxEngineNavarra = require("../lib/tax-engine-navarra.js");

const GUIA_PATH = path.join(__dirname, "..", "guias", "tabla-retenciones-irpf-navarra-2026.html");
const CALCULADORA_PATH = path.join(__dirname, "..", "calculadora-sueldo-neto-navarra.html");
const guiaHtml = fs.readFileSync(GUIA_PATH, "utf8");
const calculadoraHtml = fs.readFileSync(CALCULADORA_PATH, "utf8");

// Replica exacta de App.brutoToNetoNavarra (assets/js/components.js), que no
// es requireable en Node por ser un script de navegador — se usa aquí solo
// para verificar independientemente los números que la propia guía calcula
// en el navegador con la misma función real.
function brutoToNetoNavarra(datos) {
  const ss = TaxEngine.calcularSegSocialTrabajador(
    TaxEngine.normalizarInput({ brutoAnual: datos.salario, numPagas: datos.numPagas, tipoContrato: datos.tipoContrato }),
    Constants2026
  );
  const navarra = TaxEngineNavarra.calcularTipoRetencion(
    { retribucionFija: datos.salario, retribucionVariablePrevisible: 0, numDescendientes: datos.numHijos, discapacidad: datos.discapacidadPropia },
    ConstantsNavarra2026
  );
  const brutoAnual = TaxEngine.round(datos.salario);
  const retencionAnual = TaxEngine.round(datos.salario * (navarra.tipoRetencion / 100));
  const netoAnual = TaxEngine.round(datos.salario - ss.anual - retencionAnual);
  return { brutoAnual, segSocial: ss, irpf: { tipoRetencion: navarra.tipoRetencion, retencionAnual }, netoAnual };
}

describe("filasDesdeUmbralesExclusivos: convierte la tabla de Navarra sin inventar datos", () => {
  const filas = RenderTablaRetencion.filasDesdeUmbralesExclusivos(ConstantsNavarra2026.tablaRetencion);

  test("añade exactamente una fila más (la implícita 'hasta el primer umbral, 0%')", () => {
    assert.equal(filas.length, ConstantsNavarra2026.tablaRetencion.length + 1);
  });

  test("la fila implícita es 0% en todas las columnas y termina en el primer umbral real", () => {
    assert.equal(filas[0].desde, 0);
    assert.equal(filas[0].hasta, ConstantsNavarra2026.tablaRetencion[0].thresholdExclusive);
    assert.ok(filas[0].tipos.every((t) => t === 0));
  });

  test("cada fila real conserva exactamente los mismos tipos que la constante, sin redondear ni inventar", () => {
    for (let i = 0; i < ConstantsNavarra2026.tablaRetencion.length; i++) {
      assert.deepEqual(filas[i + 1].tipos, ConstantsNavarra2026.tablaRetencion[i].tipos);
    }
  });

  test("la última fila queda abierta ('Más de ...'), igual que en el motor (tax-engine-navarra.js)", () => {
    const ultima = filas[filas.length - 1];
    assert.equal(ultima.hasta, Infinity);
    assert.match(RenderTablaRetencion.etiquetaTramo(ultima), /^Más de /);
  });
});

describe("guía /guias/tabla-retenciones-irpf-navarra-2026: no mantiene una segunda tabla fiscal independiente", () => {
  test("la guía carga las constantes reales de Navarra y el renderizador compartido, no una tabla escrita a mano", () => {
    assert.ok(guiaHtml.includes('src="/lib/constants-navarra-2026.js'), "la guía debe cargar lib/constants-navarra-2026.js");
    assert.ok(guiaHtml.includes('src="/lib/render-tabla-retencion.js'), "la guía debe cargar lib/render-tabla-retencion.js");
    assert.ok(
      guiaHtml.includes("RenderTablaRetencion.filasDesdeUmbralesExclusivos(ConstantsNavarra2026.tablaRetencion)"),
      "la guía debe renderizar la tabla a partir de ConstantsNavarra2026.tablaRetencion, no de datos hardcodeados"
    );
  });

  test("la guía no contiene una tabla de porcentajes hardcodeada en el HTML estático", () => {
    assert.ok(!/<td>\d+([.,]\d+)? ?%<\/td>/.test(guiaHtml), "no debería haber celdas de porcentaje ya escritas en el HTML de la guía");
  });

  test("los ejemplos y la comparativa se calculan con el motor real (App.brutoToNetoNavarra / TaxEngine.brutoToNeto), no con cifras escritas a mano", () => {
    assert.ok(guiaHtml.includes("App.brutoToNetoNavarra("), "los ejemplos deben usar el motor real (App.brutoToNetoNavarra)");
    assert.ok(guiaHtml.includes("TaxEngine.brutoToNeto("), "la comparativa con el régimen común debe usar el motor real (TaxEngine.brutoToNeto)");
  });

  test("el script usa exactamente los salarios 25k/30k/35k/40k, los mismos que produce el motor real sin errores", () => {
    // El HTML servido no contiene los porcentajes literales: se inyectan en
    // tiempo de ejecución en el navegador (igual que en la guía de Álava).
    // Aquí se verifica que el array de salarios que usa el script es el
    // esperado y que el motor real no falla para ninguno de ellos.
    assert.match(guiaHtml, /var SALARIOS_EJEMPLO = \[25000, 30000, 35000, 40000\];/);
    const supuestos = { numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" };
    for (const salario of [25000, 30000, 35000, 40000]) {
      const r = brutoToNetoNavarra(Object.assign({ salario }, supuestos));
      assert.ok(Number.isFinite(r.irpf.tipoRetencion) && r.irpf.tipoRetencion >= 0);
      assert.ok(Number.isFinite(r.netoAnual) && r.netoAnual > 0 && r.netoAnual < salario);
    }
  });

  test("el ejemplo de 30.000 € coincide exactamente con el motor (Navarra 14,6% / común 16,42%)", () => {
    const navarra = brutoToNetoNavarra({ salario: 30000, numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" });
    const comun = TaxEngine.brutoToNeto({ brutoAnual: 30000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, Constants2026);
    assert.equal(navarra.irpf.tipoRetencion, 14.6);
    assert.equal(comun.irpf.tipoRetencion, 16.42);
    assert.equal(navarra.netoAnual, 23670);
    assert.equal(comun.netoAnual, 23124);
  });
});

describe("guía: no confunde retención con IRPF final, ni presenta reglas universales", () => {
  test("distingue explícitamente retención de nómina y declaración de la renta", () => {
    assert.match(guiaHtml, /pago a cuenta/i);
    assert.match(guiaHtml, /declaración de la renta/i);
  });

  test("no afirma que en Navarra 'se pagan menos impuestos' de forma genérica", () => {
    assert.ok(!/en navarra se pagan? menos impuestos/i.test(guiaHtml));
  });

  test("la comparación con el régimen común indica el supuesto exacto usado", () => {
    assert.match(guiaHtml, /30\.000\s*€/);
    assert.match(guiaHtml, /sin hijos/i);
    assert.match(guiaHtml, /único supuesto concreto/i);
  });
});

describe("enlazado interno bidireccional guía <-> calculadora de Navarra", () => {
  const enlacesMinimos = ["/calculadora-sueldo-neto-navarra", "/retencion-irpf-vs-renta", "/metodologia"];

  for (const href of enlacesMinimos) {
    test(`la guía enlaza a ${href}`, () => {
      assert.ok(guiaHtml.includes('href="' + href + '"'), `falta el enlace a ${href} en la guía`);
    });
  }

  test("la guía enlaza fuentes oficiales de Navarra (Hacienda Foral, modificaciones tributarias y LexNavarra)", () => {
    assert.ok(guiaHtml.includes("https://hacienda.navarra.es/CalculoRetencion/Inicio.aspx"));
    assert.ok(guiaHtml.includes("https://www.navarra.es/NR/rdonlyres/14E42A9F-ED01-4147-8C76-EBCF257CC797/0/Modificacionestributariaspara20263.pdf"));
    assert.ok(guiaHtml.includes("https://www.lexnavarra.navarra.es/detalle.asp?r=10615"));
  });

  test("la calculadora de Navarra enlaza de vuelta a la nueva guía", () => {
    assert.ok(
      calculadoraHtml.includes('href="/guias/tabla-retenciones-irpf-navarra-2026"'),
      "la calculadora de Navarra debe enlazar a la nueva guía"
    );
  });

  test("la calculadora de Navarra mantiene su H1, title y canonical (no se ha canibalizado su contenido)", () => {
    assert.match(calculadoraHtml, /<title>Calculadora de Sueldo Neto Navarra 2026 \| SueldoClaro<\/title>/);
    assert.match(calculadoraHtml, /<h1 class="hero-title">Calculadora de sueldo neto en Navarra<\/h1>/);
    assert.ok(calculadoraHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/calculadora-sueldo-neto-navarra">'));
  });
});

describe("guía: SEO básico", () => {
  test("title, meta description y canonical", () => {
    assert.match(guiaHtml, /<title>Tabla de retenciones IRPF de Navarra 2026 \| SueldoClaro<\/title>/);
    const meta = guiaHtml.match(/<meta name="description" content="([^"]+)">/);
    assert.ok(meta && meta[1].length >= 50 && meta[1].length <= 165);
    assert.ok(guiaHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-navarra-2026">'));
  });

  test("un único H1 con el texto pedido", () => {
    const h1s = guiaHtml.match(/<h1[^>]*>([^<]*)<\/h1>/g) || [];
    assert.equal(h1s.length, 1);
    assert.match(guiaHtml, /<h1 class="hero-title">Tabla de retenciones IRPF de Navarra 2026<\/h1>/);
  });

  test("indexable y JSON-LD WebPage (sin FAQPage inventado)", () => {
    assert.ok(guiaHtml.includes('<meta name="robots" content="index, follow">'));
    const bloques = Array.from(guiaHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g));
    assert.equal(bloques.length, 1);
    assert.equal(JSON.parse(bloques[0][1])["@type"], "WebPage");
  });

  test("está en sitemap.xml", () => {
    const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes("<loc>https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-navarra-2026</loc>"));
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
