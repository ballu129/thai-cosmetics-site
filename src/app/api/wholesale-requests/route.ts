import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateWholesaleRequestInput } from "@/lib/wholesale-validation";

const MAX_BODY_BYTES = 32 * 1024;

function getRequestKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `wholesale:${forwardedFor || "unknown"}`;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.startsWith("application/json")) {
      return NextResponse.json(
        { success: false, error: "Ожидаются данные в формате JSON." },
        { status: 415 },
      );
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: "Заявка содержит слишком много данных." },
        { status: 413 },
      );
    }

    if (!checkRateLimit(getRequestKey(request), { limit: 5, windowMs: 10 * 60_000 })) {
      return NextResponse.json(
        { success: false, error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 },
      );
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: "Заявка содержит слишком много данных." },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Переданы некорректные данные заявки." },
        { status: 400 },
      );
    }

    const validation = validateWholesaleRequestInput(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 },
      );
    }

    if (!validation.honeypotTriggered) {
      await prisma.wholesaleRequest.create({
        data: {
          ...validation.data,
          status: "NEW",
          consentAcceptedAt: new Date(),
        },
        select: { id: true },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Заявка отправлена. Мы свяжемся с вами после её рассмотрения.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Wholesale request creation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { success: false, error: "Не удалось отправить заявку. Попробуйте позже." },
      { status: 500 },
    );
  }
}
