import crypto from "crypto";

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const getAdminName = () => String(process.env.ADMIN_NAME || "admin").trim().toLowerCase();
const getAdminEmail = () => String(process.env.ADMIN_EMAIL || "admin").trim().toLowerCase();
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

export const isAdminCredentialValid = (nameOrEmail, password) => {
  const normalizedNameOrEmail = String(nameOrEmail || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  const isValidIdentity =
    normalizedNameOrEmail === getAdminName() || normalizedNameOrEmail === getAdminEmail();

  return isValidIdentity && normalizedPassword === getAdminPassword();
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
