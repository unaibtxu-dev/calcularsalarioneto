"use strict";
/**
 * Panel SEO local de SueldoClaro — herramienta de desarrollo, SOLO
 * LECTURA, sin dependencias npm (solo módulos nativos de Node).
 *
 * Sirve una página estática (tools/seo-panel/index.html) más un endpoint
 * JSON (/api/data) construido por tools/seo-panel/data.js, que a su vez
 * reutiliza tools/seo-audit.js y tools/seo-lib.js sin duplicar ninguna
 * regla: este archivo no decide qué es un error o un warning, solo sirve
 * lo que el auditor ya calcula.
 *
 * Sin caché ni base de datos: cada petición a /api/data vuelve a leer los
 * HTML del proyecto desde disco, así que un cambio en cualquier página
 * (o una página nueva añadida a tools/seo-lib.js) se refleja recargando
 * el panel en el navegador, sin reiniciar el proceso.
 *
 * Herramienta de desarrollo local: no se enlaza desde el sitio público,
 * no se añade a sitemap.xml ni a robots.txt, no se despliega.
 *
 * Uso:
 *   node tools/seo-panel.js               (puerto 4173 por defecto)
 *   node tools/seo-panel.js --serve       (alias, mismo comportamiento)
 *   node tools/seo-panel.js --port 5000   (puerto a medida)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildPanelData } = require("./seo-panel/data.js");

const PANEL_DIR = path.join(__dirname, "seo-panel");
const DEFAULT_PORT = 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

function puertoDesdeArgv(argv) {
  const i = argv.indexOf("--port");
  if (i !== -1 && argv[i + 1] && Number.isInteger(Number(argv[i + 1])) && Number(argv[i + 1]) > 0) {
    return Number(argv[i + 1]);
  }
  return DEFAULT_PORT;
}

function servirEstatico(res, filePath) {
  fs.readFile(filePath, (err, contenido) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No encontrado");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(contenido);
  });
}

function crearServidor() {
  return http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch (e) {
      res.writeHead(400);
      res.end("URL invalida");
      return;
    }

    if (url.pathname === "/api/data") {
      try {
        const data = buildPanelData();
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // Panel de solo lectura: cualquier otra ruta se resuelve como archivo
    // estático dentro de tools/seo-panel/, con "/" -> index.html. Se
    // normaliza y se comprueba que el resultado siga dentro de PANEL_DIR
    // para no servir nada fuera de esa carpeta (p. ej. "/../../lib/...").
    const rutaPedida = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.join(PANEL_DIR, path.normalize(rutaPedida));
    if (!filePath.startsWith(PANEL_DIR)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Prohibido");
      return;
    }
    servirEstatico(res, filePath);
  });
}

function main() {
  const port = puertoDesdeArgv(process.argv.slice(2));
  const server = crearServidor();
  server.listen(port, () => {
    console.log("SEO Panel disponible en:");
    console.log("http://localhost:" + port);
  });
}

if (require.main === module) main();

module.exports = { crearServidor, puertoDesdeArgv };
