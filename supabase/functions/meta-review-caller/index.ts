import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("meta-review-caller function deployed and running!");

serve(async (req) => {
  // Handle CORS preflight request for browser-based clients
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // We only need the accessToken to make the discovery call.
    const { accessToken } = await req.json()

    // Validate input parameters
    if (!accessToken) {
      console.error("Missing accessToken");
      const errorPayload = {
        status: "error",
        error: 'O parâmetro "accessToken" é obrigatório.',
        errorCode: "MISSING_PARAMS"
      };
      return new Response(JSON.stringify(errorPayload), {
        status: 200, // Always return 200 OK
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For the threads_profile_discovery permission, we must call the /profile_lookup endpoint.
    // With standard access, only a few specific usernames can be queried. We'll use 'zuck' as a valid example.
    const usernameToLookup = 'instagram';
    console.log(`Attempting to call Threads Profile Discovery API for username: ${usernameToLookup}`);

    // Make the call to the correct Threads API endpoint
    const response = await fetch(`https://graph.threads.net/v1.0/profile_lookup?username=${usernameToLookup}&access_token=${accessToken}`);

    const responseText = await response.text();
    let responseData;

    try {
        responseData = JSON.parse(responseText);
    } catch(e) {
        console.error("Failed to parse Meta API response as JSON:", responseText);
        const errorPayload = {
            status: "error",
            error: 'A API da Meta retornou uma resposta inválida.',
            details: responseText,
            errorCode: "META_API_PARSE_ERROR"
        };
        return new Response(JSON.stringify(errorPayload), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // If the API call itself was not successful
    if (!response.ok) {
        console.error('Meta API Error:', responseData);
        const errorPayload = {
            status: "error",
            error: 'Falha ao chamar a API da Meta.',
            details: responseData,
            errorCode: "META_API_ERROR"
        };
        return new Response(JSON.stringify(errorPayload), {
            status: 200, // Always return 200 OK
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log('Meta API Success:', responseData);

    // Return a successful response
    const successPayload = { status: "success", data: responseData };
    return new Response(JSON.stringify(successPayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Function Error:', error);
    const errorPayload = {
        status: "error",
        error: error.message,
        errorCode: "FUNCTION_ERROR"
    };
    return new Response(JSON.stringify(errorPayload), {
      status: 200, // Always return 200 OK
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})