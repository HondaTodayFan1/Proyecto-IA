-- Fase 5: config_parametros_legales, periodos_nomina, nomina_detalle + RLS
--
-- NOTA (ver PLAN_MAESTRO.md sección 25): config_parametros_legales no estaba
-- asignada a ninguna fase de creación en el plan original; se crea aquí porque
-- la orquestación de cálculo de esta fase depende de leerla. nomina_detalle
-- incluye horas_nocturnas y dias_trabajados, ausentes en el diseño original de
-- la sección 2.1, requeridas como entradas por el motor de cálculo (Fase 4).

create table if not exists public.config_parametros_legales (
  clave text primary key,
  valor numeric not null,
  vigente_desde date not null default current_date
);

alter table public.config_parametros_legales enable row level security;

create policy "parametros_legales_select_authenticated"
  on public.config_parametros_legales for select
  to authenticated
  using (true);

create policy "parametros_legales_write_admin"
  on public.config_parametros_legales for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Valores de referencia (LOTTT) — pendientes de verificación profesional antes
-- de un uso real en producción. CESTA_TICKET_BS queda en 0 como placeholder
-- explícito hasta que un admin configure el monto vigente.
insert into public.config_parametros_legales (clave, valor) values
  ('PORCENTAJE_IVSS', 0.04),
  ('PORCENTAJE_RPE', 0.005),
  ('PORCENTAJE_FAOV', 0.01),
  ('RECARGO_HORA_EXTRA', 0.5),
  ('RECARGO_BONO_NOCTURNO', 0.3),
  ('CESTA_TICKET_BS', 0),
  ('DIAS_GARANTIA_POR_TRIMESTRE', 15)
on conflict (clave) do nothing;

create table if not exists public.periodos_nomina (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  tasa_bcv_id uuid not null references public.tasas_bcv (id),
  estado text not null default 'borrador' check (estado in ('borrador', 'calculado', 'cerrado')),
  creado_por uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create index if not exists periodos_nomina_creado_por_idx on public.periodos_nomina (creado_por);

alter table public.periodos_nomina enable row level security;

create policy "periodos_nomina_select_own_or_admin"
  on public.periodos_nomina for select
  using (creado_por = auth.uid() or public.is_admin(auth.uid()));

create policy "periodos_nomina_insert_own"
  on public.periodos_nomina for insert
  with check (creado_por = auth.uid());

create policy "periodos_nomina_update_own_or_admin"
  on public.periodos_nomina for update
  using (creado_por = auth.uid() or public.is_admin(auth.uid()));

create table if not exists public.nomina_detalle (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.periodos_nomina (id) on delete cascade,
  empleado_id uuid not null references public.empleados (id),
  salario_base_usd numeric not null default 0,
  salario_base_bs numeric,
  horas_extra numeric not null default 0,
  horas_nocturnas numeric not null default 0,
  dias_trabajados numeric not null default 0,
  bono_nocturno_bs numeric,
  bono_alimentacion_bs numeric,
  total_asignaciones_bs numeric,
  deduccion_ivss_bs numeric,
  deduccion_rpe_bs numeric,
  deduccion_faov_bs numeric,
  total_deducciones_bs numeric,
  neto_a_pagar_bs numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (periodo_id, empleado_id)
);

create index if not exists nomina_detalle_periodo_id_idx on public.nomina_detalle (periodo_id);

alter table public.nomina_detalle enable row level security;

create policy "nomina_detalle_select_own_or_admin"
  on public.nomina_detalle for select
  using (
    exists (
      select 1 from public.periodos_nomina p
      where p.id = periodo_id
        and (p.creado_por = auth.uid() or public.is_admin(auth.uid()))
    )
  );

create policy "nomina_detalle_insert_own"
  on public.nomina_detalle for insert
  with check (
    exists (
      select 1 from public.periodos_nomina p
      where p.id = periodo_id and p.creado_por = auth.uid()
    )
    and exists (
      select 1 from public.empleados e
      where e.id = empleado_id and e.owner_id = auth.uid()
    )
  );

create policy "nomina_detalle_update_own_or_admin"
  on public.nomina_detalle for update
  using (
    exists (
      select 1 from public.periodos_nomina p
      where p.id = periodo_id
        and (p.creado_por = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop trigger if exists nomina_detalle_set_updated_at on public.nomina_detalle;

create trigger nomina_detalle_set_updated_at
  before update on public.nomina_detalle
  for each row
  execute function public.set_updated_at();
