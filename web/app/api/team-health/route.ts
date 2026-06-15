import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user role is indeed manager
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Managers only.' }, { status: 403 });
    }

    // Call RPC function to get aggregate statistics
    const { data: stats, error: rpcError } = await supabase
      .rpc('get_team_health_stats', { manager_user_id: user.id });

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json({ teams: stats || [] }, { status: 200 });
  } catch (error: any) {
    console.error('API team-health error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
