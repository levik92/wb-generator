ALTER TABLE public.ai_prompts DROP CONSTRAINT ai_prompts_model_type_check;
ALTER TABLE public.ai_prompts ADD CONSTRAINT ai_prompts_model_type_check CHECK (model_type = ANY (ARRAY['openai'::text, 'google'::text, 'kling'::text, 'technical'::text]));

INSERT INTO public.ai_prompts (prompt_type, prompt_template, model_type)
SELECT 'identify-product', 'Определи товар на изображении. Верни только наименование товара на русском языке длиной до 120 символов с учетом пробелов. Без описания, без кавычек, без точки в конце.', 'technical'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_prompts WHERE prompt_type = 'identify-product');