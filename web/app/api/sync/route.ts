import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // 1. Get the Authorization Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing session token.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // 2. Validate user using Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    // 3. Parse request body
    const body = await req.json();
    const { events } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ message: 'No events to sync.' }, { status: 200 });
    }

    // 4. Transform events to match DB schema (attach user_id)
    const logsToInsert = events.map((event: any) => ({
      user_id: user.id,
      domain: event.domain,
      category: event.category,
      duration_seconds: event.duration_seconds,
      start_time: event.start_time,
      work_date: event.work_date
    }));

    // 5. Batch insert into activity_logs
    const { error: dbError } = await supabase
      .from('activity_logs')
      .insert(logsToInsert);

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ message: `Successfully synced ${events.length} activities.` }, { status: 201 });
  } catch (error: any) {
    console.error('API sync error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
