"use client";

import { FormEvent, useState } from "react";

type ImportRowStatus = "created" | "updated" | "skipped" | "error";

type ImportRowResult = {
  row: number;
  slug: string;
  name: string;
  status: ImportRowStatus;
  errors: string[];
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

const statusLabels: Record<ImportRowStatus, string> = {
  created: "Будет создан",
  updated: "Будет обновлён",
  skipped: "Пропущен",
  error: "Ошибка",
};

function getStatusLabel(status: ImportRowStatus, dryRun: boolean) {
  if (dryRun) {
    return statusLabels[status];
  }

  if (status === "created") {
    return "Создан";
  }

  if (status === "updated") {
    return "Обновлён";
  }

  return statusLabels[status];
}

export default function ProductImportForm() {
  const [spreadsheet, setSpreadsheet] = useState<File | null>(
    null,
  );
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ImportReport | null>(
    null,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!spreadsheet) {
      setError("Загрузите Excel или CSV-файл.");
      return;
    }

    const formData = new FormData();
    formData.append("spreadsheet", spreadsheet);
    formData.append("dryRun", String(dryRun));

    if (imagesZip) {
      formData.append("imagesZip", imagesZip);
    }

    setImporting(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.rows) {
        setReport({
          dryRun: data.dryRun ?? dryRun,
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
          data.error ??
            "Файл не прошёл проверку. Исправьте ошибки и повторите загрузку.",
        );
        return;
      }
    } catch {
      setError("Не удалось выполнить импорт.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <a
        href="/api/import/template"
        style={{
          display: "inline-block",
          padding: "10px 16px",
          border: "1px solid #777",
          borderRadius: 6,
          color: "inherit",
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        Скачать шаблон Excel
      </a>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <label>
          Excel или CSV
          <input
            type="file"
            accept=".xlsx,.csv"
            required
            disabled={importing}
            onChange={(event) =>
              setSpreadsheet(event.target.files?.[0] ?? null)
            }
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              padding: 10,
            }}
          />
        </label>

        <label>
          ZIP-архив изображений
          <input
            type="file"
            accept=".zip"
            disabled={importing}
            onChange={(event) =>
              setImagesZip(event.target.files?.[0] ?? null)
            }
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              padding: 10,
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            type="checkbox"
            checked={dryRun}
            disabled={importing}
            onChange={(event) =>
              setDryRun(event.target.checked)
            }
          />
          Только предварительная проверка без записи в базу и Blob
        </label>

        <button
          type="submit"
          disabled={importing}
          style={{
            width: "fit-content",
            padding: "12px 18px",
            cursor: importing ? "default" : "pointer",
          }}
        >
          {importing
            ? dryRun
              ? "Проверка..."
              : "Импорт..."
            : dryRun
              ? "Проверить импорт"
              : "Импортировать товары"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>{error}</p>
      )}

      {report && (
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
              ? "Отчёт предварительной проверки"
              : "Отчёт импорта"}
          </h2>

          <p style={{ margin: "8px 0" }}>
            Всего строк: {report.totalRows}
          </p>

          <p style={{ margin: "8px 0" }}>
            {report.dryRun ? "Будет создано" : "Создано"}:{" "}
            {report.created}
          </p>

          <p style={{ margin: "8px 0" }}>
            {report.dryRun ? "Будет обновлено" : "Обновлено"}:{" "}
            {report.updated}
          </p>

          <p style={{ margin: "8px 0" }}>
            Пропущено: {report.skipped}
          </p>

          <p style={{ margin: "8px 0" }}>
            Строк с ошибками: {report.errors.length}
          </p>

          {report.rows.length > 0 && (
            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Строка
                    </th>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Slug
                    </th>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Название
                    </th>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Статус
                    </th>
                    <th style={{ textAlign: "left", padding: 8 }}>
                      Ошибка
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((item) => (
                    <tr key={`${item.row}-${item.slug}`}>
                      <td style={{ padding: 8 }}>{item.row}</td>
                      <td style={{ padding: 8 }}>
                        {item.slug || "—"}
                      </td>
                      <td style={{ padding: 8 }}>
                        {item.name || "—"}
                      </td>
                      <td style={{ padding: 8 }}>
                        {getStatusLabel(
                          item.status,
                          report.dryRun,
                        )}
                      </td>
                      <td style={{ padding: 8 }}>
                        {item.errors.length > 0
                          ? item.errors.join(" ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
