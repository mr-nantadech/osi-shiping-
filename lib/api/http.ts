import axios from 'axios';

// Use the Next.js rewrite on the client (same-origin /api/*) to avoid CORS; fall back to the real host on the server.
const isServer = typeof window === 'undefined';
const apiBaseUrl = isServer
  ? process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://osi-shipping-api-qas.osilab.co.th/'
  : '';

const apiAuthUrl = isServer
  ? process.env.NEXT_PUBLIC_API_AUTH_URL || 'https://authapi-qas.osilab.co.th/'
  : '';

export const http = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const httpAuth = axios.create({
  baseURL: apiAuthUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

