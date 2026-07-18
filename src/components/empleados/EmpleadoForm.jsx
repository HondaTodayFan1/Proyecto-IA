import { useId, useState } from 'react'

const EMPTY_FORM = {
  nombre_completo: '',
  cedula: '',
  cargo: '',
  fecha_ingreso: '',
  salario_base_usd: '',
  tipo_nomina: 'mensual',
}

export function EmpleadoForm({ onSubmit, initialValues, submitLabel = 'Agregar empleado' }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initialValues }))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const uid = useId()

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre_completo.trim() || !form.cedula.trim() || !form.fecha_ingreso) {
      setError('Nombre, cédula y fecha de ingreso son obligatorios.')
      return
    }
    if (Number(form.salario_base_usd) < 0 || form.salario_base_usd === '') {
      setError('El salario base en USD debe ser un número válido mayor o igual a 0.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        salario_base_usd: Number(form.salario_base_usd),
      })
      if (!initialValues) setForm(EMPTY_FORM)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form" style={{ maxWidth: 480 }}>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${uid}-nombre`}>Nombre completo</label>
          <input
            id={`${uid}-nombre`}
            type="text"
            value={form.nombre_completo}
            onChange={(e) => handleChange('nombre_completo', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-cedula`}>Cédula</label>
          <input
            id={`${uid}-cedula`}
            type="text"
            value={form.cedula}
            onChange={(e) => handleChange('cedula', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${uid}-cargo`}>Cargo</label>
          <input
            id={`${uid}-cargo`}
            type="text"
            value={form.cargo}
            onChange={(e) => handleChange('cargo', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-fecha`}>Fecha de ingreso</label>
          <input
            id={`${uid}-fecha`}
            type="date"
            value={form.fecha_ingreso}
            onChange={(e) => handleChange('fecha_ingreso', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${uid}-salario`}>Salario base (USD)</label>
          <input
            id={`${uid}-salario`}
            type="number"
            min="0"
            step="0.01"
            value={form.salario_base_usd}
            onChange={(e) => handleChange('salario_base_usd', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-tipo`}>Tipo de nómina</label>
          <select id={`${uid}-tipo`} value={form.tipo_nomina} onChange={(e) => handleChange('tipo_nomina', e.target.value)}>
            <option value="mensual">Mensual</option>
            <option value="quincenal">Quincenal</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
        {submitting ? 'Guardando...' : submitLabel}
      </button>
    </form>
  )
}
