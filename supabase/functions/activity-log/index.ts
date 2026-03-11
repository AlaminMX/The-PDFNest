import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REDACT_KEYS = [
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "email",
  "phone",
  "cookie",
  "access_token",
  "refresh_token",
];

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitize);

  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, rawVal] of Object.entries(input)) {
      if (REDACT_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        output[key] = "[REDACTED]";
        continue;
      }

      output[key] = sanitize(rawVal);
    }

    return output;
  }

  if (typeof value === "string" && value.length > 2000) {
    return `${value.slice(0, 2000)}...[truncated]`;
  }

  return value;
}

function getIpAddress(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return req.headers.get("x-real-ip");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    let userId = "guest";
    if (token) {
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData.user?.id) {
        userId = authData.user.id;
      }
    }

    const body = await req.json().catch(() => ({}));

    const timestamp = typeof body.timestamp === "string" ? body.timestamp : new Date().toISOString();
    const sessionId = typeof body.session_id === "string" && body.session_id.trim() ? body.session_id.trim() : crypto.randomUUID();
    const action = typeof body.action === "string" && body.action.trim() ? body.action.trim().toUpperCase() : "UNKNOWN";
    const resource = typeof body.resource === "string" && body.resource.trim() ? body.resource.trim() : "/unknown";
    const status = typeof body.status === "string" || typeof body.status === "number"
      ? String(body.status)
      : "UNKNOWN";

    const requestContext = {
      ...((typeof body.context === "object" && body.context !== null) ? body.context : {}),
      ip_address: getIpAddress(req),
      user_agent: req.headers.get("user-agent") || null,
    };

    const context = sanitize(requestContext);

    const { error: insertError } = await supabase.rpc("insert_activity_event", {
      p_timestamp: timestamp,
      p_user_id: userId,
      p_session_id: sessionId,
      p_action: action,
      p_resource: resource,
      p_status: status,
      p_context: context,
    });

    if (insertError) {
      console.error("insert_activity_event failed", insertError);
      return new Response(JSON.stringify({ error: "Failed to write activity log" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "LOGIN_FAILED" && token && userId !== "guest") {
      const identifier =
        typeof body.context?.identifier === "string" && body.context.identifier.trim()
          ? body.context.identifier.trim().toLowerCase()
          : "unknown";

      const ipAddress = getIpAddress(req);
      const userAgent = req.headers.get("user-agent") || null;
      const { data: failCount, error: failError } = await supabase.rpc("record_failed_login_attempt", {
        p_identifier: identifier,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_session_id: sessionId,
        p_context: context,
      });

      if (!failError && typeof failCount === "number" && failCount >= 5) {
        await supabase.rpc("insert_activity_event", {
          p_timestamp: new Date().toISOString(),
          p_user_id: userId,
          p_session_id: sessionId,
          p_action: "MULTI_FAILED_LOGIN",
          p_resource: "/auth/login",
          p_status: "ALERT",
          p_context: sanitize({
            security_event: true,
            fail_count_last_15_min: failCount,
            identifier,
            ip_address: ipAddress,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, session_id: sessionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("activity-log function failed", error);
    return new Response(JSON.stringify({ error: "Unhandled logging error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
