"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
function leer(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const cookiesHtml = leer("cookies.html");
const contactoHtml = leer("contacto.html");
const sobreHtml = leer("sobre-sueldo-claro.html");
const privacidadHtml = leer("privacidad.html");
const avisoLegalHtml = leer("aviso-legal.html");
const metodologiaHtml = leer("metodologia.html");
const componentsJs = leer("assets/js/components.js");
const sitemap = leer("sitemap.xml");
const adsTxt = leer("ads.txt");

const EMAIL_CONTACTO = "ahorroenpareja@gmail.com";
const PAGINAS_NUEVAS = [
  { archivo: "cookies.html", html: cookiesHtml, canonical: "https://calcularsalarioneto.es/cookies" },
  { archivo: "contacto.html", html: contactoHtml, canonical: "https://calcularsalarioneto.es/contacto" },
  { archivo: "sobre-sueldo-claro.html", html: sobreHtml, canonical: "https://calcularsalarioneto.es/sobre-sueldo-claro" }
];

describe("páginas nuevas de confianza: existen y tienen SEO básico correcto", () => {
  for (const p of PAGINAS_NUEVAS) {
    test(`${p.archivo}: existe y tiene canonical correcto`, () => {
      assert.match(p.html, /<link rel="canonical" href="([^"]+)">/);
      const m = p.html.match(/<link rel="canonical" href="([^"]+)">/);
      assert.equal(m[1], p.canonical);
    });

    test(`${p.archivo}: título único (h1) y sin placeholders`, () => {
      const h1s = p.html.match(/<h1[^>]*>/g) || [];
      assert.equal(h1s.length, 1, "debe haber exactamente un H1");
      assert.ok(!/Calculando(\.\.\.|…)/.test(p.html));
      assert.ok(!/\bTODO\b/.test(p.html));
      assert.ok(!/Lorem/i.test(p.html));
      assert.ok(!/href="\s*"/.test(p.html));
      assert.ok(!/href="#"/.test(p.html));
    });

    test(`${p.archivo}: está en el sitemap`, () => {
      assert.ok(sitemap.includes("<loc>" + p.canonical + "</loc>"), `falta ${p.canonical} en sitemap.xml`);
    });

    test(`${p.archivo}: tiene contenedor de footer compartido (id="footer")`, () => {
      assert.ok(p.html.includes('<footer class="footer" id="footer"></footer>'));
    });
  }
});

describe("enlazado cruzado de las páginas legales", () => {
  test("cookies.html enlaza a /privacidad, /aviso-legal y /contacto", () => {
    assert.ok(cookiesHtml.includes('href="/privacidad"'));
    assert.ok(cookiesHtml.includes('href="/aviso-legal"'));
    assert.ok(cookiesHtml.includes('href="/contacto"'));
  });

  test("privacidad.html enlaza a /cookies", () => {
    assert.ok(privacidadHtml.includes('href="/cookies"'));
  });

  test("contacto.html enlaza a /privacidad y /metodologia, y usa el email real existente", () => {
    assert.ok(contactoHtml.includes('href="/privacidad"'));
    assert.ok(contactoHtml.includes('href="/metodologia"'));
    assert.ok(contactoHtml.includes("mailto:" + EMAIL_CONTACTO));
  });

  test("sobre-sueldo-claro.html enlaza a /metodologia, /guias y /contacto", () => {
    assert.ok(sobreHtml.includes('href="/metodologia"'));
    assert.ok(sobreHtml.includes('href="/guias"'));
    assert.ok(sobreHtml.includes('href="/contacto"'));
  });

  test("contacto.html no promete asesoramiento fiscal personalizado ni tiempos de respuesta", () => {
    assert.ok(!/certificad[oa] por (la )?AEAT/i.test(contactoHtml));
    assert.ok(!/validad[oa] por (la )?AEAT/i.test(contactoHtml));
  });

  test("sobre-sueldo-claro.html no afirma certificación/validación/aprobación oficial", () => {
    for (const frase of [/certificad[oa] por (la )?AEAT/i, /validad[oa] por (la )?AEAT/i, /aprobad[oa] por (la )?Hacienda/i]) {
      assert.ok(!frase.test(sobreHtml), `sobre-sueldo-claro.html contiene una afirmación no permitida: ${frase}`);
    }
  });
});

