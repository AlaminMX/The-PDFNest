import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  departmentId: string;
  courseCode: string;
  noteTitle: string;
  uploadedBy: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth context to validate token
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await userSupabase.auth.getUser(token);

    if (authError || !claims?.user) {
      console.error("Auth validation failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller has rep or admin role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.user.id);

    const hasPermission = userRoles?.some(r => r.role === "rep" || r.role === "admin");
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Forbidden: requires rep or admin role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lovableApiKey) {
      console.log("LOVABLE_API_KEY not configured, skipping notifications");
      return new Response(
        JSON.stringify({ success: true, message: "Notifications disabled - no API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { departmentId, courseCode, noteTitle, uploadedBy }: NotifyRequest = await req.json();

    if (!departmentId || !courseCode || !noteTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Notifying users in department ${departmentId} about new note: ${noteTitle}`);

    // Get department name
    const { data: department } = await supabase
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .single();

    const departmentName = department?.name || "your department";

    // Get users in this department who have email notifications enabled
    // For now, we'll notify all users in the department (email_notifications_enabled could be added later)
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("department_id", departmentId)
      .not("email", "is", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("No users to notify");
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${users.length} users to notify`);

    // For now, log the notification (email sending can be added with an email service)
    // This creates an activity log entry that can be used later
    const notifications = users.map(user => ({
      user_id: user.id,
      notification_type: "new_lecture_note",
      department_id: departmentId,
      metadata: {
        department_name: departmentName,
        course_code: courseCode,
        note_title: noteTitle,
        uploaded_by: uploadedBy,
      },
      is_read: false,
    }));

    // Insert notification records into user_notifications
    const { error: logError } = await supabase
      .from("user_notifications")
      .insert(notifications);

    if (logError) {
      console.error("Error logging notifications:", logError);
      // Don't throw - notification logging failure shouldn't block the upload
    }

    console.log(`Successfully logged notifications for ${users.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: users.length,
        departmentName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-department-users:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});