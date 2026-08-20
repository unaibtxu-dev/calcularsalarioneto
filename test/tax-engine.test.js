"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const TaxEngine = require("../lib/tax-engine.js");
const C = require("../lib/constants-2026.js");

const SALARIOS = [18000, 20000, 25000, 30000, 35000, 40000, 50000, 60000, 80000, 100000];
const SITUACIONES = [
  { situacionFamiliar: "otro", numHijos: 0 },
  { situacionFamiliar: "otro", numHijos: 2 },
  { situacionFamiliar: "monoparental", numHijos: 1 }
];

function casoBase(bruto, situacion, extra) {
  return Object.assign({ brutoAnual: bruto, numPagas: 12 }, situacion, extra || {});
}

describe("invariantes sobre la rejilla de sueldos x situaciones x pagas", () => {
  for (const bruto of SALARIOS) {
    for (const situacion of SITUACIONES) {
      for (const numPagas of [12, 14]) {
        const input = casoBase(bruto, situacion, { numPagas });
        const label = `bruto=${bruto} situacion=${situacion.situacionFamiliar}/${situacion.numHijos}hijos pagas=${numPagas}`;

        test(`${label}: neto <= bruto, sin NaN/Infinity`, () => {
          const r = TaxEngine.brutoToNeto(input, C);
          assert.equal(r.bloqueado, false);
          assert.ok(Number.isFinite(r.netoAnual), label);
          assert.ok(r.netoAnual <= r.brutoAnual, label);
          assert.ok(r.netoAnual >= 0, label);
        });

        test(`${label}: tipo de retención entre 0 y 47`, () => {
          const r = TaxEngine.brutoToNeto(input, C);
          assert.ok(r.irpf.tipoRetencion >= 0 && r.irpf.tipoRetencion <= 47, label);
        });

        test(`${label}: 12 vs 14 pagas no cambia el neto anual`, () => {
          const r12 = TaxEngine.brutoToNeto(Object.assign({}, input, { numPagas: 12 }), C);
          const r14 = TaxEngine.brutoToNeto(Object.assign({}, input, { numPagas: 14 }), C);
          assert.ok(Math.abs(r12.netoAnual - r14.netoAnual) < 0.01, label);
        });
      }
    }
  }

  test("monotonía: más bruto nunca produce menos neto (misma situación)", () => {
    let netoAnterior = -Infinity;
    for (const bruto of SALARIOS) {
      const r = TaxEngine.brutoToNeto(casoBase(bruto, SITUACIONES[0]), C);
      assert.ok(r.netoAnual > netoAnterior, `bruto=${bruto}`);
      netoAnterior = r.netoAnual;
    }
  });
});

describe("casos límite", () => {
  test("bruto 0 -> neto 0, sin NaN", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 0, numPagas: 12 }, C);
    assert.equal(r.netoAnual, 0);
    assert.equal(r.irpf.tipoRetencion, 0);
  });

  test("bruto negativo -> se normaliza a 0, nunca neto negativo imposible", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: -5000, numPagas: 12 }, C);
    assert.ok(Number.isFinite(r.netoAnual));
    assert.ok(r.netoAnual >= 0);
  });

  test("bruto con decimales no revienta el cálculo", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 32500.57, numPagas: 12 }, C);
    assert.ok(Number.isFinite(r.netoAnual));
  });

  test("bruto extremadamente alto: nunca NaN/Infinity, tipo tope 47%", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 50000000, numPagas: 12 }, C);
    assert.ok(Number.isFinite(r.netoAnual));
    assert.ok(r.irpf.tipoRetencion <= 47);
  });

  test("numHijos/numPagas inválidos no revientan (se normalizan)", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 30000, numPagas: 13, numHijos: -3 }, C);
    assert.ok(Number.isFinite(r.netoAnual));
    assert.equal(r.numPagas, 12);
  });
});

describe("tabla de retención cero (art. 81.1 RIRPF)", () => {
  test("soltero sin hijos por debajo del umbral -> tipo 0", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 15000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, C);
    assert.equal(r.irpf.tipoRetencion, 0);
  });

  test("justo por encima del umbral -> tipo > 0", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 16500, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, C);
    assert.ok(r.irpf.tipoRetencion > 0);
  });
});

