import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);
    const repUserId = url.searchParams.get('userId');

    if (!repUserId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching stats for rep:', repUserId);

    // Get rep profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('display_name, department_id')
      .eq('id', repUserId)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Rep profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get department name
    let departmentName = null;
    if (profile.department_id) {
      const { data: dept } = await supabaseClient
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .maybeSingle();
      departmentName = dept?.name || null;
    }

    // Get lecture notes uploaded by this rep
    const { data: notes, error: notesError } = await supabaseClient
      .from('lecture_notes')
      .select(`
        id,
        title,
        file_size,
        views,
        created_at,
        course_id,
        courses (
          code,
          name
        )
      `)
      .eq('uploaded_by', repUserId)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch lecture notes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate stats
    const totalUploads = notes?.length || 0;
    const totalViews = notes?.reduce((sum, note) => sum + (note.views || 0), 0) || 0;
    const lastUpload = notes && notes.length > 0 ? notes[0].created_at : null;

    return new Response(
      JSON.stringify({
        profile: {
          displayName: profile.display_name,
          departmentName,
        },
        stats: {
          totalUploads,
          totalViews,
          lastUpload,
        },
        recentNotes: notes || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
