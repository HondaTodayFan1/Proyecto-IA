import { useId, useState } from 'react'

export function TasaBcvManualForm({ onSubmit }) {
  const [tasa, setTasa] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputId = useId()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const valor = Number(tasa)
    if (!tasa || valor <= 0) {
      setError('Ingresa una tasa válida mayor a 0.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(valor)
      setTasa('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-4)' }}>
      <div className="field-row" style={{ alignItems: 'flex-end' }}>
        <div className="field">
          <label htmlFor={inputId}>Tasa BCV de hoy (Bs/USD)</label>
          <input
            id={inputId}
            type="number"
            min="0"
            step="0.0001"
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Registrar tasa manual'}
        </button>
      </div>
      {error && (
        <p className="alert alert-error" role="alert" style={{ marginTop: 'var(--space-2)' }}>
          {error}
        </p>
      )}
    </form>
  )
}
