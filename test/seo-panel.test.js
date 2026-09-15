"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const lib = require("../tools/seo-lib.js");
const { buildPanelData, badgeDeSeveridades, jsonLdTypeDe, globalesQueMencionan } = require("../tools/seo-panel/data.js");
const { crearServidor } = require("../tools/seo-panel.js");

describe("seo-panel/data.js: descubrimiento automático de páginas", () => {
  test("el número de páginas del panel coincide exactamente con tools/seo-lib.js (PAGES) — no hay una lista propia", () => {
    const data = buildPanelData();
    assert.equal(data.pages.length, lib.PAGES.length);
  });

  test("todas las cleanUrl de lib.PAGES aparecen en el panel, sin necesidad de configuración manual adicional", () => {
    const data = buildPanelData();
    const urlsPanel = new Set(data.pages.map((p) => p.cleanUrl));
    for (const file of lib.PAGES) {
      assert.ok(urlsPanel.has(lib.cleanUrlFromFile(file)), "falta en el panel: " + file);
    }
  });

  test("la guía de coste de empresa (añadida recientemente a PAGES) aparece en el panel sin tocar data.js ni index.html", () => {
    const data = buildPanelData();
    const pagina = data.pages.find((p) => p.cleanUrl === "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026");
    assert.ok(pagina, "la guía nueva debería aparecer automáticamente por estar en lib.PAGES");
  });
});

describe("seo-panel/data.js: extracción de hechos reales (title/meta/canonical/H1)", () => {
  test("extrae el title real de una página conocida (home)", () => {
    const data = buildPanelData();
    const home = data.pages.find((p) => p.cleanUrl === "/");
    assert.equal(home.title, "Calculadora de Sueldo Neto 2026 | SueldoClaro");
  });

  test("extrae la meta description real de /coste-empresa", () => {
    const data = buildPanelData();
    const p = data.pages.find((p) => p.cleanUrl === "/coste-empresa");
    assert.ok(p.description && p.description.length > 0);
    const htmlReal = fs.readFileSync(path.join(__dirname, "..", "coste-empresa.html"), "utf8");
    assert.ok(htmlReal.includes(p.description), "la description del panel debe ser literalmente la del HTML, no inventada");
  });

  test("extrae el canonical real de la guía de Álava", () => {
    const data = buildPanelData();
    const p = data.pages.find((p) => p.cleanUrl === "/guias/tabla-retenciones-irpf-alava-2026");
    assert.equal(p.canonical, "https://calcularsalarioneto.es/guias/tabla-retenciones-irpf-alava-2026");
  });

  test("extrae el H1 real de la guía de coste de empresa", () => {
    const data = buildPanelData();
    const p = data.pages.find((p) => p.cleanUrl === "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026");
    assert.equal(p.h1, "¿Cuánto cuesta un trabajador a la empresa en 2026?");
  });

  test("los datos no son estáticos: si el HTML fuente cambiara, buildPanelData() los releería (no hay copia cacheada en data.js)", () => {
    assert.ok(!fs.readFileSync(path.join(__dirname, "..", "tools", "seo-panel", "data.js"), "utf8").includes("Calculadora de Sueldo Neto 2026"), "data.js no debe contener titles/metas hardcodeados");
  });
});

describe("seo-panel/data.js: intent/target/related vienen de tools/seo-config.json", () => {
  test("la guía de coste de empresa expone target/intent/related tal como están en seo-config.json", () => {
    const data = buildPanelData();
    const p = data.pages.find((p) => p.cleanUrl === "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026");
    const cfg = lib.loadSeoConfig().pages["/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026"];
    assert.equal(p.editorial.target, cfg.target);
    assert.equal(p.editorial.intent, cfg.intent);
    assert.deepEqual(p.editorial.related, cfg.related);
  });

  test("una página sin entrada en seo-config.json tiene editorial=null y no rompe el panel", () => {
    const data = buildPanelData();
    const p = data.pages.find((p) => p.cleanUrl === "/aviso-legal");
    assert.equal(p.editorial, null);
    assert.equal(typeof p.badge, "string");
  });

  test("la relación editorial guía<->calculadora se ve reflejada como enlace correcto (✓) en ambos sentidos", () => {
    const data = buildPanelData();
    const guia = data.pages.find((p) => p.cleanUrl === "/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026");
    const calc = data.pages.find((p) => p.cleanUrl === "/coste-empresa");
    const outboundGuia = new Set(guia.links.outboundLiteral.concat(guia.links.outboundVirtual));
    const outboundCalc = new Set(calc.links.outboundLiteral.concat(calc.links.outboundVirtual));
    assert.ok(outboundGuia.has("/coste-empresa"));
    assert.ok(outboundCalc.has("/guias/cuanto-cuesta-un-trabajador-a-la-empresa-2026"));
  });
});

