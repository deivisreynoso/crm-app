import { createServerSideClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientIpFromRequest } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const limit = checkRateLimit(`health:${ip}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: limit.retryAfterSec
          ? { 'Retry-After': String(limit.retryAfterSec) }
          : undefined,
      }
    );
  }

  try {
    const supabase = createServerSideClient();

    const { error } = await supabase
      .from('contacts')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Health check database error:', error);
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 500 }
    );
  }
}
