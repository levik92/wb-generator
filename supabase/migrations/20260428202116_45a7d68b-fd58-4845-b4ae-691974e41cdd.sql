-- Replace direct supabase.co storage URLs with the regional proxy api.wbgen.ru
-- so that already-stored references load for users in restricted regions.

UPDATE public.generation_tasks
SET image_url = REPLACE(image_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE image_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';

UPDATE public.generation_jobs
SET style_source_image_url = REPLACE(style_source_image_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE style_source_image_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';

UPDATE public.blog_posts
SET image_url = REPLACE(image_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE image_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';

UPDATE public.service_friends
SET logo_url = REPLACE(logo_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE logo_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';

UPDATE public.support_messages
SET attachment_url = REPLACE(attachment_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE attachment_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';

UPDATE public.video_generation_jobs
SET product_image_url = REPLACE(product_image_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE product_image_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';

UPDATE public.video_generation_jobs
SET source_image_url = REPLACE(source_image_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE source_image_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';

UPDATE public.video_generation_jobs
SET result_video_url = REPLACE(result_video_url, 'https://xguiyabpngjkavyosbza.supabase.co/storage/', 'https://api.wbgen.ru/storage/')
WHERE result_video_url LIKE 'https://xguiyabpngjkavyosbza.supabase.co/storage/%';