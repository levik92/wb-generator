-- Create bonus_programs table
CREATE TABLE public.bonus_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tokens_reward INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  requires_link BOOLEAN NOT NULL DEFAULT true,
  requires_contact BOOLEAN NOT NULL DEFAULT false,
  link_placeholder TEXT DEFAULT 'Вставьте ссылку на публикацию',
  contact_placeholder TEXT DEFAULT 'Ваш Telegram для связи',
  button_text TEXT NOT NULL DEFAULT 'Выполнил',
  icon_name TEXT DEFAULT 'gift',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bonus_submissions table
CREATE TABLE public.bonus_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.bonus_programs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submission_link TEXT,
  contact_info TEXT,
  admin_notes TEXT,
  tokens_awarded INTEGER,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bonus_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for bonus_programs
CREATE POLICY "Anyone can read active bonus programs" 
ON public.bonus_programs 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all bonus programs" 
ON public.bonus_programs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- RLS policies for bonus_submissions
CREATE POLICY "Users can view their own submissions" 
ON public.bonus_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" 
ON public.bonus_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions" 
ON public.bonus_submissions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

CREATE POLICY "Admins can update submissions" 
ON public.bonus_submissions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

-- Create function to approve bonus submission
CREATE OR REPLACE FUNCTION public.approve_bonus_submission(
  submission_id_param UUID,
  tokens_amount INTEGER,
  admin_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_program_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get submission details
  SELECT user_id, program_id INTO v_user_id, v_program_id
  FROM bonus_submissions
  WHERE id = submission_id_param AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found or already processed';
  END IF;

  -- Update submission
  UPDATE bonus_submissions
  SET status = 'approved',
      tokens_awarded = tokens_amount,
      admin_notes = admin_notes_param,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = submission_id_param;

  -- Add tokens to user balance
  UPDATE profiles
  SET tokens_balance = tokens_balance + tokens_amount,
      updated_at = now()
  WHERE id = v_user_id;

  -- Record token transaction
  INSERT INTO token_transactions (user_id, amount, transaction_type, description)
  VALUES (v_user_id, tokens_amount, 'bonus', 'Бонус за выполнение задания');

  -- Log security event
  PERFORM log_security_event(
    auth.uid(),
    'bonus_approved',
    'Admin approved bonus submission',
    NULL,
    NULL,
    jsonb_build_object(
      'submission_id', submission_id_param,
      'user_id', v_user_id,
      'tokens', tokens_amount
    )
  );

  RETURN TRUE;
END;
$$;

-- Create function to reject bonus submission
CREATE OR REPLACE FUNCTION public.reject_bonus_submission(
  submission_id_param UUID,
  admin_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update submission
  UPDATE bonus_submissions
  SET status = 'rejected',
      admin_notes = admin_notes_param,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = submission_id_param AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or already processed';
  END IF;

  RETURN TRUE;
END;
$$;

-- Create indexes
CREATE INDEX idx_bonus_submissions_user_id ON public.bonus_submissions(user_id);
CREATE INDEX idx_bonus_submissions_status ON public.bonus_submissions(status);
CREATE INDEX idx_bonus_submissions_program_id ON public.bonus_submissions(program_id);
CREATE INDEX idx_bonus_programs_active ON public.bonus_programs(is_active);

-- Insert default bonus programs
INSERT INTO public.bonus_programs (title, description, tokens_reward, display_order, requires_link, requires_contact, link_placeholder, button_text, icon_name) VALUES
('Сторис в Instagram', 'Разместите сторис с отметкой @wbgenerator и получите бонус!', 10, 1, true, false, 'Ссылка на ваш аккаунт или сторис', 'Выполнил', 'instagram'),
('Рилс о сервисе', 'Снимите рилс с кейсом генерации или расскажите о нашем сервисе', 20, 2, true, false, 'Ссылка на рилс', 'Выполнил', 'video'),
('Рилс 100K+ просмотров', 'Ваш рилс о сервисе набрал более 100 000 просмотров? Получите дополнительный бонус!', 100, 3, true, false, 'Ссылка на вирусный рилс', 'Завирусилось!', 'trending-up'),
('Рилс-миллионник', 'Вирусный рилс с 1 000 000+ просмотров? Мы готовы обсудить индивидуальное вознаграждение!', 0, 4, true, true, 'Ссылка на рилс-миллионник', 'Запросить проверку', 'crown');

-- Update trigger for updated_at
CREATE TRIGGER update_bonus_programs_updated_at
BEFORE UPDATE ON public.bonus_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bonus_submissions_updated_at
BEFORE UPDATE ON public.bonus_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();