describe("Ceuta y Melilla", () => {
  test("la cuota con Ceuta/Melilla es el 40% de la cuota general (mismo caso base)", () => {
    const base = { brutoAnual: 40000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 };
    const general = TaxEngine.brutoToNeto(base, C);
    const ceuta = TaxEngine.brutoToNeto(Object.assign({}, base, { territorio: "ceuta" }), C);
    const cuotaGeneral = general.irpf.cuota.cuota1 - general.irpf.cuota.cuota2;
    assert.ok(ceuta.irpf.cuota.cuota <= cuotaGeneral * 0.41 + 1); // margen por el tope 85.3
    assert.ok(ceuta.netoAnual >= general.netoAnual);
  });
});

describe("País Vasco / Navarra — bloqueo explícito, sin fallback silencioso", () => {
  for (const territorio of ["pais_vasco", "navarra"]) {
    test(`territorio=${territorio} devuelve bloqueado=true con motivo`, () => {
      const r = TaxEngine.brutoToNeto({ brutoAnual: 30000, numPagas: 12, territorio }, C);
      assert.equal(r.bloqueado, true);
      assert.ok(typeof r.motivo === "string" && r.motivo.length > 0);
      assert.equal(r.netoAnual, undefined);
    });
  }
});

describe("suelos de tipo de contrato", () => {
  test("duración inferior al año respeta el suelo del 2% aunque el cálculo dé menos", () => {
    const r = TaxEngine.brutoToNeto(
      { brutoAnual: 14000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0, tipoContrato: "duracionInferiorAno" },
      C
    );
    assert.ok(r.irpf.tipoRetencion >= 2);
  });

  test("relación laboral especial respeta el suelo del 15%", () => {
    const r = TaxEngine.brutoToNeto(
      { brutoAnual: 14000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0, tipoContrato: "especial" },
      C
    );
    assert.ok(r.irpf.tipoRetencion >= 15);
  });
});

describe("prorrateo de pagas extra en Seguridad Social", () => {
  test("la cuota de SS anual es idéntica con 12 o 14 pagas para el mismo bruto", () => {
    const base = { brutoAnual: 42000, situacionFamiliar: "otro", numHijos: 0 };
    const ss12 = TaxEngine.calcularSegSocialTrabajador(TaxEngine.normalizarInput(Object.assign({}, base, { numPagas: 12 })), C);
    const ss14 = TaxEngine.calcularSegSocialTrabajador(TaxEngine.normalizarInput(Object.assign({}, base, { numPagas: 14 })), C);
    assert.equal(ss12.anual, ss14.anual);
  });
});

describe("esquema de fuentes de constants-2026.js", () => {
  test("todas las claves de datos tienen entrada en FUENTES con los campos obligatorios", () => {
    const exentas = new Set(["TAX_YEAR", "FUENTES"]);
    const claves = Object.keys(C).filter((k) => !exentas.has(k));
    for (const clave of claves) {
      const fuente = C.FUENTES[clave];
      assert.ok(fuente, `Falta fuente para "${clave}"`);
      for (const campo of ["norma", "articulo", "url", "anio", "estado"]) {
        assert.ok(fuente[campo], `Fuente de "${clave}" sin campo "${campo}"`);
      }
    }
  });
});

