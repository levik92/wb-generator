-- Create table to store Telegram bot subscribers
CREATE TABLE public.telegram_bot_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_bot_subscribers ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (edge functions)
CREATE POLICY "Service role can manage subscribers"
ON public.telegram_bot_subscribers
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_telegram_subscribers_active ON public.telegram_bot_subscribers (is_active) WHERE is_active = true;
CREATE INDEX idx_telegram_subscribers_chat_id ON public.telegram_bot_subscribers (chat_id);

-- Create trigger for updated_at
CREATE TRIGGER update_telegram_subscribers_updated_at
  BEFORE UPDATE ON public.telegram_bot_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();