import Link from "next/link";
import ProductImportForm from "@/components/ProductImportForm";

export const dynamic = "force-dynamic";

export default function AdminProductsImportPage() {
  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "40px auto",
        padding: 24,
      }}
    >
      <Link href="/admin/products">← Назад к товарам</Link>

      <h1 style={{ marginTop: 24 }}>Импорт товаров</h1>

      <p style={{ maxWidth: 820, lineHeight: 1.6 }}>
        Массовый импорт поддерживает CSV и XLSX до 2500 строк. Сначала
        проверьте файл, выберите режим для существующих slug и отдельно
        подтвердите создание отсутствующих брендов.
      </p>

      <ProductImportForm />
    </main>
  );
}
