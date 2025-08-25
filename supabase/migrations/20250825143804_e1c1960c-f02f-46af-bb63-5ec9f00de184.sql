-- Check current generation_type constraint and fix it if necessary
-- First, let's see what values are allowed and update the constraint

-- Drop the existing constraint if it exists
ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_generation_type_check;

-- Add updated constraint that allows both 'description' and 'cards'
ALTER TABLE public.generations ADD CONSTRAINT generations_generation_type_check 
CHECK (generation_type IN ('description', 'cards'));