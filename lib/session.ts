import crypto from 'node:crypto';
import type { SessionUser } from '@/types/auth';

export const SESSION_COOKIE_NAME = 'osi-session';

type SessionTokenPayload = SessionUser & {
  iat: number;
  exp: number;
};

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecodeToBuffer(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'SESSION_SECRET is not set; using an insecure development default.',
    );
    return 'insecure-dev-secret';
  }

  throw new Error('SESSION_SECRET is required in production.');
}

function sign(data: string, secret: string) {
  return base64UrlEncode(crypto.createHmac('sha256', secret).update(data).digest());
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createSessionToken(user: SessionUser, maxAgeSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    ...user,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = sign(body, getSessionSecret());
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) {
    return null;
  }

  const expected = sign(body, getSessionSecret());
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    const raw = base64UrlDecodeToBuffer(body).toString('utf8');
    const payload = JSON.parse(raw) as SessionTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.exp || payload.exp <= now) {
      return null;
    }

    const { iat: _iat, exp: _exp, ...user } = payload;
    return user;
  } catch {
    return null;
  }
}

