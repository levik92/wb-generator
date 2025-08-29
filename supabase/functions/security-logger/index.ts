import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityEvent {
  eventType: string;
  eventDescription: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { eventType, eventDescription, userId, metadata = {} }: SecurityEvent = await req.json();
    
    // Extract client information
    const rawClientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    // Handle comma-separated IPs and take the first one
    const clientIP = rawClientIP ? rawClientIP.split(',')[0].trim() : null;
    const userAgent = req.headers.get('user-agent');

    // Log security event
    const { error } = await supabase.rpc('log_security_event', {
      user_id_param: userId || null,
      event_type_param: eventType,
      event_description_param: eventDescription,
      ip_address_param: clientIP,
      user_agent_param: userAgent,
      metadata_param: metadata
    });

    if (error) {
      console.error('Error logging security event:', error);
      throw error;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      'multiple_failed_login',
      'excessive_token_usage',
      'unusual_ip_change',
      'account_enumeration',
      'injection_attempt'
    ];

    if (suspiciousPatterns.includes(eventType)) {
      // Additional security measures for suspicious events
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Потенциальная угроза безопасности',
        message: `Обнаружена подозрительная активность: ${eventDescription}`,
        type: 'security'
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in security-logger:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});