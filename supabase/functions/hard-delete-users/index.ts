import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log(`Function "hard-delete-users" up and running!`);

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Find users marked for deletion more than 10 days ago
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("is_deleted", true)
      .lt("deleted_at", tenDaysAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No users to hard delete.");
      return new Response(JSON.stringify({ message: "No users to hard delete." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${profiles.length} users to hard delete.`);

    for (const profile of profiles) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);

      if (deleteAuthError) {
        console.error(`Error deleting user ${profile.id} from auth:`, deleteAuthError);
        // Continue to next user even if one fails
      } else {
        console.log(`User ${profile.id} hard deleted from auth.`);
        // If profiles table has ON DELETE CASCADE, this will also delete the profile row.
        // Otherwise, we would need to explicitly delete from profiles table here.
      }
    }

    return new Response(
      JSON.stringify({ message: `Attempted to hard delete ${profiles.length} users.` }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in hard-delete-users function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
