-- Fix 5 stuck video generation jobs
UPDATE video_generation_jobs 
SET status = 'failed', 
    error_message = 'Таймаут генерации (очистка)', 
    updated_at = now() 
WHERE status = 'processing' 
  AND created_at < now() - interval '1 hour';

-- Refund 50 tokens to the affected user
SELECT refund_tokens('000a02ee-4e08-4c4c-8c88-f2cd59833a2b'::uuid, 50, 'Возврат за 5 зависших видеогенераций (очистка)');

-- Send notification
INSERT INTO notifications (user_id, type, title, message)
VALUES (
  '000a02ee-4e08-4c4c-8c88-f2cd59833a2b',
  'info',
  'Возврат токенов',
  'Обнаружены 5 зависших видеогенераций. 50 токенов возвращены на ваш баланс.'
);