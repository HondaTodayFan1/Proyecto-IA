// Tests de integración de políticas RLS críticas.
//
// Requieren una instancia REAL de Supabase (recomendado: `supabase start`
// local) con las migraciones de supabase/migrations/ ya aplicadas. Se activan
// solo si existen SUPABASE_TEST_URL y SUPABASE_TEST_ANON_KEY — variables
// DISTINTAS de VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY (que apuntan al
// proyecto real del usuario) para que sea imposible que esta suite corra por
// accidente contra datos de producción. Sin esas variables, la suite se
// omite (no cuenta como fallo).
//
// Este agente no tiene acceso a Docker/Supabase CLI ni a red en su entorno de
// ejecución, por lo que esta suite no pudo correrse aquí — ver PLAN_MAESTRO.md,
// Fase 9, para instrucciones de cómo ejecutarla localmente.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_TEST_URL = process.env.SUPABASE_TEST_URL
const SUPABASE_TEST_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY
const habilitado = Boolean(SUPABASE_TEST_URL && SUPABASE_TEST_ANON_KEY)

function nuevoClienteAnonimo() {
  return createClient(SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY)
}

async function crearUsuarioDePrueba() {
  const cliente = nuevoClienteAnonimo()
  const email = `test-${crypto.randomUUID()}@example.test`
  const password = 'password-de-prueba-123'

  const { error: signUpError } = await cliente.auth.signUp({ email, password })
  if (signUpError) throw signUpError

  const { error: signInError } = await cliente.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  return cliente
}

describe.runIf(habilitado)('RLS: empleados — aislamiento por owner_id', () => {
  let clienteA
  let clienteB

  beforeAll(async () => {
    clienteA = await crearUsuarioDePrueba()
    clienteB = await crearUsuarioDePrueba()
  })

  afterAll(async () => {
    await clienteA?.auth.signOut()
    await clienteB?.auth.signOut()
  })

  it('el usuario B no puede ver los empleados creados por el usuario A', async () => {
    const { data: userA } = await clienteA.auth.getUser()

    const { error: insertError } = await clienteA.from('empleados').insert({
      owner_id: userA.user.id,
      nombre_completo: 'Empleado de prueba A',
      cedula: `V-${Date.now()}`,
      fecha_ingreso: '2026-01-01',
      salario_base_usd: 500,
    })
    expect(insertError).toBeNull()

    const { data: comoB, error: errorB } = await clienteB.from('empleados').select('*')
    expect(errorB).toBeNull()
    expect(comoB).toEqual([])

    const { data: comoA, error: errorA } = await clienteA.from('empleados').select('*')
    expect(errorA).toBeNull()
    expect(comoA.length).toBeGreaterThan(0)
  })
})

describe.runIf(habilitado)('RLS: tasas_bcv — escritura manual restringida a admin', () => {
  it('un usuario sin rol admin no puede insertar una tasa manual', async () => {
    const cliente = await crearUsuarioDePrueba()
    const { data: user } = await cliente.auth.getUser()

    const { error } = await cliente.from('tasas_bcv').insert({
      fecha: new Date().toISOString().slice(0, 10),
      tasa: 100,
      origen: 'manual',
      creado_por: user.user.id,
    })

    expect(error).not.toBeNull()
    await cliente.auth.signOut()
  })
})

describe.runIf(habilitado)('RLS: config_parametros_legales — escritura restringida a admin', () => {
  it('un usuario sin rol admin no puede modificar un parámetro legal', async () => {
    const cliente = await crearUsuarioDePrueba()

    const { data, error } = await cliente
      .from('config_parametros_legales')
      .update({ valor: 0.99 })
      .eq('clave', 'PORCENTAJE_IVSS')
      .select()

    // RLS deniega la fila sin lanzar error explícito: el update simplemente
    // no afecta ninguna fila (comportamiento estándar de Postgres RLS).
    expect(error).toBeNull()
    expect(data).toEqual([])

    await cliente.auth.signOut()
  })
})

if (!habilitado) {
  describe('RLS (integración)', () => {
    it.skip('omitido: define SUPABASE_TEST_URL y SUPABASE_TEST_ANON_KEY para ejecutar esta suite', () => {})
  })
}
