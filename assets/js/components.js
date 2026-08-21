"use strict";
var App = (function () {
  var PAGES = [
    { id: "bruto-neto", href: "index.html", label: "Bruto a neto", icon: "💶", desc: "Cuánto cobras realmente cada mes a partir de tu salario bruto." },
    { id: "neto-bruto", href: "neto-a-bruto.html", label: "Neto a bruto", icon: "🔄", desc: "El bruto que necesitas pactar para llegar al neto que quieres." },
    { id: "comparar", href: "comparar-ofertas.html", label: "Comparar ofertas", icon: "⚖️", desc: "Compara el neto real de dos ofertas de trabajo." },
    { id: "subida", href: "calculadora-subida-sueldo.html", label: "Subida salarial", icon: "📈", desc: "Cuánto de tu subida bruta llega de verdad a tu neto." },
    { id: "coste-empresa", href: "coste-empresa.html", label: "Coste empresa", icon: "🏢", desc: "Lo que le cuesta a la empresa un trabajador, más allá del bruto." }
  ];

  function renderNav(activeId) {
    var el = document.getElementById("topnav");
    if (!el) return;
    var html = '<nav class="topnav-inner" aria-label="Herramientas">';
    PAGES.forEach(function (p) {
      var active = p.id === activeId;
      html +=
        '<a href="' + p.href + '" class="' + (active ? "active" : "") + '"' + (active ? ' aria-current="page"' : "") + '>' +
        '<span aria-hidden="true">' + p.icon + "</span>" + p.label +
        "</a>";
    });
    html += "</nav>";
    el.innerHTML = html;

    // Si el botón activo (p.ej. el último, "Coste empresa") queda fuera del
    // área visible en móvil/tablet, lo centramos en el scroll al cargar la
    // página — nunca debe quedar oculto o a medio cortar.
    var nav = el.querySelector(".topnav-inner");
    var activeLink = el.querySelector("a.active");
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
    var labelPaisVasco = soportados.indexOf("pais_vasco") === -1 ? "País Vasco (no soportado)" : "País Vasco";
    var labelNavarra = soportados.indexOf("navarra") === -1 ? "Navarra (no soportado)" : "Navarra";
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
      (cfg.showPagas === false
        ? ""
        : '<div class="field"><span class="field-label">Pagas al año</span>' +
          segmentedHTML("numPagas", "Pagas al año", [{ value: "12", label: "12 pagas" }, { value: "14", label: "14 pagas" }], "12") +
          "</div>") +
      '<div class="field"><label for="' + pre + '-sitfam">Situación familiar</label>' +
      '<select data-field="situacionFamiliar" id="' + pre + '-sitfam">' +
      '<option value="otro">Soltero/a o sin cónyuge a cargo</option>' +
      '<option value="monoparental">Familia monoparental con hijos</option>' +
      '<option value="casadoConyugeBajosIngresos">Casado/a, cónyuge con rentas ≤ 1.500 €/año</option>' +
      "</select></div>" +
      '<div class="field"><label for="' + pre + '-hijos">Hijos a cargo</label>' +
      '<input type="number" min="0" step="1" data-field="numHijos" id="' + pre + '-hijos" value="0"></div>' +
      '<details class="advanced"><summary>Personalizar cálculo <span class="chevron" aria-hidden="true">▾</span></summary><div class="advanced-body">' +
      '<div class="field"><label for="' + pre + '-territorio">Territorio</label>' +
      '<select data-field="territorio" id="' + pre + '-territorio">' +
      '<option value="comun">Régimen común</option>' +
      '<option value="ceuta">Ceuta</option>' +
      '<option value="melilla">Melilla</option>' +
      '<option value="pais_vasco">' + labelPaisVasco + "</option>" +
      '<option value="navarra">' + labelNavarra + "</option>" +
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
    var pagasWrap = container.querySelector('[data-field="numPagas"]');
    var salarioValor = salarioEl
      ? (salarioEl.dataset.format === "es" ? Fmt.parseEs(salarioEl.value) : salarioEl.valueAsNumber)
      : NaN;
    return {
      salario: salarioValor,
      numPagas: pagasWrap ? Number(pagasWrap.getAttribute("data-value")) : 12,
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

  function bloqueoHTML(motivo) {
    return '<div class="notice warn"><span>⚠️</span><span>' + motivo + "</span></div>";
  }

  var DISCLAIMER =
    "Cálculo de la retención de nómina 2026 (RD 439/2007, arts. 80-89) + Seguridad Social. " +
    "No es el resultado de tu declaración de la renta: esa usa la escala real estado + autonómica y puede incluir deducciones adicionales.";

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
    buildFormulario: buildFormulario,
    leerFormulario: leerFormulario,
    bloqueoHTML: bloqueoHTML,
    segmentedHTML: segmentedHTML,
    wireSegmented: wireSegmented,
    splitBarHTML: splitBarHTML,
    brutoToNetoNavarra: brutoToNetoNavarra,
    netoToBrutoNavarra: netoToBrutoNavarra,
    DISCLAIMER: DISCLAIMER
  };
})();
