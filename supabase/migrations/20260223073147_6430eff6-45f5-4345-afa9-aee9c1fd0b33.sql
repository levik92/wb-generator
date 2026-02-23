
-- Create table for user survey responses
CREATE TABLE public.user_survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_key)
);

-- Enable RLS
ALTER TABLE public.user_survey_responses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own responses
CREATE POLICY "Users can insert own survey responses"
ON public.user_survey_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can read their own responses
CREATE POLICY "Users can read own survey responses"
ON public.user_survey_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all responses
CREATE POLICY "Admins can read all survey responses"
ON public.user_survey_responses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Add index for faster admin queries
CREATE INDEX idx_survey_responses_question_answer ON public.user_survey_responses (question_key, answer);
CREATE INDEX idx_survey_responses_user ON public.user_survey_responses (user_id);
