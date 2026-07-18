import { useId, useState } from 'react'

export function NovedadesForm({ fila, disabled, onSave }) {
  const [horasExtra, setHorasExtra] = useState(fila.horas_extra)
  const [horasNocturnas, setHorasNocturnas] = useState(fila.horas_nocturnas)
  const [diasTrabajados, setDiasTrabajados] = useState(fila.dias_trabajados)
  const [saving, setSaving] = useState(false)
  const uid = useId()

  const isDirty =
    Number(diasTrabajados) !== fila.dias_trabajados ||
    Number(horasExtra) !== fila.horas_extra ||
    Number(horasNocturnas) !== fila.horas_nocturnas

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(fila.id, {
        horas_extra: Number(horasExtra),
        horas_nocturnas: Number(horasNocturnas),
        dias_trabajados: Number(diasTrabajados),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
      <div className="field">
        <label htmlFor={`${uid}-dias`} style={{ fontSize: '0.7rem' }}>
          Días
        </label>
        <input
          id={`${uid}-dias`}
          className="input--compact"
          type="number"
          min="0"
          step="0.5"
          value={diasTrabajados}
          onChange={(e) => setDiasTrabajados(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-extra`} style={{ fontSize: '0.7rem' }}>
          H. extra
        </label>
        <input
          id={`${uid}-extra`}
          className="input--compact"
          type="number"
          min="0"
          step="0.5"
          value={horasExtra}
          onChange={(e) => setHorasExtra(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label htmlFor={`${uid}-nocturnas`} style={{ fontSize: '0.7rem' }}>
          H. nocturnas
        </label>
        <input
          id={`${uid}-nocturnas`}
          className="input--compact"
          type="number"
          min="0"
          step="0.5"
          value={horasNocturnas}
          onChange={(e) => setHorasNocturnas(e.target.value)}
          disabled={disabled}
        />
      </div>
      <button type="button" className="btn btn-small" onClick={handleSave} disabled={disabled || saving || !isDirty}>
        {saving ? '...' : 'Guardar'}
      </button>
    </div>
  )
}
