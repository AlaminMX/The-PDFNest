import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw roleError;

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin privileges required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId)) {
      return new Response(JSON.stringify({ error: "Valid userId (UUID) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === authData.user.id) {
      return new Response(JSON.stringify({ error: "Admins cannot delete their own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userFiles, error: filesError } = await supabaseAdmin
      .from("pdf_files")
      .select("storage_path, thumbnail_url")
      .eq("user_id", userId);

    if (filesError) throw filesError;

    const storagePaths = (userFiles || []).map((file) => file.storage_path).filter(Boolean);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage.from("pdfs").remove(storagePaths);
      if (storageError) throw storageError;
    }

    const thumbnailPaths = (userFiles || []).map((file) => file.thumbnail_url).filter(Boolean);
    if (thumbnailPaths.length > 0) {
      const { error: thumbnailError } = await supabaseAdmin.storage.from("pdf-thumbnails").remove(thumbnailPaths);
      if (thumbnailError) throw thumbnailError;
    }

    // Community contributions live in a different bucket and community_uploads
    // has no foreign key back to the user, so without this they'd be left
    // permanently orphaned — no owner, and no other code path ever revisits
    // them for cleanup.
    //
    // IMPORTANT: only pending/rejected uploads are safe to remove here.
    // Once a upload is approved, approve_community_upload() inserts a
    // lecture_notes row that points at this exact same file_path — it does
    // not copy the file to a new location. Deleting an approved upload's
    // file would silently break a live, published lecture note for every
    // student trying to access it, so approved uploads are left untouched;
    // they're no longer "this user's" content once published.
    const { data: communityUploads, error: communityFetchError } = await supabaseAdmin
      .from("community_uploads")
      .select("id, file_path")
      .eq("user_id", userId)
      .in("status", ["pending", "rejected"]);

    if (communityFetchError) throw communityFetchError;

    const communityFilePaths = (communityUploads || []).map((upload) => upload.file_path).filter(Boolean);
    if (communityFilePaths.length > 0) {
      const { error: communityStorageError } = await supabaseAdmin.storage.from("school_pdfs").remove(communityFilePaths);
      if (communityStorageError) throw communityStorageError;
    }

    if ((communityUploads || []).length > 0) {
      const { error: communityDeleteError } = await supabaseAdmin
        .from("community_uploads")
        .delete()
        .eq("user_id", userId)
        .in("status", ["pending", "rejected"]);
      if (communityDeleteError) throw communityDeleteError;
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) throw profileDeleteError;

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
