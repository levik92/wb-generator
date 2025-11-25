-- Drop old unique constraint on prompt_type only
ALTER TABLE ai_prompts DROP CONSTRAINT IF EXISTS ai_prompts_prompt_type_key;

-- Create new unique constraint on combination of prompt_type and model_type
-- This allows same prompt_type for different models (openai and google)
ALTER TABLE ai_prompts ADD CONSTRAINT ai_prompts_prompt_type_model_type_key 
UNIQUE (prompt_type, model_type);