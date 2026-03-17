# Supabase evolution - payments, contracts, signatures and media

## 1. Run the migration

Execute the SQL file below in the Supabase SQL editor after your base schema:

- `supabase/migrations/20260312_phase2_payment_signature_media.sql`

## 2. Buckets created by the migration

- `space-media` -> public bucket for photos shown on the public site
- `contracts` -> private bucket for future HTML/PDF contract outputs

## 3. Edge Functions to deploy

Deploy these functions from your terminal:

```bash
supabase functions deploy create-payment-order
supabase functions deploy mercado-pago-webhook
supabase functions deploy generate-contract
supabase functions deploy create-reservation-addendum
supabase functions deploy register-signature
supabase functions deploy send-whatsapp-template
supabase functions deploy expire-reservations
```

## 4. Function secrets

Configure these secrets in Supabase:

```bash
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase secrets set APP_URL="https://YOUR_VERCEL_DOMAIN.vercel.app"
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN="YOUR_MP_ACCESS_TOKEN"
supabase secrets set WHATSAPP_ACCESS_TOKEN="YOUR_META_TOKEN"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="YOUR_PHONE_NUMBER_ID"
```

`WHATSAPP_*` are optional. If they are not defined, the system still stores a queued message inside `whatsapp_messages`.

## 5. Cron / expiration of temporary blocks

Option A: schedule the database function directly via SQL (already shown at the end of the migration).

Option B: schedule the Edge Function every 5 minutes.

## 6. Recommended rollout

1. Run migration
2. Deploy `create-payment-order`
3. Configure Mercado Pago webhook pointing to:
   - `https://YOUR_PROJECT.supabase.co/functions/v1/mercado-pago-webhook`
4. Deploy `generate-contract`, `create-reservation-addendum` and `register-signature`
5. Publish photos/videos in `Admin > Mídia`
6. Enable cron expiration
