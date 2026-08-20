/**
 * Motor fiscal puro — retención de nómina IRPF 2026 (RD 439/2007 arts. 80-89,
 * escala del art. 101.1 LIRPF) + cotización a la Seguridad Social del
 * trabajador. NO calcula la declaración de la renta anual (escala real
 * estado+autonómica, art. 63 LIRPF) — ver README para esa distinción.
 *
 * Patrón dual Node/navegador (UMD). Las constantes se reciben siempre como
 * parámetro explícito (nunca globals) para que el motor sea testeable con
 * datos parciales/mock y no dependa del orden de carga de <script>.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TaxEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // -----------------------------------------------------------------------
  // Helpers numéricos
  // -----------------------------------------------------------------------

  // Redondeo a N decimales, mitad hacia arriba (REDONDEAR1 del algoritmo AEAT
  // para importes en euros). El epsilon evita errores de representación
  // binaria (p. ej. 1.005 -> 1.00 en vez de 1.01 con Math.round ingenuo).
  function round(x, decimales) {
    decimales = decimales === undefined ? 2 : decimales;
    var factor = Math.pow(10, decimales);
    return Math.round((x + Number.EPSILON) * factor) / factor;
  }

  // Truncamiento a N decimales (TRUNCAR del algoritmo AEAT — usado para el
  // TIPO de retención, nunca para importes en euros).
  function truncate(x, decimales) {
    decimales = decimales === undefined ? 2 : decimales;
    var factor = Math.pow(10, decimales);
    var epsilon = x >= 0 ? 1e-9 : -1e-9;
    return Math.trunc(x * factor + epsilon) / factor;
  }

  function clamp(x, min, max) {
    return Math.max(min, Math.min(max, x));
  }

  // Aplica una escala progresiva (array de {desde, hasta, tipo}) a una base.
  // Devuelve la cuota íntegra acumulada hasta esa base.
  function aplicarEscala(base, escala) {
    if (base <= 0) return 0;
    var cuota = 0;
    for (var i = 0; i < escala.length; i++) {
      var tramo = escala[i];
      if (base <= tramo.desde) break;
      var techoTramo = Math.min(base, tramo.hasta);
      cuota += (techoTramo - tramo.desde) * tramo.tipo;
      if (base <= tramo.hasta) break;
    }
    return cuota;
  }

  // -----------------------------------------------------------------------
  // Validación / normalización de entrada
  // -----------------------------------------------------------------------

  var TERRITORIOS_FORALES = { pais_vasco: true, navarra: true };

  function normalizarInput(input) {
    var i = input || {};
    return {
      brutoAnual: Math.max(0, Number(i.brutoAnual) || 0),
      numPagas: i.numPagas === 14 ? 14 : 12,
      situacionFamiliar: i.situacionFamiliar || "otro", // 'monoparental' | 'casadoConyugeBajosIngresos' | 'otro'
      numHijos: Math.max(0, Math.trunc(Number(i.numHijos) || 0)),
      hijosMenores3: Math.max(0, Math.trunc(Number(i.hijosMenores3) || 0)),
      edad65oMas: !!i.edad65oMas,
      edad75oMas: !!i.edad75oMas,
      discapacidadPropia: i.discapacidadPropia || "ninguna", // 'ninguna' | '33-64' | '65omas'
      discapacidadAsistencia: !!i.discapacidadAsistencia,
      numAscendientes: Math.max(0, Math.trunc(Number(i.numAscendientes) || 0)),
      ascendientesMayores75: Math.max(0, Math.trunc(Number(i.ascendientesMayores75) || 0)),
      tipoContrato: i.tipoContrato || "general", // 'general' | 'especial' | 'duracionInferiorAno'
      territorio: i.territorio || "comun", // 'comun' | 'ceuta' | 'melilla' | 'pais_vasco' | 'navarra'
      movilidadGeografica: !!i.movilidadGeografica,
      pensionCompensatoria: Math.max(0, Number(i.pensionCompensatoria) || 0),
      anualidadesAlimentos: Math.max(0, Number(i.anualidadesAlimentos) || 0),
      prestamoViviendaAnterior2013: !!i.prestamoViviendaAnterior2013,
      pensionistaSS: !!i.pensionistaSS,
      desempleado: !!i.desempleado,
      bonusAnual: Math.max(0, Number(i.bonusAnual) || 0),
      computoDescendientesPorMitad: !!i.computoDescendientesPorMitad
    };
  }

  // -----------------------------------------------------------------------
  // Seguridad Social del trabajador (Orden PJC/297/2026)
  // -----------------------------------------------------------------------

  // Prorrateo obligatorio de pagas extra (art. 23.1.A RD 2064/1995): la base
  // de cotización mensual es siempre brutoAnual/12, tope aparte, sea cual
  // sea el número de pagas reales.
  function calcularSegSocialTrabajador(input, constants) {
    // El bonus/variable previsto es retribución salarial ordinaria a efectos
    // de cotización (art. 23 LGSS) y se incluye en la base igual que el
    // salario fijo — ambos se pagan en nómina y cotizan al mismo tipo.
    var brutoAnual = input.brutoAnual + input.bonusAnual;
    var esIndefinido = input.tipoContrato !== "duracionInferiorAno";
    var tope = constants.segSocial.basesCotizacion.topeMaximoMensual * 12;
    var baseAnual = Math.min(brutoAnual, tope);

    var t = constants.segSocial.trabajador;
    var tipoDesempleo = esIndefinido ? t.desempleoIndefinido : t.desempleoTemporal;
    var tipoTotal = t.contingenciasComunes + tipoDesempleo + t.formacionProfesional + t.mei;

    var anual = round(baseAnual * tipoTotal);
    return {
      baseAnual: round(baseAnual),
      tipoTotal: tipoTotal,
      anual: anual,
      mensual: round(anual / 12),
      desglose: {
        contingenciasComunes: round(baseAnual * t.contingenciasComunes),
        desempleo: round(baseAnual * tipoDesempleo),
        formacionProfesional: round(baseAnual * t.formacionProfesional),
        mei: round(baseAnual * t.mei)
      }
    };
  }

  function calcularSegSocialEmpresa(input, constants, atEpTipo) {
    var brutoAnual = input.brutoAnual + input.bonusAnual;
    var esIndefinido = input.tipoContrato !== "duracionInferiorAno";
    var tope = constants.segSocial.basesCotizacion.topeMaximoMensual * 12;
    var baseAnual = Math.min(brutoAnual, tope);

    var e = constants.segSocial.empresa;
    var tipoDesempleo = esIndefinido ? e.desempleoIndefinido : e.desempleoTemporal;
    var tipoAtEp = typeof atEpTipo === "number" ? atEpTipo : constants.segSocial.atEpRangoOrientativo.oficinasAdministrativo;
    var tipoTotal = e.contingenciasComunes + tipoDesempleo + e.formacionProfesional + e.mei + e.fogasa + tipoAtEp;

    var anual = round(baseAnual * tipoTotal);
    return {
      baseAnual: round(baseAnual),
      tipoTotal: tipoTotal,
      atEpTipoUsado: tipoAtEp,
      anual: anual,
      mensual: round(anual / 12)
    };
  }

  // -----------------------------------------------------------------------
  // Retención IRPF — los 5 pasos del Reglamento (arts. 82-86 RIRPF)
  // -----------------------------------------------------------------------

  // Paso 1 (art. 83): base para calcular el tipo de retención.
  function calcularBaseRetencion(input, constants, cotizacionSSAnual) {
    var retribAnualPrevista = input.brutoAnual + input.bonusAnual;
    var RNT = Math.max(0, retribAnualPrevista - cotizacionSSAnual);

    var red = constants.reduccionRendimientosTrabajo;
    var reduccionTrabajo;
    if (RNT <= red.tramo1.hastaRNT) {
      reduccionTrabajo = red.tramo1.importe;
    } else if (RNT <= red.tramo2.hastaRNT) {
      reduccionTrabajo = red.tramo2.base - red.tramo2.coeficiente * (RNT - red.tramo2.desde);
    } else if (RNT < red.tramo3.hastaRNT) {
      reduccionTrabajo = red.tramo3.base - red.tramo3.coeficiente * (RNT - red.tramo3.desde);
    } else {
      reduccionTrabajo = 0;
    }
    reduccionTrabajo = Math.max(0, reduccionTrabajo);

    var g = constants.gastosDeducibles;
    var gastos = g.generales;
    if (input.movilidadGeografica) gastos += g.movilidadGeografica;
    if (input.discapacidadPropia === "33-64") gastos += g.discapacidad33a64;
    if (input.discapacidadPropia === "65omas") gastos += g.discapacidad65omasOAsistencia;

    var RNTREDU = Math.max(0, RNT - gastos - reduccionTrabajo);

    var m = constants.minoracionesBaseRetencion;
    var minoraciones = 0;
    if (input.pensionistaSS) minoraciones += m.pensionistaSSoClasesPasivas;
    if (input.numHijos > 2) minoraciones += m.masDeDosDescendientes;
    if (input.desempleado) minoraciones += m.desempleado;
    minoraciones += input.pensionCompensatoria;

    var base = Math.max(0, RNTREDU - minoraciones);

    return {
      retribAnualPrevista: retribAnualPrevista,
      RNT: round(RNT),
      reduccionTrabajo: round(reduccionTrabajo),
      gastosDeducibles: round(gastos),
      RNTREDU: round(RNTREDU),
      minoraciones: round(minoraciones),
      base: round(base)
    };
  }

  // Paso 2 (art. 84): mínimo personal y familiar para retención.
  function calcularMinimoRetencion(input, constants) {
    var m = constants.minimoPersonalFamiliar;

    var contribuyente = m.contribuyente;
    if (input.edad65oMas) contribuyente += m.incrementoEdad65;
    if (input.edad75oMas) contribuyente += m.incrementoEdad75;

    var factorDescendiente = input.computoDescendientesPorMitad ? 0.5 : 1;
    var descendientes = 0;
    var ordenes = [m.descendiente1, m.descendiente2, m.descendiente3];
    for (var n = 1; n <= input.numHijos; n++) {
      var importeOrden = n <= 3 ? ordenes[n - 1] : m.descendiente4yMas;
      descendientes += importeOrden;
    }
    descendientes += input.hijosMenores3 * m.incrementoDescendienteMenor3;
    descendientes *= factorDescendiente;

    var ascendientes = 0;
    for (var a = 1; a <= input.numAscendientes; a++) {
      ascendientes += m.ascendiente;
    }
    ascendientes += input.ascendientesMayores75 * m.incrementoAscendiente75;

    var discapacidad = 0;
    if (input.discapacidadPropia === "33-64") discapacidad += m.discapacidad33a64;
    if (input.discapacidadPropia === "65omas") discapacidad += m.discapacidad65omas;
    if (input.discapacidadPropia !== "ninguna" && input.discapacidadAsistencia) {
      discapacidad += m.incrementoAsistencia;
    }

    var total = contribuyente + descendientes + ascendientes + discapacidad;
    return {
      contribuyente: round(contribuyente),
      descendientes: round(descendientes),
      ascendientes: round(ascendientes),
      discapacidad: round(discapacidad),
      total: round(total)
    };
  }

  // Paso 3 (art. 85): cuota de retención.
  function calcularCuotaRetencion(base, minimo, input, constants) {
    var cuota1 = aplicarEscala(base, constants.escalaRetencion);
    var cuota2 = aplicarEscala(minimo, constants.escalaRetencion);
    var cuota = Math.max(0, cuota1 - cuota2);

    var esCeutaMelilla = input.territorio === "ceuta" || input.territorio === "melilla";
    if (esCeutaMelilla) {
      cuota = cuota * constants.ceutaMelillaFactorCuota;
    }

    // Tope adicional art. 85.3 (RD 1039/2022) para retribuciones <=35.200€:
    // la cuota no puede superar el 43% de (retribución - umbral de la tabla
    // de retención-cero del art. 81, SEGÚN LA SITUACIÓN del contribuyente) —
    // NO el 43% de la retribución total. Verificado empíricamente contra el
    // simulador oficial de la AEAT (18.000€ soltero sin hijos: tipo 5,07%,
    // importe 912,60€ — coincide exactamente con esta fórmula y difiere de
    // la interpretación ingenua "43% × retribución").
    var lim = constants.limiteCuota85_3;
    if (input.retribAnualPrevista <= lim.umbralAplicacion) {
      var umbralRetCero = calcularUmbralRetencionCero(input, constants);
      var tope = lim.porcentajeMaximo * Math.max(0, input.retribAnualPrevista - umbralRetCero);
      cuota = Math.min(cuota, tope);
    }

    return {
      cuota1: round(cuota1),
      cuota2: round(cuota2),
      esCeutaMelilla: esCeutaMelilla,
      cuota: round(cuota)
    };
  }

  // Minoración por préstamo de vivienda habitual anterior a 1-1-2013 (2% de
  // las retribuciones, tope 660,14€/año, solo si retribución < 33.007,20€).
  function calcularMinoracionVivienda(input) {
    if (!input.prestamoViviendaAnterior2013) return 0;
    if (input.retribAnualPrevista >= 33007.20) return 0;
    return Math.min(660.14, round(input.retribAnualPrevista * 0.02));
  }

  // Paso 4 (art. 86): tipo de retención.
  function calcularTipoRetencion(cuota, minoracionVivienda, input, constants) {
    var esCeutaMelilla = input.territorio === "ceuta" || input.territorio === "melilla";
    var diferenciaPositiva = Math.max(0, cuota - minoracionVivienda);
    var retrib = input.retribAnualPrevista;

    var tipo = retrib > 0 ? truncate((diferenciaPositiva / retrib) * 100, constants.truncarTipoDecimales) : 0;

    // Los suelos se guardan como fracción (0.15 = 15%) en constants-2026.js,
    // igual que el resto de tipos; tipo/techo están en escala porcentual (0-100).
    var suelo = (constants.suelosTipoRetencion[input.tipoContrato] || 0) * 100;
    if (esCeutaMelilla) suelo = suelo / 2;
    tipo = Math.max(tipo, suelo);
    tipo = Math.min(tipo, constants.techoTipoRetencion * 100);

    // Tabla de retención-cero (art. 81.1): por debajo del umbral, tipo = 0,
    // salvo que el suelo de contrato obligue a un mínimo distinto de cero.
    if (suelo === 0 && retrib <= calcularUmbralRetencionCero(input, constants)) {
      tipo = 0;
    }

    return round(tipo, constants.truncarTipoDecimales);
  }

  function calcularUmbralRetencionCero(input, constants) {
    var t = constants.retencionCero;
    var grupo;
    if (input.situacionFamiliar === "monoparental") {
      grupo = input.numHijos >= 2 ? t.situacion1.hijo2omas : t.situacion1.hijo1;
    } else if (input.situacionFamiliar === "casadoConyugeBajosIngresos") {
      grupo = input.numHijos >= 2 ? t.situacion2.hijo2omas : input.numHijos === 1 ? t.situacion2.hijo1 : t.situacion2.hijo0;
    } else {
      grupo = input.numHijos >= 2 ? t.situacion3.hijo2omas : input.numHijos === 1 ? t.situacion3.hijo1 : t.situacion3.hijo0;
    }
    var umbral = grupo;
    if (input.pensionistaSS) umbral += t.incrementoPensionistaSS;
    if (input.desempleado) umbral += t.incrementoDesempleado;
    return umbral;
  }

  // -----------------------------------------------------------------------
  // Orquestación: bruto -> neto
  // -----------------------------------------------------------------------

  function brutoToNeto(inputRaw, constants) {
    var input = normalizarInput(inputRaw);

    if (TERRITORIOS_FORALES[input.territorio]) {
      return {
        bloqueado: true,
        motivo:
          "Esta calculadora implementa el régimen común de retenciones (Reglamento del IRPF estatal). " +
          "País Vasco y Navarra tienen Haciendas forales con normativa de retenciones propia, no cubierta " +
          "aquí. No podemos darte una cifra fiable para ese territorio."
      };
    }

    var ss = calcularSegSocialTrabajador(input, constants);
    var pasoBase = calcularBaseRetencion(input, constants, ss.anual);
    var inputConRetrib = Object.assign({}, input, { retribAnualPrevista: pasoBase.retribAnualPrevista });
    var minimo = calcularMinimoRetencion(input, constants);
    var pasoCuota = calcularCuotaRetencion(pasoBase.base, minimo.total, inputConRetrib, constants);
    var minoracionVivienda = calcularMinoracionVivienda(inputConRetrib);
    var tipoRetencion = calcularTipoRetencion(pasoCuota.cuota, minoracionVivienda, inputConRetrib, constants);

    // El tipo de retención se aplica sobre lo que realmente se paga cada vez
    // (art. 86 RIRPF): a lo largo del año eso es brutoAnual + bonusAnual, el
    // mismo total que ya se usó para fijar el tipo (retribAnualPrevista).
    var retribTotal = pasoBase.retribAnualPrevista;
    var retencionAnual = round(retribTotal * (tipoRetencion / 100));
    var netoAnual = round(retribTotal - ss.anual - retencionAnual);

    return {
      bloqueado: false,
      brutoAnual: round(input.brutoAnual),
      bonusAnual: round(input.bonusAnual),
      numPagas: input.numPagas,
      segSocial: ss,
      irpf: {
        base: pasoBase,
        minimo: minimo,
        cuota: pasoCuota,
        minoracionVivienda: round(minoracionVivienda),
        tipoRetencion: tipoRetencion,
        retencionAnual: retencionAnual
      },
      netoAnual: netoAnual,
      netoPorPaga: round(netoAnual / input.numPagas),
      tipoEfectivoTotal: retribTotal > 0 ? round(((ss.anual + retencionAnual) / retribTotal) * 100) : 0,
      porcentajeQueLlega: retribTotal > 0 ? round((netoAnual / retribTotal) * 100) : 0
    };
  }

  // -----------------------------------------------------------------------
  // Orquestación: neto -> bruto (bisección sobre brutoToNeto, nunca una
  // segunda fórmula — art. J del plan)
  // -----------------------------------------------------------------------

  var NETO_A_BRUTO_TOLERANCIA = 0.01; // 1 céntimo
  var NETO_A_BRUTO_TOPE_ABSOLUTO = 1e9; // cota de seguridad para el bracket

  function netoToBruto(inputRaw, constants) {
    var i = inputRaw || {};
    var objetivo = Math.max(0, Number(i.netoAnualObjetivo) || 0);

    function paraBruto(bruto) {
      return brutoToNeto(Object.assign({}, i, { brutoAnual: bruto }), constants);
    }

    var sondeo = paraBruto(0);
    if (sondeo.bloqueado) return sondeo;

    var lo = 0;
    var hi = Math.max(objetivo, 1);
    while (paraBruto(hi).netoAnual < objetivo) {
      hi *= 2;
      if (hi > NETO_A_BRUTO_TOPE_ABSOLUTO) {
        return {
          bloqueado: true,
          motivo:
            "No se ha podido encontrar un bruto anual que produzca ese neto dentro de un rango razonable " +
            "(hasta " + NETO_A_BRUTO_TOPE_ABSOLUTO + "€). Revisa el importe objetivo."
        };
      }
    }

    // Bisección hasta que el propio bracket [lo, hi] sea más estrecho que la
    // tolerancia — no se corta en cuanto el neto se acerca al objetivo,
    // porque el tipo de retención se trunca a 2 decimales (art. 86 RIRPF) y
    // eso produce microescalones donde el neto no crece de forma
    // perfectamente monótona con el bruto; cortar por bracket en vez de por
    // neto evita quedarse con precisión insuficiente en la zona lineal.
    var resultado = paraBruto(hi);
    for (var iter = 0; iter < 200 && hi - lo > 1e-6; iter++) {
      var mid = (lo + hi) / 2;
      resultado = paraBruto(mid);
      if (resultado.netoAnual < objetivo) lo = mid; else hi = mid;
    }

    resultado.netoAnualObjetivo = round(objetivo);
    resultado.objetivoAlcanzado = Math.abs(resultado.netoAnual - objetivo) <= NETO_A_BRUTO_TOLERANCIA + 1e-6;
    return resultado;
  }

  return {
    round: round,
    truncate: truncate,
    clamp: clamp,
    aplicarEscala: aplicarEscala,
    normalizarInput: normalizarInput,
    calcularSegSocialTrabajador: calcularSegSocialTrabajador,
    calcularSegSocialEmpresa: calcularSegSocialEmpresa,
    calcularBaseRetencion: calcularBaseRetencion,
    calcularMinimoRetencion: calcularMinimoRetencion,
    calcularCuotaRetencion: calcularCuotaRetencion,
    calcularMinoracionVivienda: calcularMinoracionVivienda,
    calcularTipoRetencion: calcularTipoRetencion,
    calcularUmbralRetencionCero: calcularUmbralRetencionCero,
    brutoToNeto: brutoToNeto,
    netoToBruto: netoToBruto
  };
});
