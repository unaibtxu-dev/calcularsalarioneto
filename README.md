# SueldoClaro — Calculadora de sueldo neto España 2026

Cinco herramientas estáticas (HTML/CSS/JS, sin build, sin dependencias
npm) que reutilizan un único motor fiscal puro: retención de nómina IRPF
2026 (RD 439/2007, arts. 80-89) + Seguridad Social. **No calcula la
declaración de la renta anual** — ver la nota en cada página.

- `index.html` — bruto a neto (principal)
- `neto-a-bruto.html`
- `comparar-ofertas.html`
- `calculadora-subida-sueldo.html`
- `coste-empresa.html`

## Desarrollo local

No requiere build. Sirve la carpeta con cualquier servidor estático:

```bash
npx serve .
```

o abre directamente `index.html` en el navegador.

## Tests

```bash
node --test ./test/tax-engine.test.js   # motor fiscal (239 tests)
node tools/check-constants-sources.js   # toda constante fiscal cita su fuente
node tools/check-seo-basics.js          # title/description/canonical/OG/JSON-LD/sitemap/robots
```

## SEO técnico (estado actual)

- Title y meta description únicos por página, `<meta name="robots" content="index, follow">`.
- `<link rel="canonical">` autorreferenciado en cada página.
- Open Graph y Twitter Card básicos (sin `og:image` todavía — pendiente de
  diseñar una imagen 1200×630, ver "Pendiente" abajo).
- JSON-LD `WebApplication` por página.
- Enlazado interno: nav superior + bloque "Otras herramientas" en cada página.
- `sitemap.xml` con las 5 URLs y `robots.txt` apuntando a él, sin bloquear nada.
- No hay páginas programáticas ni contenido duplicado (fuera de alcance de v1).

Dominio en producción: `https://calcularsalarioneto.es` (ya sustituido en
`sitemap.xml`, `robots.txt` y el `<head>` de las 5 páginas — `canonical`,
`og:url`, JSON-LD `url`). DNS en Cloudflare ya activo.

## Pendiente (fuera de este cambio)

- Imagen Open Graph (1200×630) — no generada aquí, es un asset de diseño.
- Investigación de keywords y páginas programáticas — explícitamente fuera
  de alcance por ahora.
- `privacidad.html` / `aviso-legal.html` — el footer menciona que la
  herramienta no sustituye asesoría, pero no hay página legal dedicada aún.
- Analytics / AdSense — pospuesto hasta validar el producto.

## Despliegue en Cloudflare Pages

1. Sube este directorio a un repositorio Git (GitHub/GitLab) o usa
   "Direct Upload" en el dashboard de Cloudflare Pages si no quieres Git.
2. En Cloudflare Pages → **Create a project** → conecta el repo.
3. Configuración de build:
   - **Framework preset**: None
   - **Build command**: (vacío)
   - **Build output directory**: `/` (la raíz de este directorio)
4. Despliega. Cloudflare servirá `_headers` automáticamente (cabeceras de
   seguridad y caché ya incluidas en este repo).
5. Añade `calcularsalarioneto.es` en **Custom domains** (DNS ya apunta a
   Cloudflare).
6. Envía `sitemap.xml` en Google Search Console / Bing Webmaster Tools una
   vez el dominio esté sirviendo en producción y verificado.
