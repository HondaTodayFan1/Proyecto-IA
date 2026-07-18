// Fase 3 — Edge Function programada (cron diario) que obtiene la tasa BCV
// desde pydolarve.org y la guarda en public.tasas_bcv con origen = 'api'.
//
// Usa SUPABASE_SERVICE_ROLE_KEY (variable de entorno inyectada automáticamente
// por Supabase en las Edge Functions) para poder escribir sin depender de RLS.
// Esta key NUNCA se expone al frontend.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const BCV_API_URL = 'https://pydolarve.org/api/v1/dollar?page=bcv'

// NOTA: el esquema exacto de la respuesta de pydolarve.org no pudo verificarse
// en este entorno (sin acceso a red al momento de implementar la Fase 3).
// Se prueban varias rutas conocidas/documentadas públicamente para tolerar
// variaciones del proveedor. Verificar contra la respuesta real antes de confiar
// en producción (ver PLAN_MAESTRO.md, Fase 3).
function extractPrice(payload) {
  const candidates = [
    payload?.monitors?.bcv?.price,
    payload?.price,
    payload?.precio,
    payload?.promedio,
  ]

  const price = candidates.find((v) => typeof v === 'number' && v > 0)
  if (price === undefined) {
    throw new Error('No se pudo extraer la tasa BCV de la respuesta de la API externa.')
  }
  return price
}

Deno.serve(async () => {
  try {
    const response = await fetch(BCV_API_URL)
    if (!response.ok) {
      throw new Error(`API BCV respondió con status ${response.status}`)
    }
    const payload = await response.json()
    const tasa = extractPrice(payload)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const fecha = new Date().toISOString().slice(0, 10)

    const { error } = await supabase
      .from('tasas_bcv')
      .upsert(
        { fecha, tasa, origen: 'api', creado_por: null },
        { onConflict: 'fecha' }
      )

    if (error) throw error

    return new Response(JSON.stringify({ ok: true, fecha, tasa }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
