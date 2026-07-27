import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
      { status: 404 }
    );
  }

  return NextResponse.json(product);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await params;
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      price: body.price,
      description: body.description,
      healing: body.healing,
      imageUrl: body.imageUrl,
    },
  });

  return NextResponse.json(product);
}export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
