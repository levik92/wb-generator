
-- Reset the test promo code "123" usage so user can test again
DELETE FROM promocode_uses WHERE promocode_id = '406ade82-4efb-4ade-aa31-c6ecb620bff1';
UPDATE promocodes SET current_uses = 0 WHERE id = '406ade82-4efb-4ade-aa31-c6ecb620bff1';
