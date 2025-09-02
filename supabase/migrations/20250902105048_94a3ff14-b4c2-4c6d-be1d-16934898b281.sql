-- Fix generations_generation_type_check constraint to allow 'product-cards' value
ALTER TABLE public.generations 
DROP CONSTRAINT IF EXISTS generations_generation_type_check;

ALTER TABLE public.generations 
ADD CONSTRAINT generations_generation_type_check 
CHECK (generation_type = ANY (ARRAY['description'::text, 'cards'::text, 'product-cards'::text]));