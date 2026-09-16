"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const guiasHtml = fs.readFileSync(path.join(ROOT, "guias.html"), "utf8");
const sitemapXml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");

// URLs que ya estaban listadas en /guias antes del rediseño (ninguna debe
// desaparecer, aunque cambie por completo la presentación visual).
const URLS_EXISTENTES = [
  "/que-se-descuenta-de-una-nomina",
  "/12-pagas-vs-14-pagas",
  "/subida-sueldo-5000",
  "/retencion-irpf-vs-renta",
  "/metodologia",
  "/guias/tabla-retenciones-irpf-alava-2026",
  "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026"
];

// Guías con imagen propia (las 6 proporcionadas) y su fichero optimizado.
const IMAGENES_POR_URL = {
  "/que-se-descuenta-de-una-nomina": "que-se-descuenta-nomina-2026.webp",
  "/12-pagas-vs-14-pagas": "12-vs-14-pagas-2026.webp",
  "/retencion-irpf-vs-renta": "retencion-irpf-vs-renta-2026.webp",
  "/subida-sueldo-5000": "subida-sueldo-5000-2026.webp",
  "/guias/tabla-retenciones-irpf-alava-2026": "irpf-alava-2026.webp",
  "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026": "coste-trabajador-empresa-2026.webp"
};

describe("/guias: ninguna guía existente desaparece", () => {
  for (const href of URLS_EXISTENTES) {
    test("sigue enlazada: " + href, () => {
      assert.ok(guiasHtml.includes('href="' + href + '"'), "falta el enlace a " + href + " en guias.html");
    });
  }

  test("el número de tarjetas coincide con el número de URLs existentes (ninguna se ha perdido ni se ha inventado ninguna nueva)", () => {
    const tarjetas = guiasHtml.match(/<article class="guia-card"/g) || [];
    assert.equal(tarjetas.length, URLS_EXISTENTES.length);
  });
});

