import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { corsHeaders } from '../_shared/cors.ts'
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts'

// Function to generate a random string for the state parameter
const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')
    const [, payload] = decode(jwt)
    const userId = payload?.sub

    if (!userId) {
      throw new Error('Could not extract user ID from JWT')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const state = generateRandomString(16)
    const { error: stateError } = await supabase
      .from('oauth_state')
      .insert({ state: state, user_id: userId })

    if (stateError) {
      console.error('Error saving state:', stateError)
      throw stateError
    }

    const clientId = Deno.env.get('THREADS_CLIENT_ID')
    if (!clientId) {
        throw new Error('THREADS_CLIENT_ID is not set in environment variables.')
    }
    
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/threads-auth-callback`
    
    // Log the exact redirect URI to be used in the Meta App Dashboard
    console.log("--- IMPORTANT: Use this exact URL in your new Meta App Dashboard for Threads ---");
    console.log(redirectUri);
    console.log("-----------------------------------------------------------------------------");

    const scopes = [
      'threads_basic',
      'threads_content_publish',
    ].join(',') // Comma-separated, like the Instagram integration

    // Standard Meta OAuth 2.0 endpoint
    const authorizationUrl = `https://threads.net/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in threads-auth-start:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
