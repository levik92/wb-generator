import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Mini app and support URLs
const MINI_APP_URL = "https://wb-gen.lovable.app";
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
    { command: "help", description: "❓ Помощь" },
    { command: "support", description: "💬 Поддержка" },
    { command: "pricing", description: "💎 Тарифы" },
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
        web_app: { url: MINI_APP_URL },
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
          web_app: { url: MINI_APP_URL },
        },
      ],
      [
        {
          text: "📸 Создать карточки",
          web_app: { url: `${MINI_APP_URL}/dashboard` },
        },
        {
          text: "📝 Описания",
          web_app: { url: `${MINI_APP_URL}/dashboard` },
        },
      ],
      [
        { text: "💬 Поддержка", url: SUPPORT_URL },
        { text: "💎 Тарифы", web_app: { url: `${MINI_APP_URL}/pricing` } },
      ],
    ],
  };
}

// Handle /start command
async function handleStart(chatId: number, firstName: string) {
  const welcomeText = `
👋 <b>Привет, ${firstName}!</b>

Добро пожаловать в <b>WB Generator</b> — твой AI-помощник для Wildberries!

🎨 <b>Что я умею:</b>
• Создавать продающие карточки товаров
• Генерировать SEO-описания
• Создавать инфографику и этикетки
• Работать с ИИ-технологиями

⚡️ Нажми кнопку ниже, чтобы открыть приложение и начать создавать!
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
/help — Эта справка
/support — Связаться с поддержкой
/pricing — Посмотреть тарифы

💡 <b>Совет:</b> Используйте кнопку меню внизу для быстрого доступа к приложению!
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
            web_app: { url: MINI_APP_URL },
          },
        ],
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
        [
          {
            text: "📱 Открыть приложение",
            web_app: { url: MINI_APP_URL },
          },
        ],
      ],
    },
  });
}

// Handle /pricing command
async function handlePricing(chatId: number) {
  const pricingText = `
💎 <b>Тарифы WB Generator</b>

🎁 <b>Стартовый бонус:</b>
После первой оплаты вы получаете токены для генерации!

💰 <b>Пакеты токенов:</b>
• Базовый — для старта
• Стандарт — для активной работы  
• Про — максимум возможностей

📊 <b>Расход токенов:</b>
• Карточка товара — от 1 токена
• SEO-описание — 1 токен
• Этикетка — 1 токен

👉 Нажмите кнопку ниже, чтобы посмотреть актуальные цены!
  `.trim();

  await sendMessage(chatId, pricingText, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "💎 Посмотреть тарифы",
            web_app: { url: `${MINI_APP_URL}/pricing` },
          },
        ],
        [
          {
            text: "📱 Открыть приложение",
            web_app: { url: MINI_APP_URL },
          },
        ],
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
