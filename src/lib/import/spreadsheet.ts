import JSZip from "jszip";
import {
  IMPORT_COLUMNS,
  type ImportRow,
  type ParsedImportTable,
  normalizeHeader,
  normalizeValue,
} from "./columns";
import { getFileExtension } from "./images";

export const MAX_TABLE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readXmlTexts(xml: string) {
  const texts: string[] = [];
  const textPattern = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml)) !== null) {
    texts.push(decodeXml(match[1]));
  }

  return texts.join("");
}

function getCellColumnIndex(cellReference: string) {
  const columnLetters =
    cellReference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "";
  let index = 0;

  for (const letter of columnLetters) {
    index =
      index * 26 + letter.charCodeAt(0) - "A".charCodeAt(0) + 1;
  }

  return Math.max(index - 1, 0);
}

function readCellAttributes(cellXml: string) {
  const attributes = new Map<string, string>();
  const openingTag = cellXml.match(/^<c\s+([^>]*)>/)?.[1] ?? "";
  const attributePattern = /([A-Za-z_:]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(openingTag)) !== null) {
    attributes.set(match[1], decodeXml(match[2]));
  }

  return attributes;
}

async function parseXlsxRows(arrayBuffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");

  if (!sheetFile) {
    throw new Error("В Excel-файле не найден первый лист.");
  }

  const sharedStringsXml =
    await zip.file("xl/sharedStrings.xml")?.async("string");
  const sharedStrings: string[] = [];

  if (sharedStringsXml) {
    const sharedStringPattern = /<si(?:\s[^>]*)?>[\s\S]*?<\/si>/g;
    let sharedStringMatch: RegExpExecArray | null;

    while (
      (sharedStringMatch = sharedStringPattern.exec(
        sharedStringsXml,
      )) !== null
    ) {
      sharedStrings.push(readXmlTexts(sharedStringMatch[0]));
    }
  }

  const sheetXml = await sheetFile.async("string");
  const rows: string[][] = [];
  const rowPattern = /<row(?:\s[^>]*)?>[\s\S]*?<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(sheetXml)) !== null) {
    const row: string[] = [];
    const cellPattern = /<c(?:\s[^>]*)?>[\s\S]*?<\/c>/g;
    let cellMatch: RegExpExecArray | null;

    while (
      (cellMatch = cellPattern.exec(rowMatch[0])) !== null
    ) {
      const cellXml = cellMatch[0];
      const attributes = readCellAttributes(cellXml);
      const columnIndex = getCellColumnIndex(
        attributes.get("r") ?? "",
      );
      const type = attributes.get("t");
      const value =
        cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";

      if (type === "s") {
        row[columnIndex] =
          sharedStrings[Number(value)] ?? "";
      } else if (type === "inlineStr") {
        row[columnIndex] = readXmlTexts(cellXml);
      } else {
        row[columnIndex] = decodeXml(value);
      }
    }

    if (row.some((cell) => normalizeValue(cell))) {
      rows.push(row);
    }
  }

  return rows;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);

  if (
    currentRow.some((cell) => cell.trim()) ||
    rows.length === 0
  ) {
    rows.push(currentRow);
  }

  return rows.filter((row) =>
    row.some((cell) => cell.trim()),
  );
}

function tableRowsToObjects(rows: string[][]): ParsedImportTable {
  if (rows.length < 2) {
    return {
      rows: [],
      missingColumns: IMPORT_COLUMNS,
    };
  }

  const headerIndexes = new Map<string, number>();

  rows[0].forEach((header, index) => {
    headerIndexes.set(normalizeHeader(header), index);
  });

  const missingColumns = IMPORT_COLUMNS.filter(
    (column) =>
      !headerIndexes.has(normalizeHeader(column)),
  );

  if (missingColumns.length > 0) {
    return {
      rows: [],
      missingColumns,
    };
  }

  return {
    rows: rows.slice(1).map((row) => {
      return Object.fromEntries(
        IMPORT_COLUMNS.map((column) => {
          const index = headerIndexes.get(
            normalizeHeader(column),
          );

          return [
            column,
            normalizeValue(
              index === undefined ? "" : row[index],
            ),
          ];
        }),
      ) as ImportRow;
    }),
    missingColumns: [],
  };
}

export async function readImportSpreadsheet(file: File) {
  if (file.size > MAX_TABLE_SIZE_BYTES) {
    throw new Error(
      "Размер таблицы не должен превышать 5 МБ.",
    );
  }

  const extension = getFileExtension(file.name);
  const arrayBuffer = await file.arrayBuffer();

  if (extension === "csv") {
    const text = new TextDecoder("utf-8").decode(
      arrayBuffer,
    );

    return tableRowsToObjects(parseCsv(text));
  }

  if (extension === "xlsx") {
    return tableRowsToObjects(
      await parseXlsxRows(arrayBuffer),
    );
  }

  throw new Error(
    "Загрузите таблицу в формате .xlsx или .csv.",
  );
}
