-- Add is_popular column to payment_packages table
ALTER TABLE public.payment_packages 
ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- Create function to ensure only one popular package at a time
CREATE OR REPLACE FUNCTION public.ensure_single_popular_package()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_popular = true THEN
    UPDATE public.payment_packages 
    SET is_popular = false 
    WHERE id != NEW.id AND is_popular = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce single popular package
DROP TRIGGER IF EXISTS enforce_single_popular_package ON public.payment_packages;
CREATE TRIGGER enforce_single_popular_package
  BEFORE INSERT OR UPDATE ON public.payment_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_popular_package();