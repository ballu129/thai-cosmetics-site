"use client";

import { FormEvent, useMemo, useState } from "react";

type ImportRowStatus = "created" | "updated" | "skipped" | "error";
type ImportAction = "create" | "update" | "skip" | "error";
type ExistingProductMode = "skip" | "update";

type ImportRowResult = {
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

type ImportReport = {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowResult[];
  rows: ImportRowResult[];
};

const actionLabels: Record<ImportAction, string> = {
  create: "Новый товар",
  update: "Обновление",
  skip: "Пропуск",
  error: "Ошибка",
};

const statusLabels: Record<ImportRowStatus, string> = {
  created: "Готов к созданию",
  updated: "Готов к обновлению",
  skipped: "Будет пропущен",
  error: "Ошибка",
};

function getResultLabel(status: ImportRowStatus, dryRun: boolean) {
  if (dryRun) {
    return statusLabels[status];
  }

  if (status === "created") {
    return "Создан";
  }

  if (status === "updated") {
    return "Обновлён";
  }

  if (status === "skipped") {
    return "Пропущен";
  }

  return "Ошибка";
}

function formatFileSize(file: File) {
  if (file.size >= 1024 * 1024) {
    return `${(file.size / 1024 / 1024).toFixed(2)} МБ`;
  }

  return `${Math.max(1, Math.round(file.size / 1024))} КБ`;
}

export default function ProductImportForm() {
  const [spreadsheet, setSpreadsheet] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [existingProductMode, setExistingProductMode] =
    useState<ExistingProductMode>("skip");
  const [createMissingBrands, setCreateMissingBrands] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    "preview" | "import" | null
  >(null);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  const importableRows = useMemo(() => {
    if (!report) {
      return 0;
    }

    return report.rows.filter(
      (row) => row.status === "created" || row.status === "updated",
    ).length;
  }, [report]);

  function resetPreview() {
    setReport(null);
    setError("");
  }

  async function submitImport(action: "preview" | "import") {
    if (!spreadsheet) {
      setError("Загрузите Excel или CSV-файл.");
      return;
    }

    const formData = new FormData();
    formData.append("spreadsheet", spreadsheet);
    formData.append("action", action);
    formData.append("existingProductMode", existingProductMode);
    formData.append("createMissingBrands", String(createMissingBrands));

    if (imagesZip) {
      formData.append("imagesZip", imagesZip);
    }

    setLoadingAction(action);
    setError("");

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (data?.rows) {
        setReport({
          dryRun: Boolean(data.dryRun),
          totalRows: data.totalRows ?? 0,
          created: data.created ?? 0,
          updated: data.updated ?? 0,
          skipped: data.skipped ?? 0,
          errors: data.errors ?? [],
          rows: data.rows ?? [],
        });
      }

      if (!response.ok) {
        setError(
          data?.error ??
            "Файл не прошёл проверку. Исправьте ошибки и повторите загрузку.",
        );
      }
    } catch {
      setError("Не удалось выполнить импорт.");
    } finally {
      setLoadingAction(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitImport("preview");
  }

  return (
    <div style={{ maxWidth: 1180 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <a
          href="/api/import/template"
          style={secondaryButtonStyle}
        >
          Скачать шаблон Excel
        </a>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 18,
          padding: 20,
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          background: "#ffffff",
        }}
      >
        <label style={fieldStyle}>
          <span style={labelStyle}>CSV или XLSX</span>
          <input
            type="file"
            accept=".xlsx,.csv"
            required
            disabled={loadingAction !== null}
            onChange={(event) => {
              setSpreadsheet(event.target.files?.[0] ?? null);
              resetPreview();
            }}
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>
            ZIP-архив изображений, если в imageUrl указаны имена файлов
          </span>
          <input
            type="file"
            accept=".zip"
            disabled={loadingAction !== null}
            onChange={(event) => {
              setImagesZip(event.target.files?.[0] ?? null);
              resetPreview();
            }}
            style={inputStyle}
          />
        </label>

        <fieldset
          style={{
            margin: 0,
            padding: 0,
            border: 0,
            display: "grid",
            gap: 10,
          }}
        >
          <legend style={labelStyle}>
            Если slug уже существует
          </legend>

          <label style={radioStyle}>
            <input
              type="radio"
              name="existingProductMode"
              value="skip"
              checked={existingProductMode === "skip"}
              disabled={loadingAction !== null}
              onChange={() => {
                setExistingProductMode("skip");
                resetPreview();
              }}
            />
            Пропустить существующий товар
          </label>

          <label style={radioStyle}>
            <input
              type="radio"
              name="existingProductMode"
              value="update"
              checked={existingProductMode === "update"}
              disabled={loadingAction !== null}
              onChange={() => {
                setExistingProductMode("update");
                resetPreview();
              }}
            />
            Обновить существующий товар
          </label>
        </fieldset>

        <label style={radioStyle}>
          <input
            type="checkbox"
            checked={createMissingBrands}
            disabled={loadingAction !== null}
            onChange={(event) => {
              setCreateMissingBrands(event.target.checked);
              resetPreview();
            }}
          />
          Создавать отсутствующие бренды после подтверждения импорта
        </label>

        <div
          style={{
            display: "grid",
            gap: 6,
            color: "#475569",
            fontSize: 14,
          }}
        >
          <span>
            Выбранный режим для существующих slug:{" "}
            <strong>
              {existingProductMode === "skip"
                ? "пропускать"
                : "обновлять"}
            </strong>
          </span>

          <span>
            Отсутствующие бренды:{" "}
            <strong>
              {createMissingBrands
                ? "создавать при импорте"
                : "считать ошибкой"}
            </strong>
          </span>

          {spreadsheet ? (
            <span>
              Файл: <strong>{spreadsheet.name}</strong> (
              {formatFileSize(spreadsheet)})
            </span>
          ) : null}

          {imagesZip ? (
            <span>
              Архив изображений: <strong>{imagesZip.name}</strong> (
              {formatFileSize(imagesZip)})
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={!spreadsheet || loadingAction !== null}
            style={primaryButtonStyle}
          >
            {loadingAction === "preview"
              ? "Проверка..."
              : "Проверить файл"}
          </button>

          <button
            type="button"
            disabled={
              !spreadsheet ||
              !report ||
              !report.dryRun ||
              importableRows === 0 ||
              loadingAction !== null
            }
            onClick={() => void submitImport("import")}
            style={primaryButtonStyle}
          >
            {loadingAction === "import"
              ? "Импорт..."
              : "Запустить импорт"}
          </button>
        </div>
      </form>

      {loadingAction ? (
        <p style={{ marginTop: 20 }}>
          {loadingAction === "preview"
            ? "Идёт предварительная проверка..."
            : "Идёт импорт товаров..."}
        </p>
      ) : null}

      {error ? (
        <p style={{ color: "#b91c1c", marginTop: 20 }}>{error}</p>
      ) : null}

      {report ? (
        <section
          style={{
            marginTop: 28,
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {report.dryRun
              ? "Предварительный просмотр"
              : "Итоговый отчёт импорта"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <SummaryItem label="Строк" value={report.totalRows} />
            <SummaryItem
              label={report.dryRun ? "Новых" : "Создано"}
              value={report.created}
            />
            <SummaryItem
              label={report.dryRun ? "Обновлений" : "Обновлено"}
              value={report.updated}
            />
            <SummaryItem label="Пропущено" value={report.skipped} />
            <SummaryItem label="Ошибок" value={report.errors.length} />
          </div>

          {report.errors.length > 0 ? (
            <div
              style={{
                marginBottom: 20,
                padding: 12,
                border: "1px solid #fecaca",
                borderRadius: 8,
                background: "#fef2f2",
              }}
            >
              <strong>Ошибки по строкам:</strong>
              <ul style={{ marginBottom: 0 }}>
                {report.errors.slice(0, 30).map((item) => (
                  <li key={`${item.row}-${item.slug}-error`}>
                    Строка {item.row}: {item.errors.join(" ")}
                  </li>
                ))}
              </ul>
              {report.errors.length > 30 ? (
                <p style={{ marginBottom: 0 }}>
                  Показаны первые 30 ошибок из {report.errors.length}.
                </p>
              ) : null}
            </div>
          ) : null}

          {report.rows.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1100,
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th style={cellStyle}>Строка</th>
                    <th style={cellStyle}>Название</th>
                    <th style={cellStyle}>Slug</th>
                    <th style={cellStyle}>Бренд</th>
                    <th style={cellStyle}>Категория</th>
                    <th style={cellStyle}>Цена</th>
                    <th style={cellStyle}>Действие</th>
                    <th style={cellStyle}>Результат проверки</th>
                    <th style={cellStyle}>Ошибка</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((item) => (
                    <tr key={`${item.row}-${item.slug}-${item.action}`}>
                      <td style={cellStyle}>{item.row}</td>
                      <td style={cellStyle}>{item.name || "—"}</td>
                      <td style={cellStyle}>{item.slug || "—"}</td>
                      <td style={cellStyle}>
                        {item.brand || "—"}
                        {item.brandMissing ? (
                          <div style={{ color: "#b45309" }}>
                            бренд отсутствует
                          </div>
                        ) : null}
                      </td>
                      <td style={cellStyle}>{item.category || "—"}</td>
                      <td style={cellStyle}>{item.price || "—"}</td>
                      <td style={cellStyle}>
                        {actionLabels[item.action]}
                        {item.productExists ? (
                          <div style={{ color: "#475569" }}>
                            slug уже есть
                          </div>
                        ) : null}
                      </td>
                      <td style={cellStyle}>
                        {getResultLabel(item.status, report.dryRun)}
                      </td>
                      <td style={cellStyle}>
                        {item.errors.length > 0
                          ? item.errors.join(" ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        background: "#f8fafc",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
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
  padding: 10,
} as const;

const radioStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
} as const;

const primaryButtonStyle = {
  width: "fit-content",
  padding: "12px 18px",
  border: "1px solid #254b3f",
  borderRadius: 6,
  background: "#254b3f",
  color: "#ffffff",
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  display: "inline-block",
  padding: "10px 16px",
  border: "1px solid #777",
  borderRadius: 6,
  color: "inherit",
  textDecoration: "none",
} as const;

const cellStyle = {
  borderBottom: "1px solid #ddd",
  padding: 10,
  textAlign: "left" as const,
  verticalAlign: "top" as const,
};
