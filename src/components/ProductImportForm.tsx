"use client";

import { FormEvent, useState } from "react";

type ImportError = {
  row: number;
  name?: string;
  errors: string[];
};

type ImportReport = {
  imported: number;
  updated: number;
  errors: ImportError[];
};

export default function ProductImportForm() {
  const [spreadsheet, setSpreadsheet] =
    useState<File | null>(null);
  const [imagesZip, setImagesZip] =
    useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] =
    useState<ImportReport | null>(null);

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

      if (!response.ok) {
        setError(
          data.error ?? "Не удалось выполнить импорт.",
        );
        return;
      }

      setReport({
        imported: data.imported ?? 0,
        updated: data.updated ?? 0,
        errors: data.errors ?? [],
      });
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
              setSpreadsheet(
                event.target.files?.[0] ?? null,
              )
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

        <button
          type="submit"
          disabled={importing}
          style={{
            width: "fit-content",
            padding: "12px 18px",
            cursor: importing ? "default" : "pointer",
          }}
        >
          {importing ? "Импорт..." : "Импортировать товары"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>
          {error}
        </p>
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
          <h2 style={{ marginTop: 0 }}>Отчёт импорта</h2>

          <p style={{ margin: "8px 0" }}>
            Импортировано: {report.imported}
          </p>

          <p style={{ margin: "8px 0" }}>
            Обновлено: {report.updated}
          </p>

          <p style={{ margin: "8px 0" }}>
            Строк с ошибками: {report.errors.length}
          </p>

          {report.errors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Ошибки</h3>

              <ul>
                {report.errors.map((item) => (
                  <li key={`${item.row}-${item.name ?? ""}`}>
                    Строка {item.row}
                    {item.name ? `, ${item.name}` : ""}:{" "}
                    {item.errors.join(" ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
