const { COOKIE_DOMAIN = "" } = process.env;

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "https://tefiaenteatro.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

const COOKIE_NAMES = [
  "CloudFront-Policy",
  "CloudFront-Signature",
  "CloudFront-Key-Pair-Id",
];

function buildExpiredCookies() {
  const baseExpiredAttrs = [
    "Path=/",
    "Secure",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  const domains = [];
  if (COOKIE_DOMAIN) domains.push(COOKIE_DOMAIN);
  if (COOKIE_DOMAIN && !COOKIE_DOMAIN.startsWith(".")) domains.push(`.${COOKIE_DOMAIN}`);
  domains.push(undefined);

  const out = [];
  for (const name of COOKIE_NAMES) {
    for (const dom of domains) {
      const attrs = dom ? [`Domain=${dom}`, ...baseExpiredAttrs] : baseExpiredAttrs;
      out.push(`${name}=deleted; ${attrs.join("; ")}`);
    }
  }
  return Array.from(new Set(out));
}

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";

    if (method === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS };
    }

    if (method !== "POST") {
      return {
        statusCode: 405,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const cookies = buildExpiredCookies();
    const isHttpApi = !!event.requestContext?.http;

    const extraHeaders = {
      ...CORS_HEADERS,
      "Clear-Site-Data": '"cookies"',
    };

    if (isHttpApi) {
      return {
        statusCode: 200,
        cookies,
        headers: extraHeaders,
        body: JSON.stringify({ ok: true }),
      };
    }

    return {
      statusCode: 200,
      multiValueHeaders: { "Set-Cookie": cookies },
      headers: extraHeaders,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("vip-logout error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal Error" }),
    };
  }
};
