import crypto from "crypto";
import { sql } from "../config/db.js";

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const getAdminName = () => String(process.env.ADMIN_NAME || "admin").trim().toLowerCase();
const getAdminEmail = () => String(process.env.ADMIN_EMAIL || "admin").trim().toLowerCase();
const getAdminPhone = () => String(process.env.ADMIN_PHONE || "").trim();
const getAdminPassword = () => String(process.env.ADMIN_PASSWORD || "admin");
const getAdminTokenSecret = () => String(process.env.ADMIN_TOKEN_SECRET || "clickart-admin-secret");

const encode = (value) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value) => Buffer.from(value, "base64url").toString("utf8");

const sign = (payloadBase64) => {
  return crypto.createHmac("sha256", getAdminTokenSecret()).update(payloadBase64).digest("base64url");
};

export const isAdminEnvConfigured = () => {
  return Boolean(getAdminName() && getAdminPassword() && getAdminTokenSecret());
};

const ensureAdminCredentialTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS Admin_Credentials (
      id INT PRIMARY KEY,
      admin_name VARCHAR(100) NOT NULL,
      admin_email VARCHAR(100) NOT NULL,
      admin_phone VARCHAR(20) NOT NULL DEFAULT '',
      admin_password VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    ALTER TABLE Admin_Credentials
    ADD COLUMN IF NOT EXISTS admin_phone VARCHAR(20) NOT NULL DEFAULT ''
  `;

  await sql`
    INSERT INTO Admin_Credentials (id, admin_name, admin_email, admin_phone, admin_password)
    VALUES (1, ${getAdminName()}, ${getAdminEmail()}, ${getAdminPhone()}, ${getAdminPassword()})
    ON CONFLICT (id) DO NOTHING
  `;
};

export const getAdminCredentialConfig = async () => {
  try {
    await ensureAdminCredentialTable();
    const rows = await sql`
      SELECT admin_name, admin_email, admin_phone, admin_password
      FROM Admin_Credentials
      WHERE id = 1
      LIMIT 1
    `;

    if (rows.length > 0) {
      return {
        admin_name: String(rows[0].admin_name || "").trim().toLowerCase(),
        admin_email: String(rows[0].admin_email || "").trim().toLowerCase(),
        admin_phone: String(rows[0].admin_phone || "").trim(),
        admin_password: String(rows[0].admin_password || ""),
      };
    }
  } catch {
    // Fallback to environment defaults if table cannot be accessed.
  }

  return {
    admin_name: getAdminName(),
    admin_email: getAdminEmail(),
    admin_phone: getAdminPhone(),
    admin_password: getAdminPassword(),
  };
};

export const isAdminCredentialValid = async (nameOrEmail, password) => {
  const normalizedNameOrEmail = String(nameOrEmail || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");
  const config = await getAdminCredentialConfig();

  const isValidIdentity =
    normalizedNameOrEmail === config.admin_name || normalizedNameOrEmail === config.admin_email;

  return isValidIdentity && normalizedPassword === config.admin_password;
};

export const updateAdminCredentialConfig = async ({ admin_name, admin_email, admin_phone, admin_password }) => {
  await ensureAdminCredentialTable();

  const current = await getAdminCredentialConfig();
  const hasName = admin_name !== undefined;
  const hasEmail = admin_email !== undefined;
  const hasPhone = admin_phone !== undefined;
  const hasPassword = admin_password !== undefined;
  const normalizedName = hasName ? String(admin_name || "").trim().toLowerCase() : current.admin_name;
  const normalizedEmail = hasEmail ? String(admin_email || "").trim().toLowerCase() : current.admin_email;
  const normalizedPhone = hasPhone ? String(admin_phone || "").trim() : current.admin_phone;
  const normalizedPassword = hasPassword ? String(admin_password || "") : current.admin_password;

  await sql`
    UPDATE Admin_Credentials
    SET admin_name = ${normalizedName},
        admin_email = ${normalizedEmail},
        admin_phone = ${normalizedPhone},
        admin_password = ${normalizedPassword},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;

  return {
    admin_name: normalizedName,
    admin_email: normalizedEmail,
    admin_phone: normalizedPhone,
  };
};

export const generateAdminToken = () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "central-admin",
    name: getAdminName(),
    email: getAdminEmail(),
    iat: nowSeconds,
    exp: nowSeconds + DEFAULT_TOKEN_TTL_SECONDS,
  };

  const payloadBase64 = encode(JSON.stringify(payload));
  const signature = sign(payloadBase64);

  return `${payloadBase64}.${signature}`;
};

export const verifyAdminToken = (token) => {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "Invalid token format" };
  }

  const [payloadBase64, providedSignature] = token.split(".");

  if (!payloadBase64 || !providedSignature) {
    return { valid: false, reason: "Invalid token format" };
  }

  const expectedSignature = sign(payloadBase64);

  if (expectedSignature !== providedSignature) {
    return { valid: false, reason: "Token signature mismatch" };
  }

  let payload;
  try {
    payload = JSON.parse(decode(payloadBase64));
  } catch {
    return { valid: false, reason: "Invalid token payload" };
  }

  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "Token expired" };
  }

  if (payload?.sub !== "central-admin") {
    return { valid: false, reason: "Invalid token subject" };
  }

  return { valid: true, payload };
};

export const requireAdminAuth = (req, res, next) => {
  const authHeader = String(req.headers.authorization || "");

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Admin authorization required" });
  }

  if (!isAdminEnvConfigured()) {
    return res.status(500).json({ success: false, message: "Admin auth is not configured" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const verification = verifyAdminToken(token);

  if (!verification.valid) {
    return res.status(401).json({ success: false, message: "Invalid or expired admin token" });
  }

  req.admin = verification.payload;
  next();
};
