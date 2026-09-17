"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RenderTablaRetencion = require("../lib/render-tabla-retencion.js");
const ConstantsBizkaia2026 = require("../lib/constants-bizkaia-2026.js");
const TaxEngine = require("../lib/tax-engine.js");
const Constants2026 = require("../lib/constants-2026.js");
const TaxEngineBizkaia = require("../lib/tax-engine-bizkaia.js");

const GUIA_PATH = path.join(__dirname, "..", "guias", "tabla-retenciones-irpf-bizkaia-2026.html");
const CALCULADORA_PATH = path.join(__dirname, "..", "calculadora-sueldo-neto-bizkaia.html");
const guiaHtml = fs.readFileSync(GUIA_PATH, "utf8");
const calculadoraHtml = fs.readFileSync(CALCULADORA_PATH, "utf8");

// Replica exacta de App.brutoToNetoBizkaia (assets/js/components.js), que no
// es requireable en Node por ser un script de navegador — se usa aquí solo
// para verificar independientemente los números que la propia guía calcula
// en el navegador con la misma función real.
function brutoToNetoBizkaia(datos) {
  const ss = TaxEngine.calcularSegSocialTrabajador(
    TaxEngine.normalizarInput({ brutoAnual: datos.salario, numPagas: datos.numPagas, tipoContrato: datos.tipoContrato }),
    Constants2026
  );
  const bizkaia = TaxEngineBizkaia.calcularTipoRetencion(
    { retribucionFija: datos.salario, retribucionVariablePrevisible: 0, numDescendientes: datos.numHijos, discapacidad: datos.discapacidadPropia },
    ConstantsBizkaia2026
  );
  const brutoAnual = TaxEngine.round(datos.salario);
  const retencionAnual = TaxEngine.round(datos.salario * (bizkaia.tipoRetencion / 100));
  const netoAnual = TaxEngine.round(datos.salario - ss.anual - retencionAnual);
  return {
    brutoAnual,
    segSocial: ss,
    irpf: { tipoRetencion: bizkaia.tipoRetencion, retencionAnual },
    netoAnual,
    netoPorPaga: TaxEngine.round(netoAnual / datos.numPagas)
  };
}

describe("tabla de retenciones renderizada: coincide exactamente con las constantes del motor", () => {
  test("el número de filas coincide con ConstantsBizkaia2026.tablaRetencion", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsBizkaia2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    const filas = html.match(/<tr>/g) || [];
    assert.equal(filas.length, ConstantsBizkaia2026.tablaRetencion.length + 1);
  });

  test("no inventa tramos: cada porcentaje de la tabla renderizada procede literalmente de la constante", () => {
    const html = RenderTablaRetencion.tablaRetencionHTML(ConstantsBizkaia2026.tablaRetencion, ["0", "1", "2", "3", "4", "5", "6 o más"]);
    for (const tramo of ConstantsBizkaia2026.tablaRetencion) {
      for (const tipo of tramo.tipos) {
        assert.ok(html.includes(">" + tipo + " %<"), `falta el tipo ${tipo}% en el HTML renderizado`);
      }
    }
  });

  test("primera y última fila usan la etiqueta esperada (Hasta.../Más de...)", () => {
    const primera = ConstantsBizkaia2026.tablaRetencion[0];
    const ultima = ConstantsBizkaia2026.tablaRetencion[ConstantsBizkaia2026.tablaRetencion.length - 1];
    assert.equal(RenderTablaRetencion.etiquetaTramo(primera), "Hasta 20.000 €");
    assert.equal(RenderTablaRetencion.etiquetaTramo(ultima), "Más de 236.060 €");
  });

  test("la tabla de Bizkaia tiene 35 tramos, tal como consta en la auditoría previa", () => {
    assert.equal(ConstantsBizkaia2026.tablaRetencion.length, 35);
  });
});

