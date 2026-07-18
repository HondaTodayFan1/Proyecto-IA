import { useEffect, useState } from 'react'
import { listParametros, updateParametro } from '../../services/parametrosService'

export default function Configuracion() {
  const [parametros, setParametros] = useState([])
  const [ediciones, setEdiciones] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingClave, setSavingClave] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await listParametros()
        setParametros(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleGuardar(clave) {
    const valor = Number(ediciones[clave])
    if (Number.isNaN(valor) || valor < 0) {
      setError('El valor debe ser un número válido mayor o igual a 0.')
      return
    }

    setSavingClave(clave)
    setError('')
    try {
      const actualizado = await updateParametro(clave, valor)
      setParametros((prev) => prev.map((p) => (p.clave === clave ? actualizado : p)))
      setEdiciones((prev) => {
        const resto = { ...prev }
        delete resto[clave]
        return resto
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingClave('')
    }
  }

  return (
    <div className="page page--medium">
      <h1>Parámetros legales</h1>
      <p className="alert alert-warning" role="note">
        Estos valores alimentan el motor de cálculo de nómina. Los sembrados por defecto son valores de
        referencia — verifícalos con tu asesor legal/contable antes de calcular nómina real.
      </p>

      {loading && <p className="text-muted">Cargando...</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Clave</th>
                <th>Valor</th>
                <th>Vigente desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {parametros.map((parametro) => (
                <tr key={parametro.clave}>
                  <td>{parametro.clave}</td>
                  <td>
                    <input
                      aria-label={`Valor de ${parametro.clave}`}
                      type="number"
                      step="any"
                      value={ediciones[parametro.clave] ?? parametro.valor}
                      onChange={(e) =>
                        setEdiciones((prev) => ({ ...prev, [parametro.clave]: e.target.value }))
                      }
                      style={{ width: 120 }}
                    />
                  </td>
                  <td>{parametro.vigente_desde}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => handleGuardar(parametro.clave)}
                      disabled={savingClave === parametro.clave}
                    >
                      {savingClave === parametro.clave ? 'Guardando...' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
