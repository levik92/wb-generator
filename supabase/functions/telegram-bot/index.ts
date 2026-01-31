import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Mini app and support URLs
const DASHBOARD_URL = "https://wbgen.ru/dashboard";
const KNOWLEDGE_BASE_URL = "https://wbgen.ru/baza-znaniy";
const SUPPORT_URL = "https://t.me/wbgen_support";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send message to Telegram
async function sendMessage(chatId: number, text: string, options: any = {}) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options,
    }),
  });
  return response.json();
}

// Send photo with caption
async function sendPhoto(chatId: number, photoUrl: string, caption: string, options: any = {}) {
  const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
      ...options,
    }),
  });
  return response.json();
}

// Set bot commands (menu)
async function setBotCommands() {
  const commands = [
    { command: "start", description: "🚀 Запустить бота" },
    { command: "app", description: "📱 Открыть приложение" },
    { command: "cards", description: "🎨 Создать карточки" },
    { command: "description", description: "📝 Генерация описаний" },
    { command: "pricing", description: "💎 Тарифы и баланс" },
    { command: "learning", description: "📚 Обучение" },
    { command: "bonuses", description: "🎁 Бонусы" },
    { command: "faq", description: "❓ База знаний" },
    { command: "support", description: "💬 Поддержка" },
  ];

  await fetch(`${TELEGRAM_API}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });
}

// Set menu button to open mini app
async function setMenuButton() {
  await fetch(`${TELEGRAM_API}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: {
        type: "web_app",
        text: "📱 Открыть WB Generator",
        web_app: { url: DASHBOARD_URL },
      },
    }),
  });
}

// Get inline keyboard with main actions
function getMainKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "🚀 Открыть приложение",
          web_app: { url: DASHBOARD_URL },
        },
      ],
      [
        {
          text: "🎨 Карточки",
          web_app: { url: `${DASHBOARD_URL}#cards` },
        },
        {
          text: "📝 Описания",
          web_app: { url: `${DASHBOARD_URL}#description` },
        },
      ],
      [
        {
          text: "💎 Баланс",
          web_app: { url: `${DASHBOARD_URL}#pricing` },
        },
        {
          text: "📚 Обучение",
          web_app: { url: `${DASHBOARD_URL}#learning` },
        },
      ],
      [
        {
          text: "🎁 Бонусы",
          web_app: { url: `${DASHBOARD_URL}#bonuses` },
        },
        {
          text: "❓ FAQ",
          url: KNOWLEDGE_BASE_URL,
        },
      ],
      [
        { text: "💬 Поддержка", url: SUPPORT_URL },
      ],
    ],
  };
}

// Handle /start command
async function handleStart(chatId: number, firstName: string) {
  const welcomeText = `
👋 <b>Привет, ${firstName}!</b>

Добро пожаловать в <b>WB Generator</b> — нейросеть для продавцов Wildberries!

🔥 <b>Что умеет этот бот:</b>

🎨 <b>Карточки товаров</b> — создавай продающий визуал за минуты. AI генерирует профессиональные изображения с инфографикой

📝 <b>SEO-описания</b> — умные тексты, которые поднимают товар в поиске. Учитываем ключевые слова и требования WB

🏷 <b>Этикетки и ШК</b> — генератор штрих-кодов и этикеток для маркировки товаров

📚 <b>База знаний</b> — гайды и обучение по работе с маркетплейсами

🎁 <b>Бонусная программа</b> — получай токены за активность

⚡️ <b>Готов начать?</b> Нажми кнопку ниже!
  `.trim();

  await sendMessage(chatId, welcomeText, {
    reply_markup: getMainKeyboard(),
  });
}

// Handle /help command
async function handleHelp(chatId: number) {
  const helpText = `
❓ <b>Помощь по WB Generator</b>

<b>Как пользоваться:</b>
1️⃣ Откройте приложение через кнопку меню
2️⃣ Загрузите фото вашего товара
3️⃣ Введите название и описание
4️⃣ Получите готовые карточки за минуты!

<b>Команды бота:</b>
/start — Запустить бота
/app — Открыть приложение
/cards — Создать карточки
/description — Генерация описаний
/pricing — Баланс и тарифы
/learning — Обучение
/bonuses — Бонусы
/faq — База знаний
/support — Связаться с поддержкой

💡 <b>Совет:</b> Используйте кнопку меню внизу для быстрого доступа!
  `.trim();

  await sendMessage(chatId, helpText, {
    reply_markup: getMainKeyboard(),
  });
}

// Handle /app command
async function handleApp(chatId: number) {
  const appText = `
📱 <b>Открыть WB Generator</b>

Нажмите кнопку ниже, чтобы открыть приложение:
  `.trim();

  await sendMessage(chatId, appText, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть приложение",
            web_app: { url: DASHBOARD_URL },
          },
        ],
      ],
    },
  });
}

// Handle /cards command
async function handleCards(chatId: number) {
  const text = `
🎨 <b>Генерация карточек товаров</b>

Создавай продающие карточки с помощью AI:
• Профессиональный дизайн
• Инфографика и иконки
• Готовые шаблоны для WB

Нажми кнопку, чтобы начать:
  `.trim();

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎨 Создать карточки", web_app: { url: `${DASHBOARD_URL}#cards` } }],
        [{ text: "📱 Открыть приложение", web_app: { url: DASHBOARD_URL } }],
      ],
    },
  });
}

