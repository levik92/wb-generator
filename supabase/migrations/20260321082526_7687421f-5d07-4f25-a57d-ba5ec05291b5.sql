
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'widget',
  status text NOT NULL DEFAULT 'active',
  ai_enabled boolean NOT NULL DEFAULT true,
  needs_admin_attention boolean NOT NULL DEFAULT false,
  admin_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL DEFAULT 'user',
  encrypted_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access conversations" ON public.support_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users view own conversations" ON public.support_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone insert conversations" ON public.support_conversations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins view all conversations" ON public.support_conversations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "Admins update conversations" ON public.support_conversations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Service role full access messages" ON public.support_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anyone insert messages" ON public.support_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users view own messages" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM support_conversations WHERE support_conversations.id = support_messages.conversation_id AND support_conversations.user_id = auth.uid()));
CREATE POLICY "Admins view all messages" ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
