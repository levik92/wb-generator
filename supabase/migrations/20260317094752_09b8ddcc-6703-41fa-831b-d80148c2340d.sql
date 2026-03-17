
CREATE TABLE public.video_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  kinescope_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active video lessons"
  ON public.video_lessons FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage all video lessons"
  ON public.video_lessons FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  ));

-- Insert existing video lessons
INSERT INTO public.video_lessons (title, subtitle, kinescope_id, display_order, duration) VALUES
  ('Обзор сервиса и всех функций', 'Узнайте о всех функциях кабинета WB генератор и как с ними работать', 'soVNVxif9ePmX7h7Hj5tMm', 1, ''),
  ('Как работать с генерацией карточек', 'Полный обзор функций и процесса создания карточек товара до высокого уровня', 'gxehUBTUM5Eg5GGcjZxs6T', 2, ''),
  ('Как делать карточки ТОП уровня', '"Лайфхаки" и "фишки" как работать с сервисом и довести уровень дизайна карточек до идеала', 'wt1tRnXbyNeAv5NMFRfEGc', 3, ''),
  ('Как делать лучшие SEO карточек', 'Рассказываем как работать в генераторе описаний и делать SEO, выводящие товары в ТОП10 выдачи', 'usJ75nHxa7YXYw1bUeLnXV', 4, ''),
  ('Зарабатывайте вместе с нами', 'Обзор кабинета партнеров и как можно скооперироваться с нашим сервисом', '5m7ZHxn36euywnnGFUzvTx', 5, ''),
  ('Функция редактирования карточек', 'Посмотрите все возможности функции "Редактирование" в сервисе', '9gw271sVENpvKKJiL6Juqd', 6, ''),
  ('Работа с товарами 18+', 'Особенности работы с товарами категории 18+ на нашем сервисе', '2uMRCQEpnYHrvawcWdmfSv', 7, '');
