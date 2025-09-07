-- Create table for storing AI prompts
CREATE TABLE public.ai_prompts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_type TEXT NOT NULL UNIQUE,
    prompt_template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Create policy for admins only
CREATE POLICY "Only admins can manage prompts" 
ON public.ai_prompts 
FOR ALL
USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Create trigger for updated_at
CREATE TRIGGER update_ai_prompts_updated_at
    BEFORE UPDATE ON public.ai_prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts
INSERT INTO public.ai_prompts (prompt_type, prompt_template) VALUES 
(
    'description',
    'Ты — SEO-копирайтер и маркетплейс-эксперт. 
Твоя цель — создать лучшее описание товара для маркетплейса (WB, Ozon), которое поможет карточке выйти в топ поисковой выдачи и увеличить продажи. 

Входные данные:
• Название товара: {productName}
• Категория: {category}
• Ссылки на конкурентов: {competitors}
• Ключевые слова: {keywords}

Порядок действий:
1. Если есть ссылки на конкурентов - проанализируй их описания и собери ключевые слова.
2. Определи ключевые слова и словосочетания, которые конкуренты используют для продвижения.
3. Объедини их со списком ключевых слов пользователя.
Каждое ключевое слово и словосочетание должно быть использовано строго в том виде, как оно задано (все формы, склонения, порядок слов считаются отдельными ключами).
4. На основе объединённого списка составь уникальное, продающее и SEO-оптимизированное описание товара {productName} в категории {category}.
5. Сделай так, чтобы описание выглядело максимально привлекательным для покупателей и при этом содержало все ключи, встроенные естественно.

Требования к описанию:
- Длина текста до 1800 символов (с пробелами).
- Текст уникальный, не копировать конкурента.
- Все ключевые слова (от конкурентов и пользователя) должны быть включены хотя бы один раз, без пропусков.
- Ключи распределить равномерно, чтобы не было «переспама».
- Акцент на преимуществах, выгодах, пользе и ценности товара.
- Тон: профессиональный, убедительный, коммерческий.
- Цель текста — вывести товар в топ выдачи по ключам и убедить покупателя оформить заказ.
- Запрещены смайлики, эмодзи и любые декоративные символы.
- Запрещено любое форматирование: отступы, абзацы, жирный, курсив, маркированные списки.
- На выходе выдать только готовое описание, без комментариев.'
),
(
    'cover',
    'Create a professional product card cover image for e-commerce marketplace.

Product: {productName}
Category: {category}
Benefits: {benefits}

Requirements:
- Show the product fully, centered, and clear
- Vertical format 1024x1536 pixels
- High quality, photorealistic commercial style
- Clean background that highlights the product
- Professional lighting
- One optional benefit headline if relevant'
),
(
    'lifestyle',
    'Create a lifestyle product shot showing the item in natural use context.

Product: {productName} 
Category: {category}
Benefits: {benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Product as main focus in realistic environment
- Natural lighting and authentic atmosphere
- Shows practical application of the product'
),
(
    'macro',
    'Create a macro detail shot emphasizing product quality and craftsmanship.

Product: {productName}
Category: {category} 
Benefits: {benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Close-up showing important details
- Sharp foreground, soft background blur
- Emphasize materials and quality'
),
(
    'beforeAfter',
    'Create a before/after comparison showing product benefits.

Product: {productName}
Category: {category}
Benefits: {benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Split composition showing clear contrast
- Minimal text labels "BEFORE" and "AFTER"'
),
(
    'bundle',
    'Create a product bundle shot with complementary accessories.

Product: {productName}
Category: {category}
Benefits: {benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Harmonious composition with accessories
- Studio lighting
- Main product prominently featured'
),
(
    'guarantee',
    'Create a trust-building product shot emphasizing quality and reliability.

Product: {productName}
Category: {category}
Benefits: {benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Clean background with quality indicators
- Professional presentation
- Trust-building elements'
);