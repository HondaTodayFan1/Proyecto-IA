-- Fase 2: tabla empleados + RLS (visibilidad: propietario o admin)

create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  nombre_completo text not null,
  cedula text not null unique,
  cargo text,
  fecha_ingreso date not null,
  salario_base_usd numeric not null check (salario_base_usd >= 0),
  tipo_nomina text not null default 'mensual' check (tipo_nomina in ('mensual', 'quincenal')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists empleados_owner_id_idx on public.empleados (owner_id);

alter table public.empleados enable row level security;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.rol = 'admin'
  );
$$;

create policy "empleados_select_own_or_admin"
  on public.empleados for select
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));

create policy "empleados_insert_own"
  on public.empleados for insert
  with check (owner_id = auth.uid());

create policy "empleados_update_own_or_admin"
  on public.empleados for update
  using (owner_id = auth.uid() or public.is_admin(auth.uid()));

-- No hay política de DELETE: la Fase 2 solo contempla "desactivar" (activo = false),
-- por lo que sin política de delete, RLS deniega los deletes por defecto.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists empleados_set_updated_at on public.empleados;

create trigger empleados_set_updated_at
  before update on public.empleados
  for each row
  execute function public.set_updated_at();
