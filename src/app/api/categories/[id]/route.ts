import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateCategoryInput } from "../category-input";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    return NextResponse.json(
      { success: false, error: "Категория не найдена." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    category,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorizedResponse = await requireAdminSession();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const { id } = await params;
    const validation = validateCategoryInput(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const [existingCategory, categoryWithSlug] = await Promise.all([
      prisma.category.findUnique({
        where: { id },
        select: {
          id: true,
        },
      }),
      prisma.category.findUnique({
        where: {
          slug: validation.data.slug,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: "Категория не найдена." },
        { status: 404 },
      );
    }

    if (categoryWithSlug && categoryWithSlug.id !== id) {
      return NextResponse.json(
        {
          success: false,
          error: "Категория с таким slug уже существует.",
        },
        { status: 400 },
      );
    }

    const category = await prisma.category.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось обновить категорию.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorizedResponse = await requireAdminSession();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Категория не найдена." },
        { status: 404 },
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Нельзя удалить категорию, у которой есть товары.",
        },
        { status: 400 },
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось удалить категорию.",
      },
      { status: 500 },
    );
  }
}
