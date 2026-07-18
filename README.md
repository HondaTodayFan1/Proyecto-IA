# Calculadora de Nómina

Aplicación web para analistas de nómina en Venezuela (React + Vite + Supabase). Ver `PLAN_MAESTRO.md` para el plan completo, el esquema de base de datos y el estado de cada fase.

## Requisitos

- Node.js 20+
- Una cuenta y proyecto de [Supabase](https://supabase.com) (para desarrollo contra datos reales), y opcionalmente [Docker](https://docker.com) + el [CLI de Supabase](https://supabase.com/docs/guides/cli) (para desarrollo/tests contra una instancia local).

## Configuración

1. Instalar dependencias:
   ```
   npm install
   ```
2. Copiar `.env.example` a `.env.local` y completar con las credenciales de tu proyecto Supabase (Project Settings → API):
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```
   `.env.local` está en `.gitignore` (vía `*.local`) — nunca se sube al repositorio. **Nunca** pongas aquí la `service_role key`.
3. Aplicar las migraciones de `supabase/migrations/` a tu proyecto, en orden, desde el SQL Editor de Supabase (o vía `supabase db push` si tienes el CLI vinculado al proyecto).
4. Promover manualmente al primer usuario a `rol = 'admin'` editando la fila correspondiente en la tabla `profiles` (Table Editor de Supabase) — no hay forma de auto-promoverse desde la app.

## Desarrollo

```
npm run dev       # servidor de desarrollo
npm run lint      # ESLint
npm run test      # tests unitarios + de componentes (Vitest); los de integración RLS se omiten sin configuración local
npm run build     # build de producción
npm run preview   # sirve el build de producción localmente
```

## Desarrollo/tests contra Supabase local (opcional pero recomendado)

Para levantar una instancia local de Supabase (aísla tus pruebas del proyecto real) y ejecutar la suite completa, incluyendo los tests de políticas RLS de `tests/integration/`:

```
supabase start
```

Esto aplica automáticamente las migraciones de `supabase/migrations/` sobre la base de datos local y expone la API en `http://127.0.0.1:54321` (URL y `anon key` fijas por defecto, impresas en la salida del comando).

Luego, para correr los tests de integración contra esa instancia local (por defecto se omiten):

```
SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_ANON_KEY=<anon-key-que-imprimió-supabase-start> npm run test
```

`SUPABASE_TEST_URL`/`SUPABASE_TEST_ANON_KEY` son variables distintas de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` a propósito, para que esta suite nunca pueda correr por accidente contra el proyecto Supabase real.

Para detener la instancia local:

```
supabase stop
```

## Despliegue

Ver la sección 22 y la Fase 10 de `PLAN_MAESTRO.md` para el runbook completo (Netlify + Supabase cloud).

## Edge Functions

`supabase/functions/fetch-tasa-bcv` obtiene la tasa BCV diaria (pydolarve.org) y requiere desplegarse con el CLI de Supabase:

```
supabase functions deploy fetch-tasa-bcv
```

Y programarse (cron diario) desde el dashboard de Supabase → Edge Functions → Schedules.
