import JSZip from "jszip";
import { NextResponse } from "next/server";
import { IMPORT_COLUMNS } from "@/lib/import/columns";

export const runtime = "nodejs";

const exampleRow = [
  "Wang Prom",
  "Лечебная косметика",
  "Wang Prom Herbal Balm",
  "wang-prom-herbal-balm",
  "690",
  "Краткое описание товара для карточки каталога.",
  "Подробное описание товара для страницы товара.",
  "ментол, камфора, тайские травы",
  "Нанести небольшое количество на кожу и мягко втереть.",
  "Только для наружного применения. Избегать контакта с глазами.",
  "Ментол, камфора, травяные экстракты, вазелиновая основа.",
  "да",
  "wang-prom-herbal-balm.png",
  "нет",
];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getColumnName(index: number) {
  let value = index + 1;
  let columnName = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    columnName =
      String.fromCharCode("A".charCodeAt(0) + remainder) +
      columnName;
    value = Math.floor((value - 1) / 26);
  }

  return columnName;
}

function createCell(value: string, rowIndex: number, columnIndex: number) {
  const reference = `${getColumnName(columnIndex)}${rowIndex}`;

  return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function createSheetXml(rows: string[][]) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const excelRowIndex = rowIndex + 1;
      const cells = row
        .map((cell, columnIndex) =>
          createCell(cell, excelRowIndex, columnIndex),
        )
        .join("");

      return `<row r="${excelRowIndex}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

async function createTemplateXlsx() {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Products" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
  );

  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
  );

  zip.file(
    "xl/worksheets/sheet1.xml",
    createSheetXml([[...IMPORT_COLUMNS], exampleRow]),
  );

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
}

export async function GET() {
  const file = await createTemplateXlsx();
  const arrayBuffer = new ArrayBuffer(file.byteLength);
  new Uint8Array(arrayBuffer).set(file);

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename=\"siam-care-import-template.xlsx\"",
    },
  });
}
