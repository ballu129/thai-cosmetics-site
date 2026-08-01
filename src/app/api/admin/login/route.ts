import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_VALUE = "authorized";

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

  const response = NextResponse.json({ success: true });

  response.cookies.set(ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
