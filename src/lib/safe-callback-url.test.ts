import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LOGIN_CALLBACK_URL,
  getSafeLoginCallbackUrl,
} from "@/lib/safe-callback-url";

test("accepts a safe internal pathname", () => {
  assert.equal(
    getSafeLoginCallbackUrl("/account/orders"),
    "/account/orders",
  );
});

test("preserves a safe internal pathname with query and hash", () => {
  assert.equal(
    getSafeLoginCallbackUrl("/account/orders?page=2&sort=date#latest"),
    "/account/orders?page=2&sort=date#latest",
  );
});

test("rejects an external absolute URL", () => {
  assert.equal(
    getSafeLoginCallbackUrl("https://evil.example/phishing"),
    DEFAULT_LOGIN_CALLBACK_URL,
  );
});

test("rejects a protocol-relative URL", () => {
  assert.equal(
    getSafeLoginCallbackUrl("//evil.example/phishing"),
    DEFAULT_LOGIN_CALLBACK_URL,
  );
});

test("rejects a javascript URL", () => {
  assert.equal(
    getSafeLoginCallbackUrl("javascript:alert(1)"),
    DEFAULT_LOGIN_CALLBACK_URL,
  );
});

test("rejects literal and encoded backslashes", () => {
  assert.equal(
    getSafeLoginCallbackUrl("/\\evil.example"),
    DEFAULT_LOGIN_CALLBACK_URL,
  );
  assert.equal(
    getSafeLoginCallbackUrl("/%5Cevil.example"),
    DEFAULT_LOGIN_CALLBACK_URL,
  );
});

test("rejects empty, missing, malformed and deceptive values", () => {
  const unsafeValues = [
    "",
    "   ",
    null,
    undefined,
    "/%E0%A4%A",
    "/%2F%2Fevil.example",
    "/account\njavascript:alert(1)",
    "/account\u202Eevil.example",
  ];

  for (const value of unsafeValues) {
    assert.equal(
      getSafeLoginCallbackUrl(value),
      DEFAULT_LOGIN_CALLBACK_URL,
    );
  }
});
