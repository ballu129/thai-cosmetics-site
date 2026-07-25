import { NextResponse } from "next/server";

const ADMIN_LOGIN = "admin";
const ADMIN_PASSWORD = "123456";

export async function POST(request: Request) {
  const { login, password } = await request.json();

  if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Неверный логин или пароль" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("admin_session", "authorized", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
