import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const { SES_SENDER_EMAIL, SES_REGION, PHOTO_REPORT_SECRET } = process.env;

const sesConfig = { ...(SES_REGION ? { region: SES_REGION } : {}), requestTimeout: 10000 };
const ses = new SESClient(sesConfig);

const ALLOWED_ORIGINS = new Set([
  "https://tefiaenteatro.com",
  "https://www.tefiaenteatro.com",
]);

function corsHeaders(event) {
  const reqOrigin = event.headers?.origin || event.headers?.Origin || "";
  const allowOrigin = ALLOWED_ORIGINS.has(reqOrigin)
    ? reqOrigin
    : "https://tefiaenteatro.com";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Report-Auth",
    "Access-Control-Max-Age": "86400",
  };
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 3600000;
const rateLimitStore = new Map();

function getRateLimitKey(ip) {
  return `photo-report:${ip}`;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const key = getRateLimitKey(ip);
  const record = rateLimitStore.get(key);
  if (record && now - record.windowStart < RATE_LIMIT_WINDOW_MS) {
    if (record.count >= RATE_LIMIT_MAX) {
      return false;
    }
    record.count++;
    return true;
  }
  rateLimitStore.set(key, { windowStart: now, count: 1 });
  return true;
}

function escapeHtml(s) {
  if (typeof s !== "string") return s || "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isValidSecret(headers) {
  if (!PHOTO_REPORT_SECRET) return false;
  const provided = headers["x-report-auth"] || headers["X-Report-Auth"] || "";
  return provided === PHOTO_REPORT_SECRET;
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(event) };
  }

  if (method !== "POST") {
    return { statusCode: 405, headers: corsHeaders(event), body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  if (!SES_SENDER_EMAIL) {
    console.error("Missing SES_SENDER_EMAIL environment variable");
    return { statusCode: 500, headers: corsHeaders(event), body: JSON.stringify({ error: "Server misconfigured" }) };
  }

  const headers = event.headers || {};
  if (!isValidSecret(headers)) {
    return { statusCode: 401, headers: corsHeaders(event), body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const ip = event.requestContext?.http?.sourceIp || "unknown";
  if (!checkRateLimit(ip)) {
    return { statusCode: 429, headers: corsHeaders(event), body: JSON.stringify({ error: "Demasiadas peticiones. Inténtalo más tarde." }) };
  }

  let payload;
  try {
    let bodyStr = event.body || "{}";
    if (event.isBase64Encoded) {
      bodyStr = Buffer.from(bodyStr, "base64").toString("utf8");
    }
    payload = JSON.parse(bodyStr);
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders(event), body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (payload.type === "photo_report") {
    const { action, photoSlug, file, data } = payload;

    const safeSlug = escapeHtml(photoSlug);
    const safeFile = escapeHtml(file);

    let htmlMsg = `<div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background: #ffffff;">`;
    htmlMsg += `<div style="background: linear-gradient(135deg, #a200ff 0%, #d946ef 100%); padding: 25px; text-align: center;">`;
    htmlMsg += `<h1 style="color: white; margin: 0; font-size: 24px;">Reporte de Foto en Zona VIP</h1>`;
    htmlMsg += `</div><div style="padding: 25px;">`;

    htmlMsg += `<p style="font-size: 16px;">Se ha solicitado una acción para la siguiente fotografía:</p>`;
    htmlMsg += `<div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #a200ff; margin-bottom: 20px;">`;
    htmlMsg += `<p style="margin: 0 0 5px 0;"><strong>Slug:</strong> ${safeSlug}</p>`;
    htmlMsg += `<p style="margin: 0;"><strong>Archivo:</strong> ${safeFile}</p>`;
    htmlMsg += `</div>`;

    if (action === "modify") {
      htmlMsg += `<h3 style="color: #a200ff; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-top: 0;">Nuevos Datos Sugeridos:</h3>`;
      htmlMsg += `<ul style="list-style: none; padding: 0; margin-bottom: 25px;">`;
      if (data.people) htmlMsg += `<li style="margin-bottom: 8px; font-size: 15px;"><strong>Personas:</strong> ${escapeHtml(data.people)}</li>`;
      if (data.event) htmlMsg += `<li style="margin-bottom: 8px; font-size: 15px;"><strong>Evento:</strong> ${escapeHtml(data.event)}</li>`;
      if (data.theme) htmlMsg += `<li style="margin-bottom: 8px; font-size: 15px;"><strong>Temática:</strong> ${escapeHtml(data.theme)}</li>`;
      if (data.music) htmlMsg += `<li style="margin-bottom: 8px; font-size: 15px;"><strong>Música:</strong> ${escapeHtml(data.music)}</li>`;
      if (data.rotateImage === "Sí") htmlMsg += `<li style="margin-bottom: 8px; font-size: 15px; color: #ef4444;"><strong>Requiere Rotación:</strong> Sí, rotar la imagen</li>`;
      if (data.extra) htmlMsg += `<li style="margin-bottom: 8px; font-size: 15px;"><strong>Extra:</strong> ${escapeHtml(data.extra)}</li>`;
      htmlMsg += `</ul>`;
    } else if (action === "delete") {
      htmlMsg += `<div style="background: #fff1f2; color: #991b1b; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 25px;">`;
      htmlMsg += `<h3 style="margin-top: 0; color: #991b1b;">Petición de Borrado</h3>`;
      htmlMsg += `<p style="margin: 0;"><strong>Motivo:</strong> ${escapeHtml(data.reason || "No especificado")}</p>`;
      htmlMsg += `</div>`;
    }

    htmlMsg += `</div>`;
    htmlMsg += `<div style="background: #f9fafb; padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
            Enviado Automáticamente desde la Galería VIP Tefía.
        </div>`;
    htmlMsg += `</div>`;

    const command = new SendEmailCommand({
      Source: SES_SENDER_EMAIL,
      Destination: { ToAddresses: [SES_SENDER_EMAIL] },
      Message: {
        Subject: { Data: `Reporte de Foto Galería: ${safeSlug}`, Charset: "UTF-8" },
        Body: {
          Html: { Data: htmlMsg, Charset: "UTF-8" },
          Text: { Data: `Reporte de Foto Galería: ${safeSlug}. Acción solicitada: ${action}`, Charset: "UTF-8" },
        },
      },
    });

    try {
      await ses.send(command);
      return {
        statusCode: 200,
        headers: corsHeaders(event),
        body: JSON.stringify({ ok: true, message: "Reporte de foto enviado" }),
      };
    } catch (err) {
      console.error("Error publishing to SES for photo report:", err);
      return { statusCode: 500, headers: corsHeaders(event), body: JSON.stringify({ error: "Error interno del servidor" }) };
    }
  }

  return { statusCode: 400, headers: corsHeaders(event), body: JSON.stringify({ error: "Invalid payload type" }) };
};