describe("céntimos y salarios arbitrarios (el motor no hardcodea ningún importe)", () => {
  test("36.650,73€ no revienta el cálculo y es coherente con vecinos enteros", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 36650.73, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, C);
    assert.equal(r.bloqueado, false);
    assert.ok(Number.isFinite(r.netoAnual));
    assert.ok(r.netoAnual > 0 && r.netoAnual < r.brutoAnual);
    assert.ok(r.irpf.tipoRetencion >= 0 && r.irpf.tipoRetencion <= 47);

    const menos = TaxEngine.brutoToNeto({ brutoAnual: 36650, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, C);
    const mas = TaxEngine.brutoToNeto({ brutoAnual: 36651, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, C);
    assert.ok(r.netoAnual >= menos.netoAnual && r.netoAnual <= mas.netoAnual);
  });

  test("36.650,73€ a 14 pagas: netoPorPaga * 14 coincide con netoAnual (dentro de redondeo)", () => {
    const r = TaxEngine.brutoToNeto({ brutoAnual: 36650.73, numPagas: 14, situacionFamiliar: "otro", numHijos: 0 }, C);
    assert.ok(Math.abs(r.netoPorPaga * 14 - r.netoAnual) < 0.5);
  });

  test("otros importes con céntimos arbitrarios (no de la lista de prueba) tampoco revientan", () => {
    for (const bruto of [12345.67, 27890.01, 58234.99, 99999.09]) {
      const r = TaxEngine.brutoToNeto({ brutoAnual: bruto, numPagas: 12 }, C);
      assert.equal(r.bloqueado, false, `bruto=${bruto}`);
      assert.ok(Number.isFinite(r.netoAnual), `bruto=${bruto}`);
      assert.ok(r.netoAnual <= r.brutoAnual, `bruto=${bruto}`);
    }
  });
});

describe("bonus/variable previsto (art. 83.1 RIRPF)", () => {
  test("el bonus sube el tipo de retención y se incluye en el neto anual (no desaparece)", () => {
    const base = { brutoAnual: 30000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 };
    const sinBonus = TaxEngine.brutoToNeto(base, C);
    const conBonus = TaxEngine.brutoToNeto(Object.assign({}, base, { bonusAnual: 5000 }), C);

    assert.ok(conBonus.irpf.tipoRetencion >= sinBonus.irpf.tipoRetencion);
    assert.ok(conBonus.netoAnual > sinBonus.netoAnual, "el bonus debe aumentar el neto anual");
    assert.ok(conBonus.netoAnual < sinBonus.netoAnual + 5000, "el bonus tributa, no llega íntegro al neto");
  });

  test("invariante: netoAnual = (bruto+bonus) - SS anual - retención anual", () => {
    const r = TaxEngine.brutoToNeto(
      { brutoAnual: 40000, bonusAnual: 8000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 },
      C
    );
    const esperado = TaxEngine.round(r.brutoAnual + r.bonusAnual - r.segSocial.anual - r.irpf.retencionAnual);
    assert.equal(r.netoAnual, esperado);
  });

  test("el bonus también forma parte de la base de cotización a la Seguridad Social", () => {
    const sinBonus = TaxEngine.calcularSegSocialTrabajador(
      TaxEngine.normalizarInput({ brutoAnual: 30000, numPagas: 12 }),
      C
    );
    const conBonus = TaxEngine.calcularSegSocialTrabajador(
      TaxEngine.normalizarInput({ brutoAnual: 30000, bonusAnual: 5000, numPagas: 12 }),
      C
    );
    assert.ok(conBonus.anual > sinBonus.anual);
  });
});

