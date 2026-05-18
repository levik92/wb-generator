
-- finance_settings (singleton)
CREATE TABLE public.finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_rate numeric NOT NULL DEFAULT 6,
  starting_cash numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage finance_settings" ON public.finance_settings FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
INSERT INTO public.finance_settings (tax_rate, starting_cash) VALUES (6, 0);

-- marketing_channels
CREATE TABLE public.marketing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing_channels" ON public.marketing_channels FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Moscow')::date,
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  category text NOT NULL CHECK (category IN ('cogs','salary_admin','marketing','representative','tax','accounting','other')),
  tag text,
  channel_id uuid REFERENCES public.marketing_channels(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_channel ON public.expenses(channel_id);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- marketing_revenues (manual monthly revenue per channel)
CREATE TABLE public.marketing_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.marketing_channels(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, period_month)
);
CREATE INDEX idx_marketing_revenues_month ON public.marketing_revenues(period_month);
ALTER TABLE public.marketing_revenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketing_revenues" ON public.marketing_revenues FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
