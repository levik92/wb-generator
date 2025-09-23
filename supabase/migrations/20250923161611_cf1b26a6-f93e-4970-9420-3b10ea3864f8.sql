-- Add allowed value 'bonus' to token_transactions.transaction_type check constraint
-- This fixes signup failures when inserting starter bonus transactions

ALTER TABLE public.token_transactions
DROP CONSTRAINT IF EXISTS token_transactions_transaction_type_check;

ALTER TABLE public.token_transactions
ADD CONSTRAINT token_transactions_transaction_type_check
CHECK (transaction_type IN (
  'purchase',          -- tokens purchased by user
  'generation',        -- tokens spent on AI generation
  'refund',            -- tokens refunded by system
  'promocode',         -- tokens added via promocode
  'referral_bonus',    -- tokens for referral events
  'bonus'              -- starter signup bonus (new)
));