describe("netoToBruto (bisección sobre brutoToNeto)", () => {
  // El invariante garantizado es que netoToBruto(x).netoAnual reproduce x
  // (al céntimo): el tipo de retención se trunca a 2 decimales (art. 86
  // RIRPF) y se aplica sobre TODA la retribución, no de forma marginal, así
  // que bruto->neto tiene microescalones reales donde el neto no crece de
  // forma estrictamente monótona (ver "microescalón de truncamiento" más
  // abajo). Eso significa que, cerca de esos escalones, dos brutos distintos
  // pueden producir el mismo neto redondeado — por eso NO se exige recuperar
  // el bruto exacto en general, solo que el neto objetivo se reproduzca.
  for (const bruto of SALARIOS) {
    for (const situacion of SITUACIONES) {
      test(`round-trip (neto) bruto=${bruto} situacion=${situacion.situacionFamiliar}/${situacion.numHijos}hijos`, () => {
        const directo = TaxEngine.brutoToNeto(casoBase(bruto, situacion), C);
        const inverso = TaxEngine.netoToBruto(
          Object.assign({ netoAnualObjetivo: directo.netoAnual }, situacion),
          C
        );
        assert.equal(inverso.bloqueado, false);
        assert.ok(inverso.objetivoAlcanzado, `objetivo no alcanzado para bruto=${bruto}`);
        assert.ok(Math.abs(inverso.netoAnual - directo.netoAnual) <= 0.0101, `bruto=${bruto}`);
        // el bruto recuperado debe estar en el mismo orden de magnitud (cota
        // amplia: los microescalones de truncamiento nunca desplazan el
        // bruto más de una fracción pequeña del salario)
        assert.ok(Math.abs(inverso.brutoAnual - bruto) < Math.max(10, bruto * 0.01), `bruto=${bruto} vs recuperado=${inverso.brutoAnual}`);
      });
    }
  }

  test("neto objetivo 0 -> bruto 0", () => {
    const r = TaxEngine.netoToBruto({ netoAnualObjetivo: 0, numPagas: 12 }, C);
    assert.equal(r.brutoAnual, 0);
  });

  test("neto objetivo con céntimos arbitrarios reproduce el neto exacto", () => {
    for (const bruto of [36650.73, 47823.19, 12345.67, 27890.01, 58234.99]) {
      const directo = TaxEngine.brutoToNeto({ brutoAnual: bruto, numPagas: 12 }, C);
      const inverso = TaxEngine.netoToBruto({ netoAnualObjetivo: directo.netoAnual, numPagas: 12 }, C);
      assert.ok(inverso.objetivoAlcanzado, `bruto=${bruto}`);
      assert.ok(Math.abs(inverso.netoAnual - directo.netoAnual) <= 0.0101, `bruto=${bruto}`);
    }
  });

  test("microescalón de truncamiento: el tipo puede subir 0,01 punto y el neto casi no crece (comportamiento real, no bug)", () => {
    // Documentado por si algún día se cambia el algoritmo: en torno a
    // bruto=36.649,50€ el tipo pasa de 18,52% a 18,53% y el neto vuelve a
    // caer momentáneamente porque el tipo se aplica a TODA la retribución.
    const antes = TaxEngine.brutoToNeto({ brutoAnual: 36649.0, numPagas: 12 }, C);
    const despues = TaxEngine.brutoToNeto({ brutoAnual: 36649.5, numPagas: 12 }, C);
    assert.ok(despues.irpf.tipoRetencion > antes.irpf.tipoRetencion);
    assert.ok(despues.netoAnual < antes.netoAnual, "el escalón de truncamiento debe producir una caída real del neto");
  });

  test("objetivo de neto absurdamente alto se marca bloqueado, no NaN/Infinity", () => {
    const r = TaxEngine.netoToBruto({ netoAnualObjetivo: 5e9, numPagas: 12 }, C);
    assert.equal(r.bloqueado, true);
    assert.ok(typeof r.motivo === "string" && r.motivo.length > 0);
  });

  test("territorio foral en netoToBruto también bloquea, sin fallback silencioso", () => {
    const r = TaxEngine.netoToBruto({ netoAnualObjetivo: 20000, territorio: "pais_vasco" }, C);
    assert.equal(r.bloqueado, true);
  });
});

describe("helpers numéricos", () => {
  test("truncate trunca, no redondea", () => {
    assert.equal(TaxEngine.truncate(17.8599, 2), 17.85);
    assert.equal(TaxEngine.truncate(17.8551, 2), 17.85);
  });

  test("round redondea mitad hacia arriba", () => {
    assert.equal(TaxEngine.round(1.005, 2), 1.01);
    assert.equal(TaxEngine.round(1.004, 2), 1.0);
  });

  test("aplicarEscala reproduce la cuota acumulada tabulada en el Reglamento", () => {
    const escala = C.escalaRetencion;
    assert.equal(TaxEngine.round(TaxEngine.aplicarEscala(12450, escala)), 2365.5);
    assert.equal(TaxEngine.round(TaxEngine.aplicarEscala(20200, escala)), 4225.5);
    assert.equal(TaxEngine.round(TaxEngine.aplicarEscala(35200, escala)), 8725.5);
    assert.equal(TaxEngine.round(TaxEngine.aplicarEscala(60000, escala)), 17901.5);
    assert.equal(TaxEngine.round(TaxEngine.aplicarEscala(300000, escala)), 125901.5);
  });
});
