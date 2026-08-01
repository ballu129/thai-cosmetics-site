import "server-only";

import { createHash, randomBytes } from "node:crypto";

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
