-- Fase 6: tabla prestaciones_sociales + RLS
-- Visibilidad atada al owner del empleado (mismo criterio ya usado en empleados/periodos_nomina).

create table if not exists public.prestaciones_sociales (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  periodo_id uuid not null references public.periodos_nomina (id) on delete cascade,
  dias_acumulados numeric not null,
  monto_acumulado_bs numeric not null,
  tipo text not null check (tipo in ('garantia', 'vacaciones', 'utilidades')),
  created_at timestamptz not null default now(),
  unique (empleado_id, periodo_id, tipo)
);

create index if not exists prestaciones_sociales_empleado_id_idx on public.prestaciones_sociales (empleado_id);

alter table public.prestaciones_sociales enable row level security;

create policy "prestaciones_sociales_select_own_or_admin"
  on public.prestaciones_sociales for select
  using (
    exists (
      select 1 from public.empleados e
      where e.id = empleado_id
        and (e.owner_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

create policy "prestaciones_sociales_insert_own"
  on public.prestaciones_sociales for insert
  with check (
    exists (
      select 1 from public.empleados e
      where e.id = empleado_id and e.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.periodos_nomina p
      where p.id = periodo_id and p.creado_por = auth.uid()
    )
  );
