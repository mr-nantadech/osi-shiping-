import axios from 'axios';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { LoginPayload, LoginResponse, SessionUser } from '@/types/auth';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

const REMOTE_LOGIN_URL = process.env.LOGIN_API_URL ?? 'https://saleosi-api-qas.sji.co.th/auth/login';
const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS ?? 60 * 60 * 12);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginPayload;

    const response = await axios.post<LoginResponse>(REMOTE_LOGIN_URL, body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    const { data } = response;

    if (response.status >= 200 && response.status < 300 && data?.data_model) {
      const { password: _password, ...safeUser } = data.data_model;
      const token = createSessionToken(
        safeUser satisfies SessionUser,
        SESSION_MAX_AGE_SECONDS,
      );

      const nextResponse = NextResponse.json(
        { ...data, data_model: safeUser },
        { status: response.status },
      );

      nextResponse.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
        domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
      });

      nextResponse.headers.set('Cache-Control', 'no-store');
      return nextResponse;
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      {
        message: ['Unable to reach login service'],
        is_completed: false,
        data_model: null,
      } satisfies LoginResponse,
      { status: 500 },
    );
  }
}
