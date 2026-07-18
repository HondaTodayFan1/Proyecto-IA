import { describe, expect, it } from 'vitest'
import {
  calcularDeduccionFaov,
  calcularDeduccionIvss,
  calcularDeduccionRpe,
} from '../../../src/lib/calculoDeducciones'

// Porcentajes de referencia (IVSS 4%, RPE 0.5%, FAOV 1%) — pendientes de
// verificación profesional antes de usarse en producción (ver PLAN_MAESTRO.md, Fase 4).

describe('calcularDeduccionIvss', () => {
  it('aplica el porcentaje sobre el salario', () => {
    expect(calcularDeduccionIvss(1000, 0.04)).toBe(40)
  })

  it('lanza un error explícito si falta el porcentaje', () => {
    expect(() => calcularDeduccionIvss(1000, undefined)).toThrow(/porcentajeIvss/)
  })
})

describe('calcularDeduccionRpe', () => {
  it('aplica el porcentaje sobre el salario', () => {
    expect(calcularDeduccionRpe(1000, 0.005)).toBe(5)
  })
})

describe('calcularDeduccionFaov', () => {
  it('aplica el porcentaje sobre el salario', () => {
    expect(calcularDeduccionFaov(1000, 0.01)).toBe(10)
  })
})
