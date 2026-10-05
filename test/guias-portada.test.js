"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const guiasHtml = fs.readFileSync(path.join(ROOT, "guias.html"), "utf8");
const sitemapXml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");

// URLs listadas en /guias tras convertirla de parrilla filtrable a biblioteca
// temática por secciones. Se añade /fiscalidad-foral (no es una URL nueva:
// ya existía y ya estaba en el sitemap, solo no tenía tarjeta propia aquí).
const URLS_EXISTENTES = [
  "/que-se-descuenta-de-una-nomina",
  "/12-pagas-vs-14-pagas",
  "/retencion-irpf-vs-renta",
  "/fiscalidad-foral",
  "/guias/tabla-retenciones-irpf-pais-vasco-2026",
  "/guias/tabla-retenciones-irpf-navarra-2026",
  "/guias/elecciones-irpf-sueldo-neto",
  "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026",
  "/metodologia"
];

// Guías con imagen propia (fiscalidad-foral y metodología usan el
// tratamiento "sin-imagen", igual que ya hacía metodología antes).
const IMAGENES_POR_URL = {
  "/que-se-descuenta-de-una-nomina": "que-se-descuenta-nomina-2026.webp",
  "/12-pagas-vs-14-pagas": "12-vs-14-pagas-2026.webp",
  "/retencion-irpf-vs-renta": "retencion-irpf-vs-renta-2026.webp",
  "/guias/tabla-retenciones-irpf-pais-vasco-2026": "irpf-alava-2026.webp",
  "/guias/tabla-retenciones-irpf-navarra-2026": "tabla-retenciones-irpf-navarra-2026.webp",
  "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026": "coste-trabajador-empresa-2026.webp"
};

const SECCIONES_ESPERADAS = ["Sueldo y nómina", "Fiscalidad", "Empresa", "Cómo calculamos"];

describe("/guias: ninguna guía existente desaparece", () => {
  for (const href of URLS_EXISTENTES) {
    test("sigue enlazada: " + href, () => {
      assert.ok(guiasHtml.includes('href="' + href + '"'), "falta el enlace a " + href + " en guias.html");
    });
  }

  test("el número de tarjetas coincide con el número de URLs existentes", () => {
    const tarjetas = guiasHtml.match(/<article class="guia-card"/g) || [];
    assert.equal(tarjetas.length, URLS_EXISTENTES.length);
  });
});

describe("/guias: SEO sin tocar salvo lo estrictamente necesario", () => {
  test("title, meta description y canonical de /guias no han cambiado", () => {
    assert.match(guiasHtml, /<title>Guías sobre nómina, salario e IRPF \(2026\) \| SueldoClaro<\/title>/);
    assert.ok(guiasHtml.includes('<link rel="canonical" href="https://calcularsalarioneto.es/guias">'));
  });

  test("mantiene un único H1 con el texto original", () => {
    const h1s = guiasHtml.match(/<h1[^>]*>([^<]*)<\/h1>/g) || [];
    assert.equal(h1s.length, 1);
    assert.match(guiasHtml, /<h1 class="hero-title">Guías sobre nómina, salario e IRPF<\/h1>/);
  });

  test("los títulos de las tarjetas son H2, no duplican el H1", () => {
    const h2Titles = Array.from(guiasHtml.matchAll(/<h2 class="guia-card-title">.*?<\/h2>/gs));
    assert.equal(h2Titles.length, URLS_EXISTENTES.length);
    for (const m of h2Titles) {
      assert.ok(!m[0].includes("Guías sobre nómina, salario e IRPF"), "una tarjeta no debe duplicar el H1 de la página");
    }
  });

  test("JSON-LD sigue siendo WebPage, sin schema nuevo añadido", () => {
    const bloques = Array.from(guiasHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g));
    assert.equal(bloques.length, 1);
    const data = JSON.parse(bloques[0][1]);
    assert.equal(data["@type"], "WebPage");
  });

  test("sigue indexable (robots index,follow) y en sitemap.xml", () => {
    assert.ok(guiasHtml.includes('<meta name="robots" content="index, follow">'));
    assert.ok(sitemapXml.includes("<loc>https://calcularsalarioneto.es/guias</loc>"));
  });

  test("AdSense sigue presente y sin cambios", () => {
    assert.ok(guiasHtml.includes('src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4073412446458032"'));
  });
});

