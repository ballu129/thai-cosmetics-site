import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { proxy } from "@/proxy";

function createTestSecret() {
  return randomBytes(48).toString("base64url");
}

test("valid signed ADMIN session is accepted", async () => {
  const secret = createTestSecret();
  const nowMs = Date.UTC(2026, 7, 6, 12, 0, 0);
  const token = await createAdminSessionToken({ secret, nowMs });
  const session = await verifyAdminSessionToken(token, {
    secret,
    nowMs: nowMs + 1000,
  });

  assert.equal(session?.role, "ADMIN");
  assert.equal(
    session?.expiresAt,
    Math.floor(nowMs / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  );
});

test("tampered and legacy cookies are rejected", async () => {
  const secret = createTestSecret();
  const token = await createAdminSessionToken({ secret });
  const replacement = token.endsWith("A") ? "B" : "A";
  const tampered = `${token.slice(0, -1)}${replacement}`;

  assert.equal(
    await verifyAdminSessionToken(tampered, { secret }),
    null,
  );
  assert.equal(
    await verifyAdminSessionToken("authorized", { secret }),
    null,
  );
});

test("expired signed session is rejected", async () => {
  const secret = createTestSecret();
  const nowMs = Date.UTC(2026, 7, 6, 12, 0, 0);
  const token = await createAdminSessionToken({
    secret,
    nowMs,
    maxAgeSeconds: 10,
  });

  assert.equal(
    await verifyAdminSessionToken(token, {
      secret,
      nowMs: nowMs + 11_000,
    }),
    null,
  );
});

test("validly signed session with a non-admin role is rejected", async () => {
  const secret = createTestSecret();
  const token = await createAdminSessionToken({
    secret,
    role: "USER",
  });

  assert.equal(
    await verifyAdminSessionToken(token, { secret }),
    null,
  );
});

test("production cookie options are secure and time-limited", () => {
  const now = new Date("2026-08-06T12:00:00.000Z");
  const options = getAdminSessionCookieOptions(now, true);

  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "strict");
  assert.equal(options.path, "/");
  assert.equal(options.secure, true);
  assert.equal(options.maxAge, ADMIN_SESSION_MAX_AGE_SECONDS);
  assert.equal(
    options.expires.getTime(),
    now.getTime() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  );
});

test("proxy denies no cookie and the old authorized literal", async () => {
  const noCookieResponse = await proxy(
    new NextRequest("http://localhost:3000/admin/orders"),
  );
  const legacyCookieResponse = await proxy(
    new NextRequest("http://localhost:3000/admin/orders", {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=authorized`,
      },
    }),
  );

  assert.equal(noCookieResponse.status, 307);
  assert.equal(legacyCookieResponse.status, 307);
  assert.equal(
    noCookieResponse.headers.get("location"),
    "http://localhost:3000/admin/login",
  );
});

test("successful login creates a verifiable protected cookie", async () => {
  const previousLogin = process.env.ADMIN_LOGIN;
  const previousPassword = process.env.ADMIN_PASSWORD;
  const previousSessionSecret = process.env.ADMIN_SESSION_SECRET;
  const secret = createTestSecret();

  process.env.ADMIN_LOGIN = "test-admin";
  process.env.ADMIN_PASSWORD = "test-password";
  process.env.ADMIN_SESSION_SECRET = secret;

  try {
    const response = await login(
      new Request("http://localhost:3000/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: "test-admin",
          password: "test-password",
        }),
      }),
    );
    const cookie = response.cookies.get(ADMIN_SESSION_COOKIE);

    assert.equal(response.status, 200);
    assert.ok(cookie?.value);
    assert.equal(
      (await verifyAdminSessionToken(cookie.value, { secret }))?.role,
      "ADMIN",
    );
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
    assert.match(response.headers.get("set-cookie") ?? "", /SameSite=Strict/i);

    const adminResponse = await proxy(
      new NextRequest("http://localhost:3000/admin/orders", {
        headers: {
          cookie: `${ADMIN_SESSION_COOKIE}=${cookie.value}`,
        },
      }),
    );

    assert.equal(adminResponse.headers.get("x-middleware-next"), "1");
  } finally {
    if (previousLogin === undefined) delete process.env.ADMIN_LOGIN;
    else process.env.ADMIN_LOGIN = previousLogin;

    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;

    if (previousSessionSecret === undefined) {
      delete process.env.ADMIN_SESSION_SECRET;
    } else {
      process.env.ADMIN_SESSION_SECRET = previousSessionSecret;
    }
  }
});

test("logout expires the cookie and the next request is denied", async () => {
  const response = await logout();
  const setCookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 200);
  assert.match(setCookie, /admin_session=;/i);
  assert.match(setCookie, /Max-Age=0/i);
  assert.match(setCookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);

  const adminResponse = await proxy(
    new NextRequest("http://localhost:3000/admin/orders"),
  );

  assert.equal(adminResponse.status, 307);
});