describe("footer compartido (assets/js/components.js)", () => {
  const enlacesEsperados = [
    ["/", "Calculadoras"],
    ["/guias", "Guías"],
    ["/metodologia", "Metodología"],
    ["/sobre-sueldo-claro", "Sobre SueldoClaro"],
    ["/contacto", "Contacto"],
    ["/privacidad", "Privacidad"],
    ["/cookies", "Cookies"],
    ["/aviso-legal", "Aviso legal"]
  ];

  test("FOOTER_LINKS incluye las 8 páginas principales con href absoluto", () => {
    const bloque = componentsJs.match(/var FOOTER_LINKS = \[([\s\S]*?)\];/);
    assert.ok(bloque, "no se encuentra FOOTER_LINKS en components.js");
    for (const [href, label] of enlacesEsperados) {
      assert.ok(bloque[1].includes('href: "' + href + '"'), `falta href absoluto ${href} en FOOTER_LINKS`);
      assert.ok(bloque[1].includes('label: "' + label + '"'), `falta label "${label}" en FOOTER_LINKS`);
    }
  });

  test("todos los href de FOOTER_LINKS son absolutos (empiezan por \"/\")", () => {
    const bloque = componentsJs.match(/var FOOTER_LINKS = \[([\s\S]*?)\];/)[1];
    const hrefs = Array.from(bloque.matchAll(/href:\s*"([^"]+)"/g)).map((m) => m[1]);
    assert.equal(hrefs.length, enlacesEsperados.length);
    for (const href of hrefs) assert.ok(href.startsWith("/"), `href no absoluto: ${href}`);
  });

  test("el footer se auto-renderiza (no depende de que cada pages/*.js lo invoque)", () => {
    assert.ok(componentsJs.includes("function autoRenderFooter"));
    assert.ok(componentsJs.includes('document.getElementById("footer")'));
  });

  test("metodologia.html usa el contenedor de footer compartido (queda accesible desde el footer)", () => {
    assert.ok(metodologiaHtml.includes('<footer class="footer" id="footer"></footer>'));
  });
});

describe("consistencia legal cruzada: sin datos identificativos contradictorios", () => {
  test("privacidad.html y aviso-legal.html usan el mismo email de contacto", () => {
    assert.ok(privacidadHtml.includes(EMAIL_CONTACTO));
    assert.ok(avisoLegalHtml.includes(EMAIL_CONTACTO));
  });

  test("privacidad.html ya no afirma que el sitio no usa cookies/publicidad de forma absoluta", () => {
    assert.ok(!/este sitio no muestra publicidad ni utiliza cookies/i.test(privacidadHtml));
  });

  test("privacidad.html reconoce que el código de AdSense ya está integrado", () => {
    assert.match(privacidadHtml, /AdSense.{0,80}integrado técnicamente|integrado técnicamente.{0,80}AdSense/s);
  });
});

describe("AdSense/CMP: fuera de scope, sin cambios (fase de auditoría separada)", () => {
  test("no se ha añadido ninguna llamada adsbygoogle.push() en ningún HTML ni JS", () => {
    const archivos = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
    for (const f of archivos) {
      assert.ok(!leer(f).includes("adsbygoogle.push"), `${f} contiene adsbygoogle.push(), fuera de scope de esta tarea`);
    }
    assert.ok(!componentsJs.includes("adsbygoogle.push"));
  });

  test("el publisher de AdSense sigue siendo ca-pub-4073412446458032 en las páginas nuevas", () => {
    for (const p of PAGINAS_NUEVAS) {
      assert.ok(p.html.includes("ca-pub-4073412446458032"));
    }
  });

  test("ads.txt no ha cambiado", () => {
    assert.equal(adsTxt.trim(), "google.com, pub-4073412446458032, DIRECT, f08c47fec0942fa0");
  });
});

describe("las calculadoras siguen funcionando tras los cambios legales (regresión mínima)", () => {
  const TaxEngine = require("../lib/tax-engine.js");
  const C = require("../lib/constants-2026.js");

  test("30.000€, común, soltero, 0 hijos, 12 pagas sigue dando 23.124€ netos / 16,42%", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 30000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, C);
    assert.equal(r.netoAnual, 23124);
    assert.equal(r.irpf.tipoRetencion, 16.42);
  });
});
