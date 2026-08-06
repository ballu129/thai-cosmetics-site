const ADMIN_SESSION_VERSION = 1;
const ADMIN_SESSION_ROLE = "ADMIN";
const MIN_SECRET_LENGTH = 32;
const MAX_CLOCK_SKEW_SECONDS = 60;

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

type AdminSessionPayload = {
  version: typeof ADMIN_SESSION_VERSION;
  role: typeof ADMIN_SESSION_ROLE;
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
};

type SignedSessionPayload = {
  v: number;
  role: string;
  iat: number;
  exp: number;
  sid: string;
};

type CreateAdminSessionTokenOptions = {
  secret: string;
  nowMs?: number;
  maxAgeSeconds?: number;
  role?: string;
  sessionId?: string;
};

export type AdminSessionCookieOptions = {
  httpOnly: true;
  sameSite: "strict";
  path: "/";
  secure: boolean;
  maxAge: number;
  expires: Date;
};

export class AdminSessionConfigurationError extends Error {
  constructor() {
    super("Admin session secret is not configured securely.");
    this.name = "AdminSessionConfigurationError";
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function validateSecret(secret: string) {
  if (encoder.encode(secret).byteLength < MIN_SECRET_LENGTH) {
    throw new AdminSessionConfigurationError();
  }
}

function getAdminSessionSecret() {
  const dedicatedSecret = process.env.ADMIN_SESSION_SECRET;
  const secret =
    dedicatedSecret === undefined
      ? process.env.AUTH_SECRET?.trim()
      : dedicatedSecret.trim();

  if (!secret) {
    throw new AdminSessionConfigurationError();
  }

  validateSecret(secret);
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string, usage: "sign" | "verify") {
  validateSecret(secret);

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    [usage],
  );
}

export async function createAdminSessionToken({
  secret,
  nowMs = Date.now(),
  maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS,
  role = ADMIN_SESSION_ROLE,
  sessionId = crypto.randomUUID(),
}: CreateAdminSessionTokenOptions) {
  if (
    !Number.isSafeInteger(maxAgeSeconds) ||
    maxAgeSeconds < 1 ||
    maxAgeSeconds > ADMIN_SESSION_MAX_AGE_SECONDS
  ) {
    throw new Error("Invalid admin session lifetime.");
  }

  const issuedAt = Math.floor(nowMs / 1000);
  const payload: SignedSessionPayload = {
    v: ADMIN_SESSION_VERSION,
    role,
    iat: issuedAt,
    exp: issuedAt + maxAgeSeconds,
    sid: sessionId,
  };
  const encodedPayload = bytesToBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const key = await importHmacKey(secret, "sign");
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload),
  );

  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAdminSessionToken(
  token: string | null | undefined,
  options: {
    secret: string;
    nowMs?: number;
  },
): Promise<AdminSessionPayload | null> {
  if (!token || token.length > 2048) {
    return null;
  }

  const [encodedPayload, encodedSignature, extraPart] = token.split(".");

  if (!encodedPayload || !encodedSignature || extraPart !== undefined) {
    return null;
  }

  const signature = base64UrlToBytes(encodedSignature);

  if (!signature) {
    return null;
  }

  try {
    const key = await importHmacKey(options.secret, "verify");
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(encodedPayload),
    );

    if (!validSignature) {
      return null;
    }

    const payloadBytes = base64UrlToBytes(encodedPayload);

    if (!payloadBytes) {
      return null;
    }

    const payload = JSON.parse(
      decoder.decode(payloadBytes),
    ) as Partial<SignedSessionPayload>;
    const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
    const issuedAt = payload.iat;
    const expiresAt = payload.exp;

    if (
      payload.v !== ADMIN_SESSION_VERSION ||
      payload.role !== ADMIN_SESSION_ROLE ||
      typeof issuedAt !== "number" ||
      !Number.isSafeInteger(issuedAt) ||
      typeof expiresAt !== "number" ||
      !Number.isSafeInteger(expiresAt) ||
      typeof payload.sid !== "string" ||
      payload.sid.length < 1 ||
      payload.sid.length > 128 ||
      issuedAt > now + MAX_CLOCK_SKEW_SECONDS ||
      expiresAt <= now ||
      expiresAt <= issuedAt ||
      expiresAt - issuedAt > ADMIN_SESSION_MAX_AGE_SECONDS
    ) {
      return null;
    }

    return {
      version: ADMIN_SESSION_VERSION,
      role: ADMIN_SESSION_ROLE,
      issuedAt,
      expiresAt,
      sessionId: payload.sid,
    };
  } catch {
    return null;
  }
}

export async function createAdminSession() {
  return createAdminSessionToken({
    secret: getAdminSessionSecret(),
  });
}

export async function verifyAdminSession(token: string | null | undefined) {
  try {
    return await verifyAdminSessionToken(token, {
      secret: getAdminSessionSecret(),
    });
  } catch (error) {
    if (error instanceof AdminSessionConfigurationError) {
      return null;
    }

    throw error;
  }
}

export function getAdminSessionCookieOptions(
  now = new Date(),
  isProduction = process.env.NODE_ENV === "production",
): AdminSessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: isProduction,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    expires: new Date(
      now.getTime() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    ),
  };
}

export function getAdminSessionClearCookieOptions(
  isProduction = process.env.NODE_ENV === "production",
): AdminSessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: isProduction,
    maxAge: 0,
    expires: new Date(0),
  };
}
