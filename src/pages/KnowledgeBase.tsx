import { Helmet } from "react-helmet-async";
import { ServicePageLayout, ServiceHero, ServiceFAQ, ServiceCTA } from "@/components/services";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Book, Image, FileText, Barcode, CreditCard, ArrowRight, Zap, Settings, HelpCircle, Users } from "lucide-react";
import heroImage from "@/assets/service-knowledge-hero.png";

// Категории статей
const categories = [
  { 
    icon: Book, 
    title: "Начало работы", 
    description: "Регистрация, первые шаги, интерфейс", 
    id: "start",
    articles: [
      { title: "Как зарегистрироваться в WBGen", id: "registration" },
      { title: "Обзор личного кабинета", id: "dashboard-overview" },
      { title: "Первая генерация карточки", id: "first-generation" },
      { title: "Как пополнить баланс токенов", id: "add-tokens" },
      { title: "Мобильная версия WBGen", id: "mobile-app" },
    ]
  },
  { 
    icon: Image, 
    title: "Генерация карточек", 
    description: "Как создавать карточки для WB, Ozon, Яндекс Маркет", 
    id: "cards",
    articles: [
      { title: "Загрузка фото товара", id: "upload-photo" },
      { title: "Выбор стиля карточки", id: "choose-style" },
      { title: "Настройки генерации", id: "generation-settings" },
      { title: "Редактирование готовых карточек", id: "edit-cards" },
      { title: "Перегенерация отдельных слайдов", id: "regenerate-slides" },
      { title: "Скачивание и экспорт", id: "download-export" },
      { title: "Требования к фотографиям", id: "photo-requirements" },
      { title: "Советы по улучшению результата", id: "tips-improve" },
    ]
  },
  { 
    icon: FileText, 
    title: "SEO-описания", 
    description: "Работа с текстами и ключевыми словами", 
    id: "seo",
    articles: [
      { title: "Как генерировать описание", id: "generate-description" },
      { title: "Добавление своих ключевых слов", id: "custom-keywords" },
      { title: "Оптимальная длина описания", id: "description-length" },
      { title: "Формула AIDA в описаниях", id: "aida-formula" },
    ]
  },
  { 
    icon: Barcode, 
    title: "Штрихкоды и этикетки", 
    description: "Генерация ШК для маркетплейсов", 
    id: "barcode",
    articles: [
      { title: "Создание штрихкода CODE-128", id: "create-barcode" },
      { title: "Генерация QR-кода", id: "create-qr" },
      { title: "Печать этикеток", id: "print-labels" },
    ]
  },
  { 
    icon: CreditCard, 
    title: "Оплата и тарифы", 
    description: "Токены, пакеты, способы оплаты", 
    id: "payment",
    articles: [
      { title: "Что такое токены", id: "what-are-tokens" },
      { title: "Как выбрать тариф", id: "choose-plan" },
      { title: "Способы оплаты", id: "payment-methods" },
      { title: "Возврат средств", id: "refund" },
      { title: "Промокоды и скидки", id: "promo-codes" },
      { title: "История платежей", id: "payment-history" },
    ]
  },
  { 
    icon: Users, 
    title: "Партнёрская программа", 
    description: "Заработок на рефералах", 
    id: "partners",
    articles: [
      { title: "Как стать партнёром", id: "become-partner" },
      { title: "Получение реферальной ссылки", id: "get-referral-link" },
      { title: "Условия вывода средств", id: "withdrawal-conditions" },
    ]
  },
];

