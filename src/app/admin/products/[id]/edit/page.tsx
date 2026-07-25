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

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
    },
  });

  if (!product) {
    notFound();
  }

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
        product={{
          id: product.id,
          name: product.name,
          category: product.category,
          price: Number(product.price),
          description: product.description,
          healing: product.healing,
          imageUrl: product.imageUrl ?? "",
        }}
      />
    </main>
  );
}