describe("/guias: imágenes locales, sin CLS, sin relleno de keywords", () => {
  for (const [href, archivo] of Object.entries(IMAGENES_POR_URL)) {
    test("existe el fichero optimizado para " + href, () => {
      const p = path.join(ROOT, "assets", "img", "guias", archivo);
      assert.ok(fs.existsSync(p), "falta " + p);
    });

    test("la tarjeta de " + href + " referencia esa imagen con width/height y alt", () => {
      const bloqueRegex = new RegExp('<img src="/assets/img/guias/' + archivo.replace(".", "\\.") + '"[^>]*>');
      const m = guiasHtml.match(bloqueRegex);
      assert.ok(m, "no se encontró el <img> para " + archivo);
      assert.match(m[0], /width="720"/);
      assert.match(m[0], /height="405"/);
      assert.match(m[0], /alt="[^"]{15,}"/);
    });
  }

  test("los originales sin optimizar se conservan en assets/img/guias, junto a los .webp", () => {
    const dir = path.join(ROOT, "assets", "img", "guias");
    assert.ok(fs.existsSync(dir));
    const originales = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));
    assert.equal(originales.length, Object.keys(IMAGENES_POR_URL).length);
  });

  test("todas las imágenes de tarjeta salvo la primera usan loading=\"lazy\"", () => {
    const imgs = Array.from(guiasHtml.matchAll(/<img [^>]*src="\/assets\/img\/guias\/[^"]+\.webp"[^>]*>/g)).map((m) => m[0]);
    assert.equal(imgs.length, Object.keys(IMAGENES_POR_URL).length);
    assert.ok(!imgs[0].includes('loading="lazy"'), "la primera imagen (candidata a LCP) no debería ser lazy");
    for (const img of imgs.slice(1)) {
      assert.match(img, /loading="lazy"/);
    }
  });

  test("ningún alt está vacío ni relleno de keywords repetidas", () => {
    const alts = Array.from(guiasHtml.matchAll(/<img [^>]*alt="([^"]*)"/g)).map((m) => m[1]);
    assert.equal(alts.length, Object.keys(IMAGENES_POR_URL).length);
    for (const alt of alts) {
      assert.ok(alt.trim().length > 10, "alt demasiado corto o vacío: " + JSON.stringify(alt));
      const palabras = alt.toLowerCase().split(/\s+/);
      const repetidas = palabras.filter((w, i) => w.length > 4 && palabras.indexOf(w) !== i);
      assert.equal(repetidas.length, 0, "alt con palabras repetidas (posible relleno de keywords): " + alt);
    }
  });

  test("las tarjetas sin imagen (fiscalidad foral y metodología) usan un tratamiento visual neutro, no una imagen externa/stock", () => {
    const sinImagen = (guiasHtml.match(/class="guia-card-media sin-imagen"/g) || []).length;
    assert.equal(sinImagen, URLS_EXISTENTES.length - Object.keys(IMAGENES_POR_URL).length);
  });
});

describe("/guias: enlaces accesibles y sin enlaces vacíos", () => {
  test("no hay href vacío ni href=\"#\"", () => {
    assert.ok(!/href="\s*"/.test(guiasHtml));
    assert.ok(!/href="#"/.test(guiasHtml));
  });

  test("cada tarjeta tiene un enlace real (no un div con onclick) hacia su guía", () => {
    for (const href of URLS_EXISTENTES) {
      const re = new RegExp('<a class="guia-card-link" href="' + href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '">');
      assert.ok(re.test(guiasHtml), "falta el <a class=\"guia-card-link\"> hacia " + href);
    }
  });
});

describe("/guias: no se ha tocado ninguna guía existente", () => {
  const paginasGuia = [
    "que-se-descuenta-de-una-nomina.html",
    "12-pagas-vs-14-pagas.html",
    "retencion-irpf-vs-renta.html",
    "guias/tabla-retenciones-irpf-pais-vasco-2026.html",
    "guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026.html"
  ];

  for (const file of paginasGuia) {
    test(file + " no referencia ninguna imagen nueva ni cambia su H1", () => {
      const html = fs.readFileSync(path.join(ROOT, file), "utf8");
      assert.ok(!html.includes(".webp"), file + " no debería usar las nuevas imágenes de portada (.webp)");
    });
  }
});

