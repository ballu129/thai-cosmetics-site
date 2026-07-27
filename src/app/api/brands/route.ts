import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateBrandInput } from "./brand-input";

export async function GET() {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const brands = await prisma.brand.findMany({
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    success: true,
    brands,
  });
}

export async function POST(request: Request) {
  try {
    const unauthorizedResponse = await requireAdminSession();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const validation = validateBrandInput(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const brandWithSlug = await prisma.brand.findUnique({
      where: {
        slug: validation.data.slug,
      },
      select: {
        id: true,
      },
    });

    if (brandWithSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд с таким slug уже существует.",
        },
        { status: 400 },
      );
    }

    const brand = await prisma.brand.create({
      data: validation.data,
    });

    return NextResponse.json(
      {
        success: true,
        brand,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось создать бренд.",
      },
      { status: 500 },
    );
  }
}
