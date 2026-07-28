import Link from "next/link";
import CategoryForm from "@/components/CategoryForm";

export const metadata = {
  title: "Новая категория",
};

export default function NewCategoryPage() {
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
        Новая категория
      </h1>

      <CategoryForm />
    </main>
  );
}
