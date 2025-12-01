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
    console.log('Setting up rep accounts...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const reps = [
      {
        email: 'repcs001@pdfnest.local',
        password: 'CS0001',
        display_name: 'RepCS001',
        full_name: 'CS Course Rep',
        department_id: '432e7adb-d261-445a-a7a9-4ee2f6f1b168' // Computer Science
      },
      {
        email: 'repcys001@pdfnest.local', 
        password: 'CYS001',
        display_name: 'RepCYS001',
        full_name: 'CYS Course Rep',
        department_id: '7a9b1bc4-fa51-4fe8-89d4-2663244d5ab3' // Cyber Security
      }
    ];

    const results = [];
    
    for (const rep of reps) {
      console.log(`Creating user: ${rep.email}`);
      
      // Create user with admin API
      const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: rep.email,
        password: rep.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: rep.full_name }
      });

      if (createError) {
        console.error(`Error creating user ${rep.email}:`, createError);
        results.push({ email: rep.email, error: createError.message });
        continue;
      }

      console.log(`User created: ${user.user.id}`);

      // Update profile with department and display name
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          department_id: rep.department_id,
          display_name: rep.display_name
        })
        .eq('id', user.user.id);

      if (profileError) {
        console.error(`Error updating profile for ${rep.email}:`, profileError);
      }

      // Assign rep role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: user.user.id,
          role: 'rep'
        });

      if (roleError) {
        console.error(`Error assigning role to ${rep.email}:`, roleError);
      }

      results.push({ 
        email: rep.email, 
        success: true, 
        userId: user.user.id,
        displayName: rep.display_name
      });

      console.log(`Successfully set up rep account: ${rep.email}`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Rep accounts setup completed',
        results 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in setup-rep-accounts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
