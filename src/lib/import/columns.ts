export const IMPORT_COLUMNS = [
  "name",
  "slug",
  "brand",
  "category",
  "price",
  "description",
  "activeIngredients",
  "imageUrl",
  "healing",
] as const;

export const IMPORT_COLUMN_ALIASES: Record<string, ImportColumn> = {
  название: "name",
  имя: "name",
  товар: "name",
  бренд: "brand",
  категория: "category",
  цена: "price",
  описание: "description",
  "активные ингредиенты": "activeIngredients",
  изображение: "imageUrl",
  "ссылка изображения": "imageUrl",
  "путь изображения": "imageUrl",
  "имя изображения": "imageUrl",
  лечебный: "healing",
  "лечебный товар": "healing",
};

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export type ImportRow = Record<ImportColumn, string>;

export type ExistingProductMode = "skip" | "update";

export type ImportAction = "create" | "update" | "skip" | "error";

export type ImportRowStatus =
  | "created"
  | "updated"
  | "skipped"
  | "error";

export type ImportRowResult = {
  row: number;
  name: string;
  slug: string;
  brand: string;
  category: string;
  price: string;
  action: ImportAction;
  status: ImportRowStatus;
  errors: string[];
  brandMissing?: boolean;
  productExists?: boolean;
};

export type ImportReport = {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowResult[];
  rows: ImportRowResult[];
};

export type ParsedImportTable = {
  rows: ImportRow[];
  missingColumns: readonly ImportColumn[];
};

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

export function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

export function mapImportHeader(value: unknown) {
  const normalized = normalizeHeader(value);

  return (
    IMPORT_COLUMNS.find((column) => normalizeHeader(column) === normalized) ??
    IMPORT_COLUMN_ALIASES[normalized] ??
    null
  );
}
