
-- Add source_job_id column to track style generation chain
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS source_job_id uuid REFERENCES public.generation_jobs(id);

-- Update the trigger to handle style generation jobs
CREATE OR REPLACE FUNCTION public.save_completed_generation_to_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    generation_exists BOOLEAN;
    completed_tasks_data JSONB;
    v_source_generation_id UUID;
    v_source_exists BOOLEAN;
    v_new_image JSONB;
    v_root_job_id UUID;
    v_parent_job_id UUID;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Handle edit/regeneration jobs (append single image to source generation)
        IF NEW.category IN ('edit', 'regeneration') THEN
            BEGIN
                v_source_generation_id := (regexp_match(NEW.description, '\[sourceGenerationId:([0-9a-f\-]+)\]'))[1]::uuid;
            EXCEPTION WHEN OTHERS THEN
                v_source_generation_id := NULL;
            END;
            
            IF v_source_generation_id IS NOT NULL THEN
                SELECT EXISTS(
                    SELECT 1 FROM public.generations WHERE id = v_source_generation_id AND user_id = NEW.user_id
                ) INTO v_source_exists;
                
                IF v_source_exists THEN
                    SELECT jsonb_build_object(
                        'index', card_index,
                        'type', card_type,
                        'image_url', image_url,
                        'storage_path', storage_path,
                        'is_edited', CASE WHEN NEW.category = 'edit' THEN true ELSE false END,
                        'is_regenerated', CASE WHEN NEW.category = 'regeneration' THEN true ELSE false END
                    )
                    INTO v_new_image
                    FROM public.generation_tasks
                    WHERE job_id = NEW.id 
                    AND status = 'completed' 
                    AND image_url IS NOT NULL
                    ORDER BY card_index
                    LIMIT 1;
                    
                    IF v_new_image IS NOT NULL THEN
                        UPDATE public.generations
                        SET 
                            output_data = jsonb_set(
                                COALESCE(output_data, '{"images":[]}'::jsonb),
                                '{images}',
                                COALESCE(output_data->'images', '[]'::jsonb) || jsonb_build_array(v_new_image)
                            ),
                            tokens_used = tokens_used + COALESCE(NEW.tokens_cost, 0),
                            updated_at = NOW()
                        WHERE id = v_source_generation_id;
                        
                        RAISE LOG 'Appended % image to generation % for job %', NEW.category, v_source_generation_id, NEW.id;
                        
                        INSERT INTO public.notifications (user_id, title, message, type, read)
                        VALUES (
                            NEW.user_id,
                            CASE WHEN NEW.category = 'edit' THEN 'Редактирование завершено' ELSE 'Перегенерация завершена' END,
                            CASE WHEN NEW.category = 'edit' 
                                THEN 'Отредактированное изображение добавлено в карточку "' || NEW.product_name || '"'
                                ELSE 'Перегенерированное изображение добавлено в карточку "' || NEW.product_name || '"'
                            END,
                            'success',
                            false
                        );
                        
                        RETURN NEW;
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- Handle style generation jobs (source_job_id is set, append multiple images)
        IF NEW.source_job_id IS NOT NULL THEN
            -- Follow chain to find root job
            v_root_job_id := NEW.source_job_id;
            LOOP
                SELECT source_job_id INTO v_parent_job_id
                FROM public.generation_jobs
                WHERE id = v_root_job_id;
                
                IF v_parent_job_id IS NULL THEN
                    EXIT;
                END IF;
                v_root_job_id := v_parent_job_id;
            END LOOP;
            
            -- Find generation record for root job
            SELECT id INTO v_source_generation_id
            FROM public.generations
            WHERE user_id = NEW.user_id
            AND generation_type = 'cards'
            AND (input_data->>'job_id')::uuid = v_root_job_id
            LIMIT 1;
            
            IF v_source_generation_id IS NOT NULL THEN
                -- Get all completed tasks from this style job
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'index', card_index,
                        'type', card_type,
                        'image_url', image_url,
                        'storage_path', storage_path,
                        'is_styled', true,
                        'style_job_id', NEW.id
                    ) ORDER BY card_index
                )
                INTO completed_tasks_data
                FROM public.generation_tasks
                WHERE job_id = NEW.id
                AND status = 'completed'
                AND image_url IS NOT NULL;
                
                IF completed_tasks_data IS NOT NULL THEN
                    UPDATE public.generations
                    SET output_data = jsonb_set(
                        COALESCE(output_data, '{"images":[]}'::jsonb),
                        '{images}',
                        COALESCE(output_data->'images', '[]'::jsonb) || completed_tasks_data
                    ),
                    tokens_used = tokens_used + COALESCE(NEW.tokens_cost, 0),
                    updated_at = NOW()
                    WHERE id = v_source_generation_id;
                    
                    RAISE LOG 'Appended style images to generation % for style job %', v_source_generation_id, NEW.id;
                    
                    INSERT INTO public.notifications (user_id, title, message, type, read)
                    VALUES (
                        NEW.user_id,
                        'Стилизация завершена',
                        'Карточки в стиле "' || NEW.product_name || '" готовы',
                        'success',
                        false
                    );
                    
                    RETURN NEW;
                END IF;
            END IF;
        END IF;
        
        -- Default behavior: create new generation record
        SELECT EXISTS(
            SELECT 1 FROM public.generations 
            WHERE user_id = NEW.user_id 
            AND generation_type = 'cards'
            AND (input_data->>'job_id')::uuid = NEW.id
        ) INTO generation_exists;
        
        IF NOT generation_exists THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'index', card_index,
                    'type', card_type,
                    'image_url', image_url,
                    'storage_path', storage_path
                ) ORDER BY card_index
            )
            INTO completed_tasks_data
            FROM public.generation_tasks
            WHERE job_id = NEW.id 
            AND status = 'completed' 
            AND image_url IS NOT NULL;
            
            INSERT INTO public.generations (
                user_id, generation_type, status, input_data, output_data,
                tokens_used, product_name, category, created_at, updated_at
            ) VALUES (
                NEW.user_id, 'cards', 'completed',
                jsonb_build_object(
                    'job_id', NEW.id,
                    'productName', NEW.product_name,
                    'category', NEW.category,
                    'description', NEW.description
                ),
                jsonb_build_object('images', COALESCE(completed_tasks_data, '[]'::jsonb)),
                COALESCE(NEW.tokens_cost, 0),
                NEW.product_name, NEW.category, NEW.created_at, NOW()
            );
            
            RAISE LOG 'Auto-saved generation to history for job %', NEW.id;
        ELSE
            RAISE LOG 'Generation already exists in history for job %', NEW.id;
        END IF;
        
        INSERT INTO public.notifications (user_id, title, message, type, read)
        VALUES (
            NEW.user_id,
            'Генерация завершена',
            'Карточки для "' || NEW.product_name || '" готовы',
            'success',
            false
        );
    END IF;
    
    RETURN NEW;
END;
$function$;
