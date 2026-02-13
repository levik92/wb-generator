
INSERT INTO public.generation_pricing (price_type, tokens_cost, description)
VALUES ('video_generation', 10, 'Генерация видеообложки')
ON CONFLICT DO NOTHING;
