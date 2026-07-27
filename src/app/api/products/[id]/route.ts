import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateProductInput } from "../product-input";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { brand: true },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Товар не найден" },
      { status: 404 },
    );
  }

  return NextResponse.json(product);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await params;
  const validation = validateProductInput(await request.json());

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const [existingProduct, brand, productWithSlug] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
      },
    }),
    prisma.brand.findFirst({
      where: {
        id: validation.data.brandId,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.product.findUnique({
      where: {
        slug: validation.data.slug,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!existingProduct) {
    return NextResponse.json(
      { error: "Товар не найден" },
      { status: 404 },
    );
  }

  if (!brand) {
    return NextResponse.json(
      { error: "Выберите активный бренд товара." },
      { status: 400 },
    );
  }

  if (productWithSlug && productWithSlug.id !== id) {
    return NextResponse.json(
      { error: "Товар с таким slug уже существует." },
      { status: 400 },
    );
  }

  const product = await prisma.product.update({
    where: { id },
    data: validation.data,
  });

  return NextResponse.json(product);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await params;

  await prisma.product.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
  });
}
