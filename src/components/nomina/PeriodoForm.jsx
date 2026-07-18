import { useId, useState } from 'react'

export function PeriodoForm({ tasas, onSubmit }) {
  const [form, setForm] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    tasa_bcv_id: tasas[0]?.id ?? '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const uid = useId()

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim() || !form.fecha_inicio || !form.fecha_fin || !form.tasa_bcv_id) {
      setError('Todos los campos son obligatorios.')
      return
    }
    if (form.fecha_fin < form.fecha_inicio) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(form)
      setForm({ nombre: '', fecha_inicio: '', fecha_fin: '', tasa_bcv_id: tasas[0]?.id ?? '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form" style={{ maxWidth: 480 }}>
      <div className="field">
        <label htmlFor={`${uid}-nombre`}>Nombre del periodo</label>
        <input
          id={`${uid}-nombre`}
          type="text"
          placeholder='Ej. "Quincena 1 - Julio 2026"'
          value={form.nombre}
          onChange={(e) => handleChange('nombre', e.target.value)}
          required
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${uid}-inicio`}>Fecha inicio</label>
          <input
            id={`${uid}-inicio`}
            type="date"
            value={form.fecha_inicio}
            onChange={(e) => handleChange('fecha_inicio', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-fin`}>Fecha fin</label>
          <input
            id={`${uid}-fin`}
            type="date"
            value={form.fecha_fin}
            onChange={(e) => handleChange('fecha_fin', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${uid}-tasa`}>Tasa BCV a aplicar</label>
        <select
          id={`${uid}-tasa`}
          value={form.tasa_bcv_id}
          onChange={(e) => handleChange('tasa_bcv_id', e.target.value)}
          required
        >
          <option value="" disabled>
            Selecciona una tasa
          </option>
          {tasas.map((tasa) => (
            <option key={tasa.id} value={tasa.id}>
              {tasa.fecha} — {tasa.tasa} Bs/USD ({tasa.origen})
            </option>
          ))}
        </select>
      </div>

      {tasas.length === 0 && (
        <p className="alert alert-warning" role="status">
          No hay tasas BCV registradas todavía. Registra una desde el Dashboard.
        </p>
      )}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={submitting || tasas.length === 0} style={{ alignSelf: 'flex-start' }}>
        {submitting ? 'Creando...' : 'Crear periodo'}
      </button>
    </form>
  )
}
