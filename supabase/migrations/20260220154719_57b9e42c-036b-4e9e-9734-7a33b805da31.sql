
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
BEGIN
    -- Срабатываем только когда статус меняется на 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Проверяем, есть ли sourceGenerationId в description для edit jobs
        IF NEW.category = 'edit' THEN
            -- Extract sourceGenerationId from description pattern [sourceGenerationId:UUID]
            BEGIN
                v_source_generation_id := (regexp_match(NEW.description, '\[sourceGenerationId:([0-9a-f\-]+)\]'))[1]::uuid;
            EXCEPTION WHEN OTHERS THEN
                v_source_generation_id := NULL;
            END;
            
            IF v_source_generation_id IS NOT NULL THEN
                -- Check if source generation exists
                SELECT EXISTS(
                    SELECT 1 FROM public.generations WHERE id = v_source_generation_id AND user_id = NEW.user_id
                ) INTO v_source_exists;
                
                IF v_source_exists THEN
                    -- Get completed task data (should be single image for edit)
                    SELECT jsonb_build_object(
                        'index', card_index,
                        'type', card_type,
                        'image_url', image_url,
                        'storage_path', storage_path,
                        'is_edited', true
                    )
                    INTO v_new_image
                    FROM public.generation_tasks
                    WHERE job_id = NEW.id 
                    AND status = 'completed' 
                    AND image_url IS NOT NULL
                    ORDER BY card_index
                    LIMIT 1;
                    
                    IF v_new_image IS NOT NULL THEN
                        -- UPDATE existing generation: append image and add tokens
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
                        
                        RAISE LOG 'Appended edited image to generation % for job %', v_source_generation_id, NEW.id;
                        
                        -- Create notification
                        INSERT INTO public.notifications (user_id, title, message, type, read)
                        VALUES (
                            NEW.user_id,
                            'Редактирование завершено',
                            'Отредактированное изображение добавлено в карточку "' || NEW.product_name || '"',
                            'success',
                            false
                        );
                        
                        RETURN NEW;
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- Default behavior: create new generation record (original logic)
        -- Проверяем, есть ли уже запись в истории для этой генерации
        SELECT EXISTS(
            SELECT 1 FROM public.generations 
            WHERE user_id = NEW.user_id 
            AND generation_type = 'cards'
            AND (input_data->>'job_id')::uuid = NEW.id
        ) INTO generation_exists;
        
        -- Если записи нет - создаем
        IF NOT generation_exists THEN
            
            -- Собираем данные о завершенных задачах
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
            
            -- Вставляем запись в историю
            INSERT INTO public.generations (
                user_id,
                generation_type,
                status,
                input_data,
                output_data,
                tokens_used,
                product_name,
                category,
                created_at,
                updated_at
            ) VALUES (
                NEW.user_id,
                'cards',
                'completed',
                jsonb_build_object(
                    'job_id', NEW.id,
                    'productName', NEW.product_name,
                    'category', NEW.category,
                    'description', NEW.description
                ),
                jsonb_build_object(
                    'images', COALESCE(completed_tasks_data, '[]'::jsonb)
                ),
                COALESCE(NEW.tokens_cost, 0),
                NEW.product_name,
                NEW.category,
                NEW.created_at,
                NOW()
            );
            
            RAISE LOG 'Auto-saved generation to history for job %', NEW.id;
        ELSE
            RAISE LOG 'Generation already exists in history for job %', NEW.id;
        END IF;
        
        -- Создаем уведомление о завершении
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
