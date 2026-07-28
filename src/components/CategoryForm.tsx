"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
};

type CategoryFormProps = {
  category?: CategoryData;
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

export default function CategoryForm({
  category,
}: CategoryFormProps) {
  const router = useRouter();
  const isEditing = Boolean(category);

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugWasEdited, setSlugWasEdited] = useState(isEditing);
  const [description, setDescription] = useState(
    category?.description ?? "",
  );
  const [isActive, setIsActive] = useState(
    category?.isActive ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);

    if (!slugWasEdited) {
      setSlug(createSlug(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanSlug = slug.trim();

    if (!cleanName || !cleanSlug) {
      setError("Заполните название и slug категории.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        isEditing
          ? `/api/categories/${category?.id}`
          : "/api/categories",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            slug: cleanSlug,
            description: description.trim() || null,
            isActive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error ?? "Не удалось сохранить категорию.");
        return;
      }

      router.push("/admin/categories");
      router.refresh();
    } catch {
      setError("Не удалось сохранить категорию.");
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
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />{" "}
        Активная категория
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
        {saving ? "Сохранение..." : "Сохранить категорию"}
      </button>
    </form>
  );
}
