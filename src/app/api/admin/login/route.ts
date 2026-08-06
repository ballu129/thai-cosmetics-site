import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  AdminSessionConfigurationError,
  createAdminSession,
  getAdminSessionCookieOptions,
} from "@/lib/admin-session";

function getAdminCredentials() {
  const login = process.env.ADMIN_LOGIN?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!login || !password) {
    return null;
  }

  return {
    login,
    password,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const login =
    typeof body?.login === "string" ? body.login.trim() : "";
  const password =
    typeof body?.password === "string" ? body.password : "";
  const adminCredentials = getAdminCredentials();

  if (
    !adminCredentials ||
    login !== adminCredentials.login ||
    password !== adminCredentials.password
  ) {
    return NextResponse.json(
      { error: "Неверный логин или пароль" },
      { status: 401 },
    );
  }

  try {
    const token = await createAdminSession();
    const response = NextResponse.json({ success: true });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      token,
      getAdminSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof AdminSessionConfigurationError) {
      console.error("Admin session configuration is invalid.");

      return NextResponse.json(
        { error: "Вход администратора временно недоступен." },
        { status: 503 },
      );
    }

    throw error;
  }
}
