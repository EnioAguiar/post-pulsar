import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, type FileObject } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Storage cleanup function initialized.");

// Fully recursive function to list all files in all subdirectories.
async function listAllFiles(bucket: any, path = ""): Promise<string[]> {
  const { data, error } = await bucket.list(path);
  if (error) {
    console.error(`Could not list files in path ${path}:`, error.message);
    return [];
  }

  const currentPath = path ? `${path}/` : "";
  
  // Get files in the current path
  let files = data
    .filter((file: FileObject) => file.id !== null)
    .map((file: FileObject) => `${currentPath}${file.name}`);

  // For each directory, recurse and add its files
  const directories = data.filter((file: FileObject) => file.id === null);
  for (const dir of directories) {
    const subFiles = await listAllFiles(bucket, `${currentPath}${dir.name}`);
    files = files.concat(subFiles);
  }

  return files;
}

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const BUCKETS_TO_CLEAN = ["post-images", "processed-videos", "raw-videos"];
    let totalOrphanedFiles = 0;

    const { data: posts, error: postsError } = await supabaseAdmin
      .from("generated_posts")
      .select("media_urls");

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`);
    }

    const activeUrls = new Set<string>();
    posts?.forEach((post) => {
      if (post.media_urls && Array.isArray(post.media_urls)) {
        post.media_urls.forEach((url) => {
          if (url) activeUrls.add(url);
        });
      }
    });
    console.log(`Found ${activeUrls.size} active media URLs in use.`);
    if (activeUrls.size > 0) {
        console.log("Sample active URLs:", Array.from(activeUrls).slice(0, 5));
    }

    for (const bucketName of BUCKETS_TO_CLEAN) {
      console.log(`\n--- Processing bucket: ${bucketName} ---`);
      const bucket = supabaseAdmin.storage.from(bucketName);
      
      const allFilePaths = await listAllFiles(bucket);

      if (allFilePaths.length === 0) {
        console.log(`Bucket ${bucketName} is empty.`);
        continue;
      }

      const orphanedFilePaths: string[] = [];
      console.log(`Checking ${allFilePaths.length} files in bucket ${bucketName}...`);

      for (const filePath of allFilePaths) {
        if (filePath.endsWith(".emptyFolderPlaceholder")) continue;

        const { data: { publicUrl } } = bucket.getPublicUrl(filePath);
        if (!activeUrls.has(publicUrl)) {
          orphanedFilePaths.push(filePath);
        }
      }

      if (orphanedFilePaths.length === 0) {
        console.log(`No orphaned files found in bucket ${bucketName}.`);
        continue;
      }

      console.log(`Found ${orphanedFilePaths.length} orphaned files in ${bucketName}.`);
      console.log("Orphaned file paths to be deleted:", orphanedFilePaths);

      const { error: deleteError } = await bucket.remove(orphanedFilePaths);

      if (deleteError) {
        console.error(`Failed to delete files from ${bucketName}:`, deleteError.message);
      } else {
        totalOrphanedFiles += orphanedFilePaths.length;
        console.log(`Successfully deleted ${orphanedFilePaths.length} files from ${bucketName}.`);
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
