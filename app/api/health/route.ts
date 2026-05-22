import { createServerSideClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSideClient();

    // Test query - get user count
    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}