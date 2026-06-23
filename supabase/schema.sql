-- ================================================
-- AAEA - Esquema completo de base de datos
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ================================================
-- TABLA: profiles (extiende auth.users)
-- ================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text,
  phone text,
  role text not null check (role in ('admin', 'inspector', 'client')) default 'client',
  signature_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- TABLA: clients
-- ================================================
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  rut text,
  email text,
  phone text,
  address text,
  city text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- TABLA: vehicles
-- ================================================
create table public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  patente text unique not null,
  marca text,
  modelo text,
  anio integer,
  color text,
  combustible text,
  transmision text,
  traccion text,
  cilindrada text,
  tapiceria text,
  num_puertas integer,
  tipo_vehiculo text default 'auto',
  vin text,
  num_motor text,
  soap_vencimiento text,
  soap_estado text,
  rev_tecnica_vencimiento text,
  rev_tecnica_estado text,
  permiso_circulacion text,
  emision_contaminantes text,
  multas text default '$0',
  api_data_raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- TABLA: inspections
-- ================================================
create table public.inspections (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references public.vehicles(id),
  client_id uuid references public.clients(id),
  inspector_id uuid references public.profiles(id),
  kilometraje integer,
  fecha_inspeccion date default current_date,
  nota_visual numeric(3,1) default 0,
  nota_carroceria numeric(3,1) default 0,
  nota_mecanica numeric(3,1) default 0,
  nota_final numeric(3,1) default 0,
  comentarios text,
  status text default 'draft' check (status in ('draft', 'completed', 'sent')),
  public_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- TABLA: inspection_items
-- ================================================
create table public.inspection_items (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid references public.inspections(id) on delete cascade,
  section integer not null check (section in (1, 2, 3)),
  subsection text not null,
  item_key text not null,
  item_label text not null,
  estado text default 'N/A',
  observaciones text,
  photo_urls text[] default '{}',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- TABLA: budgets
-- ================================================
create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid references public.inspections(id),
  client_id uuid references public.clients(id),
  inspector_id uuid references public.profiles(id),
  numero text unique,
  forma_pago text default 'Efectivo o Transferencia',
  vigencia text,
  notas text,
  notas_pie text,
  subtotal numeric(12,0) default 0,
  descuento numeric(12,0) default 0,
  iva_pct numeric(5,2) default 19,
  iva_monto numeric(12,0) default 0,
  total numeric(12,0) default 0,
  status text default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  public_token text unique default encode(gen_random_bytes(16), 'hex'),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- TABLA: budget_items
-- ================================================
create table public.budget_items (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references public.budgets(id) on delete cascade,
  orden integer not null default 1,
  descripcion text not null,
  tipo_trabajo text default 'MECÁNICO',
  rep_genuino numeric(12,0) default 0,
  rep_korea numeric(12,0) default 0,
  rep_multi numeric(12,0) default 0,
  mano_obra numeric(12,0) default 0,
  dcto_pct numeric(5,2) default 0,
  valor_item numeric(12,0) default 0,
  notas text,
  created_at timestamptz default now()
);

-- ================================================
-- TABLA: messages
-- ================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid references public.inspections(id) on delete cascade,
  budget_id uuid references public.budgets(id) on delete cascade,
  client_id uuid references public.clients(id),
  sender_id uuid references public.profiles(id),
  sender_role text check (sender_role in ('client', 'inspector', 'admin')),
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ================================================
-- TABLA: settings
-- ================================================
create table public.settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value text,
  updated_at timestamptz default now()
);

-- Valores iniciales de configuración
insert into public.settings (key, value) values
  ('company_name', 'AAEA Inspecciones'),
  ('company_rut', ''),
  ('company_address', ''),
  ('company_phone', ''),
  ('company_email', ''),
  ('company_logo_url', ''),
  ('budget_next_number', '1'),
  ('iva_pct', '19'),
  ('payment_info', '');

-- ================================================
-- FUNCIÓN: crear perfil automático al registrar usuario
-- ================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================
-- FUNCIÓN: número automático de presupuesto
-- ================================================
create or replace function public.get_next_budget_number()
returns text as $$
declare
  next_num integer;
begin
  select (value::integer) into next_num from public.settings where key = 'budget_next_number';
  update public.settings set value = (next_num + 1)::text where key = 'budget_next_number';
  return 'PR-' || lpad(next_num::text, 4, '0');
end;
$$ language plpgsql security definer;

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.messages enable row level security;
alter table public.settings enable row level security;

-- PROFILES
create policy "Usuarios ven su propio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "Admin ve todos los perfiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Usuario actualiza su perfil" on public.profiles
  for update using (auth.uid() = id);
create policy "Admin inserta perfiles" on public.profiles
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'inspector'))
  );

