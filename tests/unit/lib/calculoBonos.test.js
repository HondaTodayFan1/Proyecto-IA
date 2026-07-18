import { describe, expect, it } from 'vitest'
import {
  calcularBonoAlimentacion,
  calcularBonoNocturno,
  calcularHorasExtra,
} from '../../../src/lib/calculoBonos'

describe('calcularBonoAlimentacion', () => {
  it('multiplica días trabajados por el monto de cesta ticket', () => {
    expect(calcularBonoAlimentacion(15, 40)).toBe(600)
  })

  it('permite 0 días trabajados', () => {
    expect(calcularBonoAlimentacion(0, 40)).toBe(0)
  })
})

describe('calcularBonoNocturno', () => {
  // Recargo de referencia 30% (Art. 156 LOTTT) — pendiente de verificación profesional.
  it('aplica el recargo nocturno sobre las horas trabajadas', () => {
    expect(calcularBonoNocturno(8, 10, 0.3)).toBeCloseTo(24, 5)
  })

  it('sin horas nocturnas no genera bono', () => {
    expect(calcularBonoNocturno(0, 10, 0.3)).toBe(0)
  })
})

describe('calcularHorasExtra', () => {
  // Recargo de referencia 50% (Art. 118 LOTTT) — pendiente de verificación profesional.
  it('paga la hora extra con su recargo', () => {
    expect(calcularHorasExtra(2, 10, 0.5)).toBeCloseTo(30, 5)
  })

  it('sin horas extra no genera pago adicional', () => {
    expect(calcularHorasExtra(0, 10, 0.5)).toBe(0)
  })
})
