import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function generateOrderAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOrderAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeOrderLookupEmail(email: string) {
  return email.normalize("NFKC").trim().toLowerCase();
}

export function hashOrderLookupEmail(orderId: string, email: string) {
  return createHash("sha256")
    .update(`${orderId}:${normalizeOrderLookupEmail(email)}`)
    .digest("hex");
}

export function buildGuestOrderPath(orderId: string, token: string) {
  return `/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(
    token,
  )}`;
}

function getGuestOrderSigningSecret() {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("Не настроен секрет для гостевого доступа к заказу.");
  }

  return secret;
}

export function assertGuestOrderAccessConfigured() {
  getGuestOrderSigningSecret();
}

function signGuestOrderPayload(payload: string) {
  return createHmac("sha256", getGuestOrderSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function createGuestOrderAccessToken(orderId: string, email: string) {
  const payload = Buffer.from(
    JSON.stringify({
      orderId,
      email: normalizeOrderLookupEmail(email),
      issuedAt: Date.now(),
    }),
  ).toString("base64url");
  const signature = signGuestOrderPayload(payload);

  return `v1.${payload}.${signature}`;
}

export function verifyGuestOrderAccessToken(
  token: string,
  expectedOrderId: string,
) {
  const [version, payload, signature] = token.trim().split(".");

  if (version !== "v1" || !payload || !signature) {
    return null;
  }

  const expectedSignature = signGuestOrderPayload(payload);
  const received = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      orderId?: unknown;
      email?: unknown;
    };

    if (
      parsed.orderId !== expectedOrderId ||
      typeof parsed.email !== "string" ||
      !parsed.email
    ) {
      return null;
    }

    return {
      email: normalizeOrderLookupEmail(parsed.email),
    };
  } catch {
    return null;
  }
}
