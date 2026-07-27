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

export function validateBrandInput(body: unknown): BrandInputResult {
  if (!isObject(body)) {
    return {
      success: false,
      error: "Переданы некорректные данные бренда.",
    };
  }

  const name = readRequiredString(body, "name");
  const slug = readRequiredString(body, "slug");
  const description = readOptionalString(body, "description");
  const logoUrl = readOptionalString(body, "logoUrl");
  const websiteUrl = readOptionalString(body, "websiteUrl");

  if (!name || !slug) {
    return {
      success: false,
      error: "Заполните название и slug бренда.",
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
