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
