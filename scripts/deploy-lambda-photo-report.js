/**
 * scripts/deploy-lambda-photo-report.js
 * Despliega la Lambda photo-report (reemplazo seguro de submit-revision).
 *
 * Uso:
 *   node scripts/deploy-lambda-photo-report.js
 *   node scripts/deploy-lambda-photo-report.js --profile iam-auditor
 *   node scripts/deploy-lambda-photo-report.js --profile iam-auditor --update-env
 *
 * Variables en .env (cargadas con dotenv):
 *   PHOTO_REPORT_SECRET      — Secreto compartido con el frontend (se genera si falta)
 *   SES_SENDER_EMAIL         — Por defecto contacto@tefiaenteatro.com
 *   SES_REGION               — Por defecto eu-north-1
 *   LAMBDA_ROLE_ARN          — Rol IAM; por defecto reutiliza submit-revision-role-bt5krpvq
 *   LAMBDA_AWS_PROFILE       — Perfil AWS (fallback iam-auditor)
 *   PUBLIC_REVISION_API_URL  — Se actualiza con --update-env
 */

import { execSync } from "child_process";
import { randomBytes } from "crypto";
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile();

function parseFlag(name) {
  return process.argv.includes(name);
}

function parseCliProfile() {
  const idx = process.argv.indexOf("--profile");
  return idx !== -1 ? process.argv[idx + 1] : null;
}

const FUNCTION_NAME = "photo-report";
const LAMBDA_DIR = join(ROOT, "serverless/api/photo-report");
const BUILD_DIR = join(ROOT, ".lambda-build-photo-report");
const FN_DIR = join(BUILD_DIR, "fn");
const ZIP_PATH = join(BUILD_DIR, "photo-report.zip");
const REGION = process.env.LAMBDA_REGION || "us-east-1";
const PROFILE =
  parseCliProfile() ||
  process.env.LAMBDA_AWS_PROFILE ||
  process.env.AWS_PROFILE ||
  "iam-auditor";
const UPDATE_ENV = parseFlag("--update-env");
const DEFAULT_ROLE_ARN =
  process.env.LAMBDA_ROLE_ARN ||
  "arn:aws:iam::282662225889:role/service-role/submit-revision-role-bt5krpvq";

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd.length > 120 ? cmd.slice(0, 117) + "…" : cmd}`);
  return execSync(cmd, { stdio: "inherit", ...opts });
}

function runSilent(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}

function ensureSecret() {
  if (process.env.PHOTO_REPORT_SECRET?.trim()) {
    return process.env.PHOTO_REPORT_SECRET.trim();
  }
  try {
    const cfg = runSilent(
      `aws lambda get-function-configuration --function-name ${FUNCTION_NAME} --region ${REGION} --profile ${PROFILE} --no-cli-pager --output json`
    );
    const existing = JSON.parse(cfg)?.Environment?.Variables?.PHOTO_REPORT_SECRET;
    if (existing?.trim()) {
      console.log("\n🔑  Reutilizando PHOTO_REPORT_SECRET de la Lambda existente.");
      return existing.trim();
    }
  } catch {
    /* nueva función */
  }
  const secret = randomBytes(32).toString("hex");
  console.log("\n🔑  PHOTO_REPORT_SECRET generado (añádelo a .env para builds reproducibles).");
  return secret;
}

function buildEnvJson(secret) {
  const vars = {
    PHOTO_REPORT_SECRET: secret,
    SES_SENDER_EMAIL:
      process.env.SES_SENDER_EMAIL || "contacto@tefiaenteatro.com",
    SES_REGION: process.env.SES_REGION || "eu-north-1",
  };
  const pairs = Object.entries(vars).map(
    ([k, v]) => `${k}=${String(v).replace(/"/g, '\\"')}`
  );
  return `Variables={${pairs.join(",")}}`;
}

function upsertEnvFile(functionUrl, secret) {
  const envPath = join(ROOT, ".env");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  const upsert = (key, value) => {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    content = re.test(content)
      ? content.replace(re, line)
      : content.trimEnd() + (content.endsWith("\n") || !content ? "" : "\n") + line + "\n";
  };

  upsert("PUBLIC_REVISION_API_URL", functionUrl);
  upsert("PHOTO_REPORT_SECRET", secret);

  writeFileSync(envPath, content, "utf8");
  console.log(`\n📝  .env actualizado (${envPath})`);
}

