/**
 * Prueba manual de photo-report (requiere PHOTO_REPORT_SECRET).
 * Uso: node serverless/api/photo-report/test.js [secret] [url]
 */

const secret = process.argv[2] || "";
const url =
  process.argv[3] ||
  "https://REPLACE_AFTER_DEPLOY.lambda-url.us-east-1.on.aws/";

if (!secret) {
  console.error("Uso: node test.js <PHOTO_REPORT_SECRET> [FUNCTION_URL]");
  process.exit(1);
}

const payload = {
  type: "photo_report",
  action: "modify",
  photoSlug: "test-slug",
  file: "test.jpg",
  data: { people: "Test", extra: "Prueba desde test.js" },
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Report-Auth": secret,
  },
  body: JSON.stringify(payload),
});

console.log("Status:", res.status);
console.log("Body:", await res.text());