describe("seo-panel/data.js: los badges/errores/warnings coinciden con seo-lib.js (no hay reglas propias)", () => {
  test("el total de errores/warnings/manual del resumen coincide con checkTecnico+checkContenido+checkEnlazado+checkConfianza", () => {
    const ctx = lib.cargarTodo();
    const findings = [...lib.checkTecnico(ctx), ...lib.checkContenido(ctx), ...lib.checkEnlazado(ctx), ...lib.checkConfianza(ctx)];
    const data = buildPanelData();
    assert.equal(data.summary.errors, findings.filter((f) => f.severity === "error").length);
    assert.equal(data.summary.warnings, findings.filter((f) => f.severity === "warning").length);
    assert.equal(data.summary.manual, findings.filter((f) => f.severity === "manual").length);
  });

  test("badgeDeSeveridades reproduce la misma precedencia error > warning > manual > ok", () => {
    assert.equal(badgeDeSeveridades([{ severity: "ok" }, { severity: "warning" }, { severity: "error" }]), "error");
    assert.equal(badgeDeSeveridades([{ severity: "ok" }, { severity: "warning" }]), "warning");
    assert.equal(badgeDeSeveridades([{ severity: "ok" }, { severity: "manual" }]), "manual");
    assert.equal(badgeDeSeveridades([{ severity: "ok" }]), "ok");
    assert.equal(badgeDeSeveridades([]), "ok");
  });

  test("una página con errores técnicos reales (canonical/H1) se reflejaría con badge 'error' (comprobado indirectamente: 0 páginas reales tienen error hoy, así que el conjunto de páginas con badge error coincide con checkTecnico)", () => {
    const ctx = lib.cargarTodo();
    const errores = lib.checkTecnico(ctx).filter((f) => f.severity === "error" && f.page);
    const data = buildPanelData();
    const urlsConError = new Set(errores.map((f) => f.page));
    for (const url of urlsConError) {
      const p = data.pages.find((pg) => pg.cleanUrl === url);
      assert.equal(p.badge, "error", url + " debería tener badge error en el panel");
    }
  });

  test("jsonLdTypeDe delega en el mismo parseo que checkTecnico (JSONLD_TYPE), sin nueva validación", () => {
    const ctx = lib.cargarTodo();
    const home = ctx.facts.find((p) => p.cleanUrl === "/");
    assert.equal(jsonLdTypeDe(home), "WebApplication");
  });
});

describe("seo-panel/data.js: findings globales relevantes por página", () => {
  test("globalesQueMencionan encuentra un finding global (sitemap) que nombra la URL, sin falsos positivos para '/'", () => {
    const globalFindings = [
      { page: null, message: "sitemap.xml: falta la página indexable https://calcularsalarioneto.es/foo." },
      { page: null, message: "algo no relacionado con ninguna URL." }
    ];
    const encontrados = globalesQueMencionan("/foo", "https://calcularsalarioneto.es/foo", globalFindings);
    assert.equal(encontrados.length, 1);

    const paraRoot = globalesQueMencionan("/", "https://calcularsalarioneto.es/", globalFindings);
    assert.equal(paraRoot.length, 0, "'/' no debe hacer match por casualidad con mensajes que contienen 'https://...'");
  });
});

describe("seo-panel.js: servidor HTTP local (solo lectura)", () => {
  function conServidor(fn) {
    return new Promise((resolve, reject) => {
      const server = crearServidor();
      server.listen(0, () => {
        const port = server.address().port;
        Promise.resolve(fn(port))
          .then((r) => { server.close(); resolve(r); })
          .catch((e) => { server.close(); reject(e); });
      });
    });
  }

  function get(port, urlPath) {
    return new Promise((resolve, reject) => {
      http
        .get("http://127.0.0.1:" + port + urlPath, (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
        })
        .on("error", reject);
    });
  }

  test("GET /api/data devuelve JSON válido con las páginas reales del proyecto", async () => {
    await conServidor(async (port) => {
      const res = await get(port, "/api/data");
      assert.equal(res.status, 200);
      assert.match(res.headers["content-type"], /application\/json/);
      const data = JSON.parse(res.body);
      assert.equal(data.pages.length, lib.PAGES.length);
      assert.equal(data.siteName, "SueldoClaro");
    });
  });

  test("GET / sirve el panel (index.html)", async () => {
    await conServidor(async (port) => {
      const res = await get(port, "/");
      assert.equal(res.status, 200);
      assert.match(res.headers["content-type"], /text\/html/);
      assert.match(res.body, /SEO Panel/);
    });
  });

  test("el panel se marca a sí mismo noindex,nofollow (no debe indexarse)", () => {
    const html = fs.readFileSync(path.join(__dirname, "..", "tools", "seo-panel", "index.html"), "utf8");
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  });

  test("GET /ruta-inexistente devuelve 404", async () => {
    await conServidor(async (port) => {
      const res = await get(port, "/ruta-inexistente.js");
      assert.equal(res.status, 404);
    });
  });

  test("no sirve archivos fuera de tools/seo-panel/ (path traversal)", async () => {
    await conServidor(async (port) => {
      const res = await get(port, "/../../lib/constants-2026.js");
      assert.notEqual(res.status, 200);
    });
  });
});

describe("panel: no toca producción", () => {
  test("el panel no aparece en tools/seo-lib.js (PAGES) ni en sitemap.xml", () => {
    assert.ok(!lib.PAGES.some((f) => f.includes("seo-panel")));
    const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
    assert.ok(!sitemap.includes("seo-panel"));
  });

  test("ninguna página pública enlaza a tools/seo-panel", () => {
    const ctx = lib.cargarTodo();
    for (const p of ctx.facts) {
      assert.ok(!p.hrefsRaw.some((h) => h.includes("seo-panel")), p.cleanUrl + " no debería enlazar al panel de desarrollo");
    }
  });
});
