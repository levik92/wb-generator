
-- Add max_uses_per_user column to promocodes
ALTER TABLE public.promocodes ADD COLUMN IF NOT EXISTS max_uses_per_user integer DEFAULT NULL;

-- Drop existing check constraint on type if exists, then add new one with tokens_instant
DO $$
BEGIN
  -- Try to drop any existing check constraint on type
  EXECUTE (
    SELECT 'ALTER TABLE public.promocodes DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'public.promocodes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add updated check constraint allowing 3 types
ALTER TABLE public.promocodes ADD CONSTRAINT promocodes_type_check
  CHECK (type IN ('tokens', 'discount', 'tokens_instant'));
