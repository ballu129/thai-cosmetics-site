import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/admin-session";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSession(token);

  if (session?.role === "ADMIN") {
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