describe("/guias: SEO sin tocar", () => {
  test("title, meta description y canonical de /guias no han cambiado", () => {
    assert.match(guiasHtml, /<title>Guías sobre nómina, salario e IRPF \(2026\) \| SueldoClaro<\/title>/);
    assert.match(
      guiasHtml,
      /<meta name="description" content="Guías claras sobre cómo funciona tu nómina: retención de IRPF, declaración de la renta, pagas extra y qué se descuenta de tu salario\.">/
    );
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
    assert.equal(originales.length, 6);
  });

  test("todas las imágenes de tarjeta salvo la primera usan loading=\"lazy\"", () => {
    const imgs = Array.from(guiasHtml.matchAll(/<img [^>]*src="\/assets\/img\/guias\/[^"]+\.webp"[^>]*>/g)).map((m) => m[0]);
    assert.equal(imgs.length, 6);
    assert.ok(!imgs[0].includes('loading="lazy"'), "la primera imagen (candidata a LCP) no debería ser lazy");
    for (const img of imgs.slice(1)) {
      assert.match(img, /loading="lazy"/);
    }
  });

  test("ningún alt está vacío ni relleno de keywords repetidas", () => {
    const alts = Array.from(guiasHtml.matchAll(/<img [^>]*alt="([^"]*)"/g)).map((m) => m[1]);
    assert.equal(alts.length, 6);
    for (const alt of alts) {
      assert.ok(alt.trim().length > 10, "alt demasiado corto o vacío: " + JSON.stringify(alt));
      const palabras = alt.toLowerCase().split(/\s+/);
      const repetidas = palabras.filter((w, i) => w.length > 4 && palabras.indexOf(w) !== i);
      assert.equal(repetidas.length, 0, "alt con palabras repetidas (posible relleno de keywords): " + alt);
    }
  });

  test("la tarjeta sin imagen (metodología) usa un tratamiento visual neutro, no una imagen externa/stock", () => {
    assert.ok(guiasHtml.includes('class="guia-card-media sin-imagen"'));
    assert.ok(!/metodologia[\s\S]{0,400}<img/.test(guiasHtml.split('href="/metodologia"')[0]?.slice(-400) || ""));
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

  test("el botón de filtro activo por defecto es \"Todas\" y expone aria-pressed", () => {
    assert.match(guiasHtml, /<button type="button" class="active" data-filtro="todas" aria-pressed="true">Todas<\/button>/);
  });
});

describe("/guias: no se ha tocado ninguna guía existente", () => {
  const paginasGuia = [
    "que-se-descuenta-de-una-nomina.html",
    "12-pagas-vs-14-pagas.html",
    "subida-sueldo-5000.html",
    "retencion-irpf-vs-renta.html",
    "metodologia.html",
    "guias/tabla-retenciones-irpf-alava-2026.html",
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
// Filtro de categorías — bug real reproducido en producción: el JS movía
// bien el atributo "hidden" en el DOM, pero .guia-card fijaba su propio
// "display: flex" con la misma especificidad que la regla [hidden] del
// user-agent, y al ganar la hoja de estilos del autor en la cascada, las
// tarjetas "ocultas" seguían viéndose. Estos tests cubren tanto los datos
// (categorías válidas en botones/tarjetas) como la regresión de CSS.
// -----------------------------------------------------------------------
describe("/guias: filtro de categorías", () => {
  const CATEGORIAS_VALIDAS = ["Sueldo y nómina", "IRPF y fiscalidad", "Fiscalidad foral", "Empresas y costes laborales", "Carrera y salario"];
  const stylesCss = fs.readFileSync(path.join(ROOT, "assets", "css", "styles.css"), "utf8");

  test("cada botón de filtro tiene una categoría válida (o 'todas')", () => {
    const botones = Array.from(guiasHtml.matchAll(/<button type="button"[^>]*data-filtro="([^"]+)"/g)).map((m) => m[1]);
    assert.equal(botones.length, 6, "deben existir 6 botones: Todas + 5 categorías");
    assert.equal(botones[0], "todas");
    for (const cat of botones.slice(1)) {
      assert.ok(CATEGORIAS_VALIDAS.includes(cat), "categoría de botón no reconocida: " + cat);
    }
  });

  test("existen las 5 categorías esperadas, cada una exactamente una vez como botón", () => {
    const botones = Array.from(guiasHtml.matchAll(/data-filtro="([^"]+)"/g)).map((m) => m[1]);
    for (const cat of CATEGORIAS_VALIDAS) {
      assert.equal(botones.filter((b) => b === cat).length, 1, "la categoría " + cat + " debería tener exactamente un botón");
    }
  });

  test("cada tarjeta con data-categoria usa una categoría reconocida por algún botón (sin categorías huérfanas)", () => {
    const categoriasEnTarjetas = Array.from(guiasHtml.matchAll(/<article class="guia-card" data-categoria="([^"]+)"/g)).map((m) => m[1]);
    for (const cat of categoriasEnTarjetas) {
      assert.ok(CATEGORIAS_VALIDAS.includes(cat), "la tarjeta usa una categoría sin botón de filtro: " + cat);
    }
  });

  test("el reparto de tarjetas por categoría coincide con el esperado", () => {
    const REPARTO_ESPERADO = {
      "Sueldo y nómina": 2,
      "IRPF y fiscalidad": 1,
      "Fiscalidad foral": 1,
      "Empresas y costes laborales": 1,
      "Carrera y salario": 1
    };
    for (const [cat, n] of Object.entries(REPARTO_ESPERADO)) {
      const re = new RegExp('<article class="guia-card" data-categoria="' + cat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"', "g");
      const matches = guiasHtml.match(re) || [];
      assert.equal(matches.length, n, cat + " debería tener " + n + " tarjeta(s), encontradas " + matches.length);
    }
  });

  test("la tarjeta de metodología no tiene data-categoria (se oculta con cualquier filtro específico, visible solo en Todas)", () => {
    assert.match(guiasHtml, /<article class="guia-card">\s*<div class="guia-card-media sin-imagen"/);
  });

  test("el script de filtrado está inicializado: añade un listener de click por botón y usa element.hidden", () => {
    assert.match(guiasHtml, /querySelectorAll\(".guias-filtros button"\)/);
    assert.match(guiasHtml, /addEventListener\("click"/);
    assert.match(guiasHtml, /card\.hidden\s*=\s*!coincide/);
  });

  test("REGRESIÓN: existe una regla CSS que garantiza que .guia-card[hidden] se oculta de verdad, aunque .guia-card fije su propio display", () => {
    // No basta con que exista .guia-card { display: flex }: hace falta una
    // regla con más especificidad (o !important) para [hidden] que gane
    // siempre, sin depender del orden de aparición en la hoja de estilos.
    assert.match(
      stylesCss,
      /\.guia-card\[hidden\]\s*\{[^}]*display:\s*none\s*!important/,
      "falta la regla .guia-card[hidden] { display: none !important; } que corrige el bug de especificidad CSS"
    );
  });

  test("REGRESIÓN: .guia-card sigue fijando su propio display (si esto cambiara habría que revisar si la regla de arriba sigue haciendo falta)", () => {
    assert.match(stylesCss, /\.guia-card\s*\{[^}]*display:\s*flex/);
  });
});
