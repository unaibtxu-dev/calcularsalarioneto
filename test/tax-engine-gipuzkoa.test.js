"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const ConstantsGipuzkoa2026 = require("../lib/constants-gipuzkoa-2026.js");
const ConstantsBizkaia2026 = require("../lib/constants-bizkaia-2026.js");
// Gipuzkoa reutiliza el mismo motor que Bizkaia (ver lib/tax-engine-bizkaia.js):
// la tabla es idéntica, verificada por separado contra fuente propia de Gipuzkoa.
const TaxEngineBizkaia = require("../lib/tax-engine-bizkaia.js");

function tipo(retribucionFija, numDescendientes, discapacidad) {
  return TaxEngineBizkaia.calcularTipoRetencion(
    { retribucionFija: retribucionFija, retribucionVariablePrevisible: 0, numDescendientes: numDescendientes || 0, discapacidad: discapacidad || "ninguna" },
    ConstantsGipuzkoa2026
  ).tipoRetencion;
}

describe("tax-engine (Gipuzkoa) — validación oficial contra ejemplos de Hacienda Foral de Gipuzkoa", () => {
  test("Ejemplo Ibon: 24.581,39€, 2 hijos, sin discapacidad -> 9%", () => {
    assert.equal(tipo(24581.39, 2), 9);
  });

  test("Ejemplo Ibon (tras subida): 27.609,81€, 2 hijos -> 11%", () => {
    assert.equal(tipo(27609.81, 2), 11);
  });

  test("Ejemplo Ainhoa: 28.581,39€, 2 hijos, discapacidad situación A (33-64%) -> 11% - 7% = 4%", () => {
    assert.equal(tipo(28581.39, 2, "33-64"), 4);
  });

  test("Ejemplo Ainhoa (tras subida): 31.709,81€, 2 hijos, discapacidad situación A -> 13% - 7% = 6%", () => {
    assert.equal(tipo(31709.81, 2, "33-64"), 6);
  });
});

describe("tax-engine (Gipuzkoa) — tabla idéntica a Bizkaia (verificado, no asumido)", () => {
  test("las 35 filas de la tabla general son exactamente iguales a las de Bizkaia", () => {
    assert.deepEqual(ConstantsGipuzkoa2026.tablaRetencion, ConstantsBizkaia2026.tablaRetencion);
  });

  test("las 8 bandas de discapacidad son exactamente iguales a las de Bizkaia", () => {
    assert.deepEqual(ConstantsGipuzkoa2026.minoracionDiscapacidad, ConstantsBizkaia2026.minoracionDiscapacidad);
  });
});

describe("tax-engine (Gipuzkoa) — tabla general (0 descendientes)", () => {
  const casos = [
    [10000, 0], [20000, 0], [20000.01, 7], [29790, 14], [29790.01, 15],
    [61820, 22], [61820.01, 23], [236060, 39], [236060.01, 40], [1000000, 40]
  ];
  casos.forEach(([bruto, esperado]) => {
    test(`${bruto}€ sin descendientes -> ${esperado}%`, () => {
      assert.equal(tipo(bruto, 0), esperado);
    });
  });
});

describe("tax-engine (Gipuzkoa) — minoración por discapacidad", () => {
  test("30.000€ discapacidad 33-64% (situación A) resta 7 puntos -> 15-7=8%", () => {
    assert.equal(tipo(30000, 0, "33-64"), 8);
  });

  test("30.000€ discapacidad >=65% (situación C) resta 12 puntos -> 15-12=3%", () => {
    assert.equal(tipo(30000, 0, "65omas"), 3);
  });

  test("la minoración nunca deja el tipo por debajo de 0", () => {
    assert.equal(tipo(15000, 0, "65omas"), 0);
  });
});
