-- Add photo_edit pricing type
INSERT INTO public.generation_pricing (price_type, tokens_cost, description)
VALUES ('photo_edit', 2, 'Стоимость редактирования карточки')
ON CONFLICT (price_type) DO NOTHING;