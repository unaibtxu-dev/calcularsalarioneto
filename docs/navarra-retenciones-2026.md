# Retenciones de nómina — Navarra 2026

**Estado: implementado, integrado en las 5 herramientas y verificado contra
la norma oficial.** Este documento sustituye al placeholder anterior, que
dejaba constancia de que la investigación no se había hecho todavía.

## 1. Fuente oficial verificada

- **Decreto Foral 148/2025, de 23 de diciembre**, que da nueva redacción al
  art. 71 del Reglamento del IRPF de Navarra. Publicado en el BON:
  https://bon.navarra.es/es/anuncio/-/texto/2025/260/4
- **Corrección de errores**, BON 2026/14/0:
  https://bon.navarra.es/es/anuncio/-/texto/2026/14/0 — verificada el
  25/08/2026: **no modifica ningún valor numérico** de la tabla de
  retenciones ni de la minoración por discapacidad. Solo reordena el texto
  del apartado veinte (la tabla pasaba después de la escala de discapacidad
  y debía ir antes) y corrige dos erratas de redacción sin relación con los
  porcentajes.
- Verificación: se leyó el texto íntegro del decreto original y se comparó
  fila por fila, columna por columna, contra `lib/constants-navarra-2026.js`.
  **Coincidencia exacta** en las 25 filas de la tabla general (11 columnas
  cada una) y en las 4 bandas de minoración por discapacidad.

## 2. Reglas confirmadas

- **Mecanismo**: tabla directa de tipo de retención por tramo de
  rendimiento anual × número de descendientes (0 a "10 o más"). A
  diferencia del régimen común, Navarra no calcula una base, un mínimo
  personal/familiar y una cuota por separado: el tipo sale directamente de
  la tabla.
- **Semántica del umbral**: "más de X euros" — límite inferior **exclusivo**.
  Confirmado con el propio texto del decreto, que usa literalmente "más de"
  en cada fila. El motor (`buscarFilaTabla` en `tax-engine-navarra.js`)
  implementa esta semántica y está probado con 75 puntos en los bordes de
  los 25 umbrales (justo por debajo, en el umbral, justo por encima).
- **Discapacidad**: minoración en puntos porcentuales restados del tipo de
  la tabla general, en 4 bandas de renta, distinta según el grado
  (33%-64% o 65% o más). Confirmado literalmente: "se les aplicará el
  porcentaje de retención que resulte de la tabla anterior minorado en los
  puntos que señala la siguiente escala".
- **Suelo del 0%**: confirmado literalmente — "no podrán resultar
  porcentajes inferiores a cero". Implementado con `Math.max(0, ...)`.
- **Redondeo**: el decreto no menciona ninguna regla de redondeo o
  truncamiento del tipo resultante. El motor no aplica ninguna, salvo una
  corrección de ruido de coma flotante (`round1`) para evitar que una resta
  como `18.1 - 15` devuelva `3.1000000000000014` en vez de `3.1`.
- **Situación familiar / mínimo personal**: no aplica en este mecanismo. La
  tabla navarra solo distingue por descendientes, no por estado civil ni
  por un mínimo personal separado, a diferencia del régimen común.

## 3. Lo que queda fuera del alcance actual (documentado, no oculto)

- **Ascendientes a cargo**: el decreto no trata este caso en el apartado de
  retenciones sobre rendimientos del trabajo con el mismo detalle que el
  régimen común; no se ha implementado.
- **Pensionistas, desempleados, contratos especiales**: no verificados
  específicamente para Navarra. El motor actual solo aplica la tabla
  general + discapacidad.
- **Regularización a mitad de año**: fuera de alcance, igual que en el
  régimen común.

## 4. Casos de validación

11 casos oficiales contrastados contra el calculador de la Hacienda Foral
de Navarra están en
`test/tax-engine-navarra.test.js` (bloque "validación oficial — calculador
Hacienda Foral de Navarra 2026"). Esa validación ya existía; lo nuevo en
esta revisión es la verificación independiente de la tabla contra el texto
legal, que cierra el hueco que quedaba abierto.
