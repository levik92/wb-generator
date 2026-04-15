import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'https://esm.sh/resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let userEmail = 'unknown';

  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = await req.json() as {
      user: { email: string }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    };

    userEmail = user.email;
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Подтвердите ваш email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f7f7f7; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 40px 30px; text-align: center; color: white; }
            .logo { display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 16px; margin-bottom: 20px; font-size: 24px; }
            .content { padding: 40px 30px; }
            .title { color: #1f2937; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; }
            .subtitle { color: #6b7280; font-size: 16px; margin: 0 0 30px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .bonus { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; }
            .bonus-title { font-size: 20px; font-weight: bold; margin: 0 0 8px 0; }
            .bonus-text { font-size: 14px; opacity: 0.9; margin: 0; }
            .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #6b7280; font-size: 14px; margin: 0 0 10px 0; }
            .footer a { color: #8B5CF6; text-decoration: none; }
            .security-note { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .security-note p { color: #92400e; font-size: 14px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚡</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">WB Генератор</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 16px;">Создавайте профессиональные карточки товаров</p>
            </div>
            <div class="content">
              <h2 class="title">Подтвердите ваш email</h2>
              <p class="subtitle">Добро пожаловать в WB Генератор! Для завершения регистрации подтвердите ваш email адрес.</p>
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Подтвердить email адрес</a>
              </div>
              <div class="bonus">
                <div class="bonus-title">🎉 Бонус при регистрации!</div>
                <p class="bonus-text">10 токенов уже ждут вас в аккаунте для создания первых карточек</p>
              </div>
              <div class="security-note">
                <p><strong>⚠️ Важно:</strong> Если вы не регистрировались на WB Генератор, просто проигнорируйте это письмо.</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>
                <a href="${confirmationUrl}" style="color: #8B5CF6; word-break: break-all;">${confirmationUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p><strong>WB Генератор</strong> - AI генератор карточек товаров для Wildberries</p>
              <p><a href="mailto:info@wbgen.ru">Поддержка</a> | <a href="https://wbgen.ru">Сайт</a></p>
              <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">© 2025 WB Генератор. Все права защищены.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const { error } = await resend.emails.send({
        from: 'WB Генератор <noreply@wbgen.ru>',
        to: [user.email],
        subject: '✨ Подтвердите email в WB Генератор - 10 токенов ждут вас!',
        html,
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error(`Email send failed for ${userEmail}, but allowing signup:`, error);
      } else {
        console.log(`Welcome email sent to ${userEmail}`);
      }
    } catch (emailError: any) {
      console.error(`Email sending error for ${userEmail} (non-blocking):`, emailError?.message || emailError);
    }

  } catch (parseError: any) {
    console.error('Failed to parse request body (non-blocking):', parseError?.message || parseError);
  }

  // ALWAYS return 200 so Auth Hook does not block signup
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
