import Constants from 'expo-constants';

export function apiBase() {
  return (
    Constants.expoConfig?.extra?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://10.0.2.2:4000/api'
  );
}

/** Normalize email for lookup only — never alter the password. */
export function normalizeEmail(email) {
  return String(email || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
}

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function errorFrom(res, json, fallback) {
  const message = json?.error?.message || json?.message || fallback;
  const code = json?.error?.code || null;
  const err = new Error(message);
  err.status = res.status;
  err.code = code;
  err.network = false;
  return err;
}

function mapHttpError(res, json) {
  if (res.status === 401 || json?.error?.code === 'INVALID_CREDENTIALS') {
    return errorFrom(res, json, 'Invalid email or password');
  }
  if (res.status === 409) {
    return errorFrom(res, json, 'Email already registered');
  }
  if (res.status >= 500) {
    const err = new Error('Server error — try again in a moment.');
    err.status = res.status;
    err.code = json?.error?.code || 'SERVER_ERROR';
    err.network = false;
    return err;
  }
  if (res.status === 429) {
    const err = new Error('Too many attempts — wait a few minutes and try again.');
    err.status = 429;
    err.code = 'RATE_LIMIT';
    return err;
  }
  return errorFrom(res, json, `Request failed (${res.status})`);
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error(
      `Cannot reach API at ${apiBase()}. Start the backend or set EXPO_PUBLIC_API_URL.`
    );
    err.network = true;
    err.cause = e;
    err.status = 0;
    err.code = 'NETWORK';
    throw err;
  }
  const json = await parseJson(res);
  if (!res.ok) throw mapHttpError(res, json);
  return json.data ?? json;
}

export async function loginRequest({ email, password }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) {
    const err = new Error('Email and password are required.');
    err.code = 'VALIDATION';
    err.status = 400;
    throw err;
  }
  // Password is sent exactly as entered (no trim) — only email is normalized.
  return post('/auth/login', { email: normalized, password });
}

export async function registerRequest({ email, password, name, occupation }) {
  const normalized = normalizeEmail(email);
  const displayName = String(name || '').trim();
  if (!normalized || !password || !displayName) {
    const err = new Error('Name, email and password are required.');
    err.code = 'VALIDATION';
    err.status = 400;
    throw err;
  }
  return post('/auth/register', {
    email: normalized,
    password,
    name: displayName,
    occupation: occupation || 'other',
  });
}

export async function forgotPasswordRequest(email) {
  return post('/auth/forgot-password', { email: normalizeEmail(email) });
}

export async function logoutRequest({ accessToken, refreshToken }) {
  if (!accessToken) return { revoked: false, reason: 'no_token' };
  try {
    const res = await fetch(`${apiBase()}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return { revoked: false, reason: `http_${res.status}` };
    return { revoked: true };
  } catch {
    return { revoked: false, reason: 'network' };
  }
}
