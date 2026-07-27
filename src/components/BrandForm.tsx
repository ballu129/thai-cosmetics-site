"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type BrandData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  isActive: boolean;
};

type BrandFormProps = {
  brand?: BrandData;
};

type UploadResponse = {
  success?: boolean;
  imageUrl?: string;
  error?: string;
};

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/й/g, "i")
    .replace(/[^a-z0-9а-я]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BrandForm({ brand }: BrandFormProps) {
  const router = useRouter();
  const isEditing = Boolean(brand);

  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [slugWasEdited, setSlugWasEdited] = useState(isEditing);
  const [description, setDescription] = useState(
    brand?.description ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? "");
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);

    if (!slugWasEdited) {
      setSlug(createSlug(value));
    }
  }

  async function handleLogoUpload(
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
        setError(data.error ?? "Не удалось загрузить логотип.");
        return;
      }

      setLogoUrl(data.imageUrl);
    } catch {
      setError("Не удалось загрузить логотип.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanSlug = slug.trim();

    if (!cleanName || !cleanSlug) {
      setError("Заполните название и slug бренда.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        isEditing ? `/api/brands/${brand?.id}` : "/api/brands",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            slug: cleanSlug,
            description: description.trim() || null,
            logoUrl: logoUrl.trim() || null,
            websiteUrl: null,
            isActive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error ?? "Не удалось сохранить бренд.");
        return;
      }

      router.push("/admin/brands");
      router.refresh();
    } catch {
      setError("Не удалось сохранить бренд.");
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
          onChange={(event) => handleNameChange(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Slug
        <input
          type="text"
          required
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugWasEdited(true);
          }}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Описание
        <textarea
          rows={6}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        Загрузить логотип
        <input
          type="file"
          accept="image/*"
          disabled={uploading || saving}
          onChange={handleLogoUpload}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: 10,
          }}
        />
      </label>

      {uploading && <p style={{ margin: 0 }}>Загрузка логотипа...</p>}

      <label>
        Путь к логотипу
        <input
          type="text"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
          placeholder="/products/example.jpg"
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />{" "}
        Активный бренд
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
        {saving ? "Сохранение..." : "Сохранить бренд"}
      </button>
    </form>
  );
}
