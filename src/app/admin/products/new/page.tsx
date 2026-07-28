import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewProductForm from "@/components/NewProductForm";

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([
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
    prisma.category.findMany({
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
        Новый товар
      </h1>

      <NewProductForm brands={brands} categories={categories} />
    </main>
  );
}
