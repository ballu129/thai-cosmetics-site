"use client";

import { useRouter } from "next/navigation";

type DeleteBrandButtonProps = {
  brandId: string;
  productCount: number;
};

export default function DeleteBrandButton({
  brandId,
  productCount,
}: DeleteBrandButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    if (productCount > 0) {
      alert(
        `Нельзя удалить бренд, пока к нему привязаны товары. Связанных товаров: ${productCount}.`,
      );
      return;
    }

    const ok = window.confirm("Удалить бренд?");

    if (!ok) {
      return;
    }

    const response = await fetch(`/api/brands/${brandId}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      alert(data?.error ?? "Не удалось удалить бренд.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      title={
        productCount > 0
          ? "Нельзя удалить бренд с товарами"
          : "Удалить бренд"
      }
      style={{
        padding: "7px 12px",
        border: "1px solid #c33",
        borderRadius: 6,
        background: "#fff",
        color: "#c33",
        cursor: "pointer",
      }}
    >
      Удалить
    </button>
  );
}
