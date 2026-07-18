import { useAuth } from '../hooks/useAuth'
import { useBcvRate } from '../hooks/useBcvRate'
import { TasaBcvBadge } from '../components/bcv/TasaBcvBadge'
import { TasaBcvManualForm } from '../components/bcv/TasaBcvManualForm'

function rolLabel(profile, profileLoading, profileError) {
  if (profileLoading) return 'cargando...'
  if (profileError) return 'error al cargar perfil'
  return profile?.rol ?? 'sin perfil'
}

export default function Dashboard() {
  const { user, profile, profileLoading, profileError } = useAuth()
  const { tasaHoy, ultimaTasa, loading, faltaTasaHoy, error, submitTasaManual } = useBcvRate()

  return (
    <div className="page page--medium">
      <h1>Dashboard</h1>
      <p className="text-muted">
        {user?.email} · rol: {rolLabel(profile, profileLoading, profileError)}
      </p>
      {!profileLoading && profileError && (
        <p className="alert alert-error" role="alert">
          No se pudo cargar tu perfil ({profileError}). Si el problema persiste, contacta al administrador.
        </p>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Tasa BCV</h2>
        <TasaBcvBadge tasaHoy={tasaHoy} ultimaTasa={ultimaTasa} loading={loading} />
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {faltaTasaHoy && profile?.rol === 'admin' && <TasaBcvManualForm onSubmit={submitTasaManual} />}
      </div>
    </div>
  )
}
