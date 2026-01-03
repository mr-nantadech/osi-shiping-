import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = verifySessionToken(token);
  if (!user) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      maxAge: 0,
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ user }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

