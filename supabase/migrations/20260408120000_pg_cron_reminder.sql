-- Migration: pg_cron Job für tägliche Tag-vorher-Erinnerung
-- Läuft täglich um 16:00 UTC (= 18:00 MESZ / 17:00 MEZ)
--
-- Voraussetzungen (einmalig im SQL Editor ausführen, falls noch nicht geschehen):
--   ALTER DATABASE postgres SET "app.service_role_key" = 'dein-service-role-key';
--   (Service Role Key: Supabase Dashboard → Settings → API → service_role)
--
-- Ausserdem muss pg_net aktiviert sein:
--   Supabase Dashboard → Database → Extensions → pg_net aktivieren

SELECT cron.schedule(
  'eventflow-day-before-reminder',
  '0 16 * * *',
  $$
  SELECT
    net.http_post(
      url        := 'https://lvdezpdhjnbppphboxyd.supabase.co/functions/v1/send-notification-email',
      headers    := jsonb_build_object(
                      'Content-Type',  'application/json',
                      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                    ),
      body       := '{"type":"day_before_reminder"}'::jsonb
    ) AS request_id
  $$
);
