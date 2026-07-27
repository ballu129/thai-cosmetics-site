import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_VALUE = "authorized";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (session === ADMIN_SESSION_VALUE) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: "Требуется вход администратора.",
    },
    {
      status: 401,
    },
  );
}
