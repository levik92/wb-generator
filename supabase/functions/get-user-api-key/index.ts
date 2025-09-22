import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  provider: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid or expired token')
    }

    const { provider }: RequestBody = await req.json()

    if (!provider) {
      throw new Error('Provider is required')
    }

    // Get the decrypted API key using the secure function
    const { data: decryptedKey, error } = await supabaseClient
      .rpc('get_user_api_key_decrypted', {
        user_id_param: user.id,
        provider_name: provider
      })

    if (error) {
      console.error('Error getting decrypted API key:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to retrieve API key',
          hasKey: false 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!decryptedKey) {
      return new Response(
        JSON.stringify({ 
          error: 'API key not found for this provider',
          hasKey: false 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log security event for API key access
    await supabaseClient.rpc('log_security_event', {
      user_id_param: user.id,
      event_type_param: 'api_key_accessed',
      event_description_param: `API key accessed for provider: ${provider}`,
      metadata_param: { provider, timestamp: new Date().toISOString() }
    })

    return new Response(
      JSON.stringify({ 
        apiKey: decryptedKey, // Now properly decrypted using secure function
        hasKey: true,
        lastUsed: new Date().toISOString() // Last used timestamp is updated by the function
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-user-api-key function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        hasKey: false 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})