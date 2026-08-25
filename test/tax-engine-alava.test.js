"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const ConstantsAlava2026 = require("../lib/constants-alava-2026.js");
const ConstantsBizkaia2026 = require("../lib/constants-bizkaia-2026.js");
// Álava reutiliza el mismo motor que Bizkaia y Gipuzkoa (ver
// lib/tax-engine-bizkaia.js): la tabla es idéntica, verificada por
// separado contra fuente propia de Álava (web.araba.eus).
const TaxEngineBizkaia = require("../lib/tax-engine-bizkaia.js");

function tipo(retribucionFija, numDescendientes, discapacidad) {
  return TaxEngineBizkaia.calcularTipoRetencion(
    { retribucionFija: retribucionFija, retribucionVariablePrevisible: 0, numDescendientes: numDescendientes || 0, discapacidad: discapacidad || "ninguna" },
    ConstantsAlava2026
  ).tipoRetencion;
}

describe("tax-engine (Álava) — tabla idéntica a Bizkaia (verificado, no asumido)", () => {
  test("las 35 filas de la tabla general son exactamente iguales a las de Bizkaia", () => {
    assert.deepEqual(ConstantsAlava2026.tablaRetencion, ConstantsBizkaia2026.tablaRetencion);
  });

  test("las 8 bandas de discapacidad son exactamente iguales a las de Bizkaia", () => {
    assert.deepEqual(ConstantsAlava2026.minoracionDiscapacidad, ConstantsBizkaia2026.minoracionDiscapacidad);
  });
});

describe("tax-engine (Álava) — tabla general (0 descendientes)", () => {
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

describe("tax-engine (Álava) — minoración por discapacidad", () => {
  test("30.000€ discapacidad 33-64% (apartado a) resta 7 puntos -> 15-7=8%", () => {
    assert.equal(tipo(30000, 0, "33-64"), 8);
  });

  test("30.000€ discapacidad >=65% (apartado c) resta 12 puntos -> 15-12=3%", () => {
    assert.equal(tipo(30000, 0, "65omas"), 3);
  });

  test("la minoración nunca deja el tipo por debajo de 0", () => {
    assert.equal(tipo(15000, 0, "65omas"), 0);
  });
});

describe("tax-engine (Álava) — casos combinados, coherentes con Bizkaia/Gipuzkoa", () => {
  test("30.000€, 2 hijos, discapacidad 33-64% -> igual que Bizkaia (6%)", () => {
    assert.equal(tipo(30000, 2, "33-64"), 6);
  });

  test("40.000€, discapacidad >=65% -> igual que Bizkaia (7%)", () => {
    assert.equal(tipo(40000, 0, "65omas"), 7);
  });
});
