-- Exemplo para agendar a expiração automática a cada 5 minutos.
-- Ajuste SEU_PROJECT_REF e SUA_ANON_KEY antes de executar.

select cron.schedule(
  'expire-reservations-every-5-minutes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/expire-reservations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
