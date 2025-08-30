import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

// Follows the Instagram Business Login flow:
// https://developers.facebook.com/docs/instagram/business-login-for-instagram/getting-started

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
      throw new Error('Missing code or state from callback')
    }

    // 1. Validate state to get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('oauth_state')
      .select('user_id')
      .eq('state', state)
      .single()

    if (stateError || !stateData) {
      console.error('State validation failed:', stateError)
      throw new Error('Invalid or expired state parameter.')
    }
    const userId = stateData.user_id

    // 2. Exchange authorization code for a short-lived user access token
    const tokenUrl = 'https://api.instagram.com/oauth/access_token'
    const tokenParams = new FormData()
    tokenParams.append('client_id', Deno.env.get('INSTAGRAM_CLIENT_ID')!)
    tokenParams.append('client_secret', Deno.env.get('INSTAGRAM_CLIENT_SECRET')!)
    tokenParams.append('grant_type', 'authorization_code')
    tokenParams.append('redirect_uri', `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-auth-callback`)
    tokenParams.append('code', code)

    let response = await fetch(tokenUrl, { method: 'POST', body: tokenParams })
    let data = await response.json()

    if (!response.ok) {
      console.error('Failed to exchange code for token', data)
      throw new Error(data.error_message || 'Failed to get short-lived token.')
    }

    const shortLivedToken = data.access_token
    const instagramUserId = data.user_id

    // 3. Exchange the short-lived token for a long-lived token
    const longLivedTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${Deno.env.get('INSTAGRAM_CLIENT_SECRET')}&access_token=${shortLivedToken}`
    response = await fetch(longLivedTokenUrl)
    data = await response.json()

    if (!response.ok) {
      console.error('Failed to exchange for long-lived token', data)
      throw new Error(data.error.message || 'Failed to get long-lived token.')
    }

    const longLivedToken = data.access_token

    // 4. Get user profile information (like username)
    const profileUrl = `https://graph.instagram.com/${instagramUserId}?fields=username&access_token=${longLivedToken}`
    const profileResponse = await fetch(profileUrl)
    const profileData = await profileResponse.json()
    const instagramUsername = profileData.username || instagramUserId

    // 5. Store the connection details
    const { error: insertError } = await supabaseAdmin
      .from('social_connections')
      .insert({
        user_id: userId,
        provider: 'instagram',
        access_token: longLivedToken,
        provider_user_id: instagramUserId,
        provider_user_name: instagramUsername,
      })

    if (insertError) {
      console.error('Error saving social connection:', insertError)
      throw insertError
    }

    // 6. Clean up state
    await supabaseAdmin.from('oauth_state').delete().eq('state', state)

    // Redirect user back to the app
    const redirectUrl = new URL('/app/connections', Deno.env.get('SITE_URL'))
    return Response.redirect(redirectUrl.href, 302)

  } catch (error) {
    console.error('Error in instagram-auth-callback:', error)
    const errorRedirectUrl = new URL('/app/connections?error=' + encodeURIComponent(error.message), Deno.env.get('SITE_URL'))
    return Response.redirect(errorRedirectUrl.href, 302)
  }
})