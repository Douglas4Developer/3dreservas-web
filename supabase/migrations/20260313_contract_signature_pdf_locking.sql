-- Contrato com assinatura desenhada, PDF automático e travamento da agenda após assinatura.

update storage.buckets
set public = true
where id = 'contracts';

drop policy if exists "public can read contracts bucket objects" on storage.objects;
create policy "public can read contracts bucket objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'contracts');

create or replace function public.prevent_reservation_schedule_change_when_contract_has_signature()
returns trigger
language plpgsql
as $$
begin
  if (new.event_date is distinct from old.event_date)
     or (new.period_start is distinct from old.period_start)
     or (new.period_end is distinct from old.period_end) then

    if exists (
      select 1
      from public.contracts c
      inner join public.signatures s on s.contract_id = c.id
      where c.reservation_id = new.id
    ) then
      raise exception 'A data e os horários desta reserva estão bloqueados porque o contrato já possui assinatura registrada.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservations_lock_schedule_after_signature on public.reservations;
create trigger trg_reservations_lock_schedule_after_signature
before update on public.reservations
for each row
execute function public.prevent_reservation_schedule_change_when_contract_has_signature();
