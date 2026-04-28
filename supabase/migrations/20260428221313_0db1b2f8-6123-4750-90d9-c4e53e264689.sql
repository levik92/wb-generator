-- 1. Helper function: rewrite supabase.co storage URLs to proxy
CREATE OR REPLACE FUNCTION public.rewrite_supabase_storage_url_to_proxy(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN url IS NULL THEN NULL
    WHEN url ~ 'https?://[a-z0-9-]+\.supabase\.co/storage/v1/'
      THEN regexp_replace(url, 'https?://[a-z0-9-]+\.supabase\.co', 'https://api.wbgen.ru')
    ELSE url
  END;
$$;

-- 2. Trigger function for generation_tasks.image_url
CREATE OR REPLACE FUNCTION public.proxy_generation_tasks_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.image_url := public.rewrite_supabase_storage_url_to_proxy(NEW.image_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proxy_generation_tasks_url ON public.generation_tasks;
CREATE TRIGGER trg_proxy_generation_tasks_url
BEFORE INSERT OR UPDATE OF image_url ON public.generation_tasks
FOR EACH ROW EXECUTE FUNCTION public.proxy_generation_tasks_url();

-- 3. Trigger function for generation_jobs.style_source_image_url
CREATE OR REPLACE FUNCTION public.proxy_generation_jobs_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.style_source_image_url := public.rewrite_supabase_storage_url_to_proxy(NEW.style_source_image_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proxy_generation_jobs_url ON public.generation_jobs;
CREATE TRIGGER trg_proxy_generation_jobs_url
BEFORE INSERT OR UPDATE OF style_source_image_url ON public.generation_jobs
FOR EACH ROW EXECUTE FUNCTION public.proxy_generation_jobs_url();

-- 4. Trigger function for video_generation_jobs (3 url columns)
CREATE OR REPLACE FUNCTION public.proxy_video_generation_jobs_urls()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.product_image_url := public.rewrite_supabase_storage_url_to_proxy(NEW.product_image_url);
  NEW.source_image_url  := public.rewrite_supabase_storage_url_to_proxy(NEW.source_image_url);
  NEW.result_video_url  := public.rewrite_supabase_storage_url_to_proxy(NEW.result_video_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proxy_video_generation_jobs_urls ON public.video_generation_jobs;
CREATE TRIGGER trg_proxy_video_generation_jobs_urls
BEFORE INSERT OR UPDATE ON public.video_generation_jobs
FOR EACH ROW EXECUTE FUNCTION public.proxy_video_generation_jobs_urls();

-- 5. One-time backfill of historical "broken" URLs
UPDATE public.generation_tasks
SET image_url = public.rewrite_supabase_storage_url_to_proxy(image_url)
WHERE image_url ~ 'https?://[a-z0-9-]+\.supabase\.co/storage/v1/';

UPDATE public.generation_jobs
SET style_source_image_url = public.rewrite_supabase_storage_url_to_proxy(style_source_image_url)
WHERE style_source_image_url ~ 'https?://[a-z0-9-]+\.supabase\.co/storage/v1/';

UPDATE public.video_generation_jobs
SET
  product_image_url = public.rewrite_supabase_storage_url_to_proxy(product_image_url),
  source_image_url  = public.rewrite_supabase_storage_url_to_proxy(source_image_url),
  result_video_url  = public.rewrite_supabase_storage_url_to_proxy(result_video_url)
WHERE
  product_image_url ~ 'https?://[a-z0-9-]+\.supabase\.co/storage/v1/'
  OR source_image_url ~ 'https?://[a-z0-9-]+\.supabase\.co/storage/v1/'
  OR result_video_url ~ 'https?://[a-z0-9-]+\.supabase\.co/storage/v1/';