describe("guía /guias/tabla-retenciones-irpf-bizkaia-2026: no mantiene una segunda tabla fiscal independiente", () => {
  test("la guía carga las constantes reales de Bizkaia y el renderizador compartido, no una tabla escrita a mano", () => {
    assert.ok(guiaHtml.includes('src="/lib/constants-bizkaia-2026.js'), "la guía debe cargar lib/constants-bizkaia-2026.js");
    assert.ok(guiaHtml.includes('src="/lib/render-tabla-retencion.js'), "la guía debe cargar lib/render-tabla-retencion.js");
    assert.ok(
      guiaHtml.includes("RenderTablaRetencion.tablaRetencionHTML(ConstantsBizkaia2026.tablaRetencion"),
      "la guía debe renderizar la tabla a partir de ConstantsBizkaia2026.tablaRetencion, no de datos hardcodeados"
    );
  });

  test("la guía no contiene una tabla de porcentajes hardcodeada en el HTML estático", () => {
    assert.ok(!/<td>\d+ ?%<\/td>/.test(guiaHtml), "no debería haber celdas de porcentaje ya escritas en el HTML de la guía");
  });

  test("los ejemplos y la comparativa se calculan con el motor real (App.brutoToNetoBizkaia / TaxEngine.brutoToNeto), no con cifras escritas a mano", () => {
    assert.ok(guiaHtml.includes("App.brutoToNetoBizkaia("), "los ejemplos deben usar el motor real (App.brutoToNetoBizkaia)");
    assert.ok(guiaHtml.includes("TaxEngine.brutoToNeto("), "la comparativa con el régimen común debe usar el motor real (TaxEngine.brutoToNeto)");
  });

  test("el script usa exactamente los salarios 25k/30k/35k/40k, los mismos que produce el motor real sin errores", () => {
    assert.match(guiaHtml, /var SALARIOS_EJEMPLO = \[25000, 30000, 35000, 40000\];/);
    const supuestos = { numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" };
    for (const salario of [25000, 30000, 35000, 40000]) {
      const r = brutoToNetoBizkaia(Object.assign({ salario }, supuestos));
      assert.ok(Number.isFinite(r.irpf.tipoRetencion) && r.irpf.tipoRetencion >= 0);
      assert.ok(Number.isFinite(r.netoAnual) && r.netoAnual > 0 && r.netoAnual < salario);
    }
  });

  test("los cuatro ejemplos coinciden exactamente con los valores auditados previamente", () => {
    const supuestos = { numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" };
    const esperado = {
      25000: { tipo: 12, retencion: 3000, ss: 1625, neto: 20375, netoPaga: 1697.92 },
      30000: { tipo: 15, retencion: 4500, ss: 1950, neto: 23550, netoPaga: 1962.5 },
      35000: { tipo: 16, retencion: 5600, ss: 2275, neto: 27125, netoPaga: 2260.42 },
      40000: { tipo: 17, retencion: 6800, ss: 2600, neto: 30600, netoPaga: 2550 }
    };
    for (const salario of [25000, 30000, 35000, 40000]) {
      const r = brutoToNetoBizkaia(Object.assign({ salario }, supuestos));
      const e = esperado[salario];
      assert.equal(r.irpf.tipoRetencion, e.tipo, `tipo de retención ${salario}€`);
      assert.equal(r.irpf.retencionAnual, e.retencion, `retención en € ${salario}€`);
      assert.equal(r.segSocial.anual, e.ss, `SS anual ${salario}€`);
      assert.equal(r.netoAnual, e.neto, `neto anual ${salario}€`);
      assert.equal(r.netoPorPaga, e.netoPaga, `neto mensual ${salario}€`);
    }
  });

  test("el ejemplo de 30.000 € coincide exactamente con el motor (Bizkaia 15% / común 16,42%)", () => {
    const bizkaia = brutoToNetoBizkaia({ salario: 30000, numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" });
    const comun = TaxEngine.brutoToNeto({ brutoAnual: 30000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, Constants2026);
    assert.equal(bizkaia.irpf.tipoRetencion, 15);
    assert.equal(comun.irpf.tipoRetencion, 16.42);
    assert.equal(bizkaia.netoAnual, 23550);
    assert.equal(comun.netoAnual, 23124);
  });
});

describe("guía: no confunde retención con IRPF final, ni presenta reglas universales", () => {
  test("distingue explícitamente retención de nómina y declaración de la renta", () => {
    assert.match(guiaHtml, /pago a cuenta/i);
    assert.match(guiaHtml, /declaración de la renta/i);
  });

  test("no afirma que en Bizkaia 'se pagan menos impuestos' de forma genérica", () => {
    assert.ok(!/en bizkaia se pagan? menos impuestos/i.test(guiaHtml));
    assert.ok(!/bizkaia paga menos/i.test(guiaHtml));
    assert.ok(!/bizkaia es fiscalmente mejor/i.test(guiaHtml));
  });

  test("la comparación con el régimen común indica el supuesto exacto usado", () => {
    assert.match(guiaHtml, /30\.000\s*€/);
    assert.match(guiaHtml, /sin hijos/i);
    assert.match(guiaHtml, /único supuesto concreto/i);
  });

  test("no afirma una validación completa contra un calculador oficial que no existe", () => {
    assert.ok(!/valida(do|da)?\s+(automáticamente\s+)?contra\s+(el\s+)?(calculador|simulador)\s+oficial/i.test(guiaHtml));
    assert.match(guiaHtml, /no ofrece.*un ejemplo completo equivalente/i);
  });
});

describe("enlazado interno bidireccional guía <-> calculadora de Bizkaia", () => {
  const enlacesMinimos = ["/calculadora-sueldo-neto-bizkaia", "/retencion-irpf-vs-renta", "/fiscalidad-foral", "/metodologia"];

  for (const href of enlacesMinimos) {
    test(`la guía enlaza a ${href}`, () => {
      assert.ok(guiaHtml.includes('href="' + href + '"'), `falta el enlace a ${href} en la guía`);
    });
  }

  test("la guía enlaza fuentes oficiales de Bizkaia (normativa tributaria y Decreto Foral 47/2014)", () => {
    assert.ok(guiaHtml.includes("https://www.bizkaia.eus/es/normativa-tributaria/retenciones-de-trabajo"));
    assert.ok(guiaHtml.includes("https://www.bizkaia.eus/documents/880307/15229563/ca_47_2014.pdf"));
  });

  test("la calculadora de Bizkaia enlaza de vuelta a la nueva guía", () => {
    assert.ok(
      calculadoraHtml.includes('href="/guias/tabla-retenciones-irpf-bizkaia-2026"'),
      "la calculadora de Bizkaia debe enlazar a la nueva guía"
    );
  });

  test("la calculadora de Bizkaia mantiene su H1, title y canonical (no se ha canibalizado su contenido)", () => {
    assert.match(calculadoraHtml, /<title>Calculadora de Sueldo Neto Bizkaia 2026 \| SueldoClaro<\/title>/);
    assert.match(calculadoraHtml, /<h1 class="hero-title">Calculadora de sueldo neto en Bizkaia<\/h1>/);
    assert.ok(calculadoraHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/calculadora-sueldo-neto-bizkaia">'));
  });
});

describe("guía: SEO básico", () => {
  test("title, meta description y canonical", () => {
    assert.match(guiaHtml, /<title>Tabla de retenciones IRPF de Bizkaia 2026 \| SueldoClaro<\/title>/);
    const meta = guiaHtml.match(/<meta name="description" content="([^"]+)">/);
    assert.ok(meta && meta[1].length >= 50 && meta[1].length <= 165);
    assert.ok(guiaHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-bizkaia-2026">'));
  });

  test("un único H1 con el texto pedido", () => {
    const h1s = guiaHtml.match(/<h1[^>]*>([^<]*)<\/h1>/g) || [];
    assert.equal(h1s.length, 1);
    assert.match(guiaHtml, /<h1 class="hero-title">Tabla de retenciones IRPF de Bizkaia 2026<\/h1>/);
  });

  test("indexable y JSON-LD WebPage (sin FAQPage inventado)", () => {
    assert.ok(guiaHtml.includes('<meta name="robots" content="index, follow">'));
    const bloques = Array.from(guiaHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g));
    assert.equal(bloques.length, 1);
    assert.equal(JSON.parse(bloques[0][1])["@type"], "WebPage");
  });

  test("está en sitemap.xml", () => {
    const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes("<loc>https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-bizkaia-2026</loc>"));
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

describe("/guias: tarjeta de Bizkaia presente en Fiscalidad foral, con imagen propia", () => {
  const guiasHtml = fs.readFileSync(path.join(__dirname, "..", "guias.html"), "utf8");

  test("existe la tarjeta de Bizkaia con la categoría correcta y su imagen optimizada", () => {
    assert.match(
      guiasHtml,
      /<article class="guia-card" data-categoria="Fiscalidad foral">\s*<div class="guia-card-media">\s*<img src="\/assets\/img\/guias\/tabla-retenciones-irpf-bizkaia-2026\.webp" alt="[^"]+" width="720" height="405" loading="lazy">\s*<\/div>\s*<div class="guia-card-body">\s*<span class="guia-card-categoria">Fiscalidad foral<\/span>\s*<h2 class="guia-card-title"><a class="guia-card-link" href="\/guias\/tabla-retenciones-irpf-bizkaia-2026">/
    );
  });

  test("la imagen optimizada existe en assets/img/guias, junto al PNG original conservado", () => {
    const dir = path.join(__dirname, "..", "assets", "img", "guias");
    assert.ok(fs.existsSync(path.join(dir, "tabla-retenciones-irpf-bizkaia-2026.webp")), "falta el .webp de Bizkaia");
    assert.ok(fs.existsSync(path.join(dir, "tabla-retenciones-irpf-bizkaia-2026.png")), "falta conservar el .png original de Bizkaia");
  });

  test("la tarjeta de Bizkaia ya no usa el tratamiento neutro sin imagen", () => {
    const inicio = guiasHtml.indexOf('href="/guias/tabla-retenciones-irpf-bizkaia-2026"');
    const bloqueAnterior = guiasHtml.slice(Math.max(0, inicio - 400), inicio);
    assert.ok(!bloqueAnterior.includes("sin-imagen"), "la tarjeta de Bizkaia ya no debería usar el tratamiento sin-imagen");
  });
});

describe("motor y constantes fiscales: no modificados por esta tarea", () => {
  test("ConstantsBizkaia2026 conserva exactamente 35 tramos y 8 bandas de discapacidad", () => {
    assert.equal(ConstantsBizkaia2026.tablaRetencion.length, 35);
    assert.equal(ConstantsBizkaia2026.minoracionDiscapacidad.length, 8);
  });

  test("TaxEngineBizkaia expone las mismas funciones públicas de siempre", () => {
    assert.equal(typeof TaxEngineBizkaia.calcularTipoRetencion, "function");
    assert.equal(typeof TaxEngineBizkaia.obtenerTipoBase, "function");
    assert.equal(typeof TaxEngineBizkaia.obtenerPuntosMinoracionDiscapacidad, "function");
  });
});
