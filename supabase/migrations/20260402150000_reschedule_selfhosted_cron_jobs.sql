-- Self-hosted cron endpoints must call the local API domain instead of the old hosted project URL.

SELECT cron.unschedule('cleanup-stale-jobs')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'cleanup-stale-jobs'
);

SELECT cron.schedule(
  'cleanup-stale-jobs',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.wbgen.ru/functions/v1/cleanup-stale-jobs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndWl5YWJwbmdqa2F2eW9zYnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjcwMDEsImV4cCI6MjA3MTcwMzAwMX0.RrDztNYkAy0-PMb4j4A9XG28hROv9PsMw9EyG8dFcco"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.unschedule('cleanup-stale-payments')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'cleanup-stale-payments'
);

SELECT cron.schedule(
  'cleanup-stale-payments',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.wbgen.ru/functions/v1/cleanup-stale-payments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndWl5YWJwbmdqa2F2eW9zYnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjcwMDEsImV4cCI6MjA3MTcwMzAwMX0.RrDztNYkAy0-PMb4j4A9XG28hROv9PsMw9EyG8dFcco"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

SELECT cron.unschedule('cleanup-idle-widget-chats')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'cleanup-idle-widget-chats'
);

SELECT cron.schedule(
  'cleanup-idle-widget-chats',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.wbgen.ru/functions/v1/cleanup-idle-widget-chats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndWl5YWJwbmdqa2F2eW9zYnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjcwMDEsImV4cCI6MjA3MTcwMzAwMX0.RrDztNYkAy0-PMb4j4A9XG28hROv9PsMw9EyG8dFcco"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
