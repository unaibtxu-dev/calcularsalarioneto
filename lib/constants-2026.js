/**
 * Constantes fiscales y de Seguridad Social — ejercicio 2026.
 *
 * Cada bloque de datos tiene una entrada gemela en FUENTES con norma,
 * artículo, URL y estado. tools/check-constants-sources.js falla si falta
 * alguna. Nunca añadas un número aquí sin su fuente correspondiente.
 *
 * Patrón dual Node/navegador (UMD), igual que lib/tax-engine.js.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Constants2026 = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var Constants2026 = {
    TAX_YEAR: 2026,

    // -----------------------------------------------------------------
    // ESCALA DE RETENCIÓN (art. 101.1 LIRPF, operacionalizada vía RIRPF
    // art. 85). Es una escala NACIONAL AUTOCONTENIDA para el cálculo de
    // retenciones sobre el trabajo — DISTINTA de la escala general del
    // art. 63.1 LIRPF (esa sí combina tramo estatal + autonómico, y se usa
    // solo en la declaración anual). Confirmado que esta escala no varía
    // por comunidad autónoma: la tabla "DATOS DE ENTRADA" del algoritmo
    // oficial de la AEAT no incluye ningún campo de CCAA.
    // Vigente para 2026 sin cambio respecto a 2025 (no depende del PGE).
    // -----------------------------------------------------------------
    escalaRetencion: [
      { desde: 0, hasta: 12450, tipo: 0.19 },
      { desde: 12450, hasta: 20200, tipo: 0.24 },
      { desde: 20200, hasta: 35200, tipo: 0.30 },
      { desde: 35200, hasta: 60000, tipo: 0.37 },
      { desde: 60000, hasta: 300000, tipo: 0.45 },
      { desde: 300000, hasta: Infinity, tipo: 0.47 }
    ],

    // Tope adicional art. 85.3 RIRPF (introducido por RD 1039/2022, vigente
    // desde 1-1-2023): para retribuciones anuales <= umbralAplicacion, la
    // cuota de retención no puede superar el 43% de la diferencia positiva
    // entre la retribución total y el umbral de la tabla de retención-cero
    // del art. 81 (retencionCero) QUE CORRESPONDA a la situación del
    // contribuyente — no el 43% de la retribución total sin más. Verificado
    // exactamente contra el simulador oficial de la AEAT (ver
    // validacion-aeat.md, casos 18.000€ y 60.000€).
    limiteCuota85_3: { umbralAplicacion: 35200, porcentajeMaximo: 0.43 },

    // Ceuta y Melilla: la cuota de retención se multiplica por 0,40 (recorte
    // del 60%) cuando el trabajador reside Y obtiene la renta allí. Mismo
    // 60% que el art. 68.4 LIRPF aplica en la declaración anual (distinta
    // base, misma proporción). Fuente: algoritmo AEAT, bloque "CÁLCULO TIPO
    // DE RETENCIÓN" (RESICEME/RENCEME → CEUMELI).
    ceutaMelillaFactorCuota: 0.40,

    // Suelos y techo del tipo de retención (art. 86 RIRPF). "general" no
    // tiene suelo. "especial" = relaciones laborales especiales (art. 11
    // RIRPF: penados en instituciones penitenciarias, discapacitados en
    // centros especiales de empleo, etc.). "duracionInferiorAno" = relación
    // de duración inferior al año (p.ej. relaciones artísticas temporales).
    // Los suelos se reducen a la mitad en Ceuta/Melilla.
    suelosTipoRetencion: {
      general: 0,
      especial: 0.15,
      duracionInferiorAno: 0.02
    },
    techoTipoRetencion: 0.47,

    // Truncamiento (NO redondeo) del tipo de retención a 2 decimales —
    // confirmado literalmente en el algoritmo oficial de la AEAT.
    truncarTipoDecimales: 2,

    // -----------------------------------------------------------------
    // REDUCCIÓN POR OBTENCIÓN DE RENDIMIENTOS DEL TRABAJO (art. 20 LIRPF),
    // tal como la aplica el algoritmo de retenciones (RED20). Vigente 2026
    // sin cambio respecto a 2025 (umbrales del RD-ley 4/2024).
    // -----------------------------------------------------------------
    reduccionRendimientosTrabajo: {
      tramo1: { hastaRNT: 14852.00, importe: 7302.00 },
      tramo2: { hastaRNT: 17673.52, base: 7302.00, coeficiente: 1.75, desde: 14852.00 },
      tramo3: { hastaRNT: 19747.50, base: 2364.34, coeficiente: 1.14, desde: 17673.52 }
      // RNT >= 19747.50 → reducción 0
    },

    // Gastos deducibles de la base de retención (art. 83.3 RIRPF).
    gastosDeducibles: {
      generales: 2000,
      movilidadGeografica: 2000, // adicional, año del cambio de residencia + siguiente
      discapacidad33a64: 3500,
      discapacidad65omasOAsistencia: 7750
    },

    // Minoraciones específicas de la BASE de retención (art. 83, paso 1),
    // distintas de la tabla de retención-cero (aunque comparten importes).
    minoracionesBaseRetencion: {
      pensionistaSSoClasesPasivas: 600,
      masDeDosDescendientes: 600,
      desempleado: 1200
    },

    // -----------------------------------------------------------------
    // MÍNIMO PERSONAL Y FAMILIAR (Título V LIRPF, aplicado a retención vía
    // art. 84 RIRPF: descendientes por mitad salvo derecho exclusivo; no
    // aplica la especialidad de cónyuges separados con guarda compartida).
    // Vigente 2026 = 2025 (no depende del PGE).
    // -----------------------------------------------------------------
    minimoPersonalFamiliar: {
      contribuyente: 5550,
      incrementoEdad65: 1150,
      incrementoEdad75: 1400, // adicional al de 65+
      descendiente1: 2400,
      descendiente2: 2700,
      descendiente3: 4000,
      descendiente4yMas: 4500,
      incrementoDescendienteMenor3: 2800,
      ascendiente: 1150,
      incrementoAscendiente75: 1400,
      discapacidad33a64: 3000,
      discapacidad65omas: 9000,
      incrementoAsistencia: 3000
    },

    // -----------------------------------------------------------------
    // TABLA DE RETENCIÓN CERO (art. 81.1 RIRPF, redacción RD 142/2024).
    // Por debajo de estos importes anuales de retribución, el tipo de
    // retención es 0%. Vigente 2026 = 2025 (sin cambio normativo).
    // situacion1 = monoparental con hijos (sin cónyuge)
    // situacion2 = casado/a, cónyuge con rentas <=1.500€/año
    // situacion3 = resto de casos
    // -----------------------------------------------------------------
    retencionCero: {
      situacion1: { hijo1: 17644, hijo2omas: 18694 },
      situacion2: { hijo0: 17197, hijo1: 18130, hijo2omas: 19262 },
      situacion3: { hijo0: 15876, hijo1: 16342, hijo2omas: 16867 },
      incrementoPensionistaSS: 600,
      incrementoDesempleado: 1200
    },

    // -----------------------------------------------------------------
    // SEGURIDAD SOCIAL — tipos de cotización 2026 (Orden PJC/297/2026).
    // -----------------------------------------------------------------
    segSocial: {
      trabajador: {
        contingenciasComunes: 0.0470,
        desempleoIndefinido: 0.0155,
        desempleoTemporal: 0.0160,
        formacionProfesional: 0.0010,
        mei: 0.0015
      },
      empresa: {
        contingenciasComunes: 0.2360,
        desempleoIndefinido: 0.0550,
        desempleoTemporal: 0.0670,
        formacionProfesional: 0.0060,
        mei: 0.0075,
        fogasa: 0.0020
        // AT/EP NO tiene tipo fijo — depende del CNAE (D.A. 61ª LGSS, RDL
        // 3/2026). No se incluye ningún valor por defecto "exacto" aquí:
        // lo introduce el usuario en la calculadora de coste empresa.
      },
      // Rango orientativo de AT/EP por CNAE — SOLO para mostrar de
      // referencia en la UI, nunca como valor aplicado por defecto sin que
      // el usuario lo confirme. Tabla completa pendiente de cotejar
      // carácter por carácter contra el texto consolidado de la D.A. 61ª
      // LGSS antes de ampliar esta lista.
      atEpRangoOrientativo: {
        oficinasAdministrativo: 0.0150,
        construccionEdificios: 0.0670,
        mineriaSubterranea: 0.0715
      },
      basesCotizacion: {
        topeMaximoMensual: 5101.20,
        minimasPorGrupo: {
          1: 1989.30,
          2: 1649.70,
          3: 1435.20,
          "4-7": 1424.40
        },
        minimaDiaria: 47.48,
        maximaDiaria: 170.04
      }
    },

    // SMI 2026 (RD 126/2026) — referencia (interacciones con bases mínimas
    // de cotización, umbrales de exención, etc.)
    smi: {
      mensual: 1221.00,
      anual14Pagas: 17094.00
    }
  };

  // ---------------------------------------------------------------------
  // Registro de fuentes — una entrada por cada bloque de datos de arriba.
  // tools/check-constants-sources.js exige que cada clave de Constants2026
  // (salvo TAX_YEAR) tenga aquí una entrada con norma + articulo + url + año
  // + estado.
  // ---------------------------------------------------------------------
  Constants2026.FUENTES = {
    escalaRetencion: {
      norma: "Reglamento del IRPF (RD 439/2007) art. 85, sobre la escala del art. 101.1 LIRPF",
      articulo: "Art. 101.1 LIRPF / RIRPF art. 85",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado"
    },
    limiteCuota85_3: {
      norma: "RD 1039/2022, que añade el límite del art. 85.3 RIRPF",
      articulo: "Art. 85.3 RIRPF",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado (fórmula simplificada, ver TODO en el código)"
    },
    ceutaMelillaFactorCuota: {
      norma: "Algoritmo AEAT retenciones 2026 + art. 68.4 LIRPF (misma proporción, distinta base)",
      articulo: "Art. 101.1 LIRPF / RIRPF art. 85; art. 68.4 LIRPF",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado"
    },
    suelosTipoRetencion: {
      norma: "Reglamento del IRPF (RD 439/2007) art. 86",
      articulo: "Art. 86 RIRPF",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado"
    },
    techoTipoRetencion: {
      norma: "Reglamento del IRPF (RD 439/2007) art. 86",
      articulo: "Art. 86 RIRPF",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado"
    },
    truncarTipoDecimales: {
      norma: "Algoritmo oficial de retenciones AEAT 2026",
      articulo: "—",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado"
    },
    reduccionRendimientosTrabajo: {
      norma: "Ley 35/2006 (LIRPF), redacción RD-ley 4/2024",
      articulo: "Art. 20 LIRPF",
      url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/7-cumplimentacion-irpf/7_1-rendimientos-trabajo-personal/7_1_6-reduccion-obtencion-rendimientos-trabajo.html",
      anio: 2026,
      estado: "confirmado (2026 = 2025, sin cambio normativo)"
    },
    gastosDeducibles: {
      norma: "Reglamento del IRPF (RD 439/2007) art. 83.3",
      articulo: "Art. 83.3 RIRPF",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado"
    },
    minimoPersonalFamiliar: {
      norma: "Ley 35/2006 (LIRPF), Título V, arts. 57-61, aplicado a retención vía RIRPF art. 84",
      articulo: "Título V LIRPF / RIRPF art. 84",
      url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/cuadro-resumen-minimo-personal-familiar.html",
      anio: 2026,
      estado: "confirmado (2026 = 2025, sin cambio normativo)"
    },
    minoracionesBaseRetencion: {
      norma: "Reglamento del IRPF (RD 439/2007) art. 83 (paso 1 del algoritmo de retenciones)",
      articulo: "Art. 83 RIRPF",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado"
    },
    retencionCero: {
      norma: "Reglamento del IRPF (RD 439/2007), redacción RD 142/2024",
      articulo: "Art. 81.1 RIRPF",
      url: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf",
      anio: 2026,
      estado: "confirmado (2026 = 2025, sin cambio normativo)"
    },
    segSocial: {
      norma: "Orden PJC/297/2026, de 30 de marzo",
      articulo: "Arts. 1, 4 y 33 Orden PJC/297/2026",
      url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296",
      anio: 2026,
      estado: "confirmado (AT/EP: rango orientativo pendiente de cotejo completo, ver nota en el código)"
    },
    smi: {
      norma: "Real Decreto 126/2026, de 18 de febrero",
      articulo: "—",
      url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2026-3815",
      anio: 2026,
      estado: "confirmado"
    }
  };

  return Constants2026;
});
