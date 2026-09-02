"use strict";
/**
 * Lint de SEO técnico básico: cada página HTML debe tener title, meta
 * description, canonical, robots indexable, Open Graph mínimo y un bloque
 * JSON-LD válido; sitemap.xml debe listar exactamente esas páginas y
 * robots.txt debe apuntar al sitemap sin bloquearlas. Cero dependencias npm,
 * igual que tools/check-constants-sources.js.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
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
  "retencion-irpf-nomina-vs-declaracion-renta.html",
  "12-pagas-vs-14-pagas.html",
  "que-se-descuenta-de-una-nomina.html",
  "guias.html"
];

// Páginas de calculadora usan WebApplication; páginas informativas (legal,
// privacidad) usan WebPage — ambos son tipos JSON-LD válidos según lo que
// describen realmente, forzar WebApplication en una página legal sería un
// dato estructurado falso.
const TIPOS_JSONLD_VALIDOS = ["WebApplication", "WebPage"];

let errores = [];

function leer(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function matchOne(html, regex, label, file) {
  const m = html.match(regex);
  if (!m) errores.push(file + ": falta " + label);
  return m ? m[1] : null;
}

const canonicalesEsperados = [];

for (const file of PAGES) {
  const html = leer(file);

  if (!/<html[^>]*\blang="es"/.test(html)) errores.push(file + ": <html> sin lang=\"es\"");

  const title = matchOne(html, /<title>(.*?)<\/title>/s, "title", file);
  if (title && (title.length < 15 || title.length > 70)) {
    errores.push(file + ": title de longitud sospechosa (" + title.length + " caracteres): " + title);
  }

  const desc = matchOne(html, /<meta name="description" content="(.*?)">/s, "meta description", file);
  if (desc && (desc.length < 50 || desc.length > 165)) {
    errores.push(file + ": meta description de longitud sospechosa (" + desc.length + " caracteres)");
  }

  const robots = matchOne(html, /<meta name="robots" content="(.*?)">/s, "meta robots", file);
  if (robots && /noindex/i.test(robots)) errores.push(file + ": meta robots contiene noindex");

  const canonical = matchOne(html, /<link rel="canonical" href="(.*?)">/s, "canonical", file);
  if (canonical) canonicalesEsperados.push(canonical);

  matchOne(html, /<meta property="og:title" content="(.*?)">/s, "og:title", file);
  matchOne(html, /<meta property="og:description" content="(.*?)">/s, "og:description", file);
  matchOne(html, /<meta property="og:url" content="(.*?)">/s, "og:url", file);
  matchOne(html, /<meta property="og:type" content="website">/s, "og:type", file);

  const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ldJsonMatch) {
    errores.push(file + ": falta bloque JSON-LD");
  } else {
    try {
      const data = JSON.parse(ldJsonMatch[1]);
      if (!TIPOS_JSONLD_VALIDOS.includes(data["@type"])) errores.push(file + ": JSON-LD con @type inesperado (" + data["@type"] + ")");
    } catch (e) {
      errores.push(file + ": JSON-LD inválido (" + e.message + ")");
    }
  }

  const relacionadas = html.match(/id="relacionadas"/);
  if (!relacionadas) errores.push(file + ": falta el contenedor de enlazado interno #relacionadas");
}

// sitemap.xml
const sitemap = leer("sitemap.xml");
if (!/^<\?xml version="1\.0"/.test(sitemap.trim())) errores.push("sitemap.xml: falta la declaración XML");
if (!/<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(sitemap)) {
  errores.push("sitemap.xml: falta o es incorrecto el namespace de <urlset>");
}
const locsEnSitemap = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);
for (const url of canonicalesEsperados) {
  if (!locsEnSitemap.includes(url)) errores.push("sitemap.xml: falta la URL canónica " + url);
}
if (locsEnSitemap.length !== canonicalesEsperados.length) {
  errores.push("sitemap.xml: tiene " + locsEnSitemap.length + " URLs, se esperaban " + canonicalesEsperados.length);
}

// robots.txt
const robotsTxt = leer("robots.txt");
if (!/Sitemap:\s*https:\/\/calcularsalarioneto\.es\/sitemap\.xml/.test(robotsTxt)) {
  errores.push("robots.txt: no referencia sitemap.xml");
}
if (/Disallow:\s*\/\s*$/m.test(robotsTxt)) {
  errores.push("robots.txt: bloquea todo el sitio (Disallow: /)");
}
for (const file of PAGES) {
  const rel = file === "index.html" ? "/" : "/" + file;
  const bloqueada = new RegExp("Disallow:\\s*" + rel.replace(".", "\\.") + "\\s*$", "m").test(robotsTxt);
  if (bloqueada) errores.push("robots.txt: bloquea " + rel);
}

if (errores.length) {
  console.error("check-seo-basics: " + errores.length + " problema(s):");
  errores.forEach((e) => console.error("  - " + e));
  process.exit(1);
}

console.log("check-seo-basics: OK (" + PAGES.length + " páginas, sitemap y robots.txt consistentes)");
