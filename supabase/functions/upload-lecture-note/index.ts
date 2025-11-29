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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Upload request from user:', user.id);

    // Check if user is a rep
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'rep')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('User is not a rep:', roleError);
      return new Response(JSON.stringify({ error: 'Only course reps can upload lecture notes' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile with display_name and department
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('display_name, department_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.display_name || !profile.department_id) {
      console.error('Profile incomplete:', profileError);
      return new Response(JSON.stringify({ error: 'Profile incomplete. Please set your display name and department.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;
    const title = formData.get('title') as string;

    if (!file || !courseId || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return new Response(JSON.stringify({ error: 'Only PDF files are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size (25MB)
    if (file.size > 26214400) {
      return new Response(JSON.stringify({ error: 'File size must be less than 25MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify course belongs to rep's department
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('department_id, code')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (course.department_id !== profile.department_id) {
      return new Response(JSON.stringify({ error: 'You can only upload to courses in your department' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get department slug for file path
    const { data: dept, error: deptError } = await supabaseClient
      .from('departments')
      .select('slug')
      .eq('id', course.department_id)
      .single();

    if (deptError || !dept) {
      return new Response(JSON.stringify({ error: 'Department not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique file name
    const fileExt = 'pdf';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${dept.slug}/${course.code}/lecture_notes/${fileName}`;

    console.log('Uploading file to:', filePath);

    // Upload file to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('school_pdfs')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create lecture note record
    const { data: lectureNote, error: insertError } = await supabaseClient
      .from('lecture_notes')
      .insert({
        course_id: courseId,
        uploaded_by: user.id,
        uploaded_by_display: profile.display_name,
        title,
        file_path: filePath,
        file_size: file.size,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Clean up uploaded file
      await supabaseClient.storage.from('school_pdfs').remove([filePath]);
      return new Response(JSON.stringify({ error: 'Failed to create lecture note record', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Lecture note created successfully:', lectureNote.id);

    return new Response(JSON.stringify({ success: true, lectureNote }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
