import Link from "next/link";
import BrandForm from "@/components/BrandForm";

export const metadata = {
  title: "Новый бренд",
};

export default function NewBrandPage() {
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
        Новый бренд
      </h1>

      <BrandForm />
    </main>
  );
}
