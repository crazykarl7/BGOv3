import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    // Create admin client
    const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create regular client for auth
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      throw new Error('Missing required parameters');
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get the access token
    const accessToken = authHeader.replace('Bearer ', '');

    // Verify the token and get the user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authUser) {
      console.error('Auth error:', authError);
      throw new Error('Invalid authentication token');
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await adminAuthClient
      .from('profiles')
      .select('is_admin')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Failed to verify admin status');
    }

    if (!profile?.is_admin) {
      throw new Error('Unauthorized - Admin access required');
    }

    // Update the user's password
    const { error: updateError } = await adminAuthClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ message: 'Password updated successfully' }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});