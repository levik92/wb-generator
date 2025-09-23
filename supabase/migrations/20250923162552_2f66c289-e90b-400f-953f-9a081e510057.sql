-- Allow authenticated users to read active promocodes when searching by code
CREATE POLICY "Users can read active promocodes by code" 
ON public.promocodes 
FOR SELECT 
TO authenticated
USING (is_active = true);