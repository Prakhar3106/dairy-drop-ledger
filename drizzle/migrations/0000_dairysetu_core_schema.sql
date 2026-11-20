
-- ===================== ENUMS & UTILITIES =====================
create type public.app_role as enum ('super_admin','centre_owner','operator','farmer');
create type public.milk_type as enum ('Cow','Buffalo');
create type public.shift_type as enum ('Morning','Evening');

create or replace function public.today_ist() returns date
language sql stable set search_path = public as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;

create or replace function public.try_uuid(_t text) returns uuid
language plpgsql immutable set search_path = public as $$
begin return _t::uuid; exception when others then return null; end $$;

-- ===================== PROFILES & ROLES =====================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  mobile text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$ select public.has_role(auth.uid(), 'super_admin') $$;

-- ===================== CENTRES & STAFF =====================
create table public.dairy_centres (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (length(trim(name)) > 0),
  village text not null default '',
  district text not null default '',
  state text not null default '',
  address text not null default '',
  mobile text not null default '',
  email text not null default '',
  opening_hours text not null default 'Morning 6:00–9:00 AM · Evening 5:00–8:00 PM',
  status text not null default 'active' check (status in ('active','suspended')),
  owner_id uuid not null references public.profiles(id),
  low_stock_threshold_litres numeric(10,2) not null default 0 check (low_stock_threshold_litres >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.dairy_centres to authenticated;
grant all on public.dairy_centres to service_role;
alter table public.dairy_centres enable row level security;
create trigger centres_updated_at before update on public.dairy_centres for each row execute function public.set_updated_at();

create table public.centre_counters (
  centre_id uuid primary key references public.dairy_centres(id) on delete cascade,
  farmer_seq int not null default 100,
  receipt_seq int not null default 0,
  payment_seq int not null default 0,
  sale_seq int not null default 0,
  batch_seq int not null default 0,
  animal_seq int not null default 200
);
grant all on public.centre_counters to service_role;
alter table public.centre_counters enable row level security;

create table public.centre_staff (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  staff_role text not null check (staff_role in ('owner','operator')),
  is_active boolean not null default true,
  can_edit_collections boolean not null default false,
  created_at timestamptz not null default now(),
  unique (centre_id, user_id)
);
create index centre_staff_user_idx on public.centre_staff(user_id);
grant select, update on public.centre_staff to authenticated;
grant all on public.centre_staff to service_role;
alter table public.centre_staff enable row level security;

create or replace function public.is_centre_member(_centre uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.centre_staff s join public.dairy_centres c on c.id = s.centre_id
    where s.centre_id = _centre and s.user_id = auth.uid() and s.is_active and c.status = 'active')
$$;
create or replace function public.is_centre_owner(_centre uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.centre_staff s join public.dairy_centres c on c.id = s.centre_id
    where s.centre_id = _centre and s.user_id = auth.uid() and s.is_active and s.staff_role = 'owner' and c.status = 'active')
$$;

create or replace function public.next_centre_seq(_centre uuid, _kind text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.centre_counters(centre_id) values (_centre) on conflict do nothing;
  if _kind = 'farmer' then update public.centre_counters set farmer_seq = farmer_seq + 1 where centre_id = _centre returning farmer_seq into v;
  elsif _kind = 'receipt' then update public.centre_counters set receipt_seq = receipt_seq + 1 where centre_id = _centre returning receipt_seq into v;
  elsif _kind = 'payment' then update public.centre_counters set payment_seq = payment_seq + 1 where centre_id = _centre returning payment_seq into v;
  elsif _kind = 'sale' then update public.centre_counters set sale_seq = sale_seq + 1 where centre_id = _centre returning sale_seq into v;
  elsif _kind = 'batch' then update public.centre_counters set batch_seq = batch_seq + 1 where centre_id = _centre returning batch_seq into v;
  elsif _kind = 'animal' then update public.centre_counters set animal_seq = animal_seq + 1 where centre_id = _centre returning animal_seq into v;
  else raise exception 'Unknown sequence %', _kind;
  end if;
  return v;
end $$;

create or replace function public.generate_centre_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    c := 'DS-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.dairy_centres where code = c);
  end loop;
  return c;
end $$;

-- ===================== AUDIT & NOTIFICATIONS =====================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  centre_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_centre_idx on public.audit_logs(centre_id, created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create or replace function public.write_audit(_centre uuid, _action text, _entity text, _entity_id uuid, _details jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_logs(actor_id, centre_id, action, entity_type, entity_id, details)
  values (auth.uid(), _centre, _action, _entity, _entity_id, coalesce(_details, '{}'::jsonb))
$$;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  centre_id uuid references public.dairy_centres(id) on delete cascade,
  title text not null,
  title_hi text,
  message text not null default '',
  message_hi text,
  category text not null default 'General',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create or replace function public.notify_user(_user uuid, _centre uuid, _title text, _title_hi text, _msg text, _msg_hi text, _category text, _link text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, centre_id, title, title_hi, message, message_hi, category, link)
  select _user, _centre, _title, _title_hi, _msg, _msg_hi, _category, _link where _user is not null
$$;

create or replace function public.notify_centre_owners(_centre uuid, _title text, _title_hi text, _msg text, _msg_hi text, _category text, _link text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, centre_id, title, title_hi, message, message_hi, category, link)
  select s.user_id, _centre, _title, _title_hi, _msg, _msg_hi, _category, _link
  from public.centre_staff s where s.centre_id = _centre and s.staff_role = 'owner' and s.is_active
$$;

-- ===================== FARMERS =====================
create table public.farmers (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete restrict,
  farmer_code text not null default '',
  name text not null check (length(trim(name)) > 0),
  name_hi text not null default '',
  village text not null default '',
  village_hi text not null default '',
  mobile text not null default '',
  address text not null default '',
  milk_type text not null default 'Both' check (milk_type in ('Cow','Buffalo','Both')),
  status text not null default 'Active' check (status in ('Active','Inactive')),
  bank_account text not null default '',
  ifsc text not null default '',
  upi_id text not null default '',
  photo_path text,
  user_id uuid unique references public.profiles(id) on delete set null,
  joined_date date not null default public.today_ist(),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (centre_id, farmer_code)
);
create index farmers_centre_idx on public.farmers(centre_id);
grant select, insert, update on public.farmers to authenticated;
grant all on public.farmers to service_role;
alter table public.farmers enable row level security;
create trigger farmers_updated_at before update on public.farmers for each row execute function public.set_updated_at();

create or replace function public.is_my_farmer(_farmer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.farmers where id = _farmer and user_id = auth.uid())
$$;
create or replace function public.is_my_farmer_centre(_centre uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.farmers where centre_id = _centre and user_id = auth.uid())
$$;

create or replace function public.farmers_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.user_id := null;
    if coalesce(trim(new.farmer_code), '') = '' then
      new.farmer_code := 'F' || public.next_centre_seq(new.centre_id, 'farmer');
    else
      new.farmer_code := upper(trim(new.farmer_code));
    end if;
    if coalesce(trim(new.name_hi), '') = '' then new.name_hi := new.name; end if;
    if coalesce(trim(new.village_hi), '') = '' then new.village_hi := new.village; end if;
  else
    if auth.uid() is not null then
      if new.centre_id is distinct from old.centre_id then raise exception 'A farmer cannot be moved to another centre'; end if;
      if new.user_id is distinct from old.user_id then raise exception 'Farmer login accounts are managed separately'; end if;
      if new.farmer_code is distinct from old.farmer_code then raise exception 'Farmer ID cannot be changed'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger farmers_before_write before insert or update on public.farmers for each row execute function public.farmers_before_write();

create or replace function public.farmers_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit(new.centre_id, 'farmer.created', 'farmer', new.id, jsonb_build_object('farmer_code', new.farmer_code, 'name', new.name));
    perform public.notify_centre_owners(new.centre_id, 'New farmer registered: ' || new.name, 'नया किसान पंजीकृत: ' || new.name_hi,
      new.farmer_code || ' · ' || new.village, new.farmer_code || ' · ' || new.village_hi, 'Farmer', '/dashboard/farmers');
  elsif new.status is distinct from old.status then
    perform public.write_audit(new.centre_id, 'farmer.status_changed', 'farmer', new.id, jsonb_build_object('from', old.status, 'to', new.status));
  else
    perform public.write_audit(new.centre_id, 'farmer.updated', 'farmer', new.id, '{}'::jsonb);
  end if;
  return null;
end $$;
create trigger farmers_after_write after insert or update on public.farmers for each row execute function public.farmers_after_write();

-- ===================== RATE CHARTS =====================
create table public.rate_charts (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  milk_type public.milk_type not null,
  method text not null check (method in ('fixed','fat','fat_snf','chart')),
  fixed_rate numeric(10,2),
  fat_rate numeric(10,4),
  snf_rate numeric(10,4),
  base_rate numeric(10,2) not null default 0,
  min_fat numeric(4,2),
  min_snf numeric(4,2),
  effective_from date not null default public.today_ist(),
  version int not null default 1,
  notes text not null default '',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index rate_charts_lookup_idx on public.rate_charts(centre_id, milk_type, effective_from desc, version desc);
grant select on public.rate_charts to authenticated;
grant all on public.rate_charts to service_role;
alter table public.rate_charts enable row level security;

create table public.rate_slabs (
  id uuid primary key default gen_random_uuid(),
  rate_chart_id uuid not null references public.rate_charts(id) on delete cascade,
  min_fat numeric(4,2) not null,
  max_fat numeric(4,2) not null,
  min_snf numeric(4,2) not null default 0,
  max_snf numeric(4,2) not null default 99,
  rate numeric(10,2) not null check (rate >= 0),
  check (max_fat >= min_fat),
  check (max_snf >= min_snf)
);
grant select on public.rate_slabs to authenticated;
grant all on public.rate_slabs to service_role;
alter table public.rate_slabs enable row level security;

create or replace function public.compute_milk_rate(_centre uuid, _milk public.milk_type, _date date, _fat numeric, _snf numeric)
returns table(rate numeric, rate_chart_id uuid, method text, quality_status text)
language plpgsql stable security definer set search_path = public as $$
declare c public.rate_charts; r numeric;
begin
  select * into c from public.rate_charts rc
   where rc.centre_id = _centre and rc.milk_type = _milk and rc.effective_from <= _date
   order by rc.effective_from desc, rc.version desc limit 1;
  if not found then
    raise exception 'No % milk rate is set for %. Ask the centre owner to set milk rates in Settings.', _milk, to_char(_date, 'DD Mon YYYY');
  end if;
  if c.method = 'fixed' then r := c.fixed_rate;
  elsif c.method = 'fat' then r := c.base_rate + _fat * c.fat_rate;
  elsif c.method = 'fat_snf' then r := c.base_rate + _fat * c.fat_rate + _snf * c.snf_rate;
  else
    select s.rate into r from public.rate_slabs s
     where s.rate_chart_id = c.id and _fat between s.min_fat and s.max_fat and _snf between s.min_snf and s.max_snf
     order by s.min_fat desc, s.min_snf desc limit 1;
    if r is null then raise exception 'No rate slab matches Fat %%% / SNF %%% in the current % rate chart', _fat, _snf, _milk; end if;
  end if;
  if r is null or r < 0 then raise exception 'The % rate chart is incomplete', _milk; end if;
  rate := round(r, 2);
  rate_chart_id := c.id;
  method := c.method;
  quality_status := case when (c.min_fat is not null and _fat < c.min_fat) or (c.min_snf is not null and _snf < c.min_snf)
                         then 'Below Standard' else 'Accepted' end;
  return next;
end $$;

create or replace function public.preview_milk_rate(_centre uuid, _milk public.milk_type, _date date, _fat numeric, _snf numeric)
returns table(rate numeric, rate_chart_id uuid, method text, quality_status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_centre_member(_centre) or public.is_my_farmer_centre(_centre)) then raise exception 'Not authorised for this centre'; end if;
  return query select * from public.compute_milk_rate(_centre, _milk, _date, _fat, _snf);
end $$;

create or replace function public.create_rate_chart(
  _centre uuid, _milk public.milk_type, _method text, _fixed_rate numeric, _fat_rate numeric, _snf_rate numeric,
  _base_rate numeric, _min_fat numeric, _min_snf numeric, _effective_from date, _notes text, _slabs jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_version int; s jsonb;
begin
  if not public.is_centre_owner(_centre) then raise exception 'Only the centre owner can change milk rates'; end if;
  if _method not in ('fixed','fat','fat_snf','chart') then raise exception 'Unknown rate method'; end if;
  if _method = 'fixed' and (_fixed_rate is null or _fixed_rate <= 0) then raise exception 'Enter a fixed rate per litre'; end if;
  if _method in ('fat','fat_snf') and (_fat_rate is null or _fat_rate <= 0) then raise exception 'Enter the rate per Fat %%'; end if;
  if _method = 'fat_snf' and (_snf_rate is null or _snf_rate < 0) then raise exception 'Enter the rate per SNF %%'; end if;
  if _method = 'chart' and (jsonb_typeof(_slabs) <> 'array' or jsonb_array_length(_slabs) = 0) then raise exception 'Add at least one Fat/SNF slab'; end if;
  select coalesce(max(version), 0) + 1 into v_version from public.rate_charts where centre_id = _centre and milk_type = _milk;
  insert into public.rate_charts(centre_id, milk_type, method, fixed_rate, fat_rate, snf_rate, base_rate, min_fat, min_snf, effective_from, version, notes, created_by)
  values (_centre, _milk, _method, _fixed_rate, _fat_rate, _snf_rate, coalesce(_base_rate, 0), _min_fat, _min_snf, coalesce(_effective_from, public.today_ist()), v_version, coalesce(_notes, ''), auth.uid())
  returning id into v_id;
  if _method = 'chart' then
    for s in select * from jsonb_array_elements(_slabs) loop
      insert into public.rate_slabs(rate_chart_id, min_fat, max_fat, min_snf, max_snf, rate)
      values (v_id, (s->>'min_fat')::numeric, (s->>'max_fat')::numeric, coalesce((s->>'min_snf')::numeric, 0), coalesce((s->>'max_snf')::numeric, 99), (s->>'rate')::numeric);
    end loop;
  end if;
  perform public.write_audit(_centre, 'rate_chart.created', 'rate_chart', v_id,
    jsonb_build_object('milk_type', _milk, 'method', _method, 'version', v_version, 'effective_from', coalesce(_effective_from, public.today_ist())));
  return v_id;
end $$;

-- ===================== INVENTORY =====================
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  milk_type public.milk_type not null,
  movement_date date not null default public.today_ist(),
  movement_type text not null check (movement_type in ('opening','collection','collection_reversal','sale','wastage','production','adjustment')),
  quantity_litres numeric(12,2) not null check (quantity_litres <> 0),
  reference_id uuid,
  notes text not null default '',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index inventory_centre_idx on public.inventory_movements(centre_id, milk_type, movement_date);
grant select on public.inventory_movements to authenticated;
grant all on public.inventory_movements to service_role;
alter table public.inventory_movements enable row level security;

create or replace function public.inventory_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_stock numeric;
begin
  if new.movement_type in ('opening','collection') and new.quantity_litres < 0 then raise exception 'Stock additions must be positive'; end if;
  if new.movement_type in ('collection_reversal','sale','wastage','production') and new.quantity_litres > 0 then raise exception 'Stock deductions must be negative'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.centre_id::text || new.milk_type::text, 0));
  select coalesce(sum(quantity_litres), 0) into v_stock from public.inventory_movements where centre_id = new.centre_id and milk_type = new.milk_type;
  if v_stock + new.quantity_litres < 0 then
    raise exception 'Not enough % milk in stock: % L available, % L needed', new.milk_type, round(v_stock, 2), round(abs(new.quantity_litres), 2);
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;
create trigger inventory_before_insert before insert on public.inventory_movements for each row execute function public.inventory_before_insert();

create or replace function public.inventory_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_stock numeric; v_threshold numeric;
begin
  select low_stock_threshold_litres into v_threshold from public.dairy_centres where id = new.centre_id;
  if coalesce(v_threshold, 0) > 0 and new.quantity_litres < 0 then
    select coalesce(sum(quantity_litres), 0) into v_stock from public.inventory_movements where centre_id = new.centre_id and milk_type = new.milk_type;
    if v_stock < v_threshold and v_stock - new.quantity_litres >= v_threshold then
      perform public.notify_centre_owners(new.centre_id, 'Low ' || new.milk_type || ' milk stock: ' || round(v_stock, 1) || ' L',
        'कम ' || case when new.milk_type = 'Cow' then 'गाय' else 'भैंस' end || ' दूध स्टॉक: ' || round(v_stock, 1) || ' L',
        'Stock fell below your alert level of ' || v_threshold || ' L.', 'स्टॉक आपकी चेतावनी सीमा ' || v_threshold || ' L से नीचे है।', 'Inventory', '/dashboard/inventory');
    end if;
  end if;
  return null;
end $$;
create trigger inventory_after_insert after insert on public.inventory_movements for each row execute function public.inventory_after_insert();

create view public.inventory_stock with (security_invoker = on) as
  select centre_id, milk_type, sum(quantity_litres)::numeric(12,2) as stock_litres
  from public.inventory_movements group by centre_id, milk_type;
grant select on public.inventory_stock to authenticated;

create or replace function public.record_inventory_entry(_centre uuid, _milk public.milk_type, _type text, _quantity numeric, _notes text, _date date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_qty numeric;
begin
  if not public.is_centre_owner(_centre) then raise exception 'Only the centre owner can change stock'; end if;
  if _type not in ('opening','wastage','adjustment') then raise exception 'Use opening, wastage or adjustment'; end if;
  if _quantity is null or _quantity = 0 then raise exception 'Enter a quantity'; end if;
  if _type in ('opening','wastage') and _quantity < 0 then raise exception 'Enter a positive quantity'; end if;
  if _type = 'adjustment' and coalesce(trim(_notes), '') = '' then raise exception 'A reason is required for stock adjustments'; end if;
  v_qty := case when _type = 'wastage' then -abs(_quantity) else _quantity end;
  insert into public.inventory_movements(centre_id, milk_type, movement_date, movement_type, quantity_litres, notes, created_by)
  values (_centre, _milk, coalesce(_date, public.today_ist()), _type, v_qty, coalesce(_notes, ''), auth.uid()) returning id into v_id;
  perform public.write_audit(_centre, 'inventory.' || _type, 'inventory_movement', v_id, jsonb_build_object('milk_type', _milk, 'quantity', v_qty, 'notes', _notes));
  return v_id;
end $$;

-- ===================== LEDGER =====================
create table public.farmer_ledger (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  entry_date date not null default public.today_ist(),
  entry_type text not null check (entry_type in ('collection','payment','advance','collection_reversal','payment_reversal','adjustment')),
  amount numeric(12,2) not null,
  reference_type text,
  reference_id uuid,
  description text not null default '',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index ledger_farmer_idx on public.farmer_ledger(farmer_id, entry_date);
create index ledger_centre_idx on public.farmer_ledger(centre_id, entry_date);
grant select on public.farmer_ledger to authenticated;
grant all on public.farmer_ledger to service_role;
alter table public.farmer_ledger enable row level security;

create or replace function public.ledger_adjustment(_farmer uuid, _amount numeric, _description text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f public.farmers; v_id uuid;
begin
  select * into f from public.farmers where id = _farmer for update;
  if not found or not public.is_centre_owner(f.centre_id) then raise exception 'Not authorised'; end if;
  if _amount is null or _amount = 0 then raise exception 'Enter an adjustment amount'; end if;
  if coalesce(trim(_description), '') = '' then raise exception 'A reason is required for ledger adjustments'; end if;
  insert into public.farmer_ledger(centre_id, farmer_id, entry_type, amount, reference_type, description, created_by)
  values (f.centre_id, f.id, 'adjustment', round(_amount, 2), 'adjustment', _description, auth.uid()) returning id into v_id;
  perform public.write_audit(f.centre_id, 'ledger.adjustment', 'farmer', f.id, jsonb_build_object('amount', _amount, 'reason', _description));
  return v_id;
end $$;

-- ===================== MILK COLLECTIONS =====================
create table public.milk_collections (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  farmer_id uuid not null references public.farmers(id) on delete restrict,
  receipt_no text not null default '',
  collection_date date not null default public.today_ist(),
  collected_at timestamptz not null default now(),
  shift public.shift_type not null,
  milk_type public.milk_type not null,
  quantity_litres numeric(10,2) not null check (quantity_litres > 0 and quantity_litres <= 2000),
  fat_percent numeric(4,2) not null check (fat_percent >= 0 and fat_percent <= 15),
  snf_percent numeric(4,2) not null check (snf_percent >= 0 and snf_percent <= 15),
  rate_per_litre numeric(10,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  rate_chart_id uuid references public.rate_charts(id),
  rate_method text not null default '',
  rate_override boolean not null default false,
  quality_status text not null default 'Accepted',
  operator_id uuid,
  idempotency_key text not null unique,
  status text not null default 'active' check (status in ('active','cancelled')),
  cancel_reason text,
  cancelled_by uuid,
  cancelled_at timestamptz,
  corrected_from uuid references public.milk_collections(id),
  created_at timestamptz not null default now(),
  unique (centre_id, receipt_no)
);
create index collections_centre_date_idx on public.milk_collections(centre_id, collection_date desc);
create index collections_farmer_date_idx on public.milk_collections(farmer_id, collection_date desc);
grant select, insert on public.milk_collections to authenticated;
grant all on public.milk_collections to service_role;
alter table public.milk_collections enable row level security;

create or replace function public.collections_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare f public.farmers; r record; v_owner boolean; v_dup text;
begin
  select * into f from public.farmers where id = new.farmer_id;
  if not found or f.centre_id <> new.centre_id then raise exception 'Farmer does not belong to this centre'; end if;
  if f.status <> 'Active' then raise exception 'Farmer % is inactive', f.farmer_code; end if;
  if not public.is_centre_member(new.centre_id) then raise exception 'Not authorised for this centre'; end if;
  v_owner := public.is_centre_owner(new.centre_id);
  if new.collection_date > public.today_ist() then raise exception 'Collection date cannot be in the future'; end if;
  if not v_owner and new.collection_date < public.today_ist() - 1 then raise exception 'Operators can record collections only for today or yesterday'; end if;
  select receipt_no into v_dup from public.milk_collections m
   where m.farmer_id = new.farmer_id and m.collection_date = new.collection_date and m.shift = new.shift and m.milk_type = new.milk_type
     and m.quantity_litres = new.quantity_litres and m.status = 'active' and m.created_at > now() - interval '2 minutes' limit 1;
  if v_dup is not null and new.corrected_from is null then
    raise exception 'This exact entry was already saved a moment ago (receipt %). Check the history before saving again.', v_dup;
  end if;
  if new.rate_override then
    if not v_owner then raise exception 'Only the centre owner can override the milk rate'; end if;
    if new.rate_per_litre is null or new.rate_per_litre <= 0 then raise exception 'Enter a valid override rate'; end if;
    new.rate_per_litre := round(new.rate_per_litre, 2);
    new.rate_method := 'manual';
    new.rate_chart_id := null;
    new.quality_status := 'Accepted';
  else
    select * into r from public.compute_milk_rate(new.centre_id, new.milk_type, new.collection_date, new.fat_percent, new.snf_percent);
    new.rate_per_litre := r.rate;
    new.rate_chart_id := r.rate_chart_id;
    new.rate_method := r.method;
    new.quality_status := r.quality_status;
  end if;
  new.total_amount := round(new.quantity_litres * new.rate_per_litre, 2);
  new.operator_id := auth.uid();
  new.status := 'active';
  new.cancel_reason := null; new.cancelled_by := null; new.cancelled_at := null;
  new.collected_at := now();
  new.receipt_no := 'R' || to_char(new.collection_date, 'YYMMDD') || '-' || lpad(public.next_centre_seq(new.centre_id, 'receipt')::text, 5, '0');
  return new;
end $$;
create trigger collections_before_insert before insert on public.milk_collections for each row execute function public.collections_before_insert();

create or replace function public.collections_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.farmer_ledger(centre_id, farmer_id, entry_date, entry_type, amount, reference_type, reference_id, description, created_by)
  values (new.centre_id, new.farmer_id, new.collection_date, 'collection', new.total_amount, 'milk_collection', new.id,
          new.milk_type || ' ' || new.shift || ' · ' || new.quantity_litres || ' L @ ₹' || new.rate_per_litre || ' (' || new.receipt_no || ')', auth.uid());
  insert into public.inventory_movements(centre_id, milk_type, movement_date, movement_type, quantity_litres, reference_id, notes, created_by)
  values (new.centre_id, new.milk_type, new.collection_date, 'collection', new.quantity_litres, new.id, new.receipt_no, auth.uid());
  perform public.write_audit(new.centre_id, 'collection.created', 'milk_collection', new.id,
    jsonb_build_object('receipt_no', new.receipt_no, 'farmer_id', new.farmer_id, 'quantity', new.quantity_litres, 'rate', new.rate_per_litre, 'amount', new.total_amount, 'override', new.rate_override));
  return null;
end $$;
create trigger collections_after_insert after insert on public.milk_collections for each row execute function public.collections_after_insert();

create or replace function public.can_edit_collection(_c public.milk_collections) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_centre_owner(_c.centre_id) or exists (
    select 1 from public.centre_staff s
    where s.centre_id = _c.centre_id and s.user_id = auth.uid() and s.is_active and s.can_edit_collections
      and _c.operator_id = auth.uid() and _c.collection_date >= public.today_ist() - 1)
$$;

create or replace function public.do_cancel_collection(_c public.milk_collections, _reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.milk_collections set status = 'cancelled', cancel_reason = _reason, cancelled_by = auth.uid(), cancelled_at = now() where id = _c.id;
  insert into public.farmer_ledger(centre_id, farmer_id, entry_date, entry_type, amount, reference_type, reference_id, description, created_by)
  values (_c.centre_id, _c.farmer_id, public.today_ist(), 'collection_reversal', -_c.total_amount, 'milk_collection', _c.id, 'Cancelled ' || _c.receipt_no || ': ' || _reason, auth.uid());
  insert into public.inventory_movements(centre_id, milk_type, movement_date, movement_type, quantity_litres, reference_id, notes, created_by)
  values (_c.centre_id, _c.milk_type, public.today_ist(), 'collection_reversal', -_c.quantity_litres, _c.id, 'Cancelled ' || _c.receipt_no, auth.uid());
  perform public.write_audit(_c.centre_id, 'collection.cancelled', 'milk_collection', _c.id, jsonb_build_object('receipt_no', _c.receipt_no, 'reason', _reason, 'amount', _c.total_amount));
end $$;

create or replace function public.cancel_collection(_id uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.milk_collections;
begin
  select * into c from public.milk_collections where id = _id for update;
  if not found then raise exception 'Collection not found'; end if;
  if not public.can_edit_collection(c) then raise exception 'You do not have permission to cancel this entry'; end if;
  if c.status <> 'active' then raise exception 'This entry is already cancelled'; end if;
  if coalesce(trim(_reason), '') = '' then raise exception 'A reason is required to cancel an entry'; end if;
  perform public.do_cancel_collection(c, trim(_reason));
end $$;

create or replace function public.correct_collection(_id uuid, _quantity numeric, _fat numeric, _snf numeric, _reason text, _idempotency_key text)
returns public.milk_collections language plpgsql security definer set search_path = public as $$
declare c public.milk_collections; n public.milk_collections;
begin
  select * into n from public.milk_collections where idempotency_key = _idempotency_key;
  if found then return n; end if;
  select * into c from public.milk_collections where id = _id for update;
  if not found then raise exception 'Collection not found'; end if;
  if not public.can_edit_collection(c) then raise exception 'You do not have permission to correct this entry'; end if;
  if c.status <> 'active' then raise exception 'Only active entries can be corrected'; end if;
  if coalesce(trim(_reason), '') = '' then raise exception 'A reason is required to correct an entry'; end if;
  insert into public.milk_collections(centre_id, farmer_id, collection_date, shift, milk_type, quantity_litres, fat_percent, snf_percent, idempotency_key, corrected_from)
  values (c.centre_id, c.farmer_id, c.collection_date, c.shift, c.milk_type, _quantity, _fat, _snf, _idempotency_key, c.id) returning * into n;
  perform public.do_cancel_collection(c, 'Corrected by ' || n.receipt_no || ': ' || trim(_reason));
  return n;
end $$;

-- ===================== PAYMENTS =====================
create table public.farmer_payments (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  farmer_id uuid not null references public.farmers(id) on delete restrict,
  txn_id text not null unique,
  payment_date date not null default public.today_ist(),
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('Cash','UPI','Bank Transfer','Cheque')),
  payment_type text not null check (payment_type in ('full','partial','advance')),
  reference_no text not null default '',
  notes text not null default '',
  recorded_by uuid,
  idempotency_key text not null unique,
  status text not null default 'completed' check (status in ('completed','reversed')),
  reversed_reason text,
  reversed_by uuid,
  reversed_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_farmer_idx on public.farmer_payments(farmer_id, payment_date desc);
create index payments_centre_idx on public.farmer_payments(centre_id, payment_date desc);
grant select on public.farmer_payments to authenticated;
grant all on public.farmer_payments to service_role;
alter table public.farmer_payments enable row level security;

create or replace function public.record_payment(_farmer uuid, _amount numeric, _method text, _payment_type text, _reference_no text, _notes text, _payment_date date, _idempotency_key text)
returns public.farmer_payments language plpgsql security definer set search_path = public as $$
declare f public.farmers; p public.farmer_payments; v_balance numeric; v_code text; v_seq int; v_amount numeric;
begin
  if coalesce(trim(_idempotency_key), '') = '' then raise exception 'Missing submission key'; end if;
  select * into p from public.farmer_payments where idempotency_key = _idempotency_key;
  if found then return p; end if;
  select * into f from public.farmers where id = _farmer for update;
  if not found then raise exception 'Farmer not found'; end if;
  if not public.is_centre_owner(f.centre_id) then raise exception 'Only the centre owner can record payments'; end if;
  v_amount := round(_amount, 2);
  if v_amount is null or v_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  if _method not in ('Cash','UPI','Bank Transfer','Cheque') then raise exception 'Choose a payment method'; end if;
  if _method <> 'Cash' and coalesce(trim(_reference_no), '') = '' then raise exception 'A reference number is required for % payments', _method; end if;
  if coalesce(_payment_date, public.today_ist()) > public.today_ist() then raise exception 'Payment date cannot be in the future'; end if;
  select coalesce(sum(amount), 0) into v_balance from public.farmer_ledger where farmer_id = f.id;
  if _payment_type = 'full' then
    if v_balance <= 0 then raise exception 'Nothing is pending for this farmer'; end if;
    if v_amount <> round(v_balance, 2) then raise exception 'A full payment must equal the pending balance of ₹%', round(v_balance, 2); end if;
  elsif _payment_type = 'partial' then
    if v_balance <= 0 then raise exception 'Nothing is pending for this farmer. Record it as an advance instead.'; end if;
    if v_amount >= round(v_balance, 2) then raise exception 'A partial payment must be less than the pending balance of ₹%', round(v_balance, 2); end if;
  elsif _payment_type <> 'advance' then raise exception 'Choose full, partial or advance';
  end if;
  select code into v_code from public.dairy_centres where id = f.centre_id;
  v_seq := public.next_centre_seq(f.centre_id, 'payment');
  insert into public.farmer_payments(centre_id, farmer_id, txn_id, payment_date, amount, method, payment_type, reference_no, notes, recorded_by, idempotency_key)
  values (f.centre_id, f.id, 'TXN-' || v_code || '-' || lpad(v_seq::text, 5, '0'), coalesce(_payment_date, public.today_ist()), v_amount, _method, _payment_type,
          coalesce(trim(_reference_no), ''), coalesce(_notes, ''), auth.uid(), _idempotency_key)
  returning * into p;
  insert into public.farmer_ledger(centre_id, farmer_id, entry_date, entry_type, amount, reference_type, reference_id, description, created_by)
  values (f.centre_id, f.id, p.payment_date, case when _payment_type = 'advance' then 'advance' else 'payment' end, -v_amount, 'farmer_payment', p.id,
          initcap(_payment_type) || ' payment ' || p.txn_id || ' via ' || _method, auth.uid());
  perform public.write_audit(f.centre_id, 'payment.recorded', 'farmer_payment', p.id,
    jsonb_build_object('txn_id', p.txn_id, 'farmer_id', f.id, 'amount', v_amount, 'type', _payment_type, 'method', _method, 'balance_before', v_balance));
  perform public.notify_user(f.user_id, f.centre_id, 'Payment received: ₹' || v_amount, 'भुगतान प्राप्त: ₹' || v_amount,
    p.txn_id || ' · ' || _method || ' · ' || to_char(p.payment_date, 'DD Mon YYYY'), p.txn_id || ' · ' || _method, 'Payment', '/farmer-portal');
  return p;
end $$;

create or replace function public.reverse_payment(_payment uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.farmer_payments;
begin
  select * into p from public.farmer_payments where id = _payment for update;
  if not found then raise exception 'Payment not found'; end if;
  if not public.is_centre_owner(p.centre_id) then raise exception 'Only the centre owner can reverse payments'; end if;
  if p.status <> 'completed' then raise exception 'This payment is already reversed'; end if;
  if coalesce(trim(_reason), '') = '' then raise exception 'A reason is required to reverse a payment'; end if;
  update public.farmer_payments set status = 'reversed', reversed_reason = trim(_reason), reversed_by = auth.uid(), reversed_at = now() where id = p.id;
  insert into public.farmer_ledger(centre_id, farmer_id, entry_date, entry_type, amount, reference_type, reference_id, description, created_by)
  values (p.centre_id, p.farmer_id, public.today_ist(), 'payment_reversal', p.amount, 'farmer_payment', p.id, 'Reversed ' || p.txn_id || ': ' || trim(_reason), auth.uid());
  perform public.write_audit(p.centre_id, 'payment.reversed', 'farmer_payment', p.id, jsonb_build_object('txn_id', p.txn_id, 'amount', p.amount, 'reason', _reason));
end $$;

create view public.farmer_balances with (security_invoker = on) as
select f.id as farmer_id, f.centre_id,
  coalesce((select sum(l.amount) from public.farmer_ledger l where l.farmer_id = f.id), 0)::numeric(12,2) as balance,
  coalesce((select sum(m.quantity_litres) from public.milk_collections m where m.farmer_id = f.id and m.status = 'active'), 0)::numeric(12,2) as total_litres,
  coalesce((select sum(m.total_amount) from public.milk_collections m where m.farmer_id = f.id and m.status = 'active'), 0)::numeric(12,2) as total_earned,
  coalesce((select sum(p.amount) from public.farmer_payments p where p.farmer_id = f.id and p.status = 'completed'), 0)::numeric(12,2) as total_paid
from public.farmers f;
grant select on public.farmer_balances to authenticated;

-- ===================== SALES & PRODUCTION =====================
create table public.milk_sales (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  sale_no text not null default '',
  sale_date date not null default public.today_ist(),
  customer_name text not null check (length(trim(customer_name)) > 0),
  customer_type text not null check (customer_type in ('Household','Sweet Shop','Chilling Plant','Retail Booth','Other')),
  milk_type public.milk_type not null,
  quantity_litres numeric(10,2) not null check (quantity_litres > 0),
  rate_per_litre numeric(10,2) not null check (rate_per_litre >= 0),
  total_amount numeric(12,2) not null default 0,
  payment_status text not null default 'Received' check (payment_status in ('Received','Credit')),
  idempotency_key text not null unique,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  unique (centre_id, sale_no)
);
create index sales_centre_idx on public.milk_sales(centre_id, sale_date desc);
grant select, insert on public.milk_sales to authenticated;
grant all on public.milk_sales to service_role;
alter table public.milk_sales enable row level security;

create or replace function public.sales_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_centre_owner(new.centre_id) then raise exception 'Only the centre owner can record sales'; end if;
  if new.sale_date > public.today_ist() then raise exception 'Sale date cannot be in the future'; end if;
  new.total_amount := round(new.quantity_litres * new.rate_per_litre, 2);
  new.recorded_by := auth.uid();
  new.sale_no := 'SL-' || lpad(public.next_centre_seq(new.centre_id, 'sale')::text, 5, '0');
  return new;
end $$;
create trigger sales_before_insert before insert on public.milk_sales for each row execute function public.sales_before_insert();

create or replace function public.sales_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory_movements(centre_id, milk_type, movement_date, movement_type, quantity_litres, reference_id, notes, created_by)
  values (new.centre_id, new.milk_type, new.sale_date, 'sale', -new.quantity_litres, new.id, new.sale_no || ' · ' || new.customer_name, auth.uid());
  perform public.write_audit(new.centre_id, 'sale.recorded', 'milk_sale', new.id, jsonb_build_object('sale_no', new.sale_no, 'quantity', new.quantity_litres, 'amount', new.total_amount));
  return null;
end $$;
create trigger sales_after_insert after insert on public.milk_sales for each row execute function public.sales_after_insert();

create or replace function public.mark_sale_received(_sale uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s public.milk_sales;
begin
  select * into s from public.milk_sales where id = _sale for update;
  if not found or not public.is_centre_owner(s.centre_id) then raise exception 'Not authorised'; end if;
  if s.payment_status = 'Received' then return; end if;
  update public.milk_sales set payment_status = 'Received' where id = s.id;
  perform public.write_audit(s.centre_id, 'sale.payment_received', 'milk_sale', s.id, jsonb_build_object('sale_no', s.sale_no, 'amount', s.total_amount));
end $$;

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  batch_no text not null default '',
  batch_date date not null default public.today_ist(),
  product_name text not null check (product_name in ('Desi Ghee','Fresh Paneer','Curd (Dahi)','Buttermilk (Chaas)','Khoa','Other')),
  milk_type public.milk_type not null,
  milk_used_litres numeric(10,2) not null check (milk_used_litres > 0),
  output_quantity text not null default '',
  estimated_value numeric(12,2) not null default 0 check (estimated_value >= 0),
  status text not null default 'In Process' check (status in ('Ready','In Process')),
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.production_batches to authenticated;
grant all on public.production_batches to service_role;
alter table public.production_batches enable row level security;

create or replace function public.batches_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.batch_no := 'PB-' || lpad(public.next_centre_seq(new.centre_id, 'batch')::text, 4, '0');
  else
    if new.milk_used_litres <> old.milk_used_litres or new.milk_type <> old.milk_type or new.centre_id <> old.centre_id or new.batch_no <> old.batch_no then
      raise exception 'Milk used cannot be changed after the batch is created';
    end if;
  end if;
  return new;
end $$;
create trigger batches_before_write before insert or update on public.production_batches for each row execute function public.batches_before_write();

create or replace function public.batches_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory_movements(centre_id, milk_type, movement_date, movement_type, quantity_litres, reference_id, notes, created_by)
  values (new.centre_id, new.milk_type, new.batch_date, 'production', -new.milk_used_litres, new.id, new.batch_no || ' · ' || new.product_name, auth.uid());
  return null;
end $$;
create trigger batches_after_insert after insert on public.production_batches for each row execute function public.batches_after_insert();

-- ===================== ANIMALS =====================
create table public.animals (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.dairy_centres(id) on delete cascade,
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  animal_code text not null default '',
  tag_number text not null default '',
  name text not null check (length(trim(name)) > 0),
  animal_type public.milk_type not null,
  breed text not null default '',
  date_of_birth date,
  age_years numeric(4,1),
  purchase_date date,
  purchase_price numeric(12,2),
  sale_date date,
  sale_price numeric(12,2),
  status text not null default 'Active' check (status in ('Active','Dry','Sold','Dead')),
  health_status text not null default 'Healthy' check (health_status in ('Healthy','Checkup Due','Under Care')),
  daily_yield_litres numeric(6,2) not null default 0 check (daily_yield_litres >= 0),
  feeding_plan text not null default '',
  notes text not null default '',
  photo_path text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index animals_farmer_idx on public.animals(farmer_id);
create index animals_centre_idx on public.animals(centre_id);
grant select, insert, update on public.animals to authenticated;
grant all on public.animals to service_role;
alter table public.animals enable row level security;
create trigger animals_updated_at before update on public.animals for each row execute function public.set_updated_at();

create or replace function public.animals_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_centre uuid;
begin
  select centre_id into v_centre from public.farmers where id = new.farmer_id;
  if v_centre is null then raise exception 'Farmer not found'; end if;
  if tg_op = 'INSERT' then
    new.centre_id := v_centre;
    new.created_by := auth.uid();
    new.animal_code := 'A' || public.next_centre_seq(v_centre, 'animal');
  else
    if new.farmer_id <> old.farmer_id and auth.uid() is not null and not public.is_centre_owner(old.centre_id) then
      raise exception 'Only the centre owner can transfer an animal';
    end if;
    new.centre_id := v_centre;
    new.animal_code := old.animal_code;
  end if;
  return new;
end $$;
create trigger animals_before_write before insert or update on public.animals for each row execute function public.animals_before_write();

create or replace function public.can_view_animal(_animal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.animals a where a.id = _animal and (public.is_centre_member(a.centre_id) or public.is_my_farmer(a.farmer_id) or public.is_super_admin()))
$$;
create or replace function public.can_edit_animal(_animal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.animals a where a.id = _animal and (public.is_centre_owner(a.centre_id) or public.is_my_farmer(a.farmer_id)))
$$;

create table public.animal_health_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  record_date date not null default public.today_ist(),
  record_type text not null default 'Checkup' check (record_type in ('Checkup','Treatment','Illness','Deworming','Note')),
  description text not null check (length(trim(description)) > 0),
  vet_name text not null default '',
  cost numeric(12,2),
  next_followup_date date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index health_animal_idx on public.animal_health_records(animal_id, record_date desc);
grant select, insert, update, delete on public.animal_health_records to authenticated;
grant all on public.animal_health_records to service_role;
alter table public.animal_health_records enable row level security;

create table public.vaccination_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  vaccine_name text not null check (length(trim(vaccine_name)) > 0),
  scheduled_date date not null,
  administered_date date,
  vet_name text not null default '',
  status text not null default 'Scheduled' check (status in ('Scheduled','Completed','Missed')),
  notes text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index vacc_animal_idx on public.vaccination_records(animal_id, scheduled_date);
grant select, insert, update, delete on public.vaccination_records to authenticated;
grant all on public.vaccination_records to service_role;
alter table public.vaccination_records enable row level security;

create table public.breeding_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  event_date date not null default public.today_ist(),
  event_type text not null check (event_type in ('Heat','Artificial Insemination','Natural Service','Pregnancy Check','Calving','Abortion','Other')),
  notes text not null default '',
  expected_calving_date date,
  calf_details text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index breeding_animal_idx on public.breeding_records(animal_id, event_date desc);
grant select, insert, update, delete on public.breeding_records to authenticated;
grant all on public.breeding_records to service_role;
alter table public.breeding_records enable row level security;

create or replace function public.vaccination_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.animals; f public.farmers;
begin
  if new.status <> 'Scheduled' then return null; end if;
  select * into a from public.animals where id = new.animal_id;
  select * into f from public.farmers where id = a.farmer_id;
  perform public.notify_user(f.user_id, a.centre_id, 'Vaccination scheduled: ' || a.name, 'टीकाकरण निर्धारित: ' || a.name,
    new.vaccine_name || ' on ' || to_char(new.scheduled_date, 'DD Mon YYYY'), new.vaccine_name || ' · ' || to_char(new.scheduled_date, 'DD Mon YYYY'), 'Animal Health', '/farmer-portal');
  perform public.notify_centre_owners(a.centre_id, 'Vaccination scheduled: ' || a.name || ' (' || f.name || ')', 'टीकाकरण निर्धारित: ' || a.name,
    new.vaccine_name || ' on ' || to_char(new.scheduled_date, 'DD Mon YYYY'), new.vaccine_name || ' · ' || to_char(new.scheduled_date, 'DD Mon YYYY'), 'Animal Health', '/dashboard/animals');
  return null;
end $$;
create trigger vaccination_after_insert after insert on public.vaccination_records for each row execute function public.vaccination_after_insert();

-- ===================== EXPENSES =====================
create table public.farm_expenses (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid references public.dairy_centres(id) on delete cascade,
  farmer_id uuid references public.farmers(id) on delete cascade,
  expense_date date not null default public.today_ist(),
  category text not null check (category in ('Green Fodder','Cattle Feed','Veterinary','Electricity & Chilling','Transport','Staff',
                                              'Animal Feed','Medicine','Labour','Transportation','Equipment','Other')),
  description text not null default '',
  amount numeric(12,2) not null check (amount > 0),
  paid_by text not null default 'Cash' check (paid_by in ('Cash','UPI','Bank')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((centre_id is null) <> (farmer_id is null))
);
create index expenses_centre_idx on public.farm_expenses(centre_id, expense_date desc);
create index expenses_farmer_idx on public.farm_expenses(farmer_id, expense_date desc);
grant select, insert, update, delete on public.farm_expenses to authenticated;
grant all on public.farm_expenses to service_role;
alter table public.farm_expenses enable row level security;
create trigger expenses_updated_at before update on public.farm_expenses for each row execute function public.set_updated_at();

-- ===================== PLATFORM SETTINGS =====================
create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;

-- ===================== GUARD TRIGGERS =====================
create or replace function public.centres_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    new.code := old.code; new.status := old.status; new.owner_id := old.owner_id;
  end if;
  if new.status is distinct from old.status then
    perform public.write_audit(new.id, 'centre.status_changed', 'dairy_centre', new.id, jsonb_build_object('from', old.status, 'to', new.status));
  else
    perform public.write_audit(new.id, 'centre.updated', 'dairy_centre', new.id, '{}'::jsonb);
  end if;
  return new;
end $$;
create trigger centres_guard before update on public.dairy_centres for each row execute function public.centres_guard();

create or replace function public.staff_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.user_id <> old.user_id or new.centre_id <> old.centre_id or new.staff_role <> old.staff_role then
      raise exception 'Only status and permissions can be changed';
    end if;
    if old.staff_role = 'owner' then raise exception 'The owner account cannot be changed here'; end if;
  end if;
  perform public.write_audit(new.centre_id, 'staff.updated', 'centre_staff', new.id, jsonb_build_object('is_active', new.is_active, 'can_edit_collections', new.can_edit_collections));
  return new;
end $$;
create trigger staff_guard before update on public.centre_staff for each row execute function public.staff_guard();

create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.email := old.email; new.is_active := old.is_active; new.id := old.id; end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

create or replace function public.notifications_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.title <> old.title or new.message <> old.message or new.user_id <> old.user_id or new.category <> old.category then
      raise exception 'Only read status can be changed';
    end if;
  end if;
  return new;
end $$;
create trigger notifications_guard before update on public.notifications for each row execute function public.notifications_guard();

-- ===================== SIGNUP =====================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); v_centre uuid;
begin
  insert into public.profiles(id, full_name, mobile, email)
  values (new.id, coalesce(meta->>'full_name', ''), nullif(meta->>'mobile', ''), new.email)
  on conflict (id) do nothing;
  if meta->>'registration' = 'centre' and coalesce(trim(meta->>'centre_name'), '') <> '' then
    insert into public.dairy_centres(code, name, village, district, state, mobile, email, owner_id)
    values (public.generate_centre_code(), trim(meta->>'centre_name'), coalesce(meta->>'centre_village', ''), coalesce(meta->>'centre_district', ''),
            coalesce(meta->>'centre_state', ''), coalesce(meta->>'mobile', ''), coalesce(new.email, ''), new.id)
    returning id into v_centre;
    insert into public.centre_counters(centre_id) values (v_centre);
    insert into public.centre_staff(centre_id, user_id, staff_role) values (v_centre, new.id, 'owner');
    insert into public.user_roles(user_id, role) values (new.id, 'centre_owner') on conflict do nothing;
    insert into public.audit_logs(actor_id, centre_id, action, entity_type, entity_id, details)
    values (new.id, v_centre, 'centre.registered', 'dairy_centre', v_centre, jsonb_build_object('name', meta->>'centre_name'));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ===================== REPORTING FUNCTIONS (RLS applies) =====================
create or replace function public.collection_daily_summary(_centre uuid, _from date, _to date, _farmer uuid default null)
returns table(day date, shift public.shift_type, milk_type public.milk_type, litres numeric, amount numeric, entries bigint, avg_fat numeric, avg_snf numeric)
language sql stable security invoker set search_path = public as $$
  select m.collection_date, m.shift, m.milk_type, sum(m.quantity_litres), sum(m.total_amount), count(*), round(avg(m.fat_percent), 2), round(avg(m.snf_percent), 2)
  from public.milk_collections m
  where m.centre_id = _centre and m.status = 'active' and m.collection_date between _from and _to and (_farmer is null or m.farmer_id = _farmer)
  group by 1, 2, 3 order by 1, 2, 3
$$;

create or replace function public.settlement_summary(_centre uuid, _from date, _to date)
returns table(farmer_id uuid, farmer_code text, name text, name_hi text, village text, litres numeric, gross numeric, paid_in_period numeric, advances_in_period numeric, balance numeric)
language sql stable security invoker set search_path = public as $$
  select f.id, f.farmer_code, f.name, f.name_hi, f.village,
    coalesce((select sum(m.quantity_litres) from public.milk_collections m where m.farmer_id = f.id and m.status = 'active' and m.collection_date between _from and _to), 0),
    coalesce((select sum(m.total_amount) from public.milk_collections m where m.farmer_id = f.id and m.status = 'active' and m.collection_date between _from and _to), 0),
    coalesce((select sum(p.amount) from public.farmer_payments p where p.farmer_id = f.id and p.status = 'completed' and p.payment_type <> 'advance' and p.payment_date between _from and _to), 0),
    coalesce((select sum(p.amount) from public.farmer_payments p where p.farmer_id = f.id and p.status = 'completed' and p.payment_type = 'advance' and p.payment_date between _from and _to), 0),
    coalesce((select sum(l.amount) from public.farmer_ledger l where l.farmer_id = f.id), 0)
  from public.farmers f where f.centre_id = _centre
  order by f.farmer_code
$$;

-- ===================== OWNER/ADMIN RPCs =====================
create or replace function public.send_centre_announcement(_centre uuid, _title text, _message text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_centre_owner(_centre) then raise exception 'Only the centre owner can send announcements'; end if;
  if coalesce(trim(_title), '') = '' then raise exception 'Enter a title'; end if;
  insert into public.notifications(user_id, centre_id, title, title_hi, message, message_hi, category)
  select u, _centre, trim(_title), trim(_title), coalesce(_message, ''), coalesce(_message, ''), 'Announcement' from (
    select s.user_id as u from public.centre_staff s where s.centre_id = _centre and s.is_active
    union select f.user_id from public.farmers f where f.centre_id = _centre and f.user_id is not null and f.status = 'Active') x;
  get diagnostics n = row_count;
  perform public.write_audit(_centre, 'announcement.sent', 'dairy_centre', _centre, jsonb_build_object('title', _title, 'recipients', n));
  return n;
end $$;

create or replace function public.set_centre_status(_centre uuid, _status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can change centre status'; end if;
  if _status not in ('active','suspended') then raise exception 'Invalid status'; end if;
  update public.dairy_centres set status = _status where id = _centre;
end $$;

create or replace function public.admin_platform_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can view platform statistics'; end if;
  return jsonb_build_object(
    'centres', (select count(*) from public.dairy_centres),
    'active_centres', (select count(*) from public.dairy_centres where status = 'active'),
    'suspended_centres', (select count(*) from public.dairy_centres where status = 'suspended'),
    'farmers', (select count(*) from public.farmers),
    'active_farmers', (select count(*) from public.farmers where status = 'Active'),
    'users', (select count(*) from public.profiles),
    'operators', (select count(*) from public.centre_staff where staff_role = 'operator'),
    'collections_30d', (select count(*) from public.milk_collections where status = 'active' and collection_date >= public.today_ist() - 30),
    'litres_30d', (select coalesce(sum(quantity_litres), 0) from public.milk_collections where status = 'active' and collection_date >= public.today_ist() - 30),
    'registrations', (select coalesce(jsonb_agg(r order by r->>'month'), '[]'::jsonb) from (
        select jsonb_build_object('month', to_char(date_trunc('month', created_at), 'YYYY-MM'), 'count', count(*)) as r
        from public.dairy_centres where created_at >= now() - interval '12 months' group by date_trunc('month', created_at)) t)
  );
end $$;

create or replace function public.admin_list_centres()
returns table(id uuid, code text, name text, village text, district text, state text, status text, owner_name text, owner_email text, farmers bigint, staff bigint, litres_30d numeric, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can list centres'; end if;
  return query
  select c.id, c.code, c.name, c.village, c.district, c.state, c.status, p.full_name, p.email,
    (select count(*) from public.farmers f where f.centre_id = c.id),
    (select count(*) from public.centre_staff s where s.centre_id = c.id),
    (select coalesce(sum(m.quantity_litres), 0) from public.milk_collections m where m.centre_id = c.id and m.status = 'active' and m.collection_date >= public.today_ist() - 30),
    c.created_at
  from public.dairy_centres c left join public.profiles p on p.id = c.owner_id
  order by c.created_at desc;
end $$;

-- ===================== RLS POLICIES =====================
create policy "Profiles: read own, staff of my centre, or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin()
    or exists (select 1 from public.centre_staff s where s.user_id = profiles.id and public.is_centre_owner(s.centre_id)));
create policy "Profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Roles: read own or admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

create policy "Centres: members, owner, linked farmers, admin" on public.dairy_centres for select to authenticated
  using (owner_id = auth.uid() or public.is_centre_member(id) or public.is_my_farmer_centre(id) or public.is_super_admin());
create policy "Centres: owner updates" on public.dairy_centres for update to authenticated
  using (public.is_centre_owner(id) or public.is_super_admin()) with check (public.is_centre_owner(id) or public.is_super_admin());

create policy "Staff: members see centre staff" on public.centre_staff for select to authenticated
  using (user_id = auth.uid() or public.is_centre_member(centre_id) or public.is_super_admin());
create policy "Staff: owner manages operators" on public.centre_staff for update to authenticated
  using (public.is_centre_owner(centre_id) and staff_role = 'operator') with check (public.is_centre_owner(centre_id) and staff_role = 'operator');

create policy "Audit: owner or admin" on public.audit_logs for select to authenticated using (public.is_centre_owner(centre_id) or public.is_super_admin());

create policy "Notifications: own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Notifications: mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Notifications: delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy "Farmers: centre members, self, admin" on public.farmers for select to authenticated
  using (public.is_centre_member(centre_id) or user_id = auth.uid() or public.is_super_admin());
create policy "Farmers: owner adds" on public.farmers for insert to authenticated with check (public.is_centre_owner(centre_id));
create policy "Farmers: owner edits" on public.farmers for update to authenticated using (public.is_centre_owner(centre_id)) with check (public.is_centre_owner(centre_id));

create policy "Rates: centre members and farmers" on public.rate_charts for select to authenticated
  using (public.is_centre_member(centre_id) or public.is_my_farmer_centre(centre_id) or public.is_super_admin());
create policy "Rate slabs: same as chart" on public.rate_slabs for select to authenticated
  using (exists (select 1 from public.rate_charts c where c.id = rate_chart_id and (public.is_centre_member(c.centre_id) or public.is_my_farmer_centre(c.centre_id) or public.is_super_admin())));

create policy "Inventory: owner or admin" on public.inventory_movements for select to authenticated using (public.is_centre_owner(centre_id) or public.is_super_admin());

create policy "Ledger: owner, own farmer, admin" on public.farmer_ledger for select to authenticated
  using (public.is_centre_owner(centre_id) or public.is_my_farmer(farmer_id) or public.is_super_admin());

create policy "Collections: members, own farmer, admin" on public.milk_collections for select to authenticated
  using (public.is_centre_member(centre_id) or public.is_my_farmer(farmer_id) or public.is_super_admin());
create policy "Collections: members record" on public.milk_collections for insert to authenticated with check (public.is_centre_member(centre_id));

create policy "Payments: owner, own farmer, admin" on public.farmer_payments for select to authenticated
  using (public.is_centre_owner(centre_id) or public.is_my_farmer(farmer_id) or public.is_super_admin());

create policy "Sales: owner or admin" on public.milk_sales for select to authenticated using (public.is_centre_owner(centre_id) or public.is_super_admin());
create policy "Sales: owner records" on public.milk_sales for insert to authenticated with check (public.is_centre_owner(centre_id));

create policy "Batches: owner or admin" on public.production_batches for select to authenticated using (public.is_centre_owner(centre_id) or public.is_super_admin());
create policy "Batches: owner records" on public.production_batches for insert to authenticated with check (public.is_centre_owner(centre_id));
create policy "Batches: owner updates" on public.production_batches for update to authenticated using (public.is_centre_owner(centre_id)) with check (public.is_centre_owner(centre_id));

create policy "Animals: centre members, own farmer, admin" on public.animals for select to authenticated
  using (public.is_centre_member(centre_id) or public.is_my_farmer(farmer_id) or public.is_super_admin());
create policy "Animals: owner or own farmer adds" on public.animals for insert to authenticated
  with check (public.is_centre_owner(centre_id) or public.is_my_farmer(farmer_id));
create policy "Animals: owner or own farmer edits" on public.animals for update to authenticated
  using (public.is_centre_owner(centre_id) or public.is_my_farmer(farmer_id)) with check (public.is_centre_owner(centre_id) or public.is_my_farmer(farmer_id));

create policy "Health: view" on public.animal_health_records for select to authenticated using (public.can_view_animal(animal_id));
create policy "Health: add" on public.animal_health_records for insert to authenticated with check (public.can_edit_animal(animal_id));
create policy "Health: edit" on public.animal_health_records for update to authenticated using (public.can_edit_animal(animal_id)) with check (public.can_edit_animal(animal_id));
create policy "Health: delete" on public.animal_health_records for delete to authenticated using (public.can_edit_animal(animal_id));
create policy "Vaccination: view" on public.vaccination_records for select to authenticated using (public.can_view_animal(animal_id));
create policy "Vaccination: add" on public.vaccination_records for insert to authenticated with check (public.can_edit_animal(animal_id));
create policy "Vaccination: edit" on public.vaccination_records for update to authenticated using (public.can_edit_animal(animal_id)) with check (public.can_edit_animal(animal_id));
create policy "Vaccination: delete" on public.vaccination_records for delete to authenticated using (public.can_edit_animal(animal_id));
create policy "Breeding: view" on public.breeding_records for select to authenticated using (public.can_view_animal(animal_id));
create policy "Breeding: add" on public.breeding_records for insert to authenticated with check (public.can_edit_animal(animal_id));
create policy "Breeding: edit" on public.breeding_records for update to authenticated using (public.can_edit_animal(animal_id)) with check (public.can_edit_animal(animal_id));
create policy "Breeding: delete" on public.breeding_records for delete to authenticated using (public.can_edit_animal(animal_id));

create policy "Expenses: view own scope" on public.farm_expenses for select to authenticated
  using ((centre_id is not null and public.is_centre_owner(centre_id)) or (farmer_id is not null and public.is_my_farmer(farmer_id)) or public.is_super_admin());
create policy "Expenses: add own scope" on public.farm_expenses for insert to authenticated
  with check ((centre_id is not null and public.is_centre_owner(centre_id)) or (farmer_id is not null and public.is_my_farmer(farmer_id)));
create policy "Expenses: edit own scope" on public.farm_expenses for update to authenticated
  using ((centre_id is not null and public.is_centre_owner(centre_id)) or (farmer_id is not null and public.is_my_farmer(farmer_id)))
  with check ((centre_id is not null and public.is_centre_owner(centre_id)) or (farmer_id is not null and public.is_my_farmer(farmer_id)));
create policy "Expenses: delete own scope" on public.farm_expenses for delete to authenticated
  using ((centre_id is not null and public.is_centre_owner(centre_id)) or (farmer_id is not null and public.is_my_farmer(farmer_id)));

create policy "Settings: signed-in read" on public.platform_settings for select to authenticated using (true);
create policy "Settings: admin insert" on public.platform_settings for insert to authenticated with check (public.is_super_admin());
create policy "Settings: admin update" on public.platform_settings for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- ===================== FUNCTION PRIVILEGES =====================
revoke execute on function public.next_centre_seq(uuid, text) from public, anon, authenticated;
revoke execute on function public.generate_centre_code() from public, anon, authenticated;
revoke execute on function public.write_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_centre_owners(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.compute_milk_rate(uuid, public.milk_type, date, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.do_cancel_collection(public.milk_collections, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.preview_milk_rate(uuid, public.milk_type, date, numeric, numeric) from public, anon;
revoke execute on function public.create_rate_chart(uuid, public.milk_type, text, numeric, numeric, numeric, numeric, numeric, numeric, date, text, jsonb) from public, anon;
revoke execute on function public.record_inventory_entry(uuid, public.milk_type, text, numeric, text, date) from public, anon;
revoke execute on function public.ledger_adjustment(uuid, numeric, text) from public, anon;
revoke execute on function public.cancel_collection(uuid, text) from public, anon;
revoke execute on function public.correct_collection(uuid, numeric, numeric, numeric, text, text) from public, anon;
revoke execute on function public.record_payment(uuid, numeric, text, text, text, text, date, text) from public, anon;
revoke execute on function public.reverse_payment(uuid, text) from public, anon;
revoke execute on function public.mark_sale_received(uuid) from public, anon;
revoke execute on function public.send_centre_announcement(uuid, text, text) from public, anon;
revoke execute on function public.set_centre_status(uuid, text) from public, anon;
revoke execute on function public.admin_platform_stats() from public, anon;
revoke execute on function public.admin_list_centres() from public, anon;
grant execute on function public.preview_milk_rate(uuid, public.milk_type, date, numeric, numeric) to authenticated;
grant execute on function public.create_rate_chart(uuid, public.milk_type, text, numeric, numeric, numeric, numeric, numeric, numeric, date, text, jsonb) to authenticated;
grant execute on function public.record_inventory_entry(uuid, public.milk_type, text, numeric, text, date) to authenticated;
grant execute on function public.ledger_adjustment(uuid, numeric, text) to authenticated;
grant execute on function public.cancel_collection(uuid, text) to authenticated;
grant execute on function public.correct_collection(uuid, numeric, numeric, numeric, text, text) to authenticated;
grant execute on function public.record_payment(uuid, numeric, text, text, text, text, date, text) to authenticated;
grant execute on function public.reverse_payment(uuid, text) to authenticated;
grant execute on function public.mark_sale_received(uuid) to authenticated;
grant execute on function public.send_centre_announcement(uuid, text, text) to authenticated;
grant execute on function public.set_centre_status(uuid, text) to authenticated;
grant execute on function public.admin_platform_stats() to authenticated;
grant execute on function public.admin_list_centres() to authenticated;
grant execute on function public.collection_daily_summary(uuid, date, date, uuid) to authenticated;
grant execute on function public.settlement_summary(uuid, date, date) to authenticated;
