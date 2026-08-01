import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildGuestOrderPath,
  createGuestOrderAccessToken,
  normalizeOrderLookupEmail,
} from "@/lib/order-access";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GENERIC_LOOKUP_ERROR =
  "Заказ не найден. Проверьте номер заказа и email.";

function readString(body: Record<string, unknown>, field: string) {
  const value = body[field];

  return typeof value === "string" ? value.trim() : "";
}

function getClientIp(headerList: Headers) {
  const forwardedFor = headerList.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return headerList.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  const headerList = await headers();
  const clientIp = getClientIp(headerList);

  if (
    !checkRateLimit(`guest-order-lookup:${clientIp}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    })
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Слишком много попыток. Попробуйте позже.",
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: GENERIC_LOOKUP_ERROR },
      { status: 404 },
    );
  }

  const orderId = readString(body as Record<string, unknown>, "orderId");
  const email = normalizeOrderLookupEmail(
    readString(body as Record<string, unknown>, "email"),
  );

  if (!orderId || !email) {
    return NextResponse.json(
      { success: false, error: GENERIC_LOOKUP_ERROR },
      { status: 404 },
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: null,
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: GENERIC_LOOKUP_ERROR },
      { status: 404 },
    );
  }

  const token = createGuestOrderAccessToken(order.id, order.email);

  return NextResponse.json({
    success: true,
    orderAccessUrl: buildGuestOrderPath(order.id, token),
  });
}
