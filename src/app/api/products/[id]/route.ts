import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

  const [
    existingProduct,
    brand,
    category,
    productWithSlug,
  ] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        brand: {
          select: {
            slug: true,
          },
        },
      },
    }),
    prisma.brand.findFirst({
      where: {
        id: validation.data.brandId,
        isActive: true,
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

  if (validation.data.categoryId && !category) {
    return NextResponse.json(
      { error: "Выберите существующую категорию товара." },
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
  revalidatePath(`/brands/${existingProduct.brand.slug}`);
  revalidatePath(`/brands/${brand.slug}`);
  revalidatePath(`/product/${existingProduct.slug}`);
  revalidatePath(`/product/${product.slug}`);

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

  const product = await prisma.product.delete({
    where: { id },
    include: {
      brand: {
        select: {
          slug: true,
        },
      },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/categories");
  revalidatePath("/catalog");
  revalidatePath("/brands");
  revalidatePath(`/brands/${product.brand.slug}`);
  revalidatePath(`/product/${product.slug}`);

  return NextResponse.json({
    success: true,
  });
}
