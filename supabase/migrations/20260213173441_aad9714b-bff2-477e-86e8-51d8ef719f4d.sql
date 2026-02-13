
-- Update check constraint to allow 'kling' model type
ALTER TABLE public.ai_prompts DROP CONSTRAINT ai_prompts_model_type_check;
ALTER TABLE public.ai_prompts ADD CONSTRAINT ai_prompts_model_type_check CHECK (model_type = ANY (ARRAY['openai'::text, 'google'::text, 'kling'::text]));

-- Insert default video cover prompt
INSERT INTO public.ai_prompts (prompt_type, model_type, prompt_template)
VALUES ('video_cover', 'kling', 'A smooth, cinematic product showcase animation. The product gently rotates or the camera slowly orbits around it, with subtle lighting changes creating depth and dimension. Clean, professional studio background with soft gradient lighting. Minimal movement, elegant presentation suitable for e-commerce product listing. No text, no watermarks.');
