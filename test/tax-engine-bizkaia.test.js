"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const ConstantsBizkaia2026 = require("../lib/constants-bizkaia-2026.js");
const TaxEngineBizkaia = require("../lib/tax-engine-bizkaia.js");

function tipo(retribucionFija, numDescendientes, discapacidad) {
  return TaxEngineBizkaia.calcularTipoRetencion(
    { retribucionFija: retribucionFija, retribucionVariablePrevisible: 0, numDescendientes: numDescendientes || 0, discapacidad: discapacidad || "ninguna" },
    ConstantsBizkaia2026
  ).tipoRetencion;
}

describe("tax-engine-bizkaia — tabla general (0 descendientes)", () => {
  const casos = [
    [10000, 0], [20000, 0], [20000.01, 7], [20510, 7], [20510.01, 8],
    [29790, 14], [29790.01, 15], [30000, 15], [44560, 18], [44560.01, 19],
    [61820, 22], [61820.01, 23], [100000, 30], [200000, 38],
    [236060, 39], [236060.01, 40], [1000000, 40]
  ];
  casos.forEach(([bruto, esperado]) => {
    test(`${bruto}€ sin descendientes -> ${esperado}%`, () => {
      assert.equal(tipo(bruto, 0), esperado);
    });
  });
});

describe("tax-engine-bizkaia — columna de descendientes (incluida '6 o más')", () => {
  test("30.000€ con 0..6 descendientes desciende monótonamente", () => {
    const tipos = [0, 1, 2, 3, 4, 5, 6].map((h) => tipo(30000, h));
    for (let i = 1; i < tipos.length; i++) {
      assert.ok(tipos[i] <= tipos[i - 1], `tipo con ${i} hijos (${tipos[i]}) debería ser <= con ${i - 1} hijos (${tipos[i - 1]})`);
    }
  });

  test("7 u 8 descendientes se tratan igual que 6 o más (tope de columna)", () => {
    assert.equal(tipo(30000, 6), tipo(30000, 7));
    assert.equal(tipo(30000, 7), tipo(30000, 8));
  });

  test("40.670,01€ con 6 o más descendientes -> 2% (única fila con ese valor no nulo en tramos bajos)", () => {
    assert.equal(tipo(40670.01, 6), 2);
  });
});

describe("tax-engine-bizkaia — bordes de los 34 tramos (intervalo cerrado)", () => {
  const tabla = ConstantsBizkaia2026.tablaRetencion;
  tabla.forEach((fila, idx) => {
    if (idx === 0) return;
    const filaAnterior = tabla[idx - 1];
    test(`tramo ${idx}: ${filaAnterior.hasta}€ (fila anterior) y ${fila.desde}€ (esta fila) dan tipos distintos de fila`, () => {
      const tAnterior = tipo(filaAnterior.hasta, 0);
      const tEsta = tipo(fila.desde, 0);
      assert.equal(tAnterior, filaAnterior.tipos[0]);
      assert.equal(tEsta, fila.tipos[0]);
    });
  });

  test("último tramo (236.060,01 en adelante) no tiene límite superior", () => {
    assert.equal(tipo(500000, 0), 40);
    assert.equal(tipo(50000000, 0), 40);
  });
});

describe("tax-engine-bizkaia — minoración por discapacidad", () => {
  test("30.000€ discapacidad 33-64% resta 7 puntos (tramo 25.410,01-32.610) -> 15-7=8%", () => {
    assert.equal(tipo(30000, 0, "33-64"), 8);
  });

  test("30.000€ discapacidad >=65% resta 12 puntos -> 15-12=3%", () => {
    assert.equal(tipo(30000, 0, "65omas"), 3);
  });

  test("la minoración nunca deja el tipo por debajo de 0", () => {
    assert.equal(tipo(15000, 0, "65omas"), 0);
    assert.ok(tipo(20510, 0, "65omas") >= 0);
  });

  test("sin discapacidad reconocida, no hay minoración", () => {
    assert.equal(tipo(30000, 0, "ninguna"), tipo(30000, 0));
  });

  test("bordes exactos de las 8 bandas de discapacidad", () => {
    const bandas = ConstantsBizkaia2026.minoracionDiscapacidad;
    bandas.forEach((banda) => {
      const base = TaxEngineBizkaia.obtenerTipoBase(banda.hasta, 0, ConstantsBizkaia2026.tablaRetencion);
      const conDiscapacidad = tipo(banda.hasta, 0, "33-64");
      assert.equal(conDiscapacidad, Math.max(0, base - banda.puntos["33-64"]));
    });
  });
});

describe("tax-engine-bizkaia — casos combinados", () => {
  test("30.000€, 2 hijos, discapacidad 33-64%: tipo base col.2 (13) - 7 puntos = 6%", () => {
    assert.equal(tipo(30000, 2, "33-64"), 6);
  });

  test("40.000€, 0 hijos, discapacidad >=65%: tipo base (17) - 10 puntos = 7%", () => {
    assert.equal(tipo(40000, 0, "65omas"), 7);
  });
});
