import { describe, expect, it } from 'vitest'
import { calcularNetoAPagar, calcularSalarioBs } from '../../../src/lib/calculoNomina'

describe('calcularSalarioBs', () => {
  it('convierte USD a Bs multiplicando por la tasa BCV', () => {
    expect(calcularSalarioBs(200, 145.32)).toBeCloseTo(29064, 5)
  })

  it('permite salario 0', () => {
    expect(calcularSalarioBs(0, 145.32)).toBe(0)
  })

  it('lanza un error explícito si no hay tasa BCV disponible', () => {
    expect(() => calcularSalarioBs(200, 0)).toThrow(/tasa BCV/)
    expect(() => calcularSalarioBs(200, null)).toThrow(/tasa BCV/)
    expect(() => calcularSalarioBs(200, undefined)).toThrow(/tasa BCV/)
  })

  it('rechaza salario negativo', () => {
    expect(() => calcularSalarioBs(-1, 145.32)).toThrow(/salarioUsd/)
  })
})

describe('calcularNetoAPagar', () => {
  it('resta el total de deducciones al total de asignaciones', () => {
    const neto = calcularNetoAPagar({
      asignaciones: [29064, 500, 300],
      deducciones: [1162.56, 145.32, 290.64],
    })
    expect(neto).toBeCloseTo(29064 + 500 + 300 - 1162.56 - 145.32 - 290.64, 5)
  })

  it('funciona sin asignaciones ni deducciones', () => {
    expect(calcularNetoAPagar({ asignaciones: [], deducciones: [] })).toBe(0)
  })
})