// Популярные вопросы
const faqItems = [
  { 
    question: "Как начать работу с WBGen?", 
    answer: "Зарегистрируйтесь на сайте, используя email или Google-аккаунт. После регистрации вы получите токены для тестирования сервиса. Перейдите в раздел «Генерация» и загрузите первое фото товара. Выберите стиль, добавьте описание товара и нажмите «Сгенерировать». Через 2-3 минуты набор карточек готов к скачиванию." 
  },
  { 
    question: "Сколько токенов даётся при регистрации?", 
    answer: "При регистрации вы получаете токены для тестирования сервиса. Их достаточно для генерации нескольких карточек и SEO-описаний, чтобы вы могли оценить качество работы ИИ перед покупкой токенов." 
  },
  { 
    question: "Какие требования к фотографиям товара?", 
    answer: "Загружайте фотографии в форматах JPG, PNG или WebP. Рекомендуемое разрешение — от 800x800 пикселей. Фон желательно однотонный или белый. Товар должен быть хорошо освещён и занимать большую часть кадра. Чем качественнее исходное фото, тем лучше результат генерации." 
  },
  { 
    question: "Как пополнить баланс токенов?", 
    answer: "Перейдите в раздел «Тарифы» в личном кабинете, выберите подходящий пакет токенов и нажмите «Оплатить». Оплата происходит через ЮKassa банковской картой Visa, MasterCard или МИР. Токены зачисляются на баланс мгновенно после успешной оплаты." 
  },
  { 
    question: "Можно ли вернуть токены за неудачную генерацию?", 
    answer: "Если генерация не удалась по техническим причинам (ошибка сервера, сбой процесса), токены возвращаются автоматически. Если результат генерации вам не понравился, вы можете перегенерировать карточку с другими настройками. По индивидуальным вопросам обращайтесь в поддержку." 
  },
  { 
    question: "Как связаться с поддержкой?", 
    answer: "Напишите в Telegram @wbgen_support или на email info@wbgen.ru. Мы отвечаем в течение нескольких часов в рабочее время. В Telegram также можно подписаться на канал @wbgen_official для получения новостей и обновлений." 
  },
  { 
    question: "Подходят ли карточки для Ozon и других маркетплейсов?", 
    answer: "Да, созданные карточки универсальны. Вы получаете PNG-файлы в высоком разрешении (900x1200 пикселей), которые подходят для Wildberries, Ozon, Яндекс.Маркет и других маркетплейсов. При необходимости размер можно скорректировать в любом графическом редакторе." 
  },
  { 
    question: "Как работает партнёрская программа?", 
    answer: "Зарегистрируйтесь и получите уникальную реферальную ссылку в разделе «Партнёрам». Делитесь ссылкой с друзьями и коллегами. Когда приглашённый пользователь покупает токены, вы получаете 20% от суммы его покупки. Комиссия начисляется пожизненно со всех покупок реферала. Минимальная сумма вывода — 5000₽." 
  },
];

