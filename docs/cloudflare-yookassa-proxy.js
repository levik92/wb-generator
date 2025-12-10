/**
 * Cloudflare Worker - YooKassa API Proxy
 * 
 * Этот воркер решает проблему TLS совместимости между Supabase Edge Functions и YooKassa API.
 * 
 * ИНСТРУКЦИЯ ПО РАЗВЕРТЫВАНИЮ:
 * 
 * 1. Зайдите на https://dash.cloudflare.com/
 * 2. Выберите Workers & Pages → Create Application → Create Worker
 * 3. Назовите воркер (например: yookassa-proxy)
 * 4. Вставьте код ниже и нажмите "Save and Deploy"
 * 5. Скопируйте URL воркера (например: https://yookassa-proxy.your-account.workers.dev)
 * 6. Добавьте секрет YOOKASSA_PROXY_URL в Supabase с этим URL
 * 7. Добавьте секрет PROXY_SECRET_KEY в Cloudflare Worker (Settings → Variables → Add)
 *    и такой же секрет в Supabase
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Secret',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify proxy secret
    const proxySecret = request.headers.get('X-Proxy-Secret');
    if (!proxySecret || proxySecret !== env.PROXY_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();
      const { endpoint, method, headers, payload, idempotenceKey } = body;

      // Validate endpoint
      if (!endpoint || !endpoint.startsWith('/v3/')) {
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log(`Proxying request to YooKassa: ${endpoint}`);

      // Make request to YooKassa
      const yookassaResponse = await fetch(`https://api.yookassa.ru${endpoint}`, {
        method: method || 'POST',
        headers: {
          'Authorization': headers.Authorization,
          'Content-Type': 'application/json',
          'Idempotence-Key': idempotenceKey || crypto.randomUUID(),
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const responseData = await yookassaResponse.text();
      
      console.log(`YooKassa response status: ${yookassaResponse.status}`);

      return new Response(responseData, {
        status: yookassaResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
