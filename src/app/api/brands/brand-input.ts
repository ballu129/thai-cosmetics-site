type BrandInput = {
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
};

type BrandInputResult =
  | {
      success: true;
      data: BrandInput;
    }
  | {
      success: false;
      error: string;
    };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 160;
const MAX_SLUG_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_URL_LENGTH = 1000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(
  body: Record<string, unknown>,
  field: string,
) {
  const value = body[field];

  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(
  body: Record<string, unknown>,
  field: string,
) {
  const value = body[field];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || null;
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidHttpUrl(value: string) {
  if (value.length > MAX_URL_LENGTH) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateBrandInput(body: unknown): BrandInputResult {
  if (!isObject(body)) {
    return {
      success: false,
      error: "Переданы некорректные данные бренда.",
    };
  }

  const name = readRequiredString(body, "name");
  const slug = normalizeSlug(readRequiredString(body, "slug"));
  const description = readOptionalString(body, "description");
  const logoUrl = readOptionalString(body, "logoUrl");
  const websiteUrl = readOptionalString(body, "websiteUrl");

  if (!name || !slug) {
    return {
      success: false,
      error: "Заполните название и slug бренда.",
    };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return {
      success: false,
      error: `Название бренда не должно быть длиннее ${MAX_NAME_LENGTH} символов.`,
    };
  }

  if (
    !SLUG_PATTERN.test(slug) ||
    slug.length > MAX_SLUG_LENGTH
  ) {
    return {
      success: false,
      error:
        "Slug должен содержать только латинские буквы, цифры и одиночные дефисы.",
    };
  }

  if (
    description === undefined ||
    logoUrl === undefined ||
    websiteUrl === undefined
  ) {
    return {
      success: false,
      error: "Переданы некорректные дополнительные поля бренда.",
    };
  }

  if (
    description &&
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return {
      success: false,
      error: `Описание бренда не должно быть длиннее ${MAX_DESCRIPTION_LENGTH} символов.`,
    };
  }

  if (logoUrl && !isValidHttpUrl(logoUrl)) {
    return {
      success: false,
      error: "Логотип должен быть корректным URL с http или https.",
    };
  }

  if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
    return {
      success: false,
      error: "Сайт бренда должен быть корректным URL с http или https.",
    };
  }

  if (typeof body.isActive !== "boolean") {
    return {
      success: false,
      error: "Передан некорректный признак активности бренда.",
    };
  }

  return {
    success: true,
    data: {
      name,
      slug,
      description,
      logoUrl,
      websiteUrl,
      isActive: body.isActive,
    },
  };
}
