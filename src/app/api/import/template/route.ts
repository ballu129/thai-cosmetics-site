import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { IMPORT_COLUMNS } from "@/lib/import/columns";

export const runtime = "nodejs";

const TEMPLATE_HEADERS = [
  ...IMPORT_COLUMNS,
  "healingFormat",
  "activeIngredientsFormat",
  "imageUrlExample",
];

const exampleRow = [
  "Wang Prom Herbal Balm 50 g",
  "wang-prom-herbal-balm-50g",
  "Wang Prom",
  "Тайские бальзамы",
  "720",
  "Травяной бальзам для наружного применения и массажа.",
  "плай, ментол, камфора",
  "/products/wang-prom-herbal-balm-50g.jpg",
  "yes",
  "yes/no, true/false, 1/0 или да/нет",
  "Список через запятую: плай, ментол, камфора. Можно JSON: [\"плай\",\"ментол\"]",
  "/products/file.jpg или https://*.blob.vercel-storage.com/products/file.jpg",
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
    createSheetXml([TEMPLATE_HEADERS, exampleRow]),
  );

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
}

export async function GET() {
  const unauthorizedResponse = await requireAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

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
