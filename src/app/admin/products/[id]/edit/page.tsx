import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminProductForm from "@/components/AdminProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, activeBrands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
    }),
    prisma.brand.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const currentBrandIsVisible = activeBrands.some(
    (brand) => brand.id === product.brandId,
  );

  const currentBrand = currentBrandIsVisible
    ? null
    : await prisma.brand.findUnique({
        where: {
          id: product.brandId,
        },
        select: {
          id: true,
          name: true,
        },
      });

  const brands = currentBrand
    ? [...activeBrands, currentBrand]
    : activeBrands;

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
      }}
    >
      <Link href="/admin/products">
        ← Назад к товарам
      </Link>

      <h1 style={{ marginTop: 24 }}>
        Редактирование товара
      </h1>

      <AdminProductForm
        brands={brands}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          brandId: product.brandId,
          category: product.category,
          price: Number(product.price),
          description: product.description,
          healing: product.healing,
          activeIngredients: product.activeIngredients,
          imageUrl: product.imageUrl ?? "",
        }}
      />
    </main>
  );
}
