import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please add RESEND_API_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse input
    const { subject, body: emailBodyText } = await req.json();
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Subject is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!emailBodyText || typeof emailBodyText !== "string" || emailBodyText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (subject.length > 200) {
      return new Response(JSON.stringify({ error: "Subject too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (emailBodyText.length > 5000) {
      return new Response(JSON.stringify({ error: "Body too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all waitlist emails
    const { data: waitlistData, error: waitlistError } = await supabase
      .from("store_waitlist")
      .select("email, name");
    if (waitlistError) throw waitlistError;

    if (!waitlistData || waitlistData.length === 0) {
      return new Response(JSON.stringify({ error: "No waitlist entries found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build HTML email
    const bodyHtml = emailBodyText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://pdfnest.lovable.app/pdfnest-logo.png" alt="PDFNest" style="height:48px;width:auto;" />
    </div>
    <h1 style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:16px;">${subject.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
    <div style="font-size:16px;line-height:1.6;color:#333333;margin-bottom:32px;">
      ${bodyHtml}
    </div>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />
    <p style="font-size:12px;color:#999999;text-align:center;">
      You're receiving this because you joined the PDFNest School Store waitlist.
    </p>
  </div>
</body>
</html>`;

    // Send emails in batches
    let sent = 0;
    let failed = 0;

    // Deduplicate emails
    const uniqueEmails = [...new Map(waitlistData.map((e) => [e.email.toLowerCase(), e])).values()];

    for (const entry of uniqueEmails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "PDFNest <onboarding@resend.dev>",
            to: [entry.email],
            subject: subject,
            html: htmlTemplate,
          }),
        });
        const resText = await res.text();
        if (res.ok) {
          sent++;
        } else {
          console.error(`Failed to send to ${entry.email}: ${resText}`);
          failed++;
        }
      } catch (emailErr) {
        console.error(`Error sending to ${entry.email}:`, emailErr);
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed, total: uniqueEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
