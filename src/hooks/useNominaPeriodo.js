import { useCallback, useEffect, useState } from 'react'
import {
  calcularPeriodo,
  cerrarPeriodo,
  getPeriodo,
  listNominaDetalle,
  updateNovedades,
} from '../services/nominaService'

export function useNominaPeriodo(periodoId) {
  const [periodo, setPeriodo] = useState(null)
  const [detalle, setDetalle] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [periodoData, detalleData] = await Promise.all([
        getPeriodo(periodoId),
        listNominaDetalle(periodoId),
      ])
      setPeriodo(periodoData)
      setDetalle(detalleData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [periodoId])

  useEffect(() => {
    async function load() {
      await refresh()
    }
    load()
  }, [refresh])

  async function guardarNovedades(detalleId, novedades) {
    const actualizado = await updateNovedades(detalleId, novedades)
    setDetalle((prev) => prev.map((fila) => (fila.id === detalleId ? actualizado : fila)))
    return actualizado
  }

  async function calcular() {
    setProcessing(true)
    setError('')
    try {
      await calcularPeriodo(periodoId)
      await refresh()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setProcessing(false)
    }
  }

  async function cerrar() {
    setProcessing(true)
    setError('')
    try {
      const actualizado = await cerrarPeriodo(periodoId)
      setPeriodo(actualizado)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setProcessing(false)
    }
  }

  return { periodo, detalle, loading, error, processing, guardarNovedades, calcular, cerrar, refresh }
}
