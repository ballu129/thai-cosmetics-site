import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { validateProductInput } from "./product-input";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      brand: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const unauthorizedResponse = await requireAdminSession();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const validation = validateProductInput(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const brand = await prisma.brand.findFirst({
      where: {
        id: validation.data.brandId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "Выберите активный бренд товара." },
        { status: 400 },
      );
    }

    const productWithSlug = await prisma.product.findUnique({
      where: {
        slug: validation.data.slug,
      },
      select: {
        id: true,
      },
    });

    if (productWithSlug) {
      return NextResponse.json(
        { error: "Товар с таким slug уже существует." },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: validation.data,
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось создать товар." },
      { status: 500 },
    );
  }
}
