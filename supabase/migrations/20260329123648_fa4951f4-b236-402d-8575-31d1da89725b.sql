
-- 1. token_transactions: INSERT only for service_role
DROP POLICY IF EXISTS "System can insert transactions" ON token_transactions;
CREATE POLICY "Service role can insert transactions"
  ON token_transactions FOR INSERT TO service_role
  WITH CHECK (true);

-- 2. referrals: INSERT only for service_role
DROP POLICY IF EXISTS "System can insert referrals" ON referrals;
CREATE POLICY "Service role can insert referrals"
  ON referrals FOR INSERT TO service_role
  WITH CHECK (true);

-- 3. referrals_completed: INSERT only for service_role
DROP POLICY IF EXISTS "System can insert completed referrals" ON referrals_completed;
CREATE POLICY "Service role can insert completed referrals"
  ON referrals_completed FOR INSERT TO service_role
  WITH CHECK (true);

-- 4. telegram_bot_subscribers: ALL only for service_role
DROP POLICY IF EXISTS "Service role can manage subscribers" ON telegram_bot_subscribers;
CREATE POLICY "Service role can manage subscribers"
  ON telegram_bot_subscribers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. admin_profile_access_rate_limit: ALL only for service_role
DROP POLICY IF EXISTS "System can manage rate limit records" ON admin_profile_access_rate_limit;
CREATE POLICY "Service role can manage rate limit records"
  ON admin_profile_access_rate_limit FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. profile_access_audit: INSERT only for service_role
DROP POLICY IF EXISTS "System can insert profile access audit" ON profile_access_audit;
CREATE POLICY "Service role can insert profile access audit"
  ON profile_access_audit FOR INSERT TO service_role
  WITH CHECK (true);
