-- Add edit prompts for both models
INSERT INTO public.ai_prompts (prompt_type, model_type, prompt_template)
VALUES 
('edit', 'openai', 'Отредактируй изображение товара {productName} согласно следующим требованиям: {editInstructions}. Сохрани общий стиль и композицию изображения, внеси только запрошенные изменения.'),
('edit', 'google', 'Отредактируй изображение товара {productName} согласно следующим требованиям: {editInstructions}. Сохрани общий стиль и композицию изображения, внеси только запрошенные изменения.')
ON CONFLICT (prompt_type, model_type) DO UPDATE 
SET prompt_template = EXCLUDED.prompt_template;