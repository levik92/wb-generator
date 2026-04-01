SELECT cron.schedule(
  'cleanup-idle-widget-chats',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xguiyabpngjkavyosbza.supabase.co/functions/v1/cleanup-idle-widget-chats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndWl5YWJwbmdqa2F2eW9zYnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjcwMDEsImV4cCI6MjA3MTcwMzAwMX0.RrDztNYkAy0-PMb4j4A9XG28hROv9PsMw9EyG8dFcco"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);