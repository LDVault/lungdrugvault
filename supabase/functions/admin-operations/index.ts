import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminRequest {
  action: 'list_users' | 'grant_admin' | 'revoke_admin' | 'reset_password';
  userId?: string;
  newPassword?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Admin check error:', roleError);
      return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, newPassword }: AdminRequest = await req.json();
    console.log('Admin operation:', action, 'for user:', userId);

    if (action === 'list_users') {
      const { data: { users }, error } = await supabaseClient.auth.admin.listUsers();
      
      if (error) {
        console.error('Error listing users:', error);
        throw error;
      }

      // Get user roles
      const { data: userRoles } = await supabaseClient
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = users.map(user => ({
        id: user.id,
        email: user.email || 'No email',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
        isAdmin: userRoles?.some(r => r.user_id === user.id && r.role === 'admin') || false,
      }));

      return new Response(JSON.stringify({ users: usersWithRoles }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'grant_admin' && userId) {
      // Check if user already has admin role
      const { data: existingRole } = await supabaseClient
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (existingRole) {
        return new Response(JSON.stringify({ message: 'User already has admin role' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        console.error('Error granting admin:', error);
        throw error;
      }

      return new Response(JSON.stringify({ message: 'Admin privileges granted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'revoke_admin' && userId) {
      const { error } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        console.error('Error revoking admin:', error);
        throw error;
      }

      return new Response(JSON.stringify({ message: 'Admin privileges revoked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset_password' && userId && newPassword) {
      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (error) {
        console.error('Error resetting password:', error);
        throw error;
      }

      return new Response(JSON.stringify({ message: 'Password reset successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in admin operations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});