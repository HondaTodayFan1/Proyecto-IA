import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NovedadesForm } from '../../../src/components/nomina/NovedadesForm'

const fila = { id: 'detalle-1', horas_extra: 2, horas_nocturnas: 1, dias_trabajados: 15 }

describe('NovedadesForm', () => {
  it('precarga los valores de la fila recibida', () => {
    render(<NovedadesForm fila={fila} disabled={false} onSave={vi.fn()} />)

    expect(screen.getByLabelText('Días')).toHaveValue(15)
    expect(screen.getByLabelText('H. extra')).toHaveValue(2)
    expect(screen.getByLabelText('H. nocturnas')).toHaveValue(1)
  })

  it('mantiene Guardar deshabilitado hasta que se edite algún valor', () => {
    render(<NovedadesForm fila={fila} disabled={false} onSave={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('H. extra'), { target: { value: '4' } })

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('llama a onSave con el id y los valores numéricos editados', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<NovedadesForm fila={fila} disabled={false} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('H. extra'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith('detalle-1', {
      horas_extra: 4,
      horas_nocturnas: 1,
      dias_trabajados: 15,
    })
  })

  it('deshabilita todos los campos cuando disabled es true', () => {
    render(<NovedadesForm fila={fila} disabled={true} onSave={vi.fn()} />)

    expect(screen.getByLabelText('Días')).toBeDisabled()
    expect(screen.getByLabelText('H. extra')).toBeDisabled()
    expect(screen.getByLabelText('H. nocturnas')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })
})
