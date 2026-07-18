import { useId, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const nombreId = useId()
  const emailId = useId()
  const passwordId = useId()

  if (session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, nombreCompleto)
        setInfo('Cuenta creada. Revisa tu correo si se requiere confirmación, luego inicia sesión.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--narrow" style={{ paddingTop: '4rem' }}>
      <div className="card">
        <h1>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

        <form onSubmit={handleSubmit} className="form">
          {mode === 'register' && (
            <div className="field">
              <label htmlFor={nombreId}>Nombre completo</label>
              <input
                id={nombreId}
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor={emailId}>Correo</label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={passwordId}>Contraseña</label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="alert alert-success" role="status">
              {info}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        <p style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
