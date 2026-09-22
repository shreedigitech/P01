-- ShopFlow production database schema
-- Run this entire file in Supabase SQL Editor.
-- Then create an Auth user and promote it to owner using the SQL at the bottom.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('owner','manager','cashier','stock_manager');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'cashier',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.shop_settings (
  id int primary key default 1 check(id=1),
  shop_name text not null default 'My Plumbing & Electrical Shop',
  address text default '',
  phone text default '',
  gstin text default '',
  invoice_prefix text not null default 'INV',
  next_invoice_no bigint not null default 1,
  currency text not null default 'INR',
  updated_at timestamptz not null default now()
);

insert into public.shop_settings(id) values(1) on conflict do nothing;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  department text not null check(department in ('Electrical','Plumbing','Sanitary','Tools','Consumables','Other')),
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  code text primary key,
  name text not null
);

insert into public.units(code,name) values
('PCS','Piece'),('MTR','Meter'),('FT','Feet'),('KG','Kilogram'),('GM','Gram'),
('LTR','Litre'),('BOX','Box'),('PACK','Pack'),('COIL','Coil'),('ROLL','Roll'),
('SET','Set'),('PAIR','Pair'),('BUNDLE','Bundle') on conflict do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  barcode text unique,
  name text not null,
  category_id uuid references public.categories(id),
  brand_id uuid references public.brands(id),
  size text default '',
  color text default '',
  material text default '',
  unit_code text not null references public.units(code) default 'PCS',
  hsn_code text default '',
  gst_rate numeric(5,2) not null default 0,
  purchase_price numeric(14,2) not null default 0,
  mrp numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  wholesale_price numeric(14,2) not null default 0,
  minimum_selling_price numeric(14,2) not null default 0,
  minimum_stock numeric(14,3) not null default 0,
  opening_stock numeric(14,3) not null default 0,
  current_stock numeric(14,3) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  old_purchase_price numeric(14,2),
  old_selling_price numeric(14,2),
  new_purchase_price numeric(14,2),
  new_selling_price numeric(14,2),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  address text default '',
  gstin text default '',
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  address text default '',
  gstin text default '',
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_no text unique not null,
  supplier_id uuid references public.suppliers(id),
  supplier_invoice_no text default '',
  purchase_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  due numeric(14,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check(quantity>0),
  unit_cost numeric(14,2) not null check(unit_cost>=0),
  gst_rate numeric(5,2) not null default 0,
  line_total numeric(14,2) not null
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  customer_id uuid references public.customers(id),
  sale_date timestamptz not null default now(),
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  cash_paid numeric(14,2) not null default 0,
  upi_paid numeric(14,2) not null default 0,
  card_paid numeric(14,2) not null default 0,
  credit_amount numeric(14,2) not null default 0,
  status text not null default 'completed' check(status in ('completed','cancelled','returned')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check(quantity>0),
  unit_price numeric(14,2) not null check(unit_price>=0),
  purchase_cost numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  gst_rate numeric(5,2) not null default 0,
  line_total numeric(14,2) not null
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type text not null check(movement_type in ('OPENING','PURCHASE','SALE','CUSTOMER_RETURN','SUPPLIER_RETURN','DAMAGE','ADJUSTMENT')),
  reference_id uuid,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null default 0,
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  supplier_id uuid references public.suppliers(id),
  sale_id uuid references public.sales(id),
  purchase_id uuid references public.purchases(id),
  payment_type text not null check(payment_type in ('cash','upi','card','bank','other')),
  amount numeric(14,2) not null check(amount>0),
  payment_date timestamptz not null default now(),
  note text default '',
  created_by uuid references auth.users(id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric(14,2) not null check(amount>0),
  expense_date date not null default current_date,
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_name on public.products using gin(to_tsvector('simple',name));
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_sales_date on public.sales(sale_date);
create index if not exists idx_stock_product on public.stock_movements(product_id);
create index if not exists idx_purchase_date on public.purchases(purchase_date);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true); $$;

create or replace function public.has_role(required_roles public.app_role[])
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.role=any(required_roles)); $$;

alter table public.profiles enable row level security;
alter table public.shop_settings enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.units enable row level security;
alter table public.products enable row level security;
alter table public.price_history enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

do $$ begin
  create policy staff_profiles_select on public.profiles for select to authenticated using (public.is_staff());
  create policy staff_settings_all on public.shop_settings for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_categories_all on public.categories for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_brands_all on public.brands for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_units_select on public.units for select to authenticated using (public.is_staff());
  create policy staff_products_all on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_prices_all on public.price_history for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_suppliers_all on public.suppliers for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_customers_all on public.customers for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_purchases_all on public.purchases for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_purchase_items_all on public.purchase_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_sales_all on public.sales for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_sale_items_all on public.sale_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_stock_all on public.stock_movements for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_payments_all on public.payments for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_expenses_all on public.expenses for all to authenticated using (public.is_staff()) with check (public.is_staff());
  create policy staff_audit_all on public.audit_logs for all to authenticated using (public.is_staff()) with check (public.is_staff());
exception when duplicate_object then null; end $$;

-- Atomic purchase: inserts purchase, items and increases stock.
create or replace function public.create_purchase(
  p_supplier_id uuid,
  p_supplier_invoice_no text,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_total numeric,
  p_paid numeric,
  p_items jsonb
) returns uuid
language plpgsql security invoker set search_path=public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_no text;
  x jsonb;
  v_due numeric := greatest(p_total-p_paid,0);
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  v_no := 'PUR-' || to_char(now(),'YYYYMMDDHH24MISSMS');
  insert into public.purchases(id,purchase_no,supplier_id,supplier_invoice_no,subtotal,discount,tax,total,paid,due,created_by)
  values(v_id,v_no,p_supplier_id,coalesce(p_supplier_invoice_no,''),p_subtotal,p_discount,p_tax,p_total,p_paid,v_due,auth.uid());

  for x in select * from jsonb_array_elements(p_items) loop
    insert into public.purchase_items(purchase_id,product_id,quantity,unit_cost,gst_rate,line_total)
    values(v_id,(x->>'product_id')::uuid,(x->>'quantity')::numeric,(x->>'unit_cost')::numeric,coalesce((x->>'gst_rate')::numeric,0),(x->>'line_total')::numeric);
    update public.products set current_stock=current_stock+(x->>'quantity')::numeric,
      purchase_price=(x->>'unit_cost')::numeric, updated_at=now()
      where id=(x->>'product_id')::uuid;
    insert into public.stock_movements(product_id,movement_type,reference_id,quantity,unit_cost,note,created_by)
    values((x->>'product_id')::uuid,'PURCHASE',v_id,(x->>'quantity')::numeric,(x->>'unit_cost')::numeric,'Purchase '||v_no,auth.uid());
  end loop;
  insert into public.audit_logs(user_id,action,entity,entity_id,details)
  values(auth.uid(),'CREATE','purchase',v_id,jsonb_build_object('purchase_no',v_no,'total',p_total));
  return v_id;
end $$;

-- Atomic sale with row locks and stock validation.
create or replace function public.create_sale(
  p_customer_id uuid,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_total numeric,
  p_cash numeric,
  p_upi numeric,
  p_card numeric,
  p_credit numeric,
  p_items jsonb
) returns uuid
language plpgsql security invoker set search_path=public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_no text;
  x jsonb;
  v_stock numeric;
  v_min numeric;
  v_qty numeric;
  v_pid uuid;
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  if p_total < 0 then raise exception 'Invalid total'; end if;

  for x in select * from jsonb_array_elements(p_items) loop
    v_pid := (x->>'product_id')::uuid;
    v_qty := (x->>'quantity')::numeric;
    select current_stock, minimum_selling_price into v_stock,v_min from public.products where id=v_pid for update;
    if not found then raise exception 'Product not found'; end if;
    if v_stock < v_qty then raise exception 'Insufficient stock for product %', v_pid; end if;
    if (x->>'unit_price')::numeric < coalesce(v_min,0) then
      raise exception 'Selling price is below minimum allowed price';
    end if;
  end loop;

  select invoice_prefix||'-'||lpad(next_invoice_no::text,6,'0') into v_no from public.shop_settings where id=1 for update;
  update public.shop_settings set next_invoice_no=next_invoice_no+1,updated_at=now() where id=1;

  insert into public.sales(id,invoice_no,customer_id,subtotal,discount,tax,total,cash_paid,upi_paid,card_paid,credit_amount,created_by)
  values(v_id,v_no,p_customer_id,p_subtotal,p_discount,p_tax,p_total,p_cash,p_upi,p_card,p_credit,auth.uid());

  for x in select * from jsonb_array_elements(p_items) loop
    insert into public.sale_items(sale_id,product_id,quantity,unit_price,purchase_cost,discount,gst_rate,line_total)
    values(v_id,(x->>'product_id')::uuid,(x->>'quantity')::numeric,(x->>'unit_price')::numeric,
           (x->>'purchase_cost')::numeric,(x->>'discount')::numeric,coalesce((x->>'gst_rate')::numeric,0),(x->>'line_total')::numeric);
    update public.products set current_stock=current_stock-(x->>'quantity')::numeric,updated_at=now()
      where id=(x->>'product_id')::uuid;
    insert into public.stock_movements(product_id,movement_type,reference_id,quantity,unit_cost,note,created_by)
    values((x->>'product_id')::uuid,'SALE',v_id,-(x->>'quantity')::numeric,(x->>'purchase_cost')::numeric,'Sale '||v_no,auth.uid());
  end loop;

  insert into public.audit_logs(user_id,action,entity,entity_id,details)
  values(auth.uid(),'CREATE','sale',v_id,jsonb_build_object('invoice_no',v_no,'total',p_total));
  return v_id;
end $$;

grant execute on function public.create_purchase(uuid,text,numeric,numeric,numeric,numeric,numeric,jsonb) to authenticated;
grant execute on function public.create_sale(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,jsonb) to authenticated;

-- Storage bucket for private invoice PDFs.
insert into storage.buckets(id,name,public) values('invoices','invoices',false) on conflict(id) do nothing;

do $$ begin
  create policy invoice_storage_insert on storage.objects for insert to authenticated
  with check(bucket_id='invoices' and public.is_staff());
  create policy invoice_storage_select on storage.objects for select to authenticated
  using(bucket_id='invoices' and public.is_staff());
exception when duplicate_object then null; end $$;

-- Starter categories.
insert into public.categories(name,department) values
('Wires & Cables','Electrical'),('Switches & Sockets','Electrical'),('MCB & Protection','Electrical'),
('LED & Lighting','Electrical'),('Electrical Accessories','Electrical'),('Conduit & Fittings','Electrical'),
('PVC / uPVC Pipes','Plumbing'),('CPVC Pipes','Plumbing'),('SWR Pipes','Plumbing'),
('PPR Pipes','Plumbing'),('GI Pipes','Plumbing'),('Pipe Fittings','Plumbing'),('Valves','Plumbing'),
('Taps & Faucets','Sanitary'),('Bathroom & Sanitary','Sanitary'),('Water Tank & Hose','Plumbing'),
('Adhesives & Consumables','Consumables'),('Pumps','Plumbing'),('Tools','Tools')
on conflict(name) do nothing;

insert into public.brands(name) values
('Polycab'),('Finolex'),('Havells'),('KEI'),('RR Kabel'),('Anchor'),('Schneider'),('Legrand'),
('GM'),('V-Guard'),('Supreme'),('Astral'),('Ashirvad'),('Prince'),('Jaquar'),('Cera'),('Generic')
on conflict(name) do nothing;

-- First user setup:
-- 1) Create an Auth user from Supabase Dashboard -> Authentication.
-- 2) Replace YOUR_USER_UUID below and run:
-- update public.profiles set role='owner', active=true where id='YOUR_USER_UUID';
