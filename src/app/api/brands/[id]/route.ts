import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateBrandInput } from "../brand-input";

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
    const validation = validateBrandInput(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const [existingBrand, brandWithSlug] = await Promise.all([
      prisma.brand.findUnique({
        where: { id },
        select: {
          id: true,
          slug: true,
        },
      }),
      prisma.brand.findUnique({
        where: {
          slug: validation.data.slug,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!existingBrand) {
      return NextResponse.json(
        { success: false, error: "Бренд не найден." },
        { status: 404 },
      );
    }

    if (brandWithSlug && brandWithSlug.id !== id) {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд с таким slug уже существует.",
        },
        { status: 400 },
      );
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: validation.data,
    });

    revalidatePath("/admin/brands");
    revalidatePath("/admin/products/new");
    revalidatePath("/brands");
    revalidatePath(`/brands/${existingBrand.slug}`);
    revalidatePath(`/brands/${brand.slug}`);

    return NextResponse.json({
      success: true,
      brand,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось обновить бренд.",
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

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Бренд не найден." },
        { status: 404 },
      );
    }

    if (brand._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Нельзя удалить бренд, у которого есть товары.",
        },
        { status: 400 },
      );
    }

    await prisma.brand.delete({
      where: { id },
    });

    revalidatePath("/admin/brands");
    revalidatePath("/admin/products/new");
    revalidatePath("/brands");
    revalidatePath(`/brands/${brand.slug}`);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось удалить бренд.",
      },
      { status: 500 },
    );
  }
}
