-- Phase 2 / 3DReservas evolution
-- Execute after the base schema already created in your project.

create extension if not exists pgcrypto;

DO $$
BEGIN
  ALTER TYPE public.contract_status ADD VALUE 'aguardando_geracao';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE public.payment_order_status AS ENUM ('pending', 'paid', 'expired', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE public.secure_link_type AS ENUM ('proposal', 'contract_view', 'contract_sign', 'status', 'payment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE public.signer_role AS ENUM ('client', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE public.whatsapp_message_status AS ENUM ('queued', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE public.space_media_type AS ENUM ('image', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

alter table public.contracts
  add column if not exists template_key text default 'default_v1',
  add column if not exists html_content text,
  add column if not exists generated_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists final_file_path text,
  add column if not exists document_hash text;

create or replace function public.generate_secure_token()
returns text
language sql
as $$
  select replace(gen_random_uuid()::text, '-', '');
$$;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  provider text not null default 'mercado_pago',
  provider_external_id text,
  checkout_url text,
  pix_qr_code text,
  pix_copy_paste text,
  amount numeric(10,2) not null check (amount >= 0),
  status public.payment_order_status not null default 'pending',
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_orders_one_active_pending_per_reservation
  on public.payment_orders(reservation_id)
  where status = 'pending';

create index if not exists payment_orders_status_expires_at_idx
  on public.payment_orders(status, expires_at);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  provider text not null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  success boolean not null default false
);

create table if not exists public.secure_links (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  type public.secure_link_type not null,
  token text not null unique default public.generate_secure_token(),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists secure_links_lookup_idx
  on public.secure_links(token, type, expires_at);

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  signer_role public.signer_role not null,
  signer_name text not null,
  signer_document text,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  evidence_json jsonb not null default '{}'::jsonb,
  document_hash text,
  created_at timestamptz not null default now(),
  unique(contract_id, signer_role)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  template_name text not null,
  phone text not null,
  message_body text not null,
  status public.whatsapp_message_status not null default 'queued',
  provider_message_id text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.space_media (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  type public.space_media_type not null,
  title text not null,
  description text,
  storage_path text,
  external_url text,
  thumbnail_path text,
  display_order integer not null default 0,
  active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create index if not exists space_media_space_order_idx
  on public.space_media(space_id, display_order, active);

alter table public.status_history drop constraint if exists status_history_entity_type_check;
alter table public.status_history add constraint status_history_entity_type_check
  check (entity_type in ('lead', 'reservation', 'payment', 'contract', 'payment_order'));

create or replace function public.log_status_history()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.status_history (entity_type, entity_id, previous_status, new_status, changed_by, reason)
    values (TG_ARGV[0], new.id, null, new.status::text, auth.uid(), 'insert');
  elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
    insert into public.status_history (entity_type, entity_id, previous_status, new_status, changed_by, reason)
    values (TG_ARGV[0], new.id, old.status::text, new.status::text, auth.uid(), 'status_change');
  end if;
  return new;
end;
$$;

create trigger trg_payment_orders_updated_at
before update on public.payment_orders
for each row execute function public.set_updated_at();

create trigger trg_space_media_updated_at
before update on public.space_media
for each row execute function public.set_updated_at();

drop trigger if exists trg_leads_status_history on public.leads;
create trigger trg_leads_status_history
after insert or update on public.leads
for each row execute function public.log_status_history('lead');

drop trigger if exists trg_reservations_status_history on public.reservations;
create trigger trg_reservations_status_history
after insert or update on public.reservations
for each row execute function public.log_status_history('reservation');

drop trigger if exists trg_payments_status_history on public.payments;
create trigger trg_payments_status_history
after insert or update on public.payments
for each row execute function public.log_status_history('payment');

drop trigger if exists trg_contracts_status_history on public.contracts;
create trigger trg_contracts_status_history
after insert or update on public.contracts
for each row execute function public.log_status_history('contract');

drop trigger if exists trg_payment_orders_status_history on public.payment_orders;
create trigger trg_payment_orders_status_history
after insert or update on public.payment_orders
for each row execute function public.log_status_history('payment_order');

create or replace function public.get_public_reservation_lookup(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_link_type text;
  v_contract public.contracts;
begin
  select r.*, 'public_token'::text
    into v_reservation, v_link_type
  from public.reservations r
  where r.public_link_token::text = p_token
  limit 1;

  if v_reservation.id is null then
    select r.*, sl.type::text
      into v_reservation, v_link_type
    from public.secure_links sl
    inner join public.reservations r on r.id = sl.reservation_id
    where sl.token = p_token
      and sl.revoked_at is null
      and sl.expires_at > now()
    order by sl.created_at desc
    limit 1;
  end if;

  if v_reservation.id is null then
    return null;
  end if;

  select *
    into v_contract
  from public.contracts c
  where c.reservation_id = v_reservation.id
  order by c.version desc, c.created_at desc
  limit 1;

  return jsonb_build_object(
    'link_type', v_link_type,
    'reservation', to_jsonb(v_reservation),
    'payments', coalesce(
      (
        select jsonb_agg(to_jsonb(p) order by p.created_at desc)
        from public.payments p
        where p.reservation_id = v_reservation.id
      ),
      '[]'::jsonb
    ),
    'paymentOrders', coalesce(
      (
        select jsonb_agg(to_jsonb(po) order by po.created_at desc)
        from public.payment_orders po
        where po.reservation_id = v_reservation.id
      ),
      '[]'::jsonb
    ),
    'activePaymentOrder', (
      select to_jsonb(po)
      from public.payment_orders po
      where po.reservation_id = v_reservation.id
        and po.status = 'pending'
        and po.expires_at > now()
      order by po.created_at desc
      limit 1
    ),
    'contract', case when v_contract.id is null then null else to_jsonb(v_contract) end,
    'signatures', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.signed_at asc)
        from public.signatures s
        where v_contract.id is not null and s.contract_id = v_contract.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.get_public_reservation_lookup(text) to anon, authenticated;

create or replace function public.expire_open_reservations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_count integer := 0;
begin
  select array_agg(id)
    into v_ids
  from public.reservations
  where status in ('bloqueio_temporario', 'aguardando_pagamento')
    and expires_at is not null
    and expires_at <= now();

  if v_ids is null or array_length(v_ids, 1) is null then
    return jsonb_build_object('expired_reservations', 0);
  end if;

  update public.payment_orders
     set status = 'expired',
         updated_at = now()
   where reservation_id = any(v_ids)
     and status = 'pending';

  update public.payments
     set status = 'falhou',
         updated_at = now()
   where reservation_id = any(v_ids)
     and status = 'pendente';

  update public.reservations
     set status = 'cancelado',
         expires_at = null,
         updated_at = now()
   where id = any(v_ids);

  get diagnostics v_count = row_count;
  return jsonb_build_object('expired_reservations', v_count);
end;
$$;

grant execute on function public.expire_open_reservations() to authenticated;

alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.secure_links enable row level security;
alter table public.signatures enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.space_media enable row level security;

create policy "authenticated can manage payment_orders"
on public.payment_orders
for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage payment_events"
on public.payment_events
for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage secure_links"
on public.secure_links
for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage signatures"
on public.signatures
for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage whatsapp_messages"
on public.whatsapp_messages
for all
to authenticated
using (true)
with check (true);

create policy "public can read active space media"
on public.space_media
for select
to anon, authenticated
using (active = true);

create policy "authenticated can manage space media"
on public.space_media
for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('space-media', 'space-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

create policy "public can read space-media bucket objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'space-media');

create policy "authenticated can upload space-media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'space-media');

create policy "authenticated can update space-media"
on storage.objects
for update
to authenticated
using (bucket_id = 'space-media')
with check (bucket_id = 'space-media');

create policy "authenticated can delete space-media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'space-media');

create policy "authenticated can manage contracts bucket"
on storage.objects
for all
to authenticated
using (bucket_id = 'contracts')
with check (bucket_id = 'contracts');

-- Schedule example (Supabase SQL editor / pg_cron enabled)
-- select cron.schedule(
--   'expire-3dreservas-blocks-every-5-minutes',
--   '*/5 * * * *',
--   $$select public.expire_open_reservations();$$
-- );
