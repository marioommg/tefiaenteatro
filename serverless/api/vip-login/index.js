import crypto from 'crypto';
import { createPrivateKey } from 'crypto';
import bcrypt from 'bcryptjs';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({});

const DEFAULT_RELEASE_EPOCH = 1731081300;

const {
  VIP_PASSWORD_HASH = '',
  CF_PUBLIC_KEY_ID = '',
  CF_RESOURCE = '',
  COOKIE_DOMAIN = '',
  COOKIE_MAX_AGE = '86400',
  COOKIE_RENEW_THRESHOLD = '43200',
  PRIVATE_KEY_SECRET_ARN = '',
  PRIVATE_KEY_PEM = '',
  PRIVATE_KEY_CACHE_TTL_SECONDS = '',
  VIP_RELEASE_EPOCH = '',
  RATE_LIMIT_MAX = '10',
  RATE_LIMIT_WINDOW_SECONDS = '300',
  RESPONSE_TARGET_MS = '300',
} = process.env;

const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const parsedCacheTtl = Number.parseInt(PRIVATE_KEY_CACHE_TTL_SECONDS, 10);
const CACHE_NEVER_EXPIRES = !Number.isNaN(parsedCacheTtl) && parsedCacheTtl === 0;
const CACHE_TTL_MS = !Number.isNaN(parsedCacheTtl) && parsedCacheTtl > 0
  ? parsedCacheTtl * 1000
  : DEFAULT_CACHE_TTL_MS;

let cachedPrivateKey;
let cachedPrivateKeyAt = 0;
let cachedPrivateKeyPromise;
let cachedKeyObject;
let cachedKeyObjectAt = 0;
let cachedKeyObjectErr;
let cachedKeyObjectPem;

// Rate limiting testimonial (in-memory, secondary to Cloudflare WAF)
const rateLimitMap = new Map();
const RATE_LIMIT_MAX_N = Math.max(1, Number.parseInt(RATE_LIMIT_MAX, 10) || 10);
const RATE_LIMIT_WINDOW_MS = Math.max(1000, (Number.parseInt(RATE_LIMIT_WINDOW_SECONDS, 10) || 300)) * 1000;
const RESPONSE_TARGET_MS_N = Math.max(0, Number.parseInt(RESPONSE_TARGET_MS, 10) || 300);

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 60_000).unref?.();

function getClientIp(event) {
  return event.requestContext?.http?.sourceIp
    || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers?.['X-Forwarded-For']?.split(',')[0]?.trim()
    || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_N;
}

function cacheIsFresh() {
  if (!cachedPrivateKey) return false;
  if (CACHE_NEVER_EXPIRES) return true;
  return (Date.now() - cachedPrivateKeyAt) < CACHE_TTL_MS;
}

function decodeSecretString(out) {
  if (out.SecretString) return out.SecretString;
  if (out.SecretBinary) return Buffer.from(out.SecretBinary, 'base64').toString('utf8');
  return '';
}

function normalizePem(raw) {
  if (typeof raw !== 'string') return '';
  let text = raw.trim();
  if (!text.includes('\n') && text.includes('\\n')) {
    text = text.replace(/\\n/g, '\n');
  }
  text = text.replace(/\r/g, '');
  const headerMatch = text.match(/-----BEGIN [^-]+-----/);
  const footerMatch = text.match(/-----END [^-]+-----/);
  if (headerMatch && footerMatch) {
    const header = headerMatch[0];
    const footer = footerMatch[0];
    const body = text
      .replace(header, '')
      .replace(footer, '')
      .replace(/\s+/g, '');
    if (body) {
      const chunked = body.match(/.{1,64}/g)?.join('\n') || '';
      text = `${header}\n${chunked}\n${footer}\n`;
    }
  }
  return text;
}

async function getPrivateKeyPem() {
  if (PRIVATE_KEY_PEM) return normalizePem(PRIVATE_KEY_PEM);
  if (cacheIsFresh()) return cachedPrivateKey;
  if (cachedPrivateKeyPromise) return cachedPrivateKeyPromise;
  if (!PRIVATE_KEY_SECRET_ARN) throw new Error('Missing PRIVATE_KEY_SECRET_ARN');

  const loader = (async () => {
    const out = await sm.send(new GetSecretValueCommand({ SecretId: PRIVATE_KEY_SECRET_ARN }));
    const value = normalizePem(decodeSecretString(out));
    if (!value || !value.includes('PRIVATE KEY')) {
      throw new Error('Invalid private key');
    }
    cachedPrivateKey = value;
    cachedPrivateKeyAt = Date.now();
    return value;
  })();

  cachedPrivateKeyPromise = loader;
  loader
    .catch(() => {
      cachedPrivateKey = undefined;
      cachedPrivateKeyAt = 0;
    })
    .finally(() => {
      cachedPrivateKeyPromise = undefined;
    });

  return loader;
}