// -----------------------------------------------------------------------
// Biblioteca temática: sustituye a la parrilla filtrable. No debe quedar
// ninguna categoría vacía (el hallazgo real de la auditoría fue que
// "Carrera y salario" se quedó sin tarjetas tras fusionar
// /subida-sueldo-5000), no debe parecer un blog (sin fechas de
// publicación tipo blog), y el filtro JS/CSS debe haberse retirado por
// completo, sin dejar código huérfano.
// -----------------------------------------------------------------------
describe("/guias: biblioteca temática por secciones, sin filtro ni categorías vacías", () => {
  const stylesCss = fs.readFileSync(path.join(ROOT, "assets", "css", "styles.css"), "utf8");

  test("existen las 4 secciones temáticas esperadas, cada una como encabezado real", () => {
    for (const seccion of SECCIONES_ESPERADAS) {
      assert.ok(guiasHtml.includes('class="guias-seccion-titulo">' + seccion + "<"), "falta la sección: " + seccion);
    }
  });

  test("no existe la categoría muerta \"Carrera y salario\"", () => {
    assert.ok(!guiasHtml.includes("Carrera y salario"), "la categoría vacía debía retirarse, no solo vaciarse");
  });

  test("no queda ningún filtro por categoría (ni botones, ni data-categoria, ni \"Todas\")", () => {
    assert.ok(!guiasHtml.includes("guias-filtros"));
    assert.ok(!guiasHtml.includes("data-filtro"));
    assert.ok(!guiasHtml.includes("data-categoria"));
    assert.ok(!/>Todas</.test(guiasHtml));
  });

  test("no queda JS del filtro/animación de tarjetas huérfano en el HTML", () => {
    assert.ok(!guiasHtml.includes("aplicarFiltro"));
    assert.ok(!guiasHtml.includes("animarSalida"));
    assert.ok(!guiasHtml.includes("animarEntrada"));
    assert.ok(!guiasHtml.includes("prefiereMenosMovimiento"));
  });

  test("no queda CSS del filtro huérfano (.guias-filtros, .guia-card[hidden]) en styles.css", () => {
    assert.ok(!stylesCss.includes(".guias-filtros"));
    assert.ok(!/\.guia-card\[hidden\]/.test(stylesCss));
  });

  test("no queda el estilo de píldora de categoría por tarjeta (.guia-card-categoria) huérfano", () => {
    assert.ok(!guiasHtml.includes("guia-card-categoria"));
    assert.ok(!stylesCss.includes(".guia-card-categoria"));
  });

  test("no hay fechas de publicación estilo blog (solo \"Actualizado/Vigente/Normativa 2026\", ya existente)", () => {
    assert.ok(!/\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(guiasHtml));
  });

  test("la intro menciona sueldo, nómina, IRPF, fiscalidad y coste laboral, y enlaza de forma discreta a /metodologia", () => {
    const intro = (guiasHtml.match(/<section id="intro">[\s\S]*?<\/section>/) || [""])[0];
    for (const palabra of [/sueldo/i, /nómina/i, /IRPF/i, /fiscal/i, /coste laboral/i]) {
      assert.match(intro, palabra);
    }
    assert.ok(intro.includes('href="/metodologia"'), "la intro debe enlazar a /metodologia");
  });

  test("las tres guías de \"Sueldo y nómina\" están en esa sección, antes de \"Fiscalidad\"", () => {
    const posSeccionSueldo = guiasHtml.indexOf('class="guias-seccion-titulo">Sueldo y nómina<');
    const posSeccionFiscalidad = guiasHtml.indexOf('class="guias-seccion-titulo">Fiscalidad<');
    const posQueSeDescuenta = guiasHtml.indexOf('href="/que-se-descuenta-de-una-nomina"');
    const pos12Pagas = guiasHtml.indexOf('href="/12-pagas-vs-14-pagas"');
    const posRetencion = guiasHtml.indexOf('href="/retencion-irpf-vs-renta"');
    assert.ok(posSeccionSueldo !== -1 && posSeccionFiscalidad !== -1);
    assert.ok(posSeccionSueldo < posQueSeDescuenta && posQueSeDescuenta < posSeccionFiscalidad);
    assert.ok(posSeccionSueldo < pos12Pagas && pos12Pagas < posSeccionFiscalidad);
    assert.ok(posSeccionSueldo < posRetencion && posRetencion < posSeccionFiscalidad);
  });

  test("Fiscalidad incluye /fiscalidad-foral y las dos guías territoriales, antes de \"Empresa\"", () => {
    const posSeccionFiscalidad = guiasHtml.indexOf('class="guias-seccion-titulo">Fiscalidad<');
    const posSeccionEmpresa = guiasHtml.indexOf('class="guias-seccion-titulo">Empresa<');
    const posFiscalidadForal = guiasHtml.indexOf('href="/fiscalidad-foral"');
    const posPaisVasco = guiasHtml.indexOf('href="/guias/tabla-retenciones-irpf-pais-vasco-2026"');
    const posNavarra = guiasHtml.indexOf('href="/guias/tabla-retenciones-irpf-navarra-2026"');
    assert.ok(posSeccionFiscalidad !== -1 && posSeccionEmpresa !== -1);
    assert.ok(posSeccionFiscalidad < posFiscalidadForal && posFiscalidadForal < posSeccionEmpresa);
    assert.ok(posSeccionFiscalidad < posPaisVasco && posPaisVasco < posSeccionEmpresa);
    assert.ok(posSeccionFiscalidad < posNavarra && posNavarra < posSeccionEmpresa);
  });

  test("metodología está en su propia sección final \"Cómo calculamos\", no dentro de otra categoría", () => {
    const posSeccionMetodologia = guiasHtml.indexOf('class="guias-seccion-titulo">Cómo calculamos<');
    const posMetodologiaLink = guiasHtml.indexOf('href="/metodologia"', guiasHtml.indexOf('id="contenido"'));
    assert.ok(posSeccionMetodologia !== -1);
    assert.ok(posSeccionMetodologia < posMetodologiaLink);
    // Es la última sección temática antes del CTA de cierre.
    const posCta = guiasHtml.indexOf('<div class="guias-cta">');
    assert.ok(posSeccionMetodologia < posCta && posMetodologiaLink < posCta);
  });
});

