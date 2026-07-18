-- Fase 3: tabla tasas_bcv + RLS
-- Lectura: cualquier usuario autenticado.
-- Escritura vía cliente (frontend): solo admin, y únicamente como origen 'manual'
--   (las inserciones automáticas del cron llegan por la Edge Function usando la
--   service_role key, que bypassa RLS por diseño de Supabase — nunca se expone al frontend).

create table if not exists public.tasas_bcv (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  tasa numeric not null check (tasa > 0),
  origen text not null check (origen in ('api', 'manual')),
  creado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.tasas_bcv enable row level security;

create policy "tasas_bcv_select_authenticated"
  on public.tasas_bcv for select
  to authenticated
  using (true);

create policy "tasas_bcv_insert_manual_admin"
  on public.tasas_bcv for insert
  to authenticated
  with check (
    origen = 'manual'
    and creado_por = auth.uid()
    and public.is_admin(auth.uid())
  );