function tryCreateKeyObject(pem) {
  if (!pem || typeof pem !== 'string') throw new Error('Missing private key content');
  const now = Date.now();
  const samePem = cachedKeyObject && cachedKeyObjectPem === pem;
  const cacheValid = CACHE_NEVER_EXPIRES || (now - cachedKeyObjectAt) < CACHE_TTL_MS;
  if (samePem && cacheValid) return cachedKeyObject;
  if (cachedKeyObjectErr && cachedKeyObjectErr.pem === pem && cacheValid) throw cachedKeyObjectErr.err;

  try {
    const key = createPrivateKey({ key: pem });
    cachedKeyObject = key;
    cachedKeyObjectAt = now;
    cachedKeyObjectPem = pem;
    cachedKeyObjectErr = undefined;
    return key;
  } catch (err) {
    cachedKeyObject = undefined;
    cachedKeyObjectAt = 0;
    cachedKeyObjectPem = undefined;
    cachedKeyObjectErr = { pem, err };
    throw err;
  }
}

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

function hasExistingCookies(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const allNames = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
  return allNames.includes('CloudFront-Policy')
    && allNames.includes('CloudFront-Signature')
    && allNames.includes('CloudFront-Key-Pair-Id');
}

export const handler = async (event) => {
  const t0 = performance.now();

  const method = event.requestContext?.http?.method || 'GET';
  if (method !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const ip = getClientIp(event);

  if (isRateLimited(ip)) {
    console.log(JSON.stringify({ event: 'rate_limited', ip }));
    return jsonResponse(429, { error: 'Too Many Requests' });
  }

  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch {}
  const { password } = body || {};

  if (!password || !VIP_PASSWORD_HASH) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  let valid = false;
  try {
    valid = await bcrypt.compare(password, VIP_PASSWORD_HASH);
  } catch (err) {
    console.error('bcrypt compare error', err);
    return jsonResponse(500, { error: 'Internal Error' });
  }

  if (!valid) {
    const elapsed = performance.now() - t0;
    console.log(JSON.stringify({
      event: 'login_failed',
      ip,
      timestamp: new Date().toISOString(),
    }));
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  if (!CF_PUBLIC_KEY_ID || !CF_RESOURCE || (!PRIVATE_KEY_PEM && !PRIVATE_KEY_SECRET_ARN)) {
    console.error('Missing env CF_PUBLIC_KEY_ID/CF_RESOURCE/PRIVATE_KEY_SOURCE');
    return jsonResponse(500, { error: 'Server misconfigured' });
  }

  let privateKeyPem;
  let privateKey;
  try {
    privateKeyPem = await getPrivateKeyPem();
    privateKey = tryCreateKeyObject(privateKeyPem);
  } catch (err) {
    console.error('Private key load error', err);
    return jsonResponse(500, { error: 'Secret error' });
  }
  if (!privateKeyPem || !privateKeyPem.includes('PRIVATE KEY')) {
    return jsonResponse(500, { error: 'Invalid private key' });
  }

  const maxAge = Math.max(60, parseInt(COOKIE_MAX_AGE, 10) || 86400);
  const renewThreshold = Math.max(0, parseInt(COOKIE_RENEW_THRESHOLD, 10) || 43200);
  const existingCookies = hasExistingCookies(event);
  const effectiveMaxAge = (existingCookies && maxAge > renewThreshold) ? maxAge : maxAge;
  const expires = Math.floor(Date.now() / 1000) + effectiveMaxAge;

  let notBefore;
  if (VIP_RELEASE_EPOCH) {
    const n = parseInt(String(VIP_RELEASE_EPOCH), 10);
    if (!Number.isNaN(n) && n > 0) notBefore = n;
  } else if (DEFAULT_RELEASE_EPOCH && Number.isFinite(DEFAULT_RELEASE_EPOCH)) {
    notBefore = DEFAULT_RELEASE_EPOCH;
  }

  const resourceUrl = CF_RESOURCE;
  console.log(`Using configured resource: ${resourceUrl}`);

  const policy = {
    Statement: [{
      Resource: resourceUrl,
      Condition: {
        DateLessThan: { 'AWS:EpochTime': expires },
        ...(notBefore ? { DateGreaterThan: { 'AWS:EpochTime': notBefore } } : {})
      }
    }]
  };
  const policyStr = JSON.stringify(policy).replace(/\s+/g, '');

  let signature;
  try {
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(policyStr);
    signature = signer.sign(privateKey, 'base64');
    console.log('Policy generated:', policyStr);
  } catch (err) {
    console.error('Signing error', err);
    return jsonResponse(500, { error: 'Signing error' });
  }

  const baseAttrs = [
    'Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax', `Max-Age=${effectiveMaxAge}`
  ];
  const domainAttr = COOKIE_DOMAIN ? [`Domain=${COOKIE_DOMAIN}`] : [];
  const attrs = [...domainAttr, ...baseAttrs].join('; ');

  const cookies = [
    `CloudFront-Policy=${Buffer.from(policyStr).toString('base64')}; ${attrs}`,
    `CloudFront-Signature=${signature}; ${attrs}`,
    `CloudFront-Key-Pair-Id=${CF_PUBLIC_KEY_ID}; ${attrs}`,
  ];

  console.log(JSON.stringify({
    event: 'login_success',
    ip,
    sliding_session: existingCookies,
    timestamp: new Date().toISOString(),
  }));

  return {
    statusCode: 200,
    cookies,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ok: true, until: expires })
  };
};
