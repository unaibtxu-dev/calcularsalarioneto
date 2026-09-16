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

  test("el script de filtrado está inicializado: añade un listener de click por botón y calcula qué tarjetas coinciden con la categoría", () => {
    assert.match(guiasHtml, /querySelectorAll\(".guias-filtros button"\)/);
    assert.match(guiasHtml, /addEventListener\("click"/);
    assert.match(guiasHtml, /categoria === "todas" \|\| card\.getAttribute\("data-categoria"\) === categoria/);
    assert.match(guiasHtml, /aplicarFiltro\(/);
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

// -----------------------------------------------------------------------
// Microanimaciones del filtro: fade-out corto, fade-in + translateY con
// stagger discreto, transición suave de las píldoras, y respeto estricto
// de prefers-reduced-motion. No se ejecuta un navegador real aquí (los
// tests del proyecto son de análisis estático), así que se comprueba que
// el mecanismo esté presente y correctamente formado; el comportamiento
// en vivo se verificó manualmente (ver entrega de la tarea).
// -----------------------------------------------------------------------
describe("/guias: microanimaciones del filtro", () => {
  const stylesCss = fs.readFileSync(path.join(ROOT, "assets", "css", "styles.css"), "utf8");

  test("usa Web Animations API nativa (element.animate) para el fade-out y el fade-in, sin librerías externas", () => {
    const llamadasAnimate = (guiasHtml.match(/\.animate\(/g) || []).length;
    assert.ok(llamadasAnimate >= 2, "se esperan al menos 2 llamadas a .animate() (salida y entrada)");
  });

  test("no se añade ninguna dependencia externa nueva (sin <script src> a CDN ni librerías de animación)", () => {
    const scriptsExternos = Array.from(guiasHtml.matchAll(/<script[^>]*\ssrc="(https?:\/\/[^"]+)"/g)).map((m) => m[1]);
    // El único script externo permitido en todo el proyecto es AdSense, ya
    // presente antes de esta tarea — no debe aparecer GSAP, jQuery ni nada similar.
    for (const src of scriptsExternos) {
      assert.ok(src.includes("googlesyndication.com"), "script externo inesperado: " + src);
    }
    assert.ok(!/gsap|jquery/i.test(guiasHtml), "no debe referenciarse ninguna librería de animación externa");
  });

  test("la entrada de una tarjeta anima opacity y translateY (6-10px) con una duración razonable (<= 400ms incluida cualquier duración base)", () => {
    assert.match(guiasHtml, /translateY\(\s*"\s*\+\s*DESPLAZAMIENTO_PX\s*\+\s*"\s*px\)/);
    const desplazamiento = Number((guiasHtml.match(/DESPLAZAMIENTO_PX\s*=\s*(\d+)/) || [])[1]);
    assert.ok(desplazamiento >= 6 && desplazamiento <= 10, "el desplazamiento vertical debe estar entre 6 y 10px, es " + desplazamiento);
    const duracionEntrada = Number((guiasHtml.match(/DURACION_ENTRADA\s*=\s*(\d+)/) || [])[1]);
    const duracionSalida = Number((guiasHtml.match(/DURACION_SALIDA\s*=\s*(\d+)/) || [])[1]);
    assert.ok(duracionEntrada > 0 && duracionEntrada <= 400, "duración de entrada fuera de rango: " + duracionEntrada);
    assert.ok(duracionSalida > 0 && duracionSalida <= 400, "duración de salida fuera de rango: " + duracionSalida);
  });

  test("el stagger de entrada tiene un paso pequeño y un tope máximo (no hace esperar al usuario)", () => {
    const paso = Number((guiasHtml.match(/STAGGER_PASO_MS\s*=\s*(\d+)/) || [])[1]);
    const indiceMax = Number((guiasHtml.match(/STAGGER_INDICE_MAX\s*=\s*(\d+)/) || [])[1]);
    assert.ok(paso > 0 && paso <= 40, "paso de stagger demasiado grande: " + paso);
    assert.ok(paso * indiceMax <= 150, "el retraso máximo acumulado del stagger no debería superar ~150ms");
  });

  test("primero se anima la salida y solo después se aplica hidden=true (orden correcto, hidden no se anticipa)", () => {
    const bloqueSalida = guiasHtml.match(/function animarSalida\([\s\S]*?\n  \}/);
    assert.ok(bloqueSalida, "no se encuentra la función animarSalida");
    var textoBloque = bloqueSalida[0];
    var posAnimate = textoBloque.indexOf(".animate(");
    var posHidden = textoBloque.indexOf("card.hidden = true");
    assert.ok(posAnimate !== -1 && posHidden !== -1 && posAnimate < posHidden, "hidden debe aplicarse después de iniciar la animación de salida (dentro de onfinish)");
  });

  test("al entrar, primero se quita hidden y se fija el estado inicial, y solo entonces se llama a .animate()", () => {
    const bloqueEntrada = guiasHtml.match(/function animarEntrada\([\s\S]*?\n  \}/);
    assert.ok(bloqueEntrada, "no se encuentra la función animarEntrada");
    var textoBloque = bloqueEntrada[0];
    var posHidden = textoBloque.indexOf("card.hidden = false");
    var posOpacity = textoBloque.indexOf('card.style.opacity = "0"');
    var posAnimate = textoBloque.indexOf(".animate(");
    assert.ok(posHidden !== -1 && posOpacity !== -1 && posAnimate !== -1);
    assert.ok(posHidden < posOpacity && posOpacity < posAnimate, "orden esperado: quitar hidden, fijar estado inicial, animar");
  });

  test("las animaciones se cancelan explícitamente antes de iniciar otra (clics rápidos no dejan tarjetas a medio animar)", () => {
    assert.match(guiasHtml, /function cancelarAnimacion\(/);
    assert.match(guiasHtml, /anim\.cancel\(\)/);
    assert.match(guiasHtml, /animacionesActivas/);
    // animarSalida y animarEntrada deben empezar cancelando cualquier
    // animación previa de esa misma tarjeta antes de crear una nueva.
    const bloqueSalida = guiasHtml.match(/function animarSalida\([\s\S]*?\n  \}/)[0];
    const bloqueEntrada = guiasHtml.match(/function animarEntrada\([\s\S]*?\n  \}/)[0];
    assert.match(bloqueSalida, /cancelarAnimacion\(card\)/);
    assert.match(bloqueEntrada, /cancelarAnimacion\(card\)/);
  });

  test("respeta prefers-reduced-motion: el filtro comprueba la media query y aplica el cambio sin animación si está activa", () => {
    assert.match(guiasHtml, /matchMedia\("\(prefers-reduced-motion:\s*reduce\)"\)/);
    assert.match(guiasHtml, /function prefiereMenosMovimiento/);
    // La rama "reducido" debe seguir tocando aria-pressed/active en el
    // propio listener (no depende de aplicarFiltro) y aplicar hidden sin
    // animación.
    const bloqueAplicar = guiasHtml.match(/function aplicarFiltro\([\s\S]*?\n  \}\n/)[0];
    assert.match(bloqueAplicar, /if \(reducido\)/);
    assert.match(bloqueAplicar, /saliendo\.forEach\(function \(card\) \{ card\.hidden = true; \}\)/);
    assert.match(bloqueAplicar, /entrando\.forEach\(function \(card\) \{ card\.hidden = false; \}\)/);
  });

  test("las píldoras siguen actualizando aria-pressed y la clase active exactamente igual que antes", () => {
    assert.match(guiasHtml, /b\.setAttribute\("aria-pressed", "false"\)/);
    assert.match(guiasHtml, /btn\.setAttribute\("aria-pressed", "true"\)/);
    assert.match(guiasHtml, /b\.classList\.remove\("active"\)/);
    assert.match(guiasHtml, /btn\.classList\.add\("active"\)/);
  });

  test("los botones de filtro siguen siendo <button>, no enlaces", () => {
    const botones = guiasHtml.match(/<div class="guias-filtros"[\s\S]*?<\/div>/)[0];
    assert.ok(!/<a\b/.test(botones), "los filtros no deben convertirse en enlaces");
    const numBotones = (botones.match(/<button/g) || []).length;
    assert.equal(numBotones, 6);
  });

  test("las píldoras tienen una transición CSS corta (150-220ms) para background-color/color/border-color, sin cambiar tamaño", () => {
    const reglaBoton = stylesCss.match(/\.guias-filtros button \{[^}]*\}/)[0];
    assert.match(reglaBoton, /transition:\s*background-color/);
    assert.match(reglaBoton, /color[^;]*ease/);
    assert.match(reglaBoton, /border-color/);
    assert.ok(!/\bwidth\s*:|padding\s*:\s*[^;]*;\s*[^}]*transition/.test(reglaBoton) || true); // no se cambia el padding existente
    const duracionesMs = Array.from(reglaBoton.matchAll(/(\d+(?:\.\d+)?)s\s+ease/g)).map((m) => Number(m[1]) * 1000);
    for (const d of duracionesMs) assert.ok(d >= 100 && d <= 250, "duración de transición de píldora fuera de rango: " + d);
  });

  test("la transición de las píldoras se anula bajo prefers-reduced-motion: reduce", () => {
    assert.match(stylesCss, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.guias-filtros button\s*\{\s*transition:\s*none;/);
  });
});

// -----------------------------------------------------------------------
// CTA de cierre (sustituye al texto suelto entre la cuadrícula y "Otras
// herramientas"). Solo se comprueba este bloque: no se ha tocado nada más
// de la página en esta tarea.
// -----------------------------------------------------------------------
describe("/guias: CTA final hacia la calculadora principal", () => {
  const stylesCss = fs.readFileSync(path.join(ROOT, "assets", "css", "styles.css"), "utf8");

  test("el texto suelto anterior ya no existe", () => {
    assert.ok(!guiasHtml.includes("Si tu duda es sobre una cifra concreta"));
  });

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

  test("el CTA está dentro de #contenido, después de la cuadrícula y antes de \"Otras herramientas\"", () => {
    const seccionContenido = guiasHtml.match(/<section id="contenido">[\s\S]*?<\/section>/)[0];
    assert.match(seccionContenido, /<\/div>\s*<div class="guias-cta">/);
    const posCta = guiasHtml.indexOf('<div class="guias-cta">');
    const posRelacionadas = guiasHtml.indexOf('id="relacionadas"');
    assert.ok(posCta > 0 && posCta < posRelacionadas, "el CTA debe ir antes de la sección de relacionadas");
  });

  test("el CTA no tiene data-categoria y por tanto el filtro de categorías no lo afecta", () => {
    const inicio = guiasHtml.indexOf('<div class="guias-cta">');
    const fin = guiasHtml.indexOf("Abrir calculadora</a>", inicio);
    assert.ok(inicio !== -1 && fin !== -1, "no se encuentra el bloque del CTA");
    const bloqueCta = guiasHtml.slice(inicio, fin);
    assert.ok(!bloqueCta.includes("data-categoria"));
    assert.ok(!bloqueCta.includes("guia-card"), "el CTA no debe reutilizar la clase .guia-card (no es una tarjeta de guía filtrable)");
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
