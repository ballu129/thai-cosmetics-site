"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Brand = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

type ProductData = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  price: number;
  description: string;
  healing: boolean;
  activeIngredients: string[];
  imageUrl: string;
};

type UploadResponse = {
  success?: boolean;
  imageUrl?: string;
  error?: string;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function validateImageFile(file: File) {
  const extension = getFileExtension(file.name);

  if (
    !file.type.startsWith("image/") ||
    !ALLOWED_IMAGE_EXTENSIONS.includes(extension)
  ) {
    return "Можно загружать только изображения JPG, PNG или WEBP.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Размер изображения не должен превышать 5 МБ.";
  }

  return null;
}

export default function AdminProductForm({
  brands,
  categories,
  product,
}: {
  brands: Brand[];
  categories: Category[];
  product: ProductData;
}) {
  const router = useRouter();

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [brandId, setBrandId] = useState(product.brandId);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description);
  const [healing, setHealing] = useState(product.healing);
  const [activeIngredients, setActiveIngredients] = useState(
    product.activeIngredients.join(", "),
  );
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

    const validationError = validateImageFile(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData =
        (await uploadResponse.json()) as UploadResponse;

      if (!uploadResponse.ok || !uploadData.imageUrl) {
        setError(
          uploadData.error ??
            "Не удалось загрузить изображение.",
        );
        return;
      }

      setImageUrl(uploadData.imageUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? `Не удалось загрузить изображение: ${uploadError.message}`
          : "Не удалось загрузить изображение.",
      );
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
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          name,
          slug,
          brandId,
          categoryId,
          price: Number(price),
          description,
          healing,
          activeIngredients: activeIngredients
            .split(",")
            .map((ingredient) => ingredient.trim())
            .filter(Boolean),
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
        Адрес товара — slug
        <input
          type="text"
          required
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Бренд
        <select
          required
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Категория
        <select
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Цена
        <input
          type="number"
          required
          min="0.01"
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
        Активные ингредиенты
        <input
          type="text"
          value={activeIngredients}
          onChange={(event) =>
            setActiveIngredients(event.target.value)
          }
          placeholder="ментол, камфора, тайские травы"
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
          <Image
            src={imageUrl}
            alt="Предпросмотр товара"
            width={240}
            height={240}
            unoptimized
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

      {brands.length === 0 && (
        <p style={{ color: "red", margin: 0 }}>
          В базе нет активных брендов. Сначала нужно создать бренд.
        </p>
      )}

      {categories.length === 0 && (
        <p style={{ color: "red", margin: 0 }}>
          В базе нет категорий. Сначала нужно создать категорию.
        </p>
      )}

      {error && (
        <p style={{ color: "red", margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          saving ||
          uploading ||
          brands.length === 0 ||
          categories.length === 0
        }
        style={{
          padding: 12,
          cursor:
            saving ||
            uploading ||
            brands.length === 0 ||
            categories.length === 0
              ? "default"
              : "pointer",
        }}
      >
        {saving ? "Сохранение..." : "Сохранить"}
      </button>
    </form>
  );
}
