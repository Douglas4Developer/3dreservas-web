-- ========================================
-- DROP FUNCTIONS (OBRIGATÓRIO)
-- ========================================
drop function if exists public.get_public_calendar(text, date, date);
drop function if exists public.get_public_reservation_lookup(text);

-- ========================================
-- ALTER TABLE RESERVATIONS
-- ========================================
alter table public.reservations
  add column if not exists end_date date,
  add column if not exists days_count integer,
  add column if not exists daily_rate numeric(10,2);

-- ========================================
-- NORMALIZAÇÃO DOS DADOS
-- ========================================
update public.reservations
   set end_date = coalesce(end_date, event_date)
 where end_date is null;

update public.reservations
   set days_count = greatest((coalesce(end_date, event_date) - event_date) + 1, 1)
 where days_count is null;

-- ========================================
-- TABELA DE ADITIVOS
-- ========================================
create table if not exists public.reservation_addendums (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  addendum_number integer not null,
  previous_end_date date not null,
  new_end_date date not null,
  extra_days integer not null check (extra_days > 0),
  amount_per_day numeric(10,2),
  extra_amount numeric(10,2) not null check (extra_amount >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reservation_id, addendum_number)
);

create index if not exists reservation_addendums_reservation_idx
  on public.reservation_addendums(reservation_id, created_at desc);

-- ========================================
-- TRIGGER UPDATED_AT (SE NÃO EXISTIR)
-- ========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reservation_addendums_updated_at on public.reservation_addendums;

create trigger trg_reservation_addendums_updated_at
before update on public.reservation_addendums
for each row execute function public.set_updated_at();

-- ========================================
-- RLS
-- ========================================
alter table public.reservation_addendums enable row level security;

drop policy if exists "authenticated can manage reservation_addendums" on public.reservation_addendums;

create policy "authenticated can manage reservation_addendums"
on public.reservation_addendums
for all
to authenticated
using (true)
with check (true);

-- ========================================
-- CALENDÁRIO (MULTI-DIA)
-- ========================================
create function public.get_public_calendar(
  p_space_slug text,
  p_from date,
  p_to date
)
returns table(event_date date, status public.reservation_status)
language sql
security definer
set search_path = public
as $$
  with selected_space as (
    select id 
    from public.spaces 
    where slug = coalesce(p_space_slug, '3deventos') 
    limit 1
  )
  select 
    gs::date as event_date, 
    r.status
  from public.reservations r
  join selected_space s on s.id = r.space_id
  join lateral generate_series(
    r.event_date, 
    coalesce(r.end_date, r.event_date), 
    interval '1 day'
  ) gs on true
  where gs::date between p_from and p_to
    and r.status in ('bloqueio_temporario', 'aguardando_pagamento', 'reservado')
  order by gs::date;
$$;

grant execute on function public.get_public_calendar(text, date, date) to anon, authenticated;

-- ========================================
-- LOOKUP PÚBLICO (CORRIGIDO)
-- ========================================
create function public.get_public_reservation_lookup(p_token text)
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

  -- 🔹 busca pelo token público
  select r.*
  into v_reservation
  from public.reservations r
  where r.public_link_token::text = p_token
  limit 1;

  if v_reservation.id is not null then
    v_link_type := 'public_token';
  end if;

  -- 🔹 busca por secure link (se não achou acima)
  if v_reservation.id is null then
    select r.*
    into v_reservation
    from public.secure_links sl
    inner join public.reservations r on r.id = sl.reservation_id
    where sl.token = p_token
      and sl.revoked_at is null
      and sl.expires_at > now()
    order by sl.created_at desc
    limit 1;

    if v_reservation.id is not null then
      select sl.type::text
      into v_link_type
      from public.secure_links sl
      where sl.token = p_token
      limit 1;
    end if;
  end if;

  -- 🔹 se não encontrou nada
  if v_reservation.id is null then
    return null;
  end if;

  -- 🔹 contrato mais recente
  select *
  into v_contract
  from public.contracts c
  where c.reservation_id = v_reservation.id
  order by c.version desc, c.created_at desc
  limit 1;

  -- 🔹 retorno final
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

    'contract', case 
      when v_contract.id is null then null 
      else to_jsonb(v_contract) 
    end,

    'signatures', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.signed_at asc)
        from public.signatures s
        where v_contract.id is not null 
          and s.contract_id = v_contract.id
      ),
      '[]'::jsonb
    ),

    'addendums', coalesce(
      (
        select jsonb_agg(to_jsonb(a) order by a.created_at desc)
        from public.reservation_addendums a
        where a.reservation_id = v_reservation.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.get_public_reservation_lookup(text) to anon, authenticated;