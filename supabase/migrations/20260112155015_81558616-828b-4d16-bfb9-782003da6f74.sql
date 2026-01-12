-- Add public read access to payment_packages for landing page
CREATE POLICY "Anyone can view active payment packages"
ON public.payment_packages
FOR SELECT
USING (is_active = true);