function ensureFunctionUrl() {
  let exists = true;
  try {
    runSilent(
      `aws lambda get-function-url-config --function-name ${FUNCTION_NAME} --region ${REGION} --profile ${PROFILE} --no-cli-pager`
    );
  } catch {
    exists = false;
  }

  const cors =
    'AllowOrigins="https://tefiaenteatro.com,https://www.tefiaenteatro.com",AllowMethods="POST",AllowHeaders="content-type,x-report-auth",MaxAge=86400';

  if (!exists) {
    console.log("\n🌐  Creando Function URL...");
    run(
      `aws lambda create-function-url-config --function-name ${FUNCTION_NAME} --auth-type NONE --cors ${cors} --region ${REGION} --profile ${PROFILE} --no-cli-pager`
    );
    try {
      run(
        `aws lambda add-permission --function-name ${FUNCTION_NAME} --statement-id FunctionURLAllowPublicAccess --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --region ${REGION} --profile ${PROFILE} --no-cli-pager`
      );
    } catch {
      /* ya existe */
    }
    try {
      run(
        `aws lambda add-permission --function-name ${FUNCTION_NAME} --statement-id FunctionURLAllowInvokeFunction --action lambda:InvokeFunction --principal "*" --invoked-via-function-url --region ${REGION} --profile ${PROFILE} --no-cli-pager`
      );
    } catch {
      /* ya existe */
    }
  } else {
    console.log("\n🌐  Actualizando CORS de Function URL...");
    run(
      `aws lambda update-function-url-config --function-name ${FUNCTION_NAME} --cors ${cors} --region ${REGION} --profile ${PROFILE} --no-cli-pager`
    );
  }

  return runSilent(
    `aws lambda get-function-url-config --function-name ${FUNCTION_NAME} --region ${REGION} --profile ${PROFILE} --no-cli-pager --query FunctionUrl --output text`
  );
}

console.log("\n🚀  Desplegando Lambda photo-report...\n");
console.log(`   Perfil: ${PROFILE} | Región: ${REGION}`);

if (!existsSync(LAMBDA_DIR)) {
  console.error(`❌  No existe ${LAMBDA_DIR}`);
  process.exit(1);
}

if (existsSync(BUILD_DIR)) rmSync(BUILD_DIR, { recursive: true });
mkdirSync(FN_DIR, { recursive: true });
cpSync(LAMBDA_DIR, FN_DIR, { recursive: true });

console.log("\n📦  Instalando dependencias...");
run("npm install --omit=dev", { cwd: FN_DIR });

console.log("\n🗜️   Creando ZIP...");
const fnDirWin = FN_DIR.replace(/\//g, "\\");
const zipWin = ZIP_PATH.replace(/\//g, "\\");
run(
  `powershell -NoProfile -Command "Compress-Archive -Path '${fnDirWin}\\*' -DestinationPath '${zipWin}' -Force"`
);

let functionExists = false;
try {
  runSilent(
    `aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} --profile ${PROFILE} --no-cli-pager`
  );
  functionExists = true;
} catch {
  functionExists = false;
}

const secret = ensureSecret();
const envVars = buildEnvJson(secret);

if (functionExists) {
  console.log("\n🔄  Actualizando código...");
  run(
    `aws lambda update-function-code --function-name ${FUNCTION_NAME} --zip-file fileb://${ZIP_PATH.replace(/\\/g, "/")} --region ${REGION} --profile ${PROFILE} --no-cli-pager`
  );
  run(
    `aws lambda wait function-updated --function-name ${FUNCTION_NAME} --region ${REGION} --profile ${PROFILE}`
  );
  console.log("🔧  Actualizando configuración...");
  run(
    `aws lambda update-function-configuration --function-name ${FUNCTION_NAME} --runtime nodejs22.x --handler index.handler --timeout 15 --memory-size 128 --environment "${envVars}" --region ${REGION} --profile ${PROFILE} --no-cli-pager`
  );
  run(
    `aws lambda wait function-updated --function-name ${FUNCTION_NAME} --region ${REGION} --profile ${PROFILE}`
  );
} else {
  console.log("\n✨  Creando función Lambda...");
  run(
    [
      `aws lambda create-function`,
      `--function-name ${FUNCTION_NAME}`,
      `--runtime nodejs22.x`,
      `--role ${DEFAULT_ROLE_ARN}`,
      `--handler index.handler`,
      `--zip-file fileb://${ZIP_PATH.replace(/\\/g, "/")}`,
      `--timeout 15`,
      `--memory-size 128`,
      `--region ${REGION}`,
      `--environment "${envVars}"`,
      `--profile ${PROFILE}`,
      `--no-cli-pager`,
    ].join(" ")
  );
  run(
    `aws lambda wait function-active --function-name ${FUNCTION_NAME} --region ${REGION} --profile ${PROFILE}`
  );
}

const functionUrl = ensureFunctionUrl();

console.log("\n✅  Lambda photo-report desplegada");
console.log(`   URL: ${functionUrl}`);
console.log(`\n👉  Añade a .env (build del sitio):`);
console.log(`   PUBLIC_REVISION_API_URL=${functionUrl}`);
console.log(`   PHOTO_REPORT_SECRET=${secret}`);
console.log("\n👉  Luego: npm run build && npm run deploy");
console.log("👉  Cuando verifiques la galería: .\\scripts\\retire-submit-revision.ps1 -Profile iam-auditor");

if (UPDATE_ENV) {
  upsertEnvFile(functionUrl, secret);
}

rmSync(BUILD_DIR, { recursive: true });
console.log("");