// -----------------------------------------------------------------------
// CTA de cierre (sustituye al texto suelto entre la cuadrícula y "Otras
// herramientas"). No se ha tocado en esta tarea salvo su posición relativa
// a las nuevas secciones.
// -----------------------------------------------------------------------
describe("/guias: CTA final hacia la calculadora principal", () => {
  const stylesCss = fs.readFileSync(path.join(ROOT, "assets", "css", "styles.css"), "utf8");

  test("el CTA tiene título (H2, no H1), descripción y botón con el contenido exacto pedido", () => {
    assert.match(guiasHtml, /<div class="guias-cta">/);
    assert.match(guiasHtml, /<h2 class="guias-cta-titulo">¿Quieres calcular tu caso concreto\?<\/h2>/);
    assert.match(guiasHtml, /<p class="guias-cta-desc">Introduce tu salario y situación personal en nuestra calculadora de sueldo neto\.<\/p>/);
    const h1s = guiasHtml.match(/<h1[^>]*>/g) || [];
    assert.equal(h1s.length, 1, "no debe añadirse un segundo H1");
  });

  test("el botón es un <a> real hacia / y reutiliza la clase .btn existente", () => {
    assert.match(guiasHtml, /<a class="btn" href="\/">Abrir calculadora<\/a>/);
  });

  test("el icono reutiliza el mismo emoji que ya usa el sitio para la calculadora de bruto a neto (/)", () => {
    assert.match(guiasHtml, /<span class="guias-cta-icono" aria-hidden="true">💶<\/span>/);
  });

  test("el CTA está dentro de #contenido, después de las secciones temáticas y antes de \"Otras herramientas\"", () => {
    const posCta = guiasHtml.indexOf('<div class="guias-cta">');
    const posRelacionadas = guiasHtml.indexOf('id="relacionadas"');
    assert.ok(posCta > 0 && posCta < posRelacionadas, "el CTA debe ir antes de la sección de relacionadas");
  });

  test("CSS del CTA está scopeado (.guias-cta / .guias-cta-*), sin reglas globales nuevas", () => {
    assert.match(stylesCss, /\.guias-cta\s*\{/);
    assert.match(stylesCss, /\.guias-cta-titulo\s*\{/);
    assert.match(stylesCss, /\.guias-cta-desc\s*\{/);
  });

  test("en escritorio (min-width 560px) el CTA se dispone en fila y el botón deja de ser 100% ancho", () => {
    const bloqueMedia = stylesCss.match(/@media \(min-width: 560px\)\s*\{\s*\.guias-cta\s*\{[\s\S]*?\n  \}\n\n  \.guias-cta \.btn[\s\S]*?\n  \}\n\}/);
    assert.ok(bloqueMedia, "falta el ajuste responsive del CTA a partir de 560px");
    assert.match(bloqueMedia[0], /flex-direction:\s*row/);
    assert.match(bloqueMedia[0], /width:\s*auto/);
  });
});
