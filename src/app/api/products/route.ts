import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

    const [brand, category] = await Promise.all([
      prisma.brand.findFirst({
        where: {
          id: validation.data.brandId,
        },
        select: {
          id: true,
          slug: true,
        },
      }),
      validation.data.categoryId
        ? prisma.category.findUnique({
            where: {
              id: validation.data.categoryId,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : null,
    ]);

    if (!brand) {
      return NextResponse.json(
        { error: "Выберите существующий бренд товара." },
        { status: 400 },
      );
    }

    if (validation.data.categoryId && !category) {
      return NextResponse.json(
        { error: "Выберите существующую категорию товара." },
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
      data: {
        name: validation.data.name,
        slug: validation.data.slug,
        brandId: validation.data.brandId,
        category: category?.name ?? validation.data.category ?? "",
        categoryId: category?.id ?? null,
        price: validation.data.price,
        description: validation.data.description,
        healing: validation.data.healing,
        activeIngredients: validation.data.activeIngredients,
        imageUrl: validation.data.imageUrl,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/categories");
    revalidatePath("/catalog");
    revalidatePath("/brands");
    revalidatePath(`/brands/${brand.slug}`);
    revalidatePath(`/product/${product.slug}`);

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось создать товар." },
      { status: 500 },
    );
  }
}
