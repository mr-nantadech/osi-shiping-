import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    maxAge: 0,
    path: '/',
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

