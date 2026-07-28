import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryForm from "@/components/CategoryForm";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Редактирование категории",
};

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
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
      <Link href="/admin/categories">
        ← Назад к категориям
      </Link>

      <h1 style={{ marginTop: 24 }}>
        Редактирование категории
      </h1>

      <CategoryForm
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          isActive: category.isActive,
        }}
      />
    </main>
  );
}
