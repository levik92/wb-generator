-- Add image_resolution column to ai_model_settings table
-- This controls the output resolution for Google Gemini image generation
-- Values: '1K' (faster, smaller files) or '2K' (higher quality, larger files)
-- Default: '2K' for best quality

ALTER TABLE ai_model_settings 
ADD COLUMN IF NOT EXISTS image_resolution TEXT DEFAULT '2K';

-- Add check constraint to ensure only valid values
ALTER TABLE ai_model_settings 
ADD CONSTRAINT image_resolution_check 
CHECK (image_resolution IN ('1K', '2K'));

-- Update existing records to have the default value
UPDATE ai_model_settings 
SET image_resolution = '2K' 
WHERE image_resolution IS NULL;