type CategoryInput = {
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
};

type CategoryInputResult =
  | {
      success: true;
      data: CategoryInput;
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

export function validateCategoryInput(
  body: unknown,
): CategoryInputResult {
  if (!isObject(body)) {
    return {
      success: false,
      error: "Переданы некорректные данные категории.",
    };
  }

  const name = readRequiredString(body, "name");
  const slug = readRequiredString(body, "slug");
  const description = readOptionalString(body, "description");

  if (!name || !slug) {
    return {
      success: false,
      error: "Заполните название и slug категории.",
    };
  }

  if (description === undefined) {
    return {
      success: false,
      error: "Передано некорректное описание категории.",
    };
  }

  if (typeof body.isActive !== "boolean") {
    return {
      success: false,
      error: "Передан некорректный признак активности категории.",
    };
  }

  return {
    success: true,
    data: {
      name,
      slug,
      description,
      isActive: body.isActive,
    },
  };
}
