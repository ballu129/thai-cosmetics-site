"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";

type Brand = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
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

function createProductImagePathname(file: File) {
  const extension = getFileExtension(file.name);

  return `products/${crypto.randomUUID()}.${extension}`;
}

export default function NewProductForm({
  brands,
  categories,
}: {
  brands: Brand[];
  categories: Category[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState(
    categories[0]?.id ?? "",
  );
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [healing, setHealing] = useState(false);
  const [activeIngredients, setActiveIngredients] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [brandId, setBrandId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setImageFile(null);
      return;
    }

    const validationError = validateImageFile(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      setImageFile(null);
      return;
    }

    setError("");
    setImageFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      let uploadedImageUrl = imageUrl.trim() || null;

      if (imageFile) {
        try {
          const blob = await upload(
            createProductImagePathname(imageFile),
            imageFile,
            {
              access: "public",
              handleUploadUrl: "/api/upload",
              contentType: imageFile.type,
            },
          );

          uploadedImageUrl = blob.url;
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? `Не удалось загрузить изображение: ${uploadError.message}`
              : "Не удалось загрузить изображение.",
          );
          return;
        }
      }
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          name,
          slug,
          categoryId,
          price: Number(price),
          description,
          healing,
          activeIngredients: activeIngredients
            .split(",")
            .map((ingredient) => ingredient.trim())
            .filter(Boolean),
          imageUrl: uploadedImageUrl,
          brandId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Не удалось создать товар.");
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Не удалось создать товар.");
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
          placeholder="например: herbal-balm"
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
          <option value="" disabled>
            Выберите бренд
          </option>
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
        Путь к изображению
        <input
          type="text"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="/products/example.jpg"
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Выбрать изображение
        <input
          type="file"
          accept="image/*"
          disabled={saving}
          onChange={handleImageChange}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: 10,
          }}
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

      {brands.length === 0 && (
        <p style={{ color: "red", margin: 0 }}>
          В базе нет брендов. Сначала нужно создать бренд.
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
          !brandId ||
          brands.length === 0 ||
          categories.length === 0
        }
        style={{
          padding: 12,
          cursor:
            saving ||
            !brandId ||
            brands.length === 0 ||
            categories.length === 0
              ? "default"
              : "pointer",
        }}
      >
        {saving ? "Создание..." : "Создать товар"}
      </button>
    </form>
  );
}