// Статьи с полным содержимым
const articleContent: Record<string, { title: string; content: string }> = {
  "registration": {
    title: "Как зарегистрироваться в WBGen",
    content: `
## Регистрация в WBGen

### Способы регистрации

WBGen предлагает два способа создания аккаунта:

1. **Регистрация по email** — введите email и придумайте пароль
2. **Вход через Google** — быстрая авторизация в один клик

### Пошаговая инструкция

1. Перейдите на страницу [регистрации](/auth)
2. Выберите способ: email или Google
3. При регистрации по email:
   - Введите действующий email
   - Придумайте надёжный пароль (минимум 6 символов)
   - Нажмите «Зарегистрироваться»
4. Подтвердите email, перейдя по ссылке в письме
5. Войдите в личный кабинет

### Бонусные токены

После успешной регистрации на ваш баланс автоматически зачисляются токены для тестирования. Их достаточно для знакомства с основными функциями сервиса.

### Частые проблемы

**Не приходит письмо с подтверждением?**
- Проверьте папку «Спам»
- Убедитесь, что email введён корректно
- Запросите повторную отправку письма

**Забыли пароль?**
- На странице входа нажмите «Забыли пароль?»
- Введите email и получите ссылку для сброса
    `
  },
  "dashboard-overview": {
    title: "Обзор личного кабинета",
    content: `
## Обзор личного кабинета WBGen

### Структура интерфейса

Личный кабинет WBGen состоит из нескольких основных разделов:

**Боковое меню:**
- Генерация — создание карточек и описаний
- История — все ваши генерации
- Тарифы — покупка токенов
- Партнёрам — реферальная программа
- Настройки — управление аккаунтом

### Главная панель

На главной панели отображается:
- Текущий баланс токенов
- Статистика генераций
- Быстрые действия
- Последние генерации

### Раздел «Генерация»

Здесь вы можете:
- Загрузить фото товара
- Выбрать стиль карточки
- Указать категорию и описание
- Запустить генерацию

### Раздел «История»

В истории хранятся:
- Все ваши генерации
- Скачанные карточки
- Статус каждой генерации
- Возможность повторной загрузки

### Горячие клавиши

- **Ctrl/Cmd + G** — быстрый переход к генерации
- **Ctrl/Cmd + H** — переход к истории
    `
  },
  "first-generation": {
    title: "Первая генерация карточки",
    content: `
## Ваша первая генерация карточки

### Подготовка

Перед началом убедитесь, что у вас есть:
- Качественная фотография товара
- Название и описание товара
- Достаточный баланс токенов

### Пошаговая инструкция

**Шаг 1: Загрузка фото**
- Нажмите «Загрузить фото» или перетащите файл
- Поддерживаемые форматы: JPG, PNG, WebP
- Рекомендуемый размер: от 800x800 пикселей

**Шаг 2: Заполнение данных**
- Введите название товара
- Выберите категорию из списка
- Добавьте краткое описание (преимущества, особенности)

**Шаг 3: Выбор стиля**
- Minimal — чистый минимализм
- Premium — премиум-оформление
- Bold — яркий и акцентный
- Luxury — люксовый стиль

**Шаг 4: Генерация**
- Нажмите «Сгенерировать»
- Дождитесь завершения (2-3 минуты)
- Просмотрите результат

**Шаг 5: Скачивание**
- Выберите нужные карточки
- Нажмите «Скачать»
- Файлы сохранятся в формате PNG

### Советы для первой генерации

- Начните с качественного фото на белом фоне
- Укажите максимум информации о товаре
- Попробуйте разные стили для сравнения
    `
  },
  "what-are-tokens": {
    title: "Что такое токены",
    content: `
## Что такое токены в WBGen

### Определение

Токены — это внутренняя валюта сервиса WBGen. Они используются для оплаты генераций карточек, описаний и других функций.

### Почему токены, а не рубли?

- **Гибкость** — вы платите только за то, что используете
- **Нет подписки** — токены не сгорают, используйте когда удобно
- **Экономия** — чем больше пакет, тем ниже цена за токен

### Расход токенов

| Действие | Токены |
|----------|--------|
| Генерация карточки (1 слайд) | 1-2 токена |
| SEO-описание | 0.5-1 токен |
| Перегенерация слайда | 1 токен |
| Штрихкоды | Бесплатно |

### Как пополнить

1. Перейдите в раздел «Тарифы»
2. Выберите пакет токенов
3. Оплатите картой через ЮKassa
4. Токены зачислятся мгновенно

### Срок действия

Токены не имеют срока годности — они остаются на балансе, пока вы их не используете.
    `
  },
  "choose-style": {
    title: "Выбор стиля карточки",
    content: `
## Выбор стиля карточки

### Доступные стили

WBGen предлагает несколько стилей оформления карточек:

**Minimal**
- Чистый минималистичный дизайн
- Акцент на товаре
- Мало декоративных элементов
- Подходит для: техника, аксессуары, косметика

**Premium**
- Премиальное оформление
- Элегантные акценты
- Качественная типографика
- Подходит для: одежда, украшения, подарки

**Bold**
- Яркие цвета и контрасты
- Крупные шрифты
- Привлекает внимание
- Подходит для: спорт, детские товары, распродажи

**Luxury**
- Люксовый стиль
- Золотые и тёмные оттенки
- Изысканные элементы
- Подходит для: премиум-сегмент, косметика, часы

### Как выбрать стиль

1. Определите целевую аудиторию
2. Изучите конкурентов в категории
3. Протестируйте 2-3 стиля
4. Выберите лучший по результатам

### Советы

- Используйте один стиль для всех товаров бренда
- Учитывайте цветовую гамму товара
- Тестируйте разные варианты с A/B-тестами
    `
  },
};

