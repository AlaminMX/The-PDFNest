import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { repId, email, password, displayName, departmentId, facultyId } = await req.json();

    // Input validation - repId is required
    if (!repId || typeof repId !== 'string' || !UUID_REGEX.test(repId)) {
      return new Response(
        JSON.stringify({ error: "Valid repId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user exists and is a rep
    const { data: repRole, error: repRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", repId)
      .eq("role", "rep")
      .maybeSingle();

    if (repRoleError || !repRole) {
      return new Response(
        JSON.stringify({ error: "Rep not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating rep account: ${repId}`);

    // Update auth credentials if provided
    if (email || password) {
      const authUpdate: { email?: string; password?: string } = {};
      
      if (email) {
        if (typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
          return new Response(
            JSON.stringify({ error: "Invalid email format" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        authUpdate.email = email;
      }
      
      if (password) {
        if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
          return new Response(
            JSON.stringify({ error: "Password must be between 6 and 128 characters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        authUpdate.password = password;
      }

      if (Object.keys(authUpdate).length > 0) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          repId,
          authUpdate
        );

        if (updateAuthError) {
          console.error("Error updating auth:", updateAuthError);
          return new Response(
            JSON.stringify({ error: updateAuthError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log(`Auth credentials updated for: ${repId}`);
      }
    }

    // Update profile if displayName or departmentId provided
    const profileUpdate: { display_name?: string; department_id?: string | null; faculty_id?: string | null } = {};
    
    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.length > 100) {
        return new Response(
          JSON.stringify({ error: "Display name must be 1-100 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      profileUpdate.display_name = displayName.trim();
    }
    
    if (departmentId !== undefined) {
      if (departmentId !== null && (typeof departmentId !== 'string' || !UUID_REGEX.test(departmentId))) {
        return new Response(
          JSON.stringify({ error: "Invalid department ID format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      profileUpdate.department_id = departmentId;
    }

    if (facultyId !== undefined) {
      if (facultyId !== null && (typeof facultyId !== 'string' || !UUID_REGEX.test(facultyId))) {
        return new Response(
          JSON.stringify({ error: "Invalid faculty ID format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      profileUpdate.faculty_id = facultyId;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", repId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Profile updated for: ${repId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Rep account updated successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-rep-account:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
