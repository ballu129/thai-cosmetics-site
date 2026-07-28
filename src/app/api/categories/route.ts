import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateCategoryInput } from "./category-input";

export async function GET() {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const categories = await prisma.category.findMany({
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
    categories,
  });
}

export async function POST(request: Request) {
  try {
    const unauthorizedResponse = await requireAdminSession();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const validation = validateCategoryInput(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const categoryWithSlug = await prisma.category.findUnique({
      where: {
        slug: validation.data.slug,
      },
      select: {
        id: true,
      },
    });

    if (categoryWithSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "Категория с таким slug уже существует.",
        },
        { status: 400 },
      );
    }

    const category = await prisma.category.create({
      data: validation.data,
    });

    return NextResponse.json(
      {
        success: true,
        category,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось создать категорию.",
      },
      { status: 500 },
    );
  }
}
