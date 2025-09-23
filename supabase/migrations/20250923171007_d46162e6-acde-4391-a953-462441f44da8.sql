-- Create news table
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 1500),
  tag TEXT NOT NULL CHECK (tag IN ('Новости', 'Обновления', 'Технические работы', 'Исправления', 'Инструкции', 'Советы', 'Аналитика', 'Кейсы')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Create news_read_status table to track which users read which news
CREATE TABLE public.news_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, news_id)
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_read_status ENABLE ROW LEVEL SECURITY;

-- News policies
CREATE POLICY "Everyone can view published news" 
ON public.news 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Admins can manage all news" 
ON public.news 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- News read status policies
CREATE POLICY "Users can view their own read status" 
ON public.news_read_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read status" 
ON public.news_read_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert read status" 
ON public.news_read_status 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create notification when news is published
CREATE OR REPLACE FUNCTION public.notify_users_on_news_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications if news is being published (not just updated)
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    -- Insert notification for all users
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT 
      p.id,
      'news',
      'Новая статья: ' || NEW.title,
      'Опубликована новая статья в разделе Новости'
    FROM public.profiles p
    WHERE p.is_blocked = false;
    
    -- Set published_at timestamp
    NEW.published_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER news_publish_notification
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_on_news_publish();