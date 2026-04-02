
CREATE OR REPLACE FUNCTION public.cleanup_old_generations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  _path text;
  _job_id uuid;
  _product_images jsonb;
  _img jsonb;
  _img_url text;
  _match text[];
BEGIN
  -- Step 1: Delete generated card files from 'generated-cards' bucket
  FOR _path IN
    SELECT gt.storage_path
    FROM generation_tasks gt
    JOIN generation_jobs gj ON gj.id = gt.job_id
    WHERE gj.created_at < now() - interval '1 month'
      AND gt.storage_path IS NOT NULL
  LOOP
    BEGIN
      PERFORM storage.delete_object('generated-cards', _path);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to delete generated-cards/%: %', _path, SQLERRM;
    END;
  END LOOP;

  -- Step 2: Delete product image files from 'product-images' bucket
  FOR _job_id, _product_images IN
    SELECT gj.id, gj.product_images
    FROM generation_jobs gj
    WHERE gj.created_at < now() - interval '1 month'
      AND gj.product_images IS NOT NULL
      AND gj.product_images != '[]'::jsonb
  LOOP
    FOR _img IN SELECT * FROM jsonb_array_elements(_product_images)
    LOOP
      _img_url := _img ->> 'storage_path';
      IF _img_url IS NULL THEN
        _img_url := _img ->> 'url';
      END IF;
      IF _img_url IS NOT NULL AND _img_url LIKE '%product-images/%' THEN
        _img_url := substring(_img_url FROM 'product-images/(.+)$');
        IF _img_url IS NOT NULL THEN
          BEGIN
            PERFORM storage.delete_object('product-images', _img_url);
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to delete product-images/%: %', _img_url, SQLERRM;
          END;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Step 3: Delete DB records (existing logic)
  DELETE FROM generation_tasks
  WHERE job_id IN (
    SELECT id FROM generation_jobs
    WHERE created_at < now() - interval '1 month'
  );

  DELETE FROM generation_jobs
  WHERE created_at < now() - interval '1 month';

  DELETE FROM generations
  WHERE created_at < now() - interval '1 month';

  DELETE FROM video_generation_jobs
  WHERE created_at < now() - interval '1 month';
END;
$$;
