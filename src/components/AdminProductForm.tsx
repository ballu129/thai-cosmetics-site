"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProductData = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  healing: boolean;
  imageUrl: string;
};

export default function AdminProductForm({
  product,
}: {
  product: ProductData;
}) {
  const router = useRouter();

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description);
  const [healing, setHealing] = useState(product.healing);
  const [imageUrl, setImageUrl] = useState(product.imageUrl);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          category,
          price: Number(price),
          description,
          healing,
          imageUrl: imageUrl.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Не удалось сохранить товар.");
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Не удалось сохранить товар.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginTop: 24,
        maxWidth: 700,
      }}
    >
      <label>
        Название
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Категория
        <input
          type="text"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Цена
        <input
          type="number"
          required
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Описание
        <textarea
          required
          rows={6}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Путь к изображению
        <input
          type="text"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={healing}
          onChange={(event) => setHealing(event.target.checked)}
        />{" "}
        Лечебный товар
      </label>

      {error && (
        <p style={{ color: "red", margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: 12,
          cursor: saving ? "default" : "pointer",
        }}
      >
        {saving ? "Сохранение..." : "Сохранить"}
      </button>
    </form>
  );
}
