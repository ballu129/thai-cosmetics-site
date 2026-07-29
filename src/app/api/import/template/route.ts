import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const headers = [
  "Бренд",
  "Категория",
  "Название",
  "Цена",
  "Краткое описание",
  "Полное описание",
  "Активные ингредиенты",
  "Способ применения",
  "Меры предосторожности",
  "Состав",
  "Лечебный товар (да/нет)",
  "Имя изображения",
];

const exampleRow = [
  "Wang Prom",
  "Лечебная косметика",
  "Wang Prom Herbal Balm",
  "690",
  "Краткое описание товара для карточки каталога.",
  "Подробное описание товара для страницы товара.",
  "ментол, камфора, тайские травы",
  "Нанести небольшое количество на кожу и мягко втереть.",
  "Только для наружного применения. Избегать контакта с глазами.",
  "Ментол, камфора, травяные экстракты, вазелиновая основа.",
  "да",
  "wang-prom-herbal-balm.png",
];

export async function GET() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    exampleRow,
  ]);

  sheet["!cols"] = headers.map((header) => ({
    wch: Math.max(header.length + 4, 18),
  }));

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Товары",
  );

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename=\"product-import-template.xlsx\"",
    },
  });
}
