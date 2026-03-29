import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://wbgen.ru";
const TELEGRAM_WEBHOOK_BASE_URL = Deno.env.get("TELEGRAM_WEBHOOK_BASE_URL") ?? SUPABASE_URL;

// Mini app and support URLs
const DASHBOARD_URL = `${PUBLIC_SITE_URL}/dashboard`;
const CASES_URL = `${PUBLIC_SITE_URL}/cases`;
const KNOWLEDGE_BASE_URL = `${PUBLIC_SITE_URL}/baza-znaniy`;
const SUPPORT_URL = "https://t.me/wbgen_support";
const GROUP_URL = "https://t.me/wbgen_official";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// Save subscriber to database
async function saveSubscriber(chatId: number, username?: string, firstName?: string, lastName?: string) {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from("telegram_bot_subscribers")
      .upsert({
        chat_id: chatId,
        username: username || null,
        first_name: firstName || null,
        last_name: lastName || null,
        is_active: true,
        unsubscribed_at: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "chat_id",
      });
    
    if (error) {
      console.error("Error saving subscriber:", error);
    } else {
      console.log("Subscriber saved:", chatId);
    }
  } catch (error) {
    console.error("Error in saveSubscriber:", error);
  }
}

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
          text: "🎨 Примеры генераций",
          url: CASES_URL,
        },
        {
          text: "❓ FAQ",
          url: KNOWLEDGE_BASE_URL,
        },
      ],
      [
        { text: "💬 Поддержка", url: SUPPORT_URL },
        { text: "👥 Наша группа", url: GROUP_URL },
      ],
    ],
  };
}

// Send news to all bot subscribers
async function sendNewsToSubscribers(news: { title: string; content: string; tag: string }) {
  const supabase = getSupabaseClient();
  
  // Get all active subscribers
  const { data: subscribers, error } = await supabase
    .from("telegram_bot_subscribers")
    .select("chat_id")
    .eq("is_active", true);
  
  if (error) {
    console.error("Error fetching subscribers:", error);
    return { ok: false, description: error.message, sent: 0, failed: 0 };
  }
  
  if (!subscribers || subscribers.length === 0) {
    console.log("No active subscribers found");
    return { ok: true, description: "No subscribers", sent: 0, failed: 0 };
  }

  const tagEmojis: Record<string, string> = {
    "Новости": "📰",
    "Обновления": "🆕",
    "Технические работы": "🔧",
    "Исправления": "🐛",
    "Инструкции": "📖",
    "Советы": "💡",
    "Аналитика": "📊",
    "Кейсы": "📈",
  };

  const emoji = tagEmojis[news.tag] || "📢";

  const message = `${emoji} <b>${news.tag}</b>

<b>${news.title}</b>

${news.content}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🚀 Открыть приложение", web_app: { url: DASHBOARD_URL } },
        { text: "👥 Наша группа", url: GROUP_URL },
      ],
    ],
  };

  let sent = 0;
  let failed = 0;
  const failedChatIds: number[] = [];

  // Send to all subscribers
  for (const subscriber of subscribers) {
    try {
      const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: subscriber.chat_id,
          text: message,
          parse_mode: "HTML",
          reply_markup: keyboard,
        }),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        sent++;
      } else {
        failed++;
        failedChatIds.push(subscriber.chat_id);
        console.log(`Failed to send to ${subscriber.chat_id}:`, result.description);
        
        // If user blocked the bot, mark as inactive
        if (result.description?.includes("blocked") || result.description?.includes("deactivated")) {
          await supabase
            .from("telegram_bot_subscribers")
            .update({ 
              is_active: false, 
              unsubscribed_at: new Date().toISOString() 
            })
            .eq("chat_id", subscriber.chat_id);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      failed++;
      console.error(`Error sending to ${subscriber.chat_id}:`, error);
    }
  }

  console.log(`News broadcast complete: ${sent} sent, ${failed} failed`);
  return { ok: true, sent, failed, total: subscribers.length };
}

// Handle /start command
async function handleStart(chatId: number, firstName: string, username?: string, lastName?: string) {
  // Save subscriber to database
  await saveSubscriber(chatId, username, firstName, lastName);
  
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
  const lastName = message.from?.last_name;
  const username = message.from?.username;

  // Handle commands
  if (text.startsWith("/start")) {
    await handleStart(chatId, firstName, username, lastName);
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
      const webhookUrl = `${TELEGRAM_WEBHOOK_BASE_URL}/functions/v1/telegram-bot`;
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
      const body = await req.json();
      
      // Check if this is a send_news action from admin
      if (body.action === "send_news" && body.news) {
        console.log("Sending news to all bot subscribers:", body.news);
        const result = await sendNewsToSubscribers(body.news);
        
        return new Response(
          JSON.stringify({ success: result.ok, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Otherwise, it's a webhook update from Telegram
      await processUpdate(body);
      
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
