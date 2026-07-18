import { useCallback, useEffect, useState } from 'react'
import { createTasaManual, getTasaHoy, getUltimaTasa } from '../services/bcvService'

export function useBcvRate() {
  const [tasaHoy, setTasaHoy] = useState(null)
  const [ultimaTasa, setUltimaTasa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const hoy = await getTasaHoy()
      setTasaHoy(hoy)
      if (!hoy) {
        const ultima = await getUltimaTasa()
        setUltimaTasa(ultima)
      } else {
        setUltimaTasa(hoy)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function load() {
      await refresh()
    }
    load()
  }, [refresh])

  async function submitTasaManual(tasa) {
    const created = await createTasaManual(tasa)
    setTasaHoy(created)
    setUltimaTasa(created)
    return created
  }

  return {
    tasaHoy,
    ultimaTasa,
    faltaTasaHoy: !loading && !tasaHoy,
    loading,
    error,
    refresh,
    submitTasaManual,
  }
}
