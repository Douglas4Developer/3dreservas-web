alter table public.payment_orders
  add column if not exists checkout_type text check (checkout_type in ('all', 'pix', 'card')) default 'all',
  add column if not exists provider_payment_id text,
  add column if not exists qr_code_base64 text;

alter table public.payments
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null,
  add column if not exists confirmation_notes text,
  add column if not exists payment_method_label text,
  add column if not exists payment_method_type text,
  add column if not exists payment_method_id text;

alter table public.reservations
  add column if not exists customer_document text,
  add column if not exists customer_address text,
  add column if not exists event_type text,
  add column if not exists remaining_amount numeric(10,2),
  add column if not exists cleaning_fee numeric(10,2) default 100,
  add column if not exists image_use_authorized boolean default true,
  add column if not exists venue_address_snapshot text default 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
  add column if not exists capacity_snapshot integer default 100;

alter table public.contracts
  add column if not exists lessor_name text default 'Douglas Soares de Souza Ferreira',
  add column if not exists lessor_document text default '708.321.121-35',
  add column if not exists lessor_address text default 'Estrada 114 QD3 LT 13, Chácara São Joaquim, Goiânia - GO',
  add column if not exists forum_city text default 'Goiânia - GO',
  add column if not exists contract_terms_json jsonb default '{}'::jsonb;

create index if not exists payments_reservation_status_idx on public.payments(reservation_id, status);
create index if not exists payment_orders_checkout_type_idx on public.payment_orders(reservation_id, checkout_type, status);

comment on column public.payment_orders.qr_code_base64 is 'QR Code Pix em base64 retornado pelo Mercado Pago';
comment on column public.reservations.customer_document is 'CPF ou documento do locatário';
comment on column public.reservations.customer_address is 'Endereço do locatário no momento da contratação';
comment on column public.reservations.event_type is 'Tipo de evento como aniversário, confraternização ou retiro';
