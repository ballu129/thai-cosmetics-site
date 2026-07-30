export const IMPORT_COLUMNS = [
  "Бренд",
  "Категория",
  "Название",
  "Slug",
  "Цена",
  "Краткое описание",
  "Полное описание",
  "Активные ингредиенты",
  "Способ применения",
  "Меры предосторожности",
  "Состав",
  "Лечебный товар",
  "Имя изображения",
  "Обновлять существующий товар",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export type ImportRow = Record<ImportColumn, string>;

export type ImportRowStatus =
  | "created"
  | "updated"
  | "skipped"
  | "error";

export type ImportRowResult = {
  row: number;
  slug: string;
  name: string;
  status: ImportRowStatus;
  errors: string[];
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
