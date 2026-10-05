"use strict";
var App = (function () {
  // Hrefs absolutos (con "/" inicial): PAGES/REGIONES se reutilizan desde
  // App.renderNav/renderRelacionadas en páginas que pueden vivir a distinta
  // profundidad de ruta (p. ej. /guias/algo), donde un href relativo como
  // "neto-a-bruto" resolvería mal (a /guias/neto-a-bruto). Con "/" siempre
  // apunta a la raíz del sitio, y no cambia nada para las páginas ya
  // existentes en la raíz.
  var PAGES = [
    { id: "bruto-neto", href: "/", label: "Bruto a neto", icon: "💶", desc: "Cuánto cobras realmente cada mes a partir de tu salario bruto." },
    { id: "neto-bruto", href: "/neto-a-bruto", label: "Neto a bruto", icon: "🔄", desc: "El bruto que necesitas pactar para llegar al neto que quieres." },
    { id: "comparar", href: "/comparar-ofertas", label: "Comparar ofertas", icon: "⚖️", desc: "Compara el neto real de dos ofertas de trabajo." },
    { id: "subida", href: "/calculadora-subida-sueldo", label: "Subida salarial", icon: "📈", desc: "Cuánto de tu subida bruta llega de verdad a tu neto." },
    { id: "coste-empresa", href: "/coste-empresa", label: "Coste empresa", icon: "🏢", desc: "Lo que le cuesta a la empresa un trabajador, más allá del bruto." }
  ];

  var REGIONES = [
    { id: "pais-vasco", href: "/calculadora-sueldo-neto-pais-vasco", label: "País Vasco" },
    { id: "navarra", href: "/calculadora-sueldo-neto-navarra", label: "Navarra" }
  ];

  // Las 2 categorías del menú que son enlaces directos (no desplegables):
  // "Calculadoras" y "Fiscalidad" sí son desplegables, ver abajo. No existe
  // categoría "Empresas" de primer nivel: /coste-empresa vive dentro de
  // "Calculadoras" (ya estaba listada ahí; el enlace directo duplicado se
  // retiró de la navegación principal).
  var CATEGORIAS = [
    { id: "sueldos", href: "/sueldos", label: "Sueldos", icon: "💶" },
    { id: "guias", href: "/guias", label: "Guías", icon: "📘" }
  ];

  function categoriaLinkHTML(cat, active) {
    return '<a href="' + cat.href + '" class="' + (active ? "active" : "") + '"' + (active ? ' aria-current="page"' : "") + '>' +
      '<span aria-hidden="true">' + cat.icon + "</span>" + cat.label +
      "</a>";
  }

  function dropdownButtonHTML(icon, label, active) {
    return '<div class="topnav-dropdown">' +
      '<button type="button" class="' + (active ? "active" : "") + '" aria-haspopup="true" aria-expanded="false">' +
      '<span aria-hidden="true">' + icon + "</span>" + label + '<span class="chevron" aria-hidden="true">▾</span>' +
      "</button>" +
      "</div>";
  }

  // Algunos navegadores móviles disparan mouseenter/mouseleave sintéticos
  // justo antes del clic al tocar; sin esto, un tap podría abrir por hover
  // y cerrarse en el mismo gesto al procesar el clic. En cuanto se detecta
  // un touchstart en la página, el hover deja de simular apertura/cierre y
  // el desplegable pasa a depender solo del clic (que sí funciona con tap).
  var esInteraccionTactil = false;
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("touchstart", function () { esInteraccionTactil = true; }, { passive: true });
  }

  // Cablea un desplegable para que se abra con clic, hover (con margen para
  // no cerrarse al mover el ratón del botón al menú) y foco de teclado, y
  // se cierre con Escape, clic fuera o al perder el foco fuera del par
  // botón+menú. Se reutiliza para "Calculadoras" y "Navarra y País Vasco".
  function wireDropdown(el, toggle, menu, cerrarOtros) {
    var closeTimer = null;

    function posicionar() {
      var toggleRect = toggle.getBoundingClientRect();
      var navRect = el.getBoundingClientRect();
      var margen = 8;
      // El botón puede estar solo parcialmente visible (el menú horizontal
      // del nav permite scroll), así que el menú desplegable no puede
      // anclarse siempre al borde izquierdo del botón: en pantallas
      // estrechas eso lo empuja fuera del viewport. Se acota para que quede
      // siempre dentro del ancho visible, sin depender de scroll de página.
      var left = toggleRect.left - navRect.left;
      var maxLeft = window.innerWidth - margen - navRect.left - menu.offsetWidth;
      left = Math.min(left, Math.max(margen - navRect.left, maxLeft));
      left = Math.max(left, margen - navRect.left);
      menu.style.left = left + "px";
    }
    function abrir() {
      clearTimeout(closeTimer);
      cerrarOtros();
      // Añadir "open" antes de posicionar: mientras el menú tiene
      // display:none su offsetWidth es 0 y posicionar() no podría acotar
      // el left contra el ancho real. Ocurre en el mismo tick, antes de
      // pintar, así que no hay parpadeo en la posición incorrecta.
      menu.classList.add("open");
      posicionar();
      toggle.setAttribute("aria-expanded", "true");
    }
    function cerrar() {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
    function cerrarConRetraso() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(cerrar, 200);
    }
    function cancelarCierre() {
      clearTimeout(closeTimer);
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.classList.contains("open")) cerrar();
      else abrir();
    });
    toggle.addEventListener("mouseenter", function () { if (!esInteraccionTactil) abrir(); });
    toggle.addEventListener("mouseleave", function () { if (!esInteraccionTactil) cerrarConRetraso(); });
    menu.addEventListener("mouseenter", function () { if (!esInteraccionTactil) cancelarCierre(); });
    menu.addEventListener("mouseleave", function () { if (!esInteraccionTactil) cerrarConRetraso(); });
    [toggle, menu].forEach(function (n) {
      n.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          cerrar();
          toggle.focus();
        }
      });
      n.addEventListener("focusout", function () {
        // Se comprueba en el siguiente turno: si el nuevo foco no está ni
        // en el botón ni en el menú, se cierra (igual criterio que el hover).
        setTimeout(function () {
          var activo = document.activeElement;
          if (activo !== toggle && !menu.contains(activo)) cerrar();
        }, 0);
      });
    });

    return { abrir: abrir, cerrar: cerrar };
  }

  function renderNav(activeId) {
    var el = document.getElementById("topnav");
    if (!el) return;
    var calculadorasActiva = PAGES.some(function (p) { return p.id === activeId; });
    var fiscalidadActiva = activeId === "fiscalidad-foral" || REGIONES.some(function (r) { return r.id === activeId; });

    var html = '<nav class="topnav-inner" aria-label="Categorías">';
    html += dropdownButtonHTML("🧮", "Calculadoras", calculadorasActiva);
    html += categoriaLinkHTML(CATEGORIAS[0], activeId === "sueldos");
    html += dropdownButtonHTML("🏔️", "Fiscalidad", fiscalidadActiva);
    html += categoriaLinkHTML(CATEGORIAS[1], activeId === "guias");
    html += "</nav>";
    // Los menús se renderizan fuera de .topnav-inner: ese contenedor tiene
    // overflow-x:auto, y por la propia especificación CSS un
    // overflow-y:visible ahí se recalcula como "auto" (recorta), así que
    // cualquier menú anidado dentro quedaría invisible salvo que quepa en
    // los 40px de alto de la barra.
    html +=
      '<div class="topnav-dropdown-menu">' +
      PAGES.map(function (p) {
        var active = p.id === activeId;
        return '<a href="' + p.href + '" class="' + (active ? "active" : "") + '"' + (active ? ' aria-current="page"' : "") + ">" + p.label + "</a>";
      }).join("") +
      "</div>" +
      '<div class="topnav-dropdown-menu">' +
      REGIONES.map(function (r) {
        var active = r.id === activeId;
        return '<a href="' + r.href + '" class="' + (active ? "active" : "") + '"' + (active ? ' aria-current="page"' : "") + ">" + r.label + "</a>";
      }).join("") +
      '<a href="/fiscalidad-foral" class="' + (activeId === "fiscalidad-foral" ? "active" : "") + '"' + (activeId === "fiscalidad-foral" ? ' aria-current="page"' : "") + ">Comparar regímenes</a>" +
      "</div>";
    el.innerHTML = html;

    var toggles = el.querySelectorAll(".topnav-dropdown > button");
    var menus = el.querySelectorAll(".topnav-dropdown-menu");
    var controles = [];
    toggles.forEach(function (toggle, i) {
      var menu = menus[i];
      if (!toggle || !menu) return;
      controles.push(
        wireDropdown(el, toggle, menu, function () {
          controles.forEach(function (c, j) {
            if (menus[j] !== menu) c.cerrar();
          });
        })
      );
    });
    document.addEventListener("click", function () {
      controles.forEach(function (c) { c.cerrar(); });
    });
    // Si el usuario hace scroll horizontal de la barra con algún menú
    // abierto, los botones se mueven pero los menús (fuera del contenedor
    // con scroll) no los seguirían — más simple y predecible cerrarlos.
    var navInnerEl = el.querySelector(".topnav-inner");
    if (navInnerEl) {
      navInnerEl.addEventListener("scroll", function () {
        controles.forEach(function (c) { c.cerrar(); });
      });
    }

    // Si el botón/enlace activo (p.ej. el último, "Empresas") queda fuera del
    // área visible en móvil/tablet, lo centramos en el scroll al cargar la
    // página — nunca debe quedar oculto o a medio cortar.
    var nav = el.querySelector(".topnav-inner");
    // Ojo: buscar "a.active" solo dentro de nav, no de el (#topnav) — los
    // menús desplegables también cuelgan de #topnav como hermanos de nav, y
    // su enlace activo (p.ej. "Álava") coincidiría antes que el propio botón.
    var activeLink = (nav && nav.querySelector("a.active")) || (nav && nav.querySelector(".topnav-dropdown > button.active"));
    if (nav && activeLink && nav.scrollWidth > nav.clientWidth) {
      var linkLeft = activeLink.offsetLeft;
      var linkRight = linkLeft + activeLink.offsetWidth;
      var yaVisible = linkLeft >= nav.scrollLeft && linkRight <= nav.scrollLeft + nav.clientWidth;
      if (!yaVisible) {
        var target = linkLeft - (nav.clientWidth - activeLink.offsetWidth) / 2;
        // behavior:"instant" explícito: si no, hereda scroll-behavior:smooth
        // del CSS y la posición inicial llegaría animada en vez de directa.
        nav.scrollTo({ left: Math.max(0, target), behavior: "instant" });
      }
    }
  }

  function renderRelacionadas(containerId, activeId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '<div class="section-title">Otras herramientas</div><ul class="related-list">';
    PAGES.filter(function (p) { return p.id !== activeId; }).forEach(function (p) {
      html +=
        '<li><a href="' + p.href + '"><span class="related-icon" aria-hidden="true">' + p.icon + "</span>" +
        '<span><span class="related-title">' + p.label + "</span>" +
        '<span class="related-desc">' + p.desc + "</span></span></a></li>";
    });
    html += "</ul>";
    el.innerHTML = html;
  }

  // Relacionados para páginas de contenido (guías, fiscalidad, metodología),
  // donde la lista genérica de "Otras herramientas" (PAGES) no es la más
  // relevante. Mismo estilo de dato explícito que PAGES/REGIONES: cada
  // página declara a mano sus 2-3 enlaces realmente relacionados, sin
  // ningún recomendador automático.
  var RELACIONADAS_CONTENIDO = {
    "que-se-descuenta": [
      { href: "/12-pagas-vs-14-pagas", icon: "📅", label: "12 pagas vs 14 pagas", desc: "Cómo cambia el reparto de tu nómina según el número de pagas." },
      { href: "/retencion-irpf-vs-renta", icon: "📄", label: "Retención vs. declaración de la renta", desc: "Por qué lo que te retienen cada mes no es tu IRPF definitivo." },
      { href: "/", icon: "💶", label: "Calcular tu sueldo neto", desc: "Aplica estos descuentos a tu propio salario bruto." }
    ],
    "12-pagas-vs-14-pagas": [
      { href: "/que-se-descuenta-de-una-nomina", icon: "🧾", label: "¿Qué se descuenta de una nómina?", desc: "IRPF y Seguridad Social, los conceptos que van del bruto al neto." },
      { href: "/retencion-irpf-vs-renta", icon: "📄", label: "Retención vs. declaración de la renta", desc: "Por qué lo que te retienen cada mes no es tu IRPF definitivo." },
      { href: "/sueldos", icon: "💶", label: "Sueldos netos por importe", desc: "Consulta el neto correspondiente a distintos salarios brutos." }
    ],
    "retencion-irpf-vs-renta": [
      { href: "/que-se-descuenta-de-una-nomina", icon: "🧾", label: "¿Qué se descuenta de una nómina?", desc: "IRPF y Seguridad Social, los conceptos que van del bruto al neto." },
      { href: "/12-pagas-vs-14-pagas", icon: "📅", label: "12 pagas vs 14 pagas", desc: "Cómo cambia el reparto de tu nómina según el número de pagas." },
      { href: "/", icon: "💶", label: "Calcular tu sueldo neto", desc: "Aplica el cálculo de retención a tu propio salario bruto." }
    ],
    "guia-pais-vasco": [
      { href: "/calculadora-sueldo-neto-pais-vasco", icon: "🧮", label: "Calculadora de sueldo neto País Vasco", desc: "Aplica esta tabla a tu propio salario en Álava, Bizkaia o Gipuzkoa." },
      { href: "/fiscalidad-foral", icon: "🏔️", label: "Fiscalidad foral en España", desc: "Compara régimen común, País Vasco y Navarra." }
    ],
    "guia-navarra": [
      { href: "/calculadora-sueldo-neto-navarra", icon: "🧮", label: "Calculadora de sueldo neto Navarra", desc: "Aplica esta tabla a tu propio salario en Navarra." },
      { href: "/fiscalidad-foral", icon: "🏔️", label: "Fiscalidad foral en España", desc: "Compara régimen común, País Vasco y Navarra." }
    ],
    "guia-coste-empresa": [
      { href: "/coste-empresa", icon: "🏢", label: "Calculadora de coste de empresa", desc: "Calcula el coste real de un trabajador con tu propio tipo de AT/EP." },
      { href: "/que-se-descuenta-de-una-nomina", icon: "🧾", label: "¿Qué se descuenta de una nómina?", desc: "La misma nómina, vista desde el lado del trabajador." },
      { href: "/metodologia", icon: "📘", label: "Metodología de cálculo", desc: "Normativa, tablas y límites de nuestros cálculos." }
    ],
    "guia-elecciones": [
      { href: "/retencion-irpf-vs-renta", icon: "📄", label: "Retención vs. declaración de la renta", desc: "Por qué lo que te retienen cada mes no es tu IRPF definitivo." },
      { href: "/fiscalidad-foral", icon: "🏔️", label: "Fiscalidad foral en España", desc: "Compara régimen común, País Vasco y Navarra." },
      { href: "/sueldos", icon: "💶", label: "Sueldos netos por importe", desc: "Consulta el neto correspondiente a distintos salarios brutos." },
      { href: "/", icon: "🧮", label: "Calcular tu sueldo neto", desc: "Tu neto actual con la normativa vigente." }
    ],
    "calc-pais-vasco": [
      { href: "/guias/tabla-retenciones-irpf-pais-vasco-2026", icon: "📘", label: "Tabla de retenciones IRPF País Vasco 2026", desc: "Consulta los porcentajes completos por rendimiento y descendientes." },
      { href: "/fiscalidad-foral", icon: "🏔️", label: "Fiscalidad foral en España", desc: "Compara régimen común, País Vasco y Navarra." },
      { href: "/calculadora-sueldo-neto-navarra", icon: "🧮", label: "Calculadora de sueldo neto Navarra", desc: "Si trabajas en el régimen foral navarro." }
    ],
    "calc-navarra": [
      { href: "/guias/tabla-retenciones-irpf-navarra-2026", icon: "📘", label: "Tabla de retenciones IRPF Navarra 2026", desc: "Consulta los porcentajes completos por rendimiento y descendientes." },
      { href: "/fiscalidad-foral", icon: "🏔️", label: "Fiscalidad foral en España", desc: "Compara régimen común, País Vasco y Navarra." },
      { href: "/calculadora-sueldo-neto-pais-vasco", icon: "🧮", label: "Calculadora de sueldo neto País Vasco", desc: "Si trabajas en Álava, Bizkaia o Gipuzkoa." }
    ],
    "metodologia": [
      { href: "/que-se-descuenta-de-una-nomina", icon: "🧾", label: "¿Qué se descuenta de una nómina?", desc: "IRPF y Seguridad Social explicados con ejemplos." },
      { href: "/12-pagas-vs-14-pagas", icon: "📅", label: "12 pagas vs 14 pagas", desc: "Cómo cambia el reparto de tu nómina según el número de pagas." },
      { href: "/", icon: "💶", label: "Calcular tu sueldo neto", desc: "Aplica esta metodología a tu propio salario." }
    ]
  };

  function renderRelacionadasContenido(containerId, id) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var items = RELACIONADAS_CONTENIDO[id];
    if (!items) { renderRelacionadas(containerId); return; }
    var html = '<div class="section-title">También te puede interesar</div><ul class="related-list">';
    items.forEach(function (it) {
      html +=
        '<li><a href="' + it.href + '"><span class="related-icon" aria-hidden="true">' + it.icon + "</span>" +
        '<span><span class="related-title">' + it.label + "</span>" +
        '<span class="related-desc">' + it.desc + "</span></span></a></li>";
    });
    html += "</ul>";
    el.innerHTML = html;
  }

  function splitBarHTML(pct, caption) {
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    return (
      '<div class="split-bar-wrap">' +
      '<div class="split-bar-caption"><span>' + caption + '</span><strong>' + p.toFixed(1).replace(".", ",") + " %</strong></div>" +
      '<div class="split-bar" role="img" aria-label="' + caption + ": " + p.toFixed(1).replace(".", ",") + ' por ciento"><div class="fill-neto" style="width:' + p + '%"></div></div>' +
      "</div>"
    );
  }

  function segmentedHTML(fieldName, groupLabel, options, defaultVal) {
    var html = '<div class="segmented" data-field="' + fieldName + '" data-value="' + defaultVal + '" role="group" aria-label="' + groupLabel + '">';
    options.forEach(function (o) {
      var active = o.value === defaultVal;
      html += '<button type="button" data-val="' + o.value + '" aria-pressed="' + active + '" class="' + (active ? "active" : "") + '">' + o.label + "</button>";
    });
    html += "</div>";
    return html;
  }

  var NUM_PAGAS_MIN = 12;
  var NUM_PAGAS_MAX = 20;
  var NUM_PAGAS_HINT =
    "El importe por paga supone que las pagas tienen el mismo importe. Si tus pagas extraordinarias tienen " +
    "importes diferentes según convenio, consulta principalmente el neto anual.";

  // Selector de pagas al año, compartido por el formulario genérico
  // (formularioHTML) y por el comparador foral (fiscalidad-foral.js), para
  // que ambos validen y lean el valor exactamente igual. "Otro" revela un
  // campo numérico acotado a [12,20] — fuera de ese rango no tiene sentido
  // como número de pagas real, y por encima empieza a ser una periodicidad
  // distinta (quincenal, etc.) que esta calculadora no modela.
  function pagasFieldHTML(idPrefix) {
    return (
      '<div class="field"><span class="field-label">Pagas al año</span>' +
      segmentedHTML("numPagas", "Pagas al año", [
        { value: "12", label: "12 pagas" },
        { value: "14", label: "14 pagas" },
        { value: "15", label: "15 pagas" },
        { value: "16", label: "16 pagas" },
        { value: "otro", label: "Otro" }
      ], "12") +
      '<div class="field" data-pagas-otro-wrap hidden>' +
      '<label for="' + idPrefix + '-pagas-otro">Número de pagas (12-20)</label>' +
      '<input type="number" min="' + NUM_PAGAS_MIN + '" max="' + NUM_PAGAS_MAX + '" step="1" inputmode="numeric" ' +
      'data-field="numPagasOtro" id="' + idPrefix + '-pagas-otro" value="' + NUM_PAGAS_MIN + '">' +
      "</div>" +
      '<div class="field-hint">' + NUM_PAGAS_HINT + "</div>" +
      "</div>"
    );
  }

  function clampNumPagasOtro(input) {
    var v = Math.trunc(Number(input.value));
    if (!Number.isFinite(v)) v = NUM_PAGAS_MIN;
    v = Math.max(NUM_PAGAS_MIN, Math.min(NUM_PAGAS_MAX, v));
    input.value = v;
    return v;
  }

  // Muestra/oculta el campo "Otro" según la opción activa del segmentado, y
  // acota su valor al perder el foco. La lectura del valor final vive en
  // leerNumPagas, para que el mismo criterio se use al calcular.
  function wirePagasField(container) {
    var wrap = container.querySelector('.segmented[data-field="numPagas"]');
    var otroWrap = container.querySelector("[data-pagas-otro-wrap]");
    var otroInput = container.querySelector('[data-field="numPagasOtro"]');
    if (!wrap || !otroWrap || !otroInput) return;
    function sync() {
      otroWrap.hidden = wrap.getAttribute("data-value") !== "otro";
    }
    sync();
    container.addEventListener("app:change", sync);
    otroInput.addEventListener("blur", function () { clampNumPagasOtro(otroInput); });
  }

  function leerNumPagas(container) {
    var wrap = container.querySelector('.segmented[data-field="numPagas"]');
    if (!wrap) return 12;
    var valor = wrap.getAttribute("data-value");
    if (valor === "otro") {
      var otroInput = container.querySelector('[data-field="numPagasOtro"]');
      return otroInput ? clampNumPagasOtro(otroInput) : NUM_PAGAS_MIN;
    }
    var n = Number(valor);
    return Number.isFinite(n) ? n : NUM_PAGAS_MIN;
  }

  function presetsHTML(presets) {
    var html = '<div class="preset-row" role="group" aria-label="Importes rápidos">';
    presets.forEach(function (v) {
      html += '<button type="button" class="preset-chip" data-preset="' + v + '">' + Fmt.formatEsInput(v) + " €</button>";
    });
    html += "</div>";
    return html;
  }

  function formularioHTML(cfg) {
    var pre = cfg.idPrefix;
    var soportados = cfg.territoriosSoportadosExtra || [];
    var labelAlava = soportados.indexOf("alava") === -1 ? "Álava (no soportado)" : "Álava";
    var labelBizkaia = soportados.indexOf("bizkaia") === -1 ? "Bizkaia (no soportado)" : "Bizkaia";
    var labelGipuzkoa = soportados.indexOf("gipuzkoa") === -1 ? "Gipuzkoa (no soportado)" : "Gipuzkoa";
    var labelNavarra = soportados.indexOf("navarra") === -1 ? "Navarra (no soportado)" : "Navarra";
    // Permite que una página monográfica (p. ej. la de Navarra) abra ya con su
    // territorio seleccionado, sin duplicar el formulario.
    function selTerr(valor) {
      return cfg.territorioDefecto === valor ? " selected" : "";
    }
    var salarioInput = cfg.salarioFormatoEspanol
      ? '<input type="text" inputmode="decimal" data-field="salario" data-format="es" id="' + pre + '-salario" placeholder="' + (cfg.placeholder || "3.000") + '" value="' + (cfg.defaultValue || "") + '">'
      : '<input type="number" min="0" step="0.01" inputmode="decimal" data-field="salario" id="' + pre + '-salario" placeholder="' + (cfg.placeholder || "30000") + '" value="' + (cfg.defaultValue || "") + '">';
    return (
      '<div class="field">' +
      '<label for="' + pre + '-salario">' + cfg.salarioLabel + "</label>" +
      salarioInput +
      (cfg.salarioPresets ? presetsHTML(cfg.salarioPresets) : "") +
      (cfg.salarioHint ? '<div class="field-hint">' + cfg.salarioHint + "</div>" : "") +
      "</div>" +
      (cfg.showPagas === false ? "" : pagasFieldHTML(pre)) +
      '<div class="field"><label for="' + pre + '-sitfam">Situación familiar</label>' +
      '<select data-field="situacionFamiliar" id="' + pre + '-sitfam">' +
      '<option value="otro">Soltero/a o sin cónyuge a cargo</option>' +
      '<option value="monoparental">Familia monoparental con hijos</option>' +
      '<option value="casadoConyugeBajosIngresos">Casado/a, cónyuge con rentas ≤ 1.500 €/año</option>' +
      "</select></div>" +
      '<div class="field"><label for="' + pre + '-hijos">Hijos a cargo</label>' +
      '<input type="number" min="0" step="1" data-field="numHijos" id="' + pre + '-hijos" value="0"></div>' +
      '<details class="advanced"' + (cfg.advancedOpen ? " open" : "") + '><summary>Personalizar cálculo <span class="chevron" aria-hidden="true">▾</span></summary><div class="advanced-body">' +
      '<div class="field"><label for="' + pre + '-territorio">Territorio</label>' +
      '<select data-field="territorio" id="' + pre + '-territorio">' +
      '<option value="comun"' + selTerr("comun") + ">Régimen común</option>" +
      '<option value="ceuta"' + selTerr("ceuta") + ">Ceuta</option>" +
      '<option value="melilla"' + selTerr("melilla") + ">Melilla</option>" +
      '<option value="alava"' + selTerr("alava") + ">" + labelAlava + "</option>" +
      '<option value="bizkaia"' + selTerr("bizkaia") + ">" + labelBizkaia + "</option>" +
      '<option value="gipuzkoa"' + selTerr("gipuzkoa") + ">" + labelGipuzkoa + "</option>" +
      '<option value="navarra"' + selTerr("navarra") + ">" + labelNavarra + "</option>" +
      "</select></div>" +
      '<div class="field"><label for="' + pre + '-contrato">Tipo de contrato</label>' +
      '<select data-field="tipoContrato" id="' + pre + '-contrato">' +
      '<option value="general">General</option>' +
      '<option value="especial">Relación laboral especial</option>' +
      '<option value="duracionInferiorAno">Duración inferior a un año</option>' +
      "</select></div>" +
      '<div class="field"><label for="' + pre + '-discapacidad">Discapacidad propia</label>' +
      '<select data-field="discapacidadPropia" id="' + pre + '-discapacidad">' +
      '<option value="ninguna">Sin discapacidad</option>' +
      '<option value="33-64">33% – 64%</option>' +
      '<option value="65omas">65% o más</option>' +
      "</select></div>" +
      '<label class="checkrow"><input type="checkbox" data-field="edad65oMas"> 65 años o más</label>' +
      '<label class="checkrow"><input type="checkbox" data-field="edad75oMas"> 75 años o más</label>' +
      '<label class="checkrow"><input type="checkbox" data-field="pensionistaSS"> Pensionista de la Seg. Social</label>' +
      '<label class="checkrow"><input type="checkbox" data-field="desempleado"> Desempleado/a</label>' +
      "</div></details>"
    );
  }

  function syncPresetActive(container) {
    var salarioEl = container.querySelector('[data-field="salario"]');
    if (!salarioEl) return;
    var actual = Fmt.parseEs(salarioEl.value);
    container.querySelectorAll(".preset-chip").forEach(function (chip) {
      chip.classList.toggle("active", Number(chip.getAttribute("data-preset")) === actual);
    });
  }

  function buildFormulario(container, cfg) {
    cfg = cfg || {};
    cfg.idPrefix = cfg.idPrefix || "f" + Math.random().toString(36).slice(2, 7);
    container.innerHTML = formularioHTML(cfg);
    wireSegmented(container);
    wirePagasField(container);
    container.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", function () { container.dispatchEvent(new Event("app:change")); });
      el.addEventListener("change", function () { container.dispatchEvent(new Event("app:change")); });
    });

    var salarioEl = container.querySelector('[data-field="salario"]');
    if (salarioEl && salarioEl.dataset.format === "es") {
      salarioEl.addEventListener("blur", function () {
        var parsed = Fmt.parseEs(salarioEl.value);
        if (Number.isFinite(parsed)) salarioEl.value = Fmt.formatEsInput(parsed);
      });
    }
    container.querySelectorAll(".preset-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (salarioEl) salarioEl.value = Fmt.formatEsInput(Number(chip.getAttribute("data-preset")));
        syncPresetActive(container);
        container.dispatchEvent(new Event("app:change"));
      });
    });
    container.addEventListener("app:change", function () { syncPresetActive(container); });
    syncPresetActive(container);

    return cfg.idPrefix;
  }

  function leerFormulario(container) {
    var salarioEl = container.querySelector('[data-field="salario"]');
    var salarioValor = salarioEl
      ? (salarioEl.dataset.format === "es" ? Fmt.parseEs(salarioEl.value) : salarioEl.valueAsNumber)
      : NaN;
    return {
      salario: salarioValor,
      numPagas: leerNumPagas(container),
      situacionFamiliar: container.querySelector('[data-field="situacionFamiliar"]').value,
      numHijos: Number(container.querySelector('[data-field="numHijos"]').value) || 0,
      territorio: container.querySelector('[data-field="territorio"]').value,
      tipoContrato: container.querySelector('[data-field="tipoContrato"]').value,
      discapacidadPropia: container.querySelector('[data-field="discapacidadPropia"]').value,
      edad65oMas: container.querySelector('[data-field="edad65oMas"]').checked,
      edad75oMas: container.querySelector('[data-field="edad75oMas"]').checked,
      pensionistaSS: container.querySelector('[data-field="pensionistaSS"]').checked,
      desempleado: container.querySelector('[data-field="desempleado"]').checked
    };
  }

  // Resumen compacto y siempre visible de las condiciones usadas en el
  // cálculo (territorio, pagas, hijos, discapacidad), para que se entienda
  // el resultado aunque "Personalizar cálculo" esté cerrado. Un único sitio
  // para el mapeo de etiquetas, reutilizado por las 5 herramientas.
  function territorioLabel(territorio, extraSoportados) {
    var soportados = extraSoportados || [];
    if (territorio === "ceuta") return "Ceuta";
    if (territorio === "melilla") return "Melilla";
    if (territorio === "alava") return soportados.indexOf("alava") === -1 ? "Álava (no soportado)" : "Álava";
    if (territorio === "bizkaia") return soportados.indexOf("bizkaia") === -1 ? "Bizkaia (no soportado)" : "Bizkaia";
    if (territorio === "gipuzkoa") return soportados.indexOf("gipuzkoa") === -1 ? "Gipuzkoa (no soportado)" : "Gipuzkoa";
    if (territorio === "navarra") return soportados.indexOf("navarra") === -1 ? "Navarra (no soportado)" : "Navarra";
    return "Régimen común";
  }

  function discapacidadLabel(discapacidad) {
    if (discapacidad === "33-64") return "discapacidad 33%-64%";
    if (discapacidad === "65omas") return "discapacidad ≥65%";
    return null;
  }

  function resumenCondiciones(datos, extraSoportados) {
    var partes = [territorioLabel(datos.territorio, extraSoportados)];
    if (datos.numPagas) partes.push(datos.numPagas + " pagas");
    if (datos.numHijos > 0) partes.push(datos.numHijos + (datos.numHijos === 1 ? " hijo" : " hijos"));
    var disc = discapacidadLabel(datos.discapacidadPropia);
    if (disc) partes.push(disc);
    return partes.join(" · ");
  }

  function resumenCondicionesHTML(datos, extraSoportados, prefijo) {
    var texto = resumenCondiciones(datos, extraSoportados);
    return '<div class="resumen-condiciones"><span class="pill">' + (prefijo ? prefijo + " · " : "") + texto + "</span></div>";
  }

  // Orquestación Navarra 2026 compartida entre Bruto->Neto y Neto->Bruto:
  // la Seguridad Social es estatal (se reutiliza TaxEngine sin cambios) y
  // solo la retención IRPF usa TaxEngineNavarra (núcleo ya validado). Esta
  // función vive aquí (no en tax-engine-navarra.js) para que ambas páginas
  // la reutilicen sin duplicar la combinación SS+retención. Requiere que la
  // página haya cargado lib/constants-2026.js, lib/tax-engine.js,
  // lib/constants-navarra-2026.js y lib/tax-engine-navarra.js.
  function brutoToNetoNavarra(datos) {
    var ss = TaxEngine.calcularSegSocialTrabajador(
      TaxEngine.normalizarInput({ brutoAnual: datos.salario, numPagas: datos.numPagas, tipoContrato: datos.tipoContrato }),
      Constants2026
    );
    var navarra = TaxEngineNavarra.calcularTipoRetencion(
      {
        retribucionFija: datos.salario,
        retribucionVariablePrevisible: 0,
        numDescendientes: datos.numHijos,
        discapacidad: datos.discapacidadPropia
      },
      ConstantsNavarra2026
    );
    var brutoAnual = TaxEngine.round(datos.salario);
    var retencionAnual = TaxEngine.round(datos.salario * (navarra.tipoRetencion / 100));
    var netoAnual = TaxEngine.round(datos.salario - ss.anual - retencionAnual);
    return {
      bloqueado: false,
      brutoAnual: brutoAnual,
      segSocial: ss,
      irpf: { tipoRetencion: navarra.tipoRetencion, retencionAnual: retencionAnual },
      numPagas: datos.numPagas,
      netoAnual: netoAnual,
      netoPorPaga: TaxEngine.round(netoAnual / datos.numPagas),
      porcentajeQueLlega: brutoAnual > 0 ? TaxEngine.round((netoAnual / brutoAnual) * 100) : 0
    };
  }

  // Bisección genérica bruto<->neto (algoritmo numérico, no una regla
  // fiscal): dado un "paraBruto(bruto)" que devuelve {netoAnual,...}, busca
  // el bruto cuyo neto anual coincide con el objetivo. Misma tolerancia
  // (1 céntimo) y tope de bracket (1e9€) que TaxEngine.netoToBruto, para
  // que el comportamiento sea consistente entre territorios.
  function bisectarBrutoParaNeto(paraBruto, netoAnualObjetivo) {
    var objetivo = Math.max(0, Number(netoAnualObjetivo) || 0);
    var TOPE_ABSOLUTO = 1e9;
    var lo = 0;
    var hi = Math.max(objetivo, 1);
    while (paraBruto(hi).netoAnual < objetivo) {
      hi *= 2;
      if (hi > TOPE_ABSOLUTO) {
        return {
          bloqueado: true,
          motivo:
            "No se ha podido encontrar un bruto anual que produzca ese neto dentro de un rango razonable " +
            "(hasta " + TOPE_ABSOLUTO + "€). Revisa el importe objetivo."
        };
      }
    }
    var resultado = paraBruto(hi);
    for (var iter = 0; iter < 200 && hi - lo > 1e-6; iter++) {
      var mid = (lo + hi) / 2;
      resultado = paraBruto(mid);
      if (resultado.netoAnual < objetivo) lo = mid; else hi = mid;
    }
    resultado.netoAnualObjetivo = TaxEngine.round(objetivo);
    resultado.objetivoAlcanzado = Math.abs(resultado.netoAnual - objetivo) <= 0.01 + 1e-6;
    return resultado;
  }

  function netoToBrutoNavarra(datos) {
    return bisectarBrutoParaNeto(function (bruto) {
      return brutoToNetoNavarra(Object.assign({}, datos, { salario: bruto }));
    }, datos.netoAnualObjetivo);
  }

  // Orquestación País Vasco 2026 (Álava, Bizkaia, Gipuzkoa): SS estatal +
  // retención vía TaxEngineBizkaia (núcleo ya validado). Los tres
  // territorios comparten el mismo motor y, en 2026, la misma tabla —
  // verificado de forma independiente contra la fuente oficial de cada
  // Diputación Foral (ver el bloque FUENTES de cada lib/constants-*-2026.js).
  // Antes había tres copias casi idénticas de esta función (una por
  // territorio); ahora hay una sola implementación parametrizada por las
  // constantes del territorio, para no duplicar la lógica de cálculo
  // mientras la lógica sea realmente la misma. brutoToNetoAlava/Bizkaia/
  // Gipuzkoa se conservan como envoltorios finos porque pages/fiscalidad-foral.js
  // y el selector "Personalizar cálculo" de otras páginas (p. ej. la
  // calculadora principal) ya dependen de esos tres nombres — si algún día
  // un territorio necesitara una regla distinta, su envoltorio pasaría a
  // llamar a un motor/constantes propios sin tocar los otros dos.
  function brutoToNetoForalPaisVasco(datos, constantsTerritorio) {
    var ss = TaxEngine.calcularSegSocialTrabajador(
      TaxEngine.normalizarInput({ brutoAnual: datos.salario, numPagas: datos.numPagas, tipoContrato: datos.tipoContrato }),
      Constants2026
    );
    var foral = TaxEngineBizkaia.calcularTipoRetencion(
      {
        retribucionFija: datos.salario,
        retribucionVariablePrevisible: 0,
        numDescendientes: datos.numHijos,
        discapacidad: datos.discapacidadPropia
      },
      constantsTerritorio
    );
    var brutoAnual = TaxEngine.round(datos.salario);
    var retencionAnual = TaxEngine.round(datos.salario * (foral.tipoRetencion / 100));
    var netoAnual = TaxEngine.round(datos.salario - ss.anual - retencionAnual);
    return {
      bloqueado: false,
      brutoAnual: brutoAnual,
      segSocial: ss,
      irpf: { tipoRetencion: foral.tipoRetencion, retencionAnual: retencionAnual },
      numPagas: datos.numPagas,
      netoAnual: netoAnual,
      netoPorPaga: TaxEngine.round(netoAnual / datos.numPagas),
      porcentajeQueLlega: brutoAnual > 0 ? TaxEngine.round((netoAnual / brutoAnual) * 100) : 0
    };
  }

  function brutoToNetoBizkaia(datos) {
    return brutoToNetoForalPaisVasco(datos, ConstantsBizkaia2026);
  }

  function netoToBrutoBizkaia(datos) {
    return bisectarBrutoParaNeto(function (bruto) {
      return brutoToNetoBizkaia(Object.assign({}, datos, { salario: bruto }));
    }, datos.netoAnualObjetivo);
  }

  function brutoToNetoGipuzkoa(datos) {
    return brutoToNetoForalPaisVasco(datos, ConstantsGipuzkoa2026);
  }

  function netoToBrutoGipuzkoa(datos) {
    return bisectarBrutoParaNeto(function (bruto) {
      return brutoToNetoGipuzkoa(Object.assign({}, datos, { salario: bruto }));
    }, datos.netoAnualObjetivo);
  }

  function brutoToNetoAlava(datos) {
    return brutoToNetoForalPaisVasco(datos, ConstantsAlava2026);
  }

  function netoToBrutoAlava(datos) {
    return bisectarBrutoParaNeto(function (bruto) {
      return brutoToNetoAlava(Object.assign({}, datos, { salario: bruto }));
    }, datos.netoAnualObjetivo);
  }

  function bloqueoHTML(motivo) {
    return '<div class="notice warn"><span>⚠️</span><span>' + motivo + "</span></div>";
  }

  // Footer compartido por todo el sitio, con hrefs absolutos ("/" inicial)
  // para que funcione igual en páginas de raíz y en rutas anidadas
  // (p. ej. /guias/algo) — mismo motivo que llevó a hacer absolutos los
  // hrefs de PAGES/REGIONES. Se auto-renderiza en cuanto el DOM está listo
  // (igual patrón que el bloque de analítica más abajo), así que cada
  // página solo necesita un <footer class="footer" id="footer"></footer>
  // vacío: no hace falta tocar cada pages/*.js para invocarlo.
  var FOOTER_LINKS = [
    { href: "/", label: "Calculadoras" },
    { href: "/guias", label: "Guías" },
    { href: "/metodologia", label: "Metodología" },
    { href: "/sobre-sueldo-claro", label: "Sobre SueldoClaro" },
    { href: "/contacto", label: "Contacto" },
    { href: "/privacidad", label: "Privacidad" },
    { href: "/cookies", label: "Cookies" },
    { href: "/aviso-legal", label: "Aviso legal" }
  ];

  function renderFooter(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML =
      "Herramienta orientativa, no oficial. No sustituye a tu declaración de la renta ni a tu asesoría. · " +
      FOOTER_LINKS.map(function (l) { return '<a href="' + l.href + '">' + l.label + "</a>"; }).join(" · ");
  }

  function autoRenderFooter() {
    if (document.getElementById("footer")) renderFooter("footer");
  }
  if (typeof document !== "undefined" && document.addEventListener) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoRenderFooter);
    } else {
      autoRenderFooter();
    }
  }

  var DISCLAIMER =
    "Cálculo de la retención de nómina 2026 (RD 439/2007, arts. 80-89) + Seguridad Social. " +
    "No es el resultado de tu declaración de la renta: esa usa la escala real estado + autonómica y puede incluir deducciones adicionales. " +
    "Es una estimación orientativa y no sustituye el asesoramiento fiscal o laboral profesional. " +
    'Consulta nuestra <a href="/metodologia">metodología</a> para conocer los criterios utilizados.';

  // Analítica mínima, reutilizando Cloudflare Web Analytics (ya instalado
  // en todas las páginas vía beacon, sin tocar aquí). Ese beacon solo
  // registra pageviews reales, así que "cálculo realizado" y "clic en
  // compartir" se miden como una pageview virtual: se empuja una URL
  // sintética (que el beacon detecta como navegación) y se revierte al
  // instante a la URL real con history.replaceState, sin que el usuario
  // vea ningún cambio ni se pierda el ?utm_source/medium/campaign que
  // traía la página (viaja intacto en location.search en ambos pasos).
  // No añade ningún servicio nuevo ni envía nada a un servidor propio.
  function trackEvent(nombre) {
    if (typeof history === "undefined" || !history.pushState || typeof location === "undefined") return;
    var actual = location.pathname + location.search + location.hash;
    try {
      history.pushState(null, "", "/_evento/" + nombre + location.search);
      history.replaceState(null, "", actual);
    } catch (e) {
      /* Entornos sin History API utilizable: no es crítico, se ignora. */
    }
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    // "Clic en compartir": delegado en document porque los botones
    // #cf-copiar/#cf-compartir del comparador foral se insertan dinámicamente.
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("#cf-copiar, #cf-compartir");
      if (btn) trackEvent("compartir");
    });

    // "Cálculo realizado": se observa el contenido de los contenedores de
    // resultado ya existentes (#resultado en las calculadoras, #comparador-
    // salida en el comparador foral) en vez de tocar cada pages/*.js. Se
    // limita a como mucho un evento cada 2s por página para no inundar la
    // analítica con cada tecla mientras el usuario escribe su salario.
    var ultimoTrack = 0;
    function alDetectarResultado() {
      var contenedor = document.getElementById("resultado") || document.getElementById("comparador-salida");
      if (!contenedor) return;
      var obs = new MutationObserver(function () {
        if (!contenedor.textContent.trim()) return; // se vació (input inválido/borrado): no cuenta
        var ahora = Date.now();
        if (ahora - ultimoTrack < 2000) return;
        ultimoTrack = ahora;
        trackEvent("calculo");
      });
      obs.observe(contenedor, { childList: true, subtree: true });
    }
    if (typeof MutationObserver !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", alDetectarResultado);
      } else {
        alDetectarResultado();
      }
    }
  }

  function wireSegmented(container) {
    container.querySelectorAll(".segmented").forEach(function (wrap) {
      wrap.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          wrap.querySelectorAll("button").forEach(function (b) {
            b.classList.remove("active");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("active");
          btn.setAttribute("aria-pressed", "true");
          wrap.setAttribute("data-value", btn.getAttribute("data-val"));
          wrap.dispatchEvent(new Event("app:change", { bubbles: true }));
        });
      });
    });
  }

  return {
    renderNav: renderNav,
    renderRelacionadas: renderRelacionadas,
    renderRelacionadasContenido: renderRelacionadasContenido,
    renderFooter: renderFooter,
    buildFormulario: buildFormulario,
    leerFormulario: leerFormulario,
    bloqueoHTML: bloqueoHTML,
    segmentedHTML: segmentedHTML,
    wireSegmented: wireSegmented,
    pagasFieldHTML: pagasFieldHTML,
    wirePagasField: wirePagasField,
    leerNumPagas: leerNumPagas,
    splitBarHTML: splitBarHTML,
    brutoToNetoNavarra: brutoToNetoNavarra,
    netoToBrutoNavarra: netoToBrutoNavarra,
    brutoToNetoBizkaia: brutoToNetoBizkaia,
    netoToBrutoBizkaia: netoToBrutoBizkaia,
    brutoToNetoGipuzkoa: brutoToNetoGipuzkoa,
    netoToBrutoGipuzkoa: netoToBrutoGipuzkoa,
    brutoToNetoAlava: brutoToNetoAlava,
    netoToBrutoAlava: netoToBrutoAlava,
    resumenCondiciones: resumenCondiciones,
    resumenCondicionesHTML: resumenCondicionesHTML,
    DISCLAIMER: DISCLAIMER
  };
})();
