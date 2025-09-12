import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Storage cleanup function initialized.");

// The function will be triggered by a cron job, so it doesn't need to handle different HTTP methods.
serve(async (req) => {
  try {
    // 1. Initialize Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const BUCKETS_TO_CLEAN = ["post-images", "processed-videos", "raw-videos"];
    let totalOrphanedFiles = 0;

    // 2. Get all media URLs currently in use
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('generated_posts')
      .select('media_urls');

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`);
    }

    const activeUrls = new Set<string>();
    if (posts) {
        posts.forEach(post => {
            if (post.media_urls && Array.isArray(post.media_urls)) {
                post.media_urls.forEach(url => activeUrls.add(url));
            }
        });
    }
    console.log(`Found ${activeUrls.size} active media URLs in use.`);

    // 3. Iterate over buckets and clean orphans
    for (const bucket of BUCKETS_TO_CLEAN) {
      const { data: files, error: listError } = await supabaseAdmin.storage.from(bucket).list();

      if (listError) {
        console.error(`Could not list files in bucket ${bucket}:`, listError.message);
        continue; // Skip to next bucket on error
      }

      if (!files || files.length === 0) {
        console.log(`Bucket ${bucket} is empty. Nothing to clean.`);
        continue;
      }

      const filePaths = files.map(file => file.name);
      const orphanedFilePaths: string[] = [];

      // 4. Identify orphaned files
      filePaths.forEach(filePath => {
        const publicURL = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
        if (!activeUrls.has(publicURL)) {
          orphanedFilePaths.push(filePath);
        }
      });

      if (orphanedFilePaths.length === 0) {
        console.log(`No orphaned files found in bucket ${bucket}.`);
        continue;
      }

      console.log(`Found ${orphanedFilePaths.length} orphaned files in ${bucket}. Preparing to delete...`);

      // 5. Delete orphaned files
      const { error: deleteError } = await supabaseAdmin.storage.from(bucket).remove(orphanedFilePaths);

      if (deleteError) {
        console.error(`Failed to delete files from ${bucket}:`, deleteError.message);
      } else {
        totalOrphanedFiles += orphanedFilePaths.length;
        console.log(`Successfully deleted ${orphanedFilePaths.length} files from ${bucket}.`);
      }
    }

    const responseMessage = `Storage cleanup complete. Total orphaned files deleted: ${totalOrphanedFiles}.`;
    console.log(responseMessage);

    return new Response(JSON.stringify({ message: responseMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error during storage cleanup:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});