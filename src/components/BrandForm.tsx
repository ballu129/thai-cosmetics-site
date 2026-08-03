"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type BrandData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
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

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidHttpUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  const [websiteUrl, setWebsiteUrl] = useState(
    brand?.websiteUrl ?? "",
  );
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);

    if (!slugWasEdited) {
      setSlug(normalizeSlug(value));
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
        setError(
          data.error ?? "Не удалось загрузить логотип.",
        );
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
    const cleanSlug = normalizeSlug(slug);
    const cleanDescription = description.trim();
    const cleanLogoUrl = logoUrl.trim();
    const cleanWebsiteUrl = websiteUrl.trim();

    if (!cleanName || !cleanSlug) {
      setError("Заполните название и slug бренда.");
      return;
    }

    if (!SLUG_PATTERN.test(cleanSlug)) {
      setError(
        "Slug должен содержать только латинские буквы, цифры и одиночные дефисы.",
      );
      return;
    }

    if (!isValidHttpUrl(cleanLogoUrl)) {
      setError("Логотип должен быть корректным URL с http или https.");
      return;
    }

    if (!isValidHttpUrl(cleanWebsiteUrl)) {
      setError("Сайт бренда должен быть корректным URL с http или https.");
      return;
    }

    setSlug(cleanSlug);
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
            description: cleanDescription || null,
            logoUrl: cleanLogoUrl || null,
            websiteUrl: cleanWebsiteUrl || null,
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
        display: "grid",
        gap: 16,
        marginTop: 24,
        maxWidth: 760,
      }}
    >
      <label style={fieldStyle}>
        <span style={labelStyle}>Название</span>
        <input
          type="text"
          required
          value={name}
          onChange={(event) =>
            handleNameChange(event.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Slug</span>
        <input
          type="text"
          required
          value={slug}
          onBlur={() => setSlug(normalizeSlug(slug))}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugWasEdited(true);
          }}
          style={inputStyle}
        />
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Описание</span>
        <textarea
          rows={6}
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          style={inputStyle}
        />
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Загрузить логотип</span>
        <input
          type="file"
          accept="image/*"
          disabled={uploading || saving}
          onChange={handleLogoUpload}
          style={inputStyle}
        />
      </label>

      {uploading ? (
        <p style={{ margin: 0 }}>Загрузка логотипа...</p>
      ) : null}

      <label style={fieldStyle}>
        <span style={labelStyle}>URL логотипа</span>
        <input
          type="url"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
          placeholder="https://example.com/logo.png"
          style={inputStyle}
        />
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Сайт бренда</span>
        <input
          type="url"
          value={websiteUrl}
          onChange={(event) =>
            setWebsiteUrl(event.target.value)
          }
          placeholder="https://example.com"
          style={inputStyle}
        />
      </label>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) =>
            setIsActive(event.target.checked)
          }
        />
        Активный бренд
      </label>

      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving || uploading}
        style={{
          width: "fit-content",
          padding: "12px 18px",
          border: "1px solid #254b3f",
          borderRadius: 6,
          background: "#254b3f",
          color: "#fff",
          cursor: saving || uploading ? "default" : "pointer",
        }}
      >
        {saving ? "Сохранение..." : "Сохранить бренд"}
      </button>
    </form>
  );
}

const fieldStyle = {
  display: "grid",
  gap: 8,
} as const;

const labelStyle = {
  fontWeight: 600,
} as const;

const inputStyle = {
  width: "100%",
  minWidth: 0,
  padding: 10,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
} as const;

const checkboxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
} as const;
