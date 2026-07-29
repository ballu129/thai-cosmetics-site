import Link from "next/link";
import ProductImportForm from "@/components/ProductImportForm";

export const dynamic = "force-dynamic";

export default function AdminImportPage() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "40px auto",
        padding: 24,
      }}
    >
      <Link href="/admin/products">
        ← Назад к товарам
      </Link>

      <h1 style={{ marginTop: 24 }}>
        Импорт товаров
      </h1>

      <p style={{ maxWidth: 760, lineHeight: 1.6 }}>
        Загрузите Excel или CSV-файл с товарами и ZIP-архив
        изображений. Названия файлов в колонке
        &quot;Имя изображения&quot; должны совпадать с файлами
        внутри архива.
      </p>

      <ProductImportForm />
    </main>
  );
}
