import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimetableChangePayload {
  departmentId: string;
  changeType: "slot_added" | "slot_updated" | "slot_removed";
  courseCode: string;
  courseName: string;
  changedBy: string;
  slotsAffected?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: TimetableChangePayload = await req.json();
    const { departmentId, changeType, courseCode, courseName, changedBy, slotsAffected = 1 } = payload;

    console.log(`[notify-timetable-change] Processing ${changeType} for ${courseCode} in department ${departmentId}`);

    if (!departmentId || !changeType || !courseCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: departmentId, changeType, courseCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get department name
    const { data: department, error: deptError } = await supabase
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .single();

    if (deptError || !department) {
      console.error("[notify-timetable-change] Department not found:", deptError);
      return new Response(
        JSON.stringify({ error: "Department not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users in this department
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("department_id", departmentId);

    if (usersError) {
      console.error("[notify-timetable-change] Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("[notify-timetable-change] No users found in department");
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications for all department users
    const changeMessages = {
      slot_added: `New time slot${slotsAffected > 1 ? "s" : ""} added`,
      slot_updated: `Time slot${slotsAffected > 1 ? "s" : ""} updated`,
      slot_removed: `Time slot${slotsAffected > 1 ? "s" : ""} removed`,
    };

    const notifications = users.map((user) => ({
      user_id: user.id,
      department_id: departmentId,
      notification_type: "timetable_update",
      metadata: {
        department_name: department.name,
        course_code: courseCode,
        course_name: courseName,
        change_type: changeType,
        change_message: changeMessages[changeType],
        changed_by: changedBy,
        slots_affected: slotsAffected,
      },
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("user_notifications")
      .insert(notifications);

    if (insertError) {
      console.error("[notify-timetable-change] Error inserting notifications:", insertError);
      throw insertError;
    }

    console.log(`[notify-timetable-change] Successfully notified ${users.length} users`);

    return new Response(
      JSON.stringify({ success: true, notified: users.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[notify-timetable-change] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
