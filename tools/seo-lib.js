"use strict";
/**
 * Fuente única de verdad para el auditor SEO de SueldoClaro.
 *
 * Reúne: (a) los mismos hechos técnicos que ya comprobaba
 * tools/check-seo-basics.js (title, meta description, canonical, OG,
 * JSON-LD, robots, sitemap, robots.txt) y (b) hechos nuevos para el
 * informe ampliado (jerarquía de encabezados, IDs duplicados, enlazado
 * interno — incluyendo los enlaces generados en runtime por
 * assets/js/components.js, no solo los que aparecen literalmente en el
 * HTML — y señales de confianza/transparencia).
 *
 * No ejecuta JavaScript de navegador: en vez de eso, PARSEA
 * assets/js/components.js con expresiones regulares para extraer los
 * arrays PAGES/REGIONES/CATEGORIAS/FOOTER_LINKS que usan
 * App.renderNav/renderRelacionadas/renderFooter, de modo que el grafo de
 * enlaces internos entienda el nav y el footer compartidos igual que los
 * entendería un navegador real, sin duplicar esa lista a mano aquí ni
 * marcar como "huérfana" una página que en realidad está enlazada desde
 * el nav o el footer generado por JS.
 *
 * check-seo-basics.js y seo-audit.js consumen ESTE módulo; ninguno de
 * los dos duplica la lógica de extracción de hechos ni las reglas.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_ORIGIN = "https://calcularsalarioneto.es";

// Mismo listado que usaba check-seo-basics.js — única fuente de verdad de
// "qué páginas HTML son indexables y deben cumplir el lint técnico".
const PAGES = [
  "index.html",
  "neto-a-bruto.html",
  "comparar-ofertas.html",
  "calculadora-subida-sueldo.html",
  "coste-empresa.html",
  "calculadora-sueldo-neto-navarra.html",
  "calculadora-sueldo-neto-bizkaia.html",
  "calculadora-sueldo-neto-gipuzkoa.html",
  "calculadora-sueldo-neto-alava.html",
  "30000-brutos-a-netos.html",
  "35000-brutos-a-netos.html",
  "40000-brutos-a-netos.html",
  "45000-brutos-a-netos.html",
  "50000-brutos-a-netos.html",
  "privacidad.html",
  "aviso-legal.html",
  "sueldos.html",
  "fiscalidad-foral.html",
  "12-pagas-vs-14-pagas.html",
  "que-se-descuenta-de-una-nomina.html",
  "guias.html",
  "subida-sueldo-5000.html",
  "retencion-irpf-vs-renta.html",
  "metodologia.html",
  "guias/tabla-retenciones-irpf-alava-2026.html",
  "guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026.html",
  "guias/tabla-retenciones-irpf-navarra-2026.html",
  "guias/tabla-retenciones-irpf-gipuzkoa-2026.html",
  "cookies.html",
  "contacto.html",
  "sobre-sueldo-claro.html"
];

const TIPOS_JSONLD_VALIDOS = ["WebApplication", "WebPage"];

// -----------------------------------------------------------------------
// Utilidades de archivo / URL
// -----------------------------------------------------------------------

function leer(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function existeArchivo(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

// "index.html" -> "/"; "guias/foo.html" -> "/guias/foo"
function cleanUrlFromFile(file) {
  if (file === "index.html") return "/";
  return "/" + file.replace(/\.html$/, "");
}

// "/guias/foo" -> "guias/foo.html"; "/" -> "index.html"
function fileFromCleanUrl(cleanUrl) {
  if (cleanUrl === "/" || cleanUrl === "") return "index.html";
  return cleanUrl.replace(/^\//, "").replace(/\/$/, "") + ".html";
}

function resolveHref(href, fromCleanUrl) {
  // Solo resolvemos enlaces internos de navegación (rutas), nunca
  // mailto:/tel:/http(s) externos ni anclas puras.
  if (/^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href)) return null;
  if (href.startsWith("#")) return null;
  let target = href.split("#")[0].split("?")[0];
  if (target === "") return fromCleanUrl; // ancla dentro de la misma página
  if (target.startsWith("/")) return target.replace(/\/$/, "") || "/";
  // Relativo: se resuelve contra el directorio de la página actual, tal
  // y como lo haría el navegador — así detectamos exactamente el mismo
  // bug que ya sufrimos una vez con /guias/... y enlaces relativos.
  const dir = fromCleanUrl === "/" ? "/" : fromCleanUrl.replace(/\/[^/]*$/, "") || "/";
  const joined = path.posix.normalize(path.posix.join(dir, target));
  return joined === "" ? "/" : joined;
}

// -----------------------------------------------------------------------
// Extracción de hechos de una página HTML
// -----------------------------------------------------------------------

function textoVisible(html) {
  // Extrae el texto de <main>...</main> y le quita etiquetas/scripts, solo
  // para medir "hay contenido real" y comparar similitud — no es un
  // extractor de contenido de precisión, es deliberadamente tosco.
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  const bloque = main ? main[1] : html;
  return bloque
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerHrefs(html) {
  return Array.from(html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)).map((m) => m[1]);
}

function extraerIds(html) {
  return Array.from(html.matchAll(/\bid="([^"]+)"/g)).map((m) => m[1]);
}

function extraerHeadingSequence(html) {
  return Array.from(html.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/g)).map((m) => ({
    nivel: Number(m[1]),
    texto: m[2].replace(/<[^>]+>/g, "").trim()
  }));
}

function extraerRelacionadasCall(html, pagesJsSrc) {
  // Busca App.renderRelacionadas("id"[, "activeId"]) primero inline en el
  // propio HTML, y si no está, en el pages/*.js que la página cargue.
  const re = /App\.renderRelacionadas\(\s*"([^"]+)"\s*(?:,\s*"([^"]+)")?\s*\)/;
  let m = html.match(re);
  if (m) return { containerId: m[1], activeId: m[2] || null };
  if (pagesJsSrc) {
    m = pagesJsSrc.match(re);
    if (m) return { containerId: m[1], activeId: m[2] || null };
  }
  return null;
}

function extraerPagesJsSrc(html) {
  const m = html.match(/<script src="(?:\/)?pages\/([a-zA-Z0-9\-]+)\.js"/);
  if (!m) return null;
  const rel = "pages/" + m[1] + ".js";
  return existeArchivo(rel) ? leer(rel) : null;
}

function extractFacts(file) {
  const html = leer(file);
  const cleanUrl = cleanUrlFromFile(file);
  const pagesJsSrc = extraerPagesJsSrc(html);

  const titleMatches = Array.from(html.matchAll(/<title>([\s\S]*?)<\/title>/g)).map((m) => m[1]);
  const descMatches = Array.from(html.matchAll(/<meta name="description" content="([^"]*)">/g)).map((m) => m[1]);
  const robotsMeta = (html.match(/<meta name="robots" content="([^"]*)">/) || [])[1] || null;
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)">/) || [])[1] || null;
  const ogTitle = (html.match(/<meta property="og:title" content="([^"]*)">/) || [])[1] || null;
  const ogDescription = (html.match(/<meta property="og:description" content="([^"]*)">/) || [])[1] || null;
  const ogUrl = (html.match(/<meta property="og:url" content="([^"]*)">/) || [])[1] || null;
  const ogType = (html.match(/<meta property="og:type" content="([^"]*)">/) || [])[1] || null;
  const hasViewport = /<meta name="viewport" content="width=device-width, initial-scale=1">/.test(html);

  const jsonLdBlocks = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map(
    (m) => m[1]
  );

  const h1s = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)).map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  const headingSequence = extraerHeadingSequence(html);
  const ids = extraerIds(html);
  const hrefsRaw = extraerHrefs(html);
  const relacionadasCall = extraerRelacionadasCall(html, pagesJsSrc);

  return {
    file,
    cleanUrl,
    html,
    title: titleMatches[0] || null,
    titleCount: titleMatches.length,
    description: descMatches[0] || null,
    descriptionCount: descMatches.length,
    robotsMeta,
    canonical,
    ogTitle,
    ogDescription,
    ogUrl,
    ogType,
    hasViewport,
    jsonLdBlocks,
    h1s,
    headingSequence,
    ids,
    hrefsRaw,
    hasTopnav: /id="topnav"/.test(html),
    hasFooterContainer: /<footer class="footer" id="footer"><\/footer>/.test(html),
    relacionadasCall,
    mainText: textoVisible(html),
    // El resultado (y su disclaimer) de las calculadoras se renderiza por
    // JS dentro de un contenedor vacío en el HTML estático — el propio
    // "no sustituye asesoramiento" vive como texto en pages/*.js o en
    // assets/js/components.js (App.DISCLAIMER), no en el HTML servido.
    // Se expone aquí para que checkConfianza pueda buscarlo sin necesitar
    // un navegador real.
    pagesJsSrc: pagesJsSrc || ""
  };
}

// -----------------------------------------------------------------------
// Componentes compartidos (nav/footer/relacionadas) generados en runtime
// por assets/js/components.js — parseados aquí para que el grafo de
// enlaces entienda esos enlaces "invisibles" en el HTML fuente.
// -----------------------------------------------------------------------

function extraerArrayDeObjetos(js, nombreVar) {
  const inicio = js.indexOf("var " + nombreVar + " = [");
  if (inicio === -1) return [];
  const cierre = js.indexOf("\n  ];", inicio);
  const bloque = js.slice(inicio, cierre === -1 ? undefined : cierre);
  // Cada objeto puede tener o no "id:" (FOOTER_LINKS solo tiene href/label),
  // así que se extrae cada { ... } por separado y luego "href" e "id"
  // dentro de él, en vez de exigir un orden fijo de propiedades.
  return Array.from(bloque.matchAll(/\{[^}]*\}/g))
    .map((m) => {
      const objeto = m[0];
      const href = (objeto.match(/href:\s*"([^"]+)"/) || [])[1];
      const id = (objeto.match(/id:\s*"([^"]+)"/) || [])[1] || null;
      return href ? { id, href } : null;
    })
    .filter(Boolean);
}

function parseComponentsJs() {
  const js = leer("assets/js/components.js");
  const PAGES_ARR = extraerArrayDeObjetos(js, "PAGES");
  const REGIONES_ARR = extraerArrayDeObjetos(js, "REGIONES");
  const CATEGORIAS_ARR = extraerArrayDeObjetos(js, "CATEGORIAS");
  const FOOTER_LINKS_ARR = extraerArrayDeObjetos(js, "FOOTER_LINKS");

  // Enlaces escritos a mano dentro de renderNav (p. ej. "Ver todos los
  // territorios" -> /fiscalidad-foral), que no viven en ningún array.
  const inicioNav = js.indexOf("function renderNav");
  const finNav = js.indexOf("function renderRelacionadas", inicioNav);
  const cuerpoNav = inicioNav === -1 ? "" : js.slice(inicioNav, finNav === -1 ? undefined : finNav);
  const hardcodedNavHrefs = Array.from(cuerpoNav.matchAll(/href="(\/[a-zA-Z0-9\-]*)"/g)).map((m) => m[1]);

  return { PAGES_ARR, REGIONES_ARR, CATEGORIAS_ARR, FOOTER_LINKS_ARR, hardcodedNavHrefs };
}

// -----------------------------------------------------------------------
// Grafo de enlaces internos (literales del HTML + generados por JS)
// -----------------------------------------------------------------------

// Lee _redirects (formato Cloudflare Pages: "/desde /hasta 301") una sola
// vez. Un enlace hacia un "/desde" sigue funcionando en producción (no es
// un enlace roto), pero merece su propio aviso: se podría enlazar
// directamente al destino final.
function parseRedirects() {
  if (!existeArchivo("_redirects")) return [];
  return leer("_redirects")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const partes = l.split(/\s+/);
      return { from: partes[0], to: partes[1], status: partes[2] || "301" };
    });
}

// Un path resuelto puede ser servible aunque no coincida con el cleanUrl
// canónico de esa misma página (p. ej. "/index" o "/privacidad.html"
// sirven igual que "/" o "/privacidad" gracias a la resolución de
// Cloudflare Pages de "<path>.html"). Se reduce aquí a su cleanUrl real
// para no fragmentar el grafo de enlaces ni marcarlo como roto.
function canonicalizeResolved(resuelto) {
  const file = fileFromCleanUrl(resuelto);
  if (existeArchivo(file)) return cleanUrlFromFile(file);
  return null; // no corresponde a ningún archivo real
}

function buildLinkGraph(pagesFacts, componentes) {
  const navDestinos = [
    ...componentes.PAGES_ARR.map((p) => p.href),
    ...componentes.REGIONES_ARR.map((p) => p.href),
    ...componentes.CATEGORIAS_ARR.map((p) => p.href),
    ...componentes.hardcodedNavHrefs
  ];
  const footerDestinos = componentes.FOOTER_LINKS_ARR.map((p) => p.href);
  const redirects = parseRedirects();

  const outbound = new Map(); // cleanUrl -> { literal: Set, virtual: Set }
  const brokenLinks = []; // { from, href, resuelveA }
  const relativeFromNested = []; // { from, href }
  const nonCanonicalLinks = []; // { from, href, resuelveA, canonical } — funciona, pero no es la URL limpia
  const redirectLinks = []; // { from, href, resuelveA, canonical, status } — pasa por _redirects

  for (const p of pagesFacts) {
    const literal = new Set();
    const virtual = new Set();

    for (const href of p.hrefsRaw) {
      const resuelto = resolveHref(href, p.cleanUrl);
      if (resuelto === null) continue; // externo / mailto / ancla pura
      if (resuelto === p.cleanUrl) continue; // ancla dentro de la misma página

      const esRelativo = !href.startsWith("/") && !href.startsWith("#");
      const anidada = p.cleanUrl.split("/").filter(Boolean).length > 1;
      if (esRelativo && anidada) relativeFromNested.push({ from: p.cleanUrl, href });

      const regla = redirects.find((r) => r.from === resuelto);
      if (regla) {
        redirectLinks.push({ from: p.cleanUrl, href, resuelveA: resuelto, canonical: regla.to, status: regla.status });
        literal.add(regla.to);
        continue;
      }

      const canon = canonicalizeResolved(resuelto);
      if (canon === null) {
        brokenLinks.push({ from: p.cleanUrl, href, resuelveA: resuelto });
        continue;
      }
      if (canon !== resuelto) {
        nonCanonicalLinks.push({ from: p.cleanUrl, href, resuelveA: resuelto, canonical: canon });
      }
      literal.add(canon);
    }

    if (p.hasTopnav) {
      for (const href of navDestinos) if (href !== p.cleanUrl) virtual.add(href);
    }
    if (p.hasFooterContainer) {
      for (const href of footerDestinos) if (href !== p.cleanUrl) virtual.add(href);
    }
    if (p.relacionadasCall) {
      const activoHref = componentes.PAGES_ARR.find((x) => x.id === p.relacionadasCall.activeId);
      for (const item of componentes.PAGES_ARR) {
        if (item.href === p.cleanUrl) continue;
        if (activoHref && item.href === activoHref.href) continue;
        virtual.add(item.href);
      }
    }

    outbound.set(p.cleanUrl, { literal, virtual });
  }

  const incoming = new Map(); // cleanUrl -> Set(cleanUrl de quien enlaza)
  for (const p of pagesFacts) incoming.set(p.cleanUrl, new Set());
  for (const [origen, sets] of outbound) {
    for (const destino of new Set([...sets.literal, ...sets.virtual])) {
      if (incoming.has(destino)) incoming.get(destino).add(origen);
    }
  }

  return { outbound, incoming, brokenLinks, relativeFromNested, nonCanonicalLinks, redirectLinks };
}

// -----------------------------------------------------------------------
// Config editorial (tools/seo-config.json), opcional
// -----------------------------------------------------------------------

function loadSeoConfig() {
  const p = path.join(ROOT, "tools", "seo-config.json");
  if (!fs.existsSync(p)) return { pages: {} };
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    return { pages: data.pages || {} };
  } catch (e) {
    throw new Error("tools/seo-config.json inválido: " + e.message);
  }
}

// -----------------------------------------------------------------------
// Carga de todos los hechos de una vez (usada por check-seo-basics.js y
// seo-audit.js) — un único punto de entrada para no repetir el orden de
// llamadas en cada script.
// -----------------------------------------------------------------------

function cargarTodo() {
  const facts = PAGES.map((f) => extractFacts(f));
  const componentes = parseComponentsJs();
  const graph = buildLinkGraph(facts, componentes);
  const config = loadSeoConfig();
  const sitemap = leer("sitemap.xml");
  const robotsTxt = leer("robots.txt");
  return { facts, componentes, graph, config, sitemap, robotsTxt };
}

function finding(severity, category, page, code, message) {
  return { severity, category, page, code, message };
}

// -----------------------------------------------------------------------
// REGLAS — 1. SEO TÉCNICO
//
// Mismas comprobaciones que ya hacía tools/check-seo-basics.js
// (title/meta description/canonical/robots/OG/JSON-LD/#relacionadas/
// sitemap/robots.txt/<html lang>), más las nuevas de esta ampliación
// (jerarquía de encabezados, IDs duplicados, href vacíos/"#", OG
// coherente con canonical, viewport, canonical duplicado entre páginas,
// URLs del sitemap que no corresponden a ningún archivo real). Las
// longitudes de title/meta description son ADVERTENCIA, nunca error: una
// desviación de la horquilla orientativa no rompe nada.
// -----------------------------------------------------------------------

function checkTecnico(ctx) {
  const out = [];
  const { facts, sitemap, robotsTxt } = ctx;

  const canonicalesVistos = new Map(); // canonical -> [cleanUrl,...]

  for (const p of facts) {
    if (!/<html[^>]*\blang="es"/.test(p.html)) {
      out.push(finding("error", "technical", p.cleanUrl, "HTML_LANG_MISSING", '<html> sin lang="es".'));
    }

    // title
    if (!p.title || !p.title.trim()) {
      out.push(finding("error", "technical", p.cleanUrl, "TITLE_MISSING", "Falta <title> o está vacío."));
    } else if (p.titleCount > 1) {
      out.push(finding("error", "technical", p.cleanUrl, "TITLE_MULTIPLE", "Hay más de un <title> en la página."));
    } else if (p.title.length < 15 || p.title.length > 70) {
      out.push(
        finding(
          "warning",
          "technical",
          p.cleanUrl,
          "TITLE_LENGTH",
          "Longitud de title fuera del rango orientativo 15-70 (" + p.title.length + " caracteres). No es un error, solo revisa si se corta en resultados de búsqueda."
        )
      );
    }

    // meta description
    if (!p.description || !p.description.trim()) {
      out.push(finding("error", "technical", p.cleanUrl, "DESC_MISSING", "Falta meta description o está vacía."));
    } else if (p.descriptionCount > 1) {
      out.push(finding("error", "technical", p.cleanUrl, "DESC_MULTIPLE", "Hay más de una meta description."));
    } else if (p.description.length < 50 || p.description.length > 165) {
      out.push(
        finding(
          "warning",
          "technical",
          p.cleanUrl,
          "DESC_LENGTH",
          "Longitud de meta description fuera del rango orientativo 50-165 (" + p.description.length + " caracteres)."
        )
      );
    }

    // H1
    if (p.h1s.length === 0) {
      out.push(finding("error", "technical", p.cleanUrl, "H1_MISSING", "No hay ningún <h1>."));
    } else if (p.h1s.length > 1) {
      out.push(finding("error", "technical", p.cleanUrl, "H1_MULTIPLE", "Hay " + p.h1s.length + " elementos <h1> (debe haber exactamente uno)."));
    } else if (!p.h1s[0]) {
      out.push(finding("error", "technical", p.cleanUrl, "H1_EMPTY", "El <h1> está vacío."));
    }

    // Jerarquía de encabezados: solo saltos evidentes (p.ej. h1 -> h3 sin
    // pasar por h2). Es una advertencia de estructura, no una regla de
    // longitud ni de cuántos H2 "debería" haber.
    let nivelAnterior = 1;
    for (const h of p.headingSequence) {
      if (h.nivel - nivelAnterior > 1) {
        out.push(
          finding(
            "warning",
            "technical",
            p.cleanUrl,
            "HEADING_SKIP",
            "Salto de jerarquía: h" + nivelAnterior + " seguido de h" + h.nivel + ' ("' + h.texto.slice(0, 60) + '").'
          )
        );
      }
      nivelAnterior = h.nivel;
    }

    // IDs duplicados dentro de la misma página
    const vistos = new Map();
    for (const id of p.ids) vistos.set(id, (vistos.get(id) || 0) + 1);
    for (const [id, n] of vistos) {
      if (n > 1) out.push(finding("error", "technical", p.cleanUrl, "ID_DUPLICATE", 'El id="' + id + '" aparece ' + n + " veces en la misma página."));
    }

    // href="" / href="#"
    for (const href of p.hrefsRaw) {
      if (href.trim() === "") out.push(finding("error", "technical", p.cleanUrl, "HREF_EMPTY", 'Hay un href="" (enlace vacío).'));
    }
    const hashCount = p.hrefsRaw.filter((h) => h === "#").length;
    if (hashCount > 0) {
      out.push(finding("warning", "technical", p.cleanUrl, "HREF_HASH", 'Hay ' + hashCount + ' enlace(s) href="#" sin destino real — revisa si es intencional (p. ej. un placeholder de UI).'));
    }

    // canonical
    if (!p.canonical) {
      out.push(finding("error", "technical", p.cleanUrl, "CANONICAL_MISSING", "Falta <link rel=\"canonical\">."));
    } else {
      if (!p.canonical.startsWith("https://")) {
        out.push(finding("error", "technical", p.cleanUrl, "CANONICAL_NOT_HTTPS", "El canonical no es una URL absoluta https://."));
      }
      const esperado = SITE_ORIGIN + (p.cleanUrl === "/" ? "/" : p.cleanUrl);
      if (p.canonical !== esperado) {
        out.push(
          finding(
            "error",
            "technical",
            p.cleanUrl,
            "CANONICAL_MISMATCH",
            "El canonical (" + p.canonical + ") no coincide con la URL limpia esperada (" + esperado + ")."
          )
        );
      }
      if (!canonicalesVistos.has(p.canonical)) canonicalesVistos.set(p.canonical, []);
      canonicalesVistos.get(p.canonical).push(p.cleanUrl);
    }

    // Open Graph
    if (!p.ogTitle) out.push(finding("error", "technical", p.cleanUrl, "OG_TITLE_MISSING", "Falta og:title."));
    if (!p.ogDescription) out.push(finding("error", "technical", p.cleanUrl, "OG_DESC_MISSING", "Falta og:description."));
    if (!p.ogUrl) {
      out.push(finding("error", "technical", p.cleanUrl, "OG_URL_MISSING", "Falta og:url."));
    } else if (p.canonical && p.ogUrl !== p.canonical) {
      out.push(finding("error", "technical", p.cleanUrl, "OG_URL_MISMATCH", "og:url (" + p.ogUrl + ") no coincide con el canonical."));
    }

    // meta robots — cualquier página de la lista PAGES se asume
    // indexable por definición (no está en PAGES si no debería estarlo,
    // como ya excluye 404.html).
    if (p.robotsMeta && /noindex/i.test(p.robotsMeta)) {
      out.push(finding("error", "technical", p.cleanUrl, "NOINDEX_UNEXPECTED", "Tiene meta robots noindex pero está en la lista de páginas indexables."));
    }

    // JSON-LD
    if (p.jsonLdBlocks.length === 0) {
      out.push(finding("error", "technical", p.cleanUrl, "JSONLD_MISSING", "Falta un bloque JSON-LD."));
    } else {
      try {
        const data = JSON.parse(p.jsonLdBlocks[0]);
        if (!TIPOS_JSONLD_VALIDOS.includes(data["@type"])) {
          out.push(finding("error", "technical", p.cleanUrl, "JSONLD_TYPE", "JSON-LD con @type inesperado (" + data["@type"] + ")."));
        }
      } catch (e) {
        out.push(finding("error", "technical", p.cleanUrl, "JSONLD_INVALID", "JSON-LD inválido: " + e.message));
      }
    }

    if (!/id="relacionadas"/.test(p.html)) {
      out.push(finding("error", "technical", p.cleanUrl, "RELACIONADAS_MISSING", 'Falta el contenedor de enlazado interno id="relacionadas".'));
    }

    // Responsive a nivel estructural: solo lo que se puede comprobar de
    // forma estática, sin inventar un resultado visual.
    if (!p.hasViewport) {
      out.push(finding("error", "technical", p.cleanUrl, "VIEWPORT_MISSING", "Falta la meta viewport (width=device-width, initial-scale=1)."));
    }
  }

  // Canonical duplicado entre páginas distintas
  for (const [canonical, paginas] of canonicalesVistos) {
    if (paginas.length > 1) {
      out.push(finding("error", "technical", null, "CANONICAL_DUPLICATE", "El canonical " + canonical + " se repite en: " + paginas.join(", ") + "."));
    }
  }

  // sitemap.xml
  if (!/^<\?xml version="1\.0"/.test(sitemap.trim())) out.push(finding("error", "technical", null, "SITEMAP_XML_DECL", "sitemap.xml: falta la declaración XML."));
  if (!/<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(sitemap)) {
    out.push(finding("error", "technical", null, "SITEMAP_NAMESPACE", "sitemap.xml: falta o es incorrecto el namespace de <urlset>."));
  }
  const locs = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);
  const locsSet = new Set();
  for (const loc of locs) {
    if (locsSet.has(loc)) out.push(finding("error", "technical", null, "SITEMAP_DUPLICATE", "sitemap.xml: la URL " + loc + " está duplicada."));
    locsSet.add(loc);
  }
  const canonicalesEsperados = facts.filter((p) => p.canonical).map((p) => p.canonical);
  for (const url of canonicalesEsperados) {
    if (!locs.includes(url)) out.push(finding("error", "technical", null, "SITEMAP_PAGE_MISSING", "sitemap.xml: falta la página indexable " + url + "."));
  }
  for (const loc of locsSet) {
    const cleanUrl = loc.replace(SITE_ORIGIN, "") || "/";
    const existeComoArchivo = existeArchivo(fileFromCleanUrl(cleanUrl));
    if (!existeComoArchivo) {
      out.push(finding("error", "technical", null, "SITEMAP_DEAD_URL", "sitemap.xml apunta a " + loc + ", que no corresponde a ninguna página existente."));
    }
  }

  // robots.txt
  if (!/Sitemap:\s*https:\/\/calcularsalarioneto\.es\/sitemap\.xml/.test(robotsTxt)) {
    out.push(finding("error", "technical", null, "ROBOTS_NO_SITEMAP", "robots.txt no referencia sitemap.xml."));
  }
  if (/Disallow:\s*\/\s*$/m.test(robotsTxt)) {
    out.push(finding("error", "technical", null, "ROBOTS_BLOCKS_ALL", "robots.txt bloquea todo el sitio (Disallow: /)."));
  }
  for (const p of facts) {
    const rel = p.cleanUrl === "/" ? "/" : p.cleanUrl;
    const bloqueada = new RegExp("Disallow:\\s*" + rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "m").test(robotsTxt);
    if (bloqueada) out.push(finding("error", "technical", p.cleanUrl, "ROBOTS_BLOCKS_PAGE", "robots.txt bloquea " + rel + ", una página que debería indexarse."));
  }

  return out;
}

// -----------------------------------------------------------------------
// REGLAS — 2. CONTENIDO E INTENCIÓN
//
// Deliberadamente SIN mitos SEO: nada de densidad de keywords, longitud
// mínima obligatoria ni keyword forzada en cada H2. Solo detecta páginas
// prácticamente vacías, duplicados exactos entre páginas, solapamiento
// heurístico (siempre como aviso de revisión manual, nunca como
// "canibalización confirmada") y, si hay tools/seo-config.json, si el
// tema objetivo declarado está representado de forma no rígida.
// -----------------------------------------------------------------------

const STOPWORDS_ES = new Set([
  "de", "la", "el", "en", "y", "a", "que", "los", "las", "un", "una", "es", "por", "con", "para",
  "su", "al", "se", "del", "lo", "más", "o", "como", "tu", "no", "si", "sin", "sobre", "entre",
  "según", "cada", "otro", "otra", "este", "esta", "esa", "ese", "qué", "cómo", "cuánto", "cuánta"
]);

function tokenizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos para comparar de forma tosca pero estable
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS_ES.has(w));
}

function jaccard(setA, setB) {
  const inter = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

function checkContenido(ctx) {
  const out = [];
  const { facts, config } = ctx;
  const UMBRAL_VACIO_PALABRAS = 40; // no es un mínimo SEO, es un suelo de "aquí no hay nada"
  const UMBRAL_SIMILITUD = 0.55;

  const porTitle = new Map();
  const porDesc = new Map();
  const porH1 = new Map();
  const tokenSets = new Map();

  for (const p of facts) {
    const palabras = p.mainText.split(/\s+/).filter(Boolean);
    if (palabras.length < UMBRAL_VACIO_PALABRAS) {
      out.push(
        finding(
          "warning",
          "content",
          p.cleanUrl,
          "CONTENT_THIN",
          "El contenido principal parece extremadamente escaso (~" + palabras.length + " palabras). No es una exigencia de longitud SEO, es una comprobación de que la página no esté prácticamente vacía."
        )
      );
    }

    if (p.title) {
      const k = p.title.trim().toLowerCase();
      if (!porTitle.has(k)) porTitle.set(k, []);
      porTitle.get(k).push(p.cleanUrl);
    }
    if (p.description) {
      const k = p.description.trim().toLowerCase();
      if (!porDesc.has(k)) porDesc.set(k, []);
      porDesc.get(k).push(p.cleanUrl);
    }
    if (p.h1s[0]) {
      const k = p.h1s[0].trim().toLowerCase();
      if (!porH1.has(k)) porH1.set(k, []);
      porH1.get(k).push(p.cleanUrl);
    }
    tokenSets.set(p.cleanUrl, new Set(tokenizar(p.mainText)));

    // Target / intención editorial (opcional, vía tools/seo-config.json)
    const cfg = config.pages[p.cleanUrl];
    if (cfg && cfg.target) {
      const palabrasObjetivo = tokenizar(cfg.target);
      const enTitle = tokenizar(p.title || "");
      const enH1 = tokenizar(p.h1s[0] || "");
      const intro = p.mainText.slice(0, 600);
      const enIntro = tokenizar(intro);
      const cobertura = (lista, contra) => lista.filter((w) => contra.includes(w)).length / Math.max(1, lista.length);
      const cTitle = cobertura(palabrasObjetivo, enTitle);
      const cH1 = cobertura(palabrasObjetivo, enH1);
      const cIntro = cobertura(palabrasObjetivo, enIntro);
      const representado = cTitle >= 0.5 || cH1 >= 0.5 || cIntro >= 0.4;
      if (representado) {
        out.push(finding("ok", "content", p.cleanUrl, "TARGET_REPRESENTED", 'Intención "' + cfg.intent + '" — el tema objetivo ("' + cfg.target + '") está representado en title/H1/introducción.'));
      } else {
        out.push(
          finding(
            "warning",
            "content",
            p.cleanUrl,
            "TARGET_NOT_REPRESENTED",
            'El tema objetivo configurado ("' + cfg.target + '") no parece bien representado en title/H1/introducción. Orientativo: no implica repetir la frase exacta, solo que el tema quede claro pronto.'
          )
        );
      }
    }
  }

  for (const [, paginas] of porTitle) if (paginas.length > 1) out.push(finding("warning", "content", null, "TITLE_DUPLICATE", "Title idéntico en: " + paginas.join(", ") + "."));
  for (const [, paginas] of porDesc) if (paginas.length > 1) out.push(finding("warning", "content", null, "DESC_DUPLICATE", "Meta description idéntica en: " + paginas.join(", ") + "."));
  for (const [, paginas] of porH1) if (paginas.length > 1) out.push(finding("warning", "content", null, "H1_DUPLICATE", "H1 idéntico en: " + paginas.join(", ") + "."));

  // Similitud de contenido — heurística de bolsa de palabras (Jaccard).
  // Nunca se afirma canibalización: solo se señala para revisión manual.
  const urls = [...tokenSets.keys()];
  const yaAvisado = new Set();
  for (let i = 0; i < urls.length; i++) {
    for (let j = i + 1; j < urls.length; j++) {
      const a = urls[i];
      const b = urls[j];
      const setA = tokenSets.get(a);
      const setB = tokenSets.get(b);
      if (setA.size < 30 || setB.size < 30) continue; // demasiado poco texto para que la métrica signifique algo
      const sim = jaccard(setA, setB);
      if (sim >= UMBRAL_SIMILITUD) {
        const clave = [a, b].sort().join("|");
        if (yaAvisado.has(clave)) continue;
        yaAvisado.add(clave);
        out.push(
          finding(
            "manual",
            "content",
            null,
            "CONTENT_OVERLAP",
            "Posible solapamiento/canibalización — revisar manualmente: " + a + " y " + b + " comparten un vocabulario muy similar (~" + Math.round(sim * 100) + "%)."
          )
        );
      }
    }
  }

  return out;
}

// -----------------------------------------------------------------------
// REGLAS — 3. ENLAZADO INTERNO
// -----------------------------------------------------------------------

function checkEnlazado(ctx) {
  const out = [];
  const { facts, graph, config } = ctx;

  for (const b of graph.brokenLinks) {
    out.push(finding("error", "links", b.from, "LINK_BROKEN", 'Enlace interno roto: href="' + b.href + '" no corresponde a ninguna página existente.'));
  }
  for (const r of graph.relativeFromNested) {
    out.push(
      finding(
        "error",
        "links",
        r.from,
        "LINK_RELATIVE_NESTED",
        'Enlace relativo peligroso desde una página anidada: href="' + r.href + '" se resolvería contra el directorio actual, no contra la raíz del sitio.'
      )
    );
  }
  for (const n of graph.nonCanonicalLinks) {
    out.push(
      finding(
        "warning",
        "links",
        n.from,
        "LINK_NON_CANONICAL",
        'Enlace a "' + n.href + '" funciona pero no es la URL limpia — usa directamente ' + n.canonical + "."
      )
    );
  }
  for (const r of graph.redirectLinks) {
    out.push(
      finding(
        "warning",
        "links",
        r.from,
        "LINK_VIA_REDIRECT",
        'Enlace a "' + r.href + '" pasa por una redirección ' + r.status + " hacia " + r.canonical + " — enlaza directamente al destino final."
      )
    );
  }

  for (const p of facts) {
    const incoming = graph.incoming.get(p.cleanUrl);
    if (incoming.size === 0) {
      out.push(finding("warning", "links", p.cleanUrl, "ORPHAN_PAGE", "Página huérfana: ninguna otra página enlaza a esta (ni en el contenido, ni por nav/footer)."));
    }

    const cfg = config.pages[p.cleanUrl];
    if (cfg && Array.isArray(cfg.related) && cfg.related.length > 0) {
      const outboundSet = new Set([...graph.outbound.get(p.cleanUrl).literal, ...graph.outbound.get(p.cleanUrl).virtual]);
      for (const relacionUrl of cfg.related) {
        if (outboundSet.has(relacionUrl)) {
          out.push(finding("ok", "links", p.cleanUrl, "RELATED_LINK_OK", "Enlaza correctamente con la página relacionada configurada: " + relacionUrl + "."));
        } else {
          out.push(
            finding(
              "warning",
              "links",
              p.cleanUrl,
              "RELATED_LINK_MISSING",
              "Relación editorial configurada pero no encontrada: debería enlazar (directa o indirectamente vía nav/footer) a " + relacionUrl + "."
            )
          );
        }
      }
    }
  }

  return out;
}

// -----------------------------------------------------------------------
// REGLAS — 4. CONFIANZA / TRANSPARENCIA
// -----------------------------------------------------------------------

const PAGINAS_CONFIANZA = ["/metodologia", "/sobre-sueldo-claro", "/contacto", "/privacidad", "/cookies", "/aviso-legal"];

// Dominios que reconocemos como fuente oficial plausible. Si el enlace
// externo no coincide con ninguno, nunca se aprueba en falso: se marca
// como revisión manual.
const DOMINIOS_OFICIALES = [
  "agenciatributaria.gob.es",
  "sede.agenciatributaria.gob.es",
  "seg-social.es",
  "boe.es",
  "araba.eus",
  "web.araba.eus",
  "bizkaia.eus",
  "gipuzkoa.eus",
  "navarra.es",
  "aepd.es"
];

const DISCLAIMER_REGEX = /no sustituye[n]?|no constituye asesoramiento/i;

function checkConfianza(ctx) {
  const out = [];
  const { facts, graph, config } = ctx;
  // El disclaimer de la mayoría de calculadoras es una sola constante
  // compartida (App.DISCLAIMER, en assets/js/components.js) referenciada
  // desde cada pages/*.js — se lee una sola vez aquí para no repetir la
  // lectura de disco por página.
  const componentsJsSrc = existeArchivo("assets/js/components.js") ? leer("assets/js/components.js") : "";
  const componentsTieneDisclaimer = DISCLAIMER_REGEX.test(componentsJsSrc);

  for (const destino of PAGINAS_CONFIANZA) {
    if (!existeArchivo(fileFromCleanUrl(destino))) {
      out.push(finding("error", "trust", null, "TRUST_PAGE_MISSING", "Falta la página de confianza " + destino + "."));
      continue;
    }
    const incoming = graph.incoming.get(destino);
    if (!incoming || incoming.size === 0) {
      out.push(finding("error", "trust", destino, "TRUST_PAGE_UNREACHABLE", "La página de confianza " + destino + " no está enlazada desde ningún sitio (ni siquiera el footer)."));
    }
  }

  for (const p of facts) {
    const cfg = config.pages[p.cleanUrl];
    if (!cfg) continue;

    if (cfg.requiresMethodology) {
      const enlazaMetodologia = graph.outbound.get(p.cleanUrl).literal.has("/metodologia") || graph.outbound.get(p.cleanUrl).virtual.has("/metodologia");
      out.push(
        enlazaMetodologia
          ? finding("ok", "trust", p.cleanUrl, "METHODOLOGY_LINKED", "Enlaza a /metodologia.")
          : finding("warning", "trust", p.cleanUrl, "METHODOLOGY_MISSING", "Está configurada como que requiere enlace a /metodologia, pero no se encuentra.")
      );
    }

    if (cfg.requiresOfficialSource) {
      const externos = p.hrefsRaw.filter((h) => /^https?:\/\//.test(h));
      const oficial = externos.find((h) => DOMINIOS_OFICIALES.some((d) => h.includes(d)));
      if (oficial) {
        out.push(finding("ok", "trust", p.cleanUrl, "OFFICIAL_SOURCE_OK", "Enlaza a una fuente reconocida como oficial (" + oficial + ")."));
      } else if (externos.length > 0) {
        out.push(
          finding(
            "manual",
            "trust",
            p.cleanUrl,
            "OFFICIAL_SOURCE_MANUAL",
            "REVISIÓN MANUAL: tiene enlaces externos pero ninguno coincide con los dominios oficiales conocidos — no se puede confirmar automáticamente que la fuente sea oficial."
          )
        );
      } else {
        out.push(finding("warning", "trust", p.cleanUrl, "OFFICIAL_SOURCE_MISSING", "Está configurada como que requiere fuente oficial, pero no se encontró ningún enlace externo."));
      }
    }

    if (cfg.requiresDateContext) {
      const tieneFecha = /(vigente desde|actualizad[oa]|última actualización)/i.test(p.mainText) || /\b20\d{2}\b/.test(p.mainText);
      out.push(
        tieneFecha
          ? finding("ok", "trust", p.cleanUrl, "DATE_CONTEXT_OK", "Incluye contexto temporal (fecha o año de vigencia).")
          : finding("warning", "trust", p.cleanUrl, "DATE_CONTEXT_MISSING", "Está configurada como que requiere contexto temporal, pero no se detecta ninguna fecha/año de vigencia.")
      );
    }

    if (cfg.requiresDisclaimer) {
      // Deliberadamente NO se acepta la palabra suelta "orientativo/a": aparece
      // como etiqueta decorativa en la cabecera de casi cualquier página
      // ("Información orientativa") y por sí sola no es un disclaimer real.
      // Se exige una frase que indique de forma explícita que el resultado
      // no sustituye asesoramiento profesional — buscada tanto en el HTML
      // estático (guías) como en el pages/*.js de la calculadora, directa o
      // indirectamente a través de App.DISCLAIMER (assets/js/components.js).
      const usaDisclaimerCompartido = p.pagesJsSrc.includes("App.DISCLAIMER");
      const tieneDisclaimer =
        DISCLAIMER_REGEX.test(p.mainText) ||
        DISCLAIMER_REGEX.test(p.pagesJsSrc) ||
        (usaDisclaimerCompartido && componentsTieneDisclaimer);
      out.push(
        tieneDisclaimer
          ? finding("ok", "trust", p.cleanUrl, "DISCLAIMER_OK", "Incluye un disclaimer de herramienta orientativa.")
          : finding("warning", "trust", p.cleanUrl, "DISCLAIMER_MISSING", "Está configurada como que requiere disclaimer, pero no se detecta ninguno.")
      );
    }
  }

  return out;
}

module.exports = {
  ROOT,
  SITE_ORIGIN,
  PAGES,
  TIPOS_JSONLD_VALIDOS,
  leer,
  existeArchivo,
  cleanUrlFromFile,
  fileFromCleanUrl,
  resolveHref,
  extractFacts,
  parseComponentsJs,
  buildLinkGraph,
  loadSeoConfig,
  cargarTodo,
  finding,
  checkTecnico,
  checkContenido,
  checkEnlazado,
  checkConfianza
};
