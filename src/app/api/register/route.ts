import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Заполните имя, email и пароль.",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Пароль должен содержать минимум 8 символов.",
        },
        {
          status: 400,
        },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Пользователь с таким email уже существует.",
        },
        {
          status: 409,
        },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        user,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("REGISTER_API_ERROR:", error);

    return NextResponse.json(
      {
        error: "Не удалось создать пользователя.",
      },
      {
        status: 500,
      },
    );
  }
}