const KnowledgeBase = () => {
  return (
    <ServicePageLayout>
      <Helmet>
        <title>База знаний WBGen — инструкции для селлеров Wildberries, Ozon, Яндекс Маркет</title>
        <meta name="description" content="Инструкции по работе с WBGen: создание карточек для WB, Ozon и Яндекс Маркет, SEO-описания, штрихкоды. Ответы на частые вопросы и руководства." />
        <meta property="og:title" content="База знаний WBGen" />
        <meta property="og:url" content="https://wbgen.ru/baza-znaniy" />
        <link rel="canonical" href="https://wbgen.ru/baza-znaniy" />
      </Helmet>

      <ServiceHero
        title="База знаний"
        subtitle="WBGen"
        description="Инструкции, руководства и ответы на частые вопросы. Всё, что нужно знать для эффективной работы с сервисом."
        breadcrumbs={[{ label: "Ресурсы" }, { label: "База знаний" }]}
        badge="Справочный центр"
        ctaText="Написать в поддержку"
        ctaLink="https://t.me/wbgen_support"
        heroImage={heroImage}
      />

      {/* Categories Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Категории статей</h2>
            <p className="text-white/60">Выберите раздел для изучения</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {categories.map((cat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                id={cat.id}
              >
                <div className="glass-card rounded-2xl p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center mb-4">
                    <cat.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{cat.title}</h3>
                  <p className="text-white/50 text-sm mb-4">{cat.description}</p>
                  
                  <ul className="space-y-2">
                    {cat.articles.map((article, articleIndex) => (
                      <li key={articleIndex}>
                        <Link 
                          to={`/baza-znaniy/${article.id}`}
                          className="text-sm text-white/70 hover:text-[hsl(268,83%,65%)] transition-colors flex items-center gap-2"
                        >
                          <ArrowRight className="w-3 h-3" />
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Быстрый старт</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card rounded-xl p-6">
                <div className="text-3xl font-bold text-[hsl(268,83%,65%)] mb-2">1</div>
                <h3 className="font-semibold text-white mb-2">Регистрация</h3>
                <p className="text-white/60 text-sm">
                  Создайте аккаунт за 30 секунд через email или Google. Получите бесплатные токены.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6">
                <div className="text-3xl font-bold text-[hsl(268,83%,65%)] mb-2">2</div>
                <h3 className="font-semibold text-white mb-2">Загрузка фото</h3>
                <p className="text-white/60 text-sm">
                  Загрузите качественное фото товара и укажите категорию с описанием.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6">
                <div className="text-3xl font-bold text-[hsl(268,83%,65%)] mb-2">3</div>
                <h3 className="font-semibold text-white mb-2">Генерация</h3>
                <p className="text-white/60 text-sm">
                  Выберите стиль и нажмите «Сгенерировать». Через 2-3 минуты карточки готовы.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sample Articles */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(268,83%,50%)] to-[hsl(268,83%,40%)] flex items-center justify-center">
                <Book className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Популярные статьи</h2>
            </div>

            <div className="space-y-6">
              {Object.entries(articleContent).slice(0, 3).map(([id, article]) => (
                <Link key={id} to={`/baza-znaniy/${id}`} className="block">
                  <div className="glass-card rounded-xl p-6 hover:bg-white/5 transition-colors">
                    <h3 className="text-lg font-semibold text-white mb-3">{article.title}</h3>
                    <div className="text-white/60 text-sm prose prose-invert prose-sm max-w-none">
                      {article.content.split('\n').slice(0, 5).map((line, i) => (
                        <p key={i}>{line.replace(/^#+\s*/, '').replace(/\*\*/g, '')}</p>
                      ))}
                    </div>
                    <span className="mt-4 text-[hsl(268,83%,65%)] text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Читать полностью <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <ServiceFAQ items={faqItems} title="Популярные вопросы" />

      <ServiceCTA 
        title="Не нашли ответ?" 
        subtitle="Напишите нам и мы поможем разобраться" 
        ctaText="Написать в Telegram" 
        ctaLink="https://t.me/wbgen_support" 
      />
    </ServicePageLayout>
  );
};

export default KnowledgeBase;