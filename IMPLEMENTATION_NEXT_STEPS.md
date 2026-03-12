# 3DReservas - next implementation steps

## 1. Database

Run the base SQL you already have, then run:

- `supabase/migrations/20260312_phase2_payment_signature_media.sql`

This adds:

- `payment_orders`
- `payment_events`
- `secure_links`
- `signatures`
- `whatsapp_messages`
- `space_media`
- public lookup RPC for secure links
- automatic expiration database function

## 2. Web frontend

New routes already included:

- `/espaco`
- `/galeria`
- `/como-funciona`
- `/proposta/:token`
- `/contrato/:token`
- `/admin/midia`

## 3. Required Vercel env vars

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
```

## 4. Required Supabase secrets

```bash
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase secrets set APP_URL="https://YOUR_VERCEL_DOMAIN.vercel.app"
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN="YOUR_MP_ACCESS_TOKEN"
```

Optional WhatsApp:

```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN="YOUR_META_TOKEN"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="YOUR_PHONE_NUMBER_ID"
```

## 5. Functions to deploy

```bash
supabase functions deploy create-payment-order
supabase functions deploy mercado-pago-webhook
supabase functions deploy generate-contract
supabase functions deploy register-signature
supabase functions deploy send-whatsapp-template
supabase functions deploy expire-reservations
```

## 6. Mercado Pago webhook

Configure the notification URL in Mercado Pago with:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/mercado-pago-webhook
```

## 7. Automatic expiration

Use one of these:

- SQL job calling `public.expire_open_reservations()` every 5 minutes
- schedule the `expire-reservations` Edge Function every 5 minutes

## 8. Recommended go-live order

1. migration
2. storage buckets
3. frontend env vars
4. deploy functions
5. Mercado Pago webhook
6. admin -> mídia
7. admin -> reservas -> gerar checkout
8. client flow -> proposta -> pagamento -> contrato -> assinatura
