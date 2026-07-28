"use client";

import { useRouter } from "next/navigation";

type DeleteCategoryButtonProps = {
  categoryId: string;
  disabled: boolean;
};

export default function DeleteCategoryButton({
  categoryId,
  disabled,
}: DeleteCategoryButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    if (disabled) {
      return;
    }

    const ok = window.confirm("Удалить категорию?");

    if (!ok) {
      return;
    }

    const response = await fetch(`/api/categories/${categoryId}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      alert(data?.error ?? "Не удалось удалить категорию.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleDelete}
      title={
        disabled
          ? "Нельзя удалить категорию с товарами"
          : "Удалить категорию"
      }
      style={{
        marginLeft: 8,
        padding: "7px 12px",
        border: "1px solid #c33",
        borderRadius: 6,
        background: "#fff",
        color: disabled ? "#999" : "#c33",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      Удалить
    </button>
  );
}
