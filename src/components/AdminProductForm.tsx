"use client";

import { ChangeEvent, FormEvent, useState } from "react";
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

type UploadResponse = {
  success?: boolean;
  imageUrl?: string;
  error?: string;
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
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Можно загружать только изображения.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.imageUrl) {
        setError(data.error ?? "Не удалось загрузить изображение.");
        return;
      }

      setImageUrl(data.imageUrl);
    } catch {
      setError("Не удалось загрузить изображение.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

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
        Выбрать новое изображение
        <input
          type="file"
          accept="image/*"
          disabled={uploading || saving}
          onChange={handleImageUpload}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: 10,
          }}
        />
      </label>

      {uploading && <p style={{ margin: 0 }}>Загрузка изображения...</p>}

      <label>
        Путь к изображению
        <input
          type="text"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      {imageUrl && (
        <div>
          <p style={{ marginTop: 0 }}>Предпросмотр</p>
          <img
            src={imageUrl}
            alt="Предпросмотр товара"
            style={{
              display: "block",
              width: 240,
              maxWidth: "100%",
              height: 240,
              objectFit: "contain",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        </div>
      )}

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
        disabled={saving || uploading}
        style={{
          padding: 12,
          cursor: saving || uploading ? "default" : "pointer",
        }}
      >
        {saving ? "Сохранение..." : "Сохранить"}
      </button>
    </form>
  );
}
