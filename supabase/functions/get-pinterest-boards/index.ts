import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const jwt = authHeader.replace('Bearer ', '');
    const [, payload] = decode(jwt);
    const userId = payload?.sub;
    if (!userId) throw new Error('Could not extract user ID from JWT');

    const { data: connection, error: connError } = await supabaseAdmin
      .from('social_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'pinterest')
      .single();

    if (connError || !connection) {
      throw new Error('Pinterest connection not found.');
    }

    const accessToken = connection.access_token;
    const boardsUrl = 'https://api.pinterest.com/v5/boards';

    const response = await fetch(boardsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Pinterest API Error (Get Boards):", errorBody);
      throw new Error('Failed to fetch boards from Pinterest.');
    }

    const { items: boards } = await response.json();
    const simplifiedBoards = boards.map((board: any) => ({ id: board.id, name: board.name }));

    return new Response(JSON.stringify({ boards: simplifiedBoards }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
