import Link from "next/link";
import { notFound } from "next/navigation";
import BrandForm from "@/components/BrandForm";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Редактирование бренда",
};

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const brand = await prisma.brand.findUnique({
    where: { id },
  });

  if (!brand) {
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
      <Link href="/admin/brands">
        ← Назад к брендам
      </Link>

      <h1 style={{ marginTop: 24 }}>
        Редактирование бренда
      </h1>

      <BrandForm
        brand={{
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          description: brand.description ?? "",
          logoUrl: brand.logoUrl ?? "",
          isActive: brand.isActive,
        }}
      />
    </main>
  );
}
