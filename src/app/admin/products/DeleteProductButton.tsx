"use client";

import { useRouter } from "next/navigation";

type Props = {
  productId: string;
};

export default function DeleteProductButton({ productId }: Props) {
  const router = useRouter();

  async function handleDelete() {
    const ok = window.confirm("Удалить товар?");
    if (!ok) return;

    const response = await fetch(`/api/products/${productId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Не удалось удалить товар.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      style={{
        marginLeft: 8,
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