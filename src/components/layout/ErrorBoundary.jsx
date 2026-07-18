import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Sin servicio de reporte de errores configurado todavía (ver README/PLAN_MAESTRO.md).
    // Se deja el registro en consola para no perder la traza en producción.
    console.error('Error no controlado:', error, info)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.assign('/dashboard')
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page page--narrow" style={{ paddingTop: '4rem' }}>
          <div className="card">
            <h1>Ocurrió un error inesperado</h1>
            <p className="text-muted">
              La aplicación encontró un problema y no pudo continuar. Puedes intentar volver al
              dashboard; si el problema persiste, contacta al administrador.
            </p>
            <button type="button" className="btn btn-primary" onClick={this.handleReload}>
              Volver al dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
