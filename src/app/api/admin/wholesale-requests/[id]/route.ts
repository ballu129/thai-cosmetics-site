import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  WHOLESALE_FIELD_LIMITS,
  WHOLESALE_REQUEST_STATUSES,
  type WholesaleRequestStatusValue,
} from "@/lib/wholesale";

const MAX_BODY_BYTES = 8 * 1024;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  if (!id || id.length > 191 || !/^[a-z0-9]+$/i.test(id)) return NextResponse.json({ success: false, error: "Заявка не найдена." }, { status: 404 });
  try {
    const request = await prisma.wholesaleRequest.findUnique({ where: { id }, select: { id: true, contactName: true, phone: true, email: true, companyName: true, taxId: true, websiteUrl: true, country: true, city: true, businessType: true, preferredContact: true, expectedVolume: true, interestedBrands: true, interestedCategories: true, customerComment: true, adminComment: true, status: true, createdAt: true, updatedAt: true } });
    if (!request) return NextResponse.json({ success: false, error: "Заявка не найдена." }, { status: 404 });
    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error("Wholesale request read failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ success: false, error: "Не удалось загрузить заявку." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  if (!id || id.length > 191 || !/^[a-z0-9]+$/i.test(id)) return NextResponse.json({ success: false, error: "Заявка не найдена." }, { status: 404 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return NextResponse.json({ success: false, error: "Ожидаются данные в формате JSON." }, { status: 415 });
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return NextResponse.json({ success: false, error: "Передано слишком много данных." }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { success: false, error: "Переданы некорректные данные." },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ success: false, error: "Переданы некорректные данные." }, { status: 400 });
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "status" && key !== "adminComment")) return NextResponse.json({ success: false, error: "Переданы некорректные данные." }, { status: 400 });
    if (typeof record.status !== "string" || !WHOLESALE_REQUEST_STATUSES.includes(record.status as WholesaleRequestStatusValue)) return NextResponse.json({ success: false, error: "Выбран некорректный статус." }, { status: 400 });
    if (typeof record.adminComment !== "string") return NextResponse.json({ success: false, error: "Передан некорректный комментарий." }, { status: 400 });
    const adminComment = record.adminComment.normalize("NFKC").trim() || null;
    if (adminComment && adminComment.length > WHOLESALE_FIELD_LIMITS.adminComment) return NextResponse.json({ success: false, error: "Внутренний комментарий слишком длинный." }, { status: 400 });
    const existing = await prisma.wholesaleRequest.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: "Заявка не найдена." }, { status: 404 });
    const updated = await prisma.wholesaleRequest.update({ where: { id }, data: { status: record.status as WholesaleRequestStatusValue, adminComment }, select: { id: true, status: true, updatedAt: true } });
    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Wholesale request update failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ success: false, error: "Не удалось сохранить изменения." }, { status: 500 });
  }
}