// Handle /description command
async function handleDescription(chatId: number) {
  const text = `
📝 <b>Генерация SEO-описаний</b>

AI создаёт оптимизированные тексты:
• Ключевые слова для поиска WB
• Продающие характеристики
• Уникальный контент

Нажми кнопку, чтобы начать:
  `.trim();

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Создать описание", web_app: { url: `${DASHBOARD_URL}#description` } }],
        [{ text: "📱 Открыть приложение", web_app: { url: DASHBOARD_URL } }],
      ],
    },
  });
}

// Handle /learning command
async function handleLearning(chatId: number) {
  const text = `
📚 <b>Обучение</b>

Изучай материалы по работе с маркетплейсами:
• Видео-уроки
• Гайды по оформлению
• Секреты продаж на WB

Нажми кнопку, чтобы перейти:
  `.trim();

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📚 Открыть обучение", web_app: { url: `${DASHBOARD_URL}#learning` } }],
        [{ text: "❓ База знаний", url: KNOWLEDGE_BASE_URL }],
      ],
    },
  });
}

// Handle /bonuses command
async function handleBonuses(chatId: number) {
  const text = `
🎁 <b>Бонусная программа</b>

Получай токены за активность:
• Делись в соцсетях
• Приглашай друзей
• Выполняй задания

Нажми кнопку, чтобы узнать больше:
  `.trim();

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎁 Получить бонусы", web_app: { url: `${DASHBOARD_URL}#bonuses` } }],
        [{ text: "📱 Открыть приложение", web_app: { url: DASHBOARD_URL } }],
      ],
    },
  });
}

// Handle /faq command
async function handleFAQ(chatId: number) {
  const text = `
❓ <b>База знаний</b>

Ответы на популярные вопросы:
• Как создавать карточки
• Как пользоваться сервисом
• Решение проблем

Нажми кнопку, чтобы открыть:
  `.trim();

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "❓ Открыть базу знаний", url: KNOWLEDGE_BASE_URL }],
        [{ text: "💬 Написать в поддержку", url: SUPPORT_URL }],
      ],
    },
  });
}

// Handle /support command
async function handleSupport(chatId: number) {
  const supportText = `
💬 <b>Поддержка WB Generator</b>

Мы всегда готовы помочь!

📩 Напишите нам, если:
• Возникли вопросы по работе сервиса
• Нужна помощь с настройкой
• Хотите предложить улучшения
• Столкнулись с проблемой

⏰ Время ответа: обычно в течение часа
  `.trim();

  await sendMessage(chatId, supportText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💬 Написать в поддержку", url: SUPPORT_URL }],
        [{ text: "❓ База знаний", url: KNOWLEDGE_BASE_URL }],
      ],
    },
  });
}

// Handle /pricing command
async function handlePricing(chatId: number) {
  const pricingText = `
💎 <b>Баланс и тарифы</b>

💰 <b>Пакеты токенов:</b>
• Стартер — для первых шагов
• Стандарт — для активной работы  
• Про — максимум возможностей

📊 <b>Расход токенов:</b>
• Карточка товара — от 1 токена
• SEO-описание — 1 токен
• Этикетка — 1 токен

🎁 <b>Бонусы:</b> получай токены бесплатно за активность!

👉 Нажми кнопку, чтобы пополнить баланс:
  `.trim();

  await sendMessage(chatId, pricingText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💎 Пополнить баланс", web_app: { url: `${DASHBOARD_URL}#pricing` } }],
        [{ text: "🎁 Получить бонусы", web_app: { url: `${DASHBOARD_URL}#bonuses` } }],
      ],
    },
  });
}

// Handle unknown messages
async function handleUnknown(chatId: number) {
  const unknownText = `
🤔 Не понимаю эту команду.

Используйте меню команд или кнопки ниже:
  `.trim();

  await sendMessage(chatId, unknownText, {
    reply_markup: getMainKeyboard(),
  });
}

// Process incoming update
async function processUpdate(update: any) {
  console.log("Received update:", JSON.stringify(update, null, 2));

  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const text = message.text || "";
  const firstName = message.from?.first_name || "друг";

  // Handle commands
  if (text.startsWith("/start")) {
    await handleStart(chatId, firstName);
  } else if (text === "/help") {
    await handleHelp(chatId);
  } else if (text === "/app") {
    await handleApp(chatId);
  } else if (text === "/cards") {
    await handleCards(chatId);
  } else if (text === "/description") {
    await handleDescription(chatId);
  } else if (text === "/learning") {
    await handleLearning(chatId);
  } else if (text === "/bonuses") {
    await handleBonuses(chatId);
  } else if (text === "/faq") {
    await handleFAQ(chatId);
  } else if (text === "/support") {
    await handleSupport(chatId);
  } else if (text === "/pricing") {
    await handlePricing(chatId);
  } else if (text.startsWith("/")) {
    await handleUnknown(chatId);
  } else {
    // Any non-command message
    await handleUnknown(chatId);
  }
}

// Setup webhook
async function setupWebhook(webhookUrl: string) {
  // Set webhook
  const webhookResponse = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  const webhookResult = await webhookResponse.json();
  console.log("Webhook setup result:", webhookResult);

  // Set bot commands
  await setBotCommands();
  console.log("Bot commands set");

  // Set menu button
  await setMenuButton();
  console.log("Menu button set");

  return webhookResult;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Setup endpoint - call this once to configure webhook
    if (url.pathname.endsWith("/setup")) {
      const webhookUrl = `https://xguiyabpngjkavyosbza.supabase.co/functions/v1/telegram-bot`;
      const result = await setupWebhook(webhookUrl);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Webhook and bot configured successfully",
          result 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle webhook updates from Telegram
    if (req.method === "POST") {
      const update = await req.json();
      await processUpdate(update);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default response
    return new Response(
      JSON.stringify({ status: "WB Generator Telegram Bot is running" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
