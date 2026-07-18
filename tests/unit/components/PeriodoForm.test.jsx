import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PeriodoForm } from '../../../src/components/nomina/PeriodoForm'

const tasas = [{ id: 'tasa-1', fecha: '2026-07-17', tasa: 145.32, origen: 'api' }]

describe('PeriodoForm', () => {
  it('deshabilita el envío y avisa cuando no hay tasas BCV disponibles', () => {
    render(<PeriodoForm tasas={[]} onSubmit={vi.fn()} />)

    expect(screen.getByText(/no hay tasas bcv registradas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear periodo' })).toBeDisabled()
  })

  it('muestra un error de validación si el nombre es solo espacios en blanco', () => {
    // El resto de los campos se completan para que la validación nativa HTML5
    // (required) no bloquee el submit antes de llegar a la validación propia
    // del componente, que es la que este test verifica (nombre.trim()).
    render(<PeriodoForm tasas={tasas} onSubmit={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/nombre del periodo/i), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2026-07-15' } })
    fireEvent.change(screen.getByLabelText(/tasa bcv/i), { target: { value: 'tasa-1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Crear periodo' }))

    expect(screen.getByText('Todos los campos son obligatorios.')).toBeInTheDocument()
  })

  it('envía el formulario con los datos ingresados cuando es válido', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PeriodoForm tasas={tasas} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/nombre del periodo/i), {
      target: { value: 'Quincena 1 - Julio 2026' },
    })
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2026-07-15' } })
    fireEvent.change(screen.getByLabelText(/tasa bcv/i), { target: { value: 'tasa-1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Crear periodo' }))

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: 'Quincena 1 - Julio 2026',
      fecha_inicio: '2026-07-01',
      fecha_fin: '2026-07-15',
      tasa_bcv_id: 'tasa-1',
    })
  })

  it('rechaza una fecha de fin anterior a la fecha de inicio', () => {
    render(<PeriodoForm tasas={tasas} onSubmit={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/nombre del periodo/i), { target: { value: 'Periodo inválido' } })
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2026-07-15' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByLabelText(/tasa bcv/i), { target: { value: 'tasa-1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Crear periodo' }))

    expect(
      screen.getByText('La fecha de fin no puede ser anterior a la fecha de inicio.')
    ).toBeInTheDocument()
  })
})
