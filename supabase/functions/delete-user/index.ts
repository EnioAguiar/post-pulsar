import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "delete-user" up and running!`);

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default when deployed.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default when deployed.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function., 
      // This way your row-level-security policies are applied.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Now we can get the session or user object
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

})