-- VEHICLES (todos pueden ver)
create policy "Usuarios autenticados ven vehículos" on public.vehicles
  for select using (auth.uid() is not null);
create policy "Inspector/admin inserta vehículos" on public.vehicles
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'inspector'))
  );
create policy "Inspector/admin actualiza vehículos" on public.vehicles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'inspector'))
  );

-- CLIENTS
create policy "Inspector ve sus clientes" on public.clients
  for select using (
    created_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    profile_id = auth.uid()
  );
create policy "Inspector/admin inserta clientes" on public.clients
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'inspector'))
  );
create policy "Inspector/admin actualiza clientes" on public.clients
  for update using (
    created_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- INSPECTIONS
create policy "Inspector ve sus inspecciones" on public.inspections
  for select using (
    inspector_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    client_id in (select id from public.clients where profile_id = auth.uid())
  );
create policy "Inspector inserta inspecciones" on public.inspections
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'inspector'))
  );
create policy "Inspector actualiza sus inspecciones" on public.inspections
  for update using (
    inspector_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- INSPECTION ITEMS
create policy "Ve ítems de sus inspecciones" on public.inspection_items
  for select using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id and (
        i.inspector_id = auth.uid() or
        exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
        i.client_id in (select id from public.clients where profile_id = auth.uid())
      )
    )
  );
create policy "Inspector inserta/actualiza ítems" on public.inspection_items
  for all using (
    exists (
      select 1 from public.inspections i
      join public.profiles p on p.id = auth.uid()
      where i.id = inspection_id and (i.inspector_id = auth.uid() or p.role = 'admin')
    )
  );

-- BUDGETS
create policy "Ve sus presupuestos" on public.budgets
  for select using (
    inspector_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    client_id in (select id from public.clients where profile_id = auth.uid())
  );
create policy "Inspector inserta presupuestos" on public.budgets
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'inspector'))
  );
create policy "Inspector actualiza presupuestos" on public.budgets
  for update using (
    inspector_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- BUDGET ITEMS
create policy "Ve ítems de sus presupuestos" on public.budget_items
  for select using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and (
        b.inspector_id = auth.uid() or
        exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
        b.client_id in (select id from public.clients where profile_id = auth.uid())
      )
    )
  );
create policy "Inspector gestiona ítems presupuesto" on public.budget_items
  for all using (
    exists (
      select 1 from public.budgets b
      join public.profiles p on p.id = auth.uid()
      where b.id = budget_id and (b.inspector_id = auth.uid() or p.role = 'admin')
    )
  );

-- MESSAGES
create policy "Ve sus mensajes" on public.messages
  for select using (
    sender_id = auth.uid() or
    client_id in (select id from public.clients where profile_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Inserta mensajes" on public.messages
  for insert with check (auth.uid() is not null);

-- SETTINGS (solo admin escribe, todos leen)
create policy "Todos leen settings" on public.settings
  for select using (auth.uid() is not null);
create policy "Admin actualiza settings" on public.settings
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ================================================
-- STORAGE: bucket para fotos y firmas
-- ================================================
insert into storage.buckets (id, name, public) values ('inspections', 'inspections', true);
insert into storage.buckets (id, name, public) values ('signatures', 'signatures', true);
insert into storage.buckets (id, name, public) values ('logos', 'logos', true);

create policy "Inspectores suben fotos" on storage.objects
  for insert with check (bucket_id = 'inspections' and auth.uid() is not null);
create policy "Todos ven fotos" on storage.objects
  for select using (bucket_id in ('inspections', 'signatures', 'logos'));
create policy "Subir firma" on storage.objects
  for insert with check (bucket_id = 'signatures' and auth.uid() is not null);
create policy "Subir logo" on storage.objects
  for insert with check (bucket_id = 'logos' and auth.uid() is not null);
