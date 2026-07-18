import { describe, expect, it } from 'vitest'
import { calcularPrestacionesAcumuladas } from '../../../src/lib/calculoPrestaciones'

describe('calcularPrestacionesAcumuladas', () => {
  it('acumula 15 días de garantía por un trimestre completo (90 días)', () => {
    const resultado = calcularPrestacionesAcumuladas(
      { salarioMensualBs: 3000 },
      { fechaInicio: '2026-01-01', fechaFin: '2026-03-31' },
      { diasGarantiaPorTrimestre: 15 }
    )
    expect(resultado.diasAcumulados).toBeCloseTo(15, 1)
    expect(resultado.montoAcumuladoBs).toBeCloseTo(15 * (3000 / 30), 1)
  })

  it('prorratea proporcionalmente para un periodo más corto', () => {
    const resultado = calcularPrestacionesAcumuladas(
      { salarioMensualBs: 3000 },
      { fechaInicio: '2026-01-01', fechaFin: '2026-01-15' },
      { diasGarantiaPorTrimestre: 15 }
    )
    expect(resultado.diasAcumulados).toBeGreaterThan(0)
    expect(resultado.diasAcumulados).toBeLessThan(15)
  })

  it('lanza un error explícito si faltan los parámetros legales', () => {
    expect(() =>
      calcularPrestacionesAcumuladas(
        { salarioMensualBs: 3000 },
        { fechaInicio: '2026-01-01', fechaFin: '2026-03-31' },
        {}
      )
    ).toThrow(/diasGarantiaPorTrimestre/)
  })
})
