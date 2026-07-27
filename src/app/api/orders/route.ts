import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OrderItemRequest = {
  slug: string;
  name: string;
  price: number;
  quantity: number;
};

type OrderRequest = {
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    comment?: string;
  };
  items: OrderItemRequest[];
  totalPrice: number;
};

function isValidOrderRequest(body: unknown): body is OrderRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const order = body as Partial<OrderRequest>;

  if (!order.customer || typeof order.customer !== "object") {
    return false;
  }

  const customer = order.customer as OrderRequest["customer"];

  if (
    typeof customer.fullName !== "string" ||
    typeof customer.phone !== "string" ||
    typeof customer.email !== "string" ||
    typeof customer.address !== "string"
  ) {
    return false;
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return false;
  }

  return order.items.every((item) => {
    return (
      typeof item.slug === "string" &&
      typeof item.name === "string" &&
      typeof item.price === "number" &&
      Number.isFinite(item.price) &&
      item.price >= 0 &&
      typeof item.quantity === "number" &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    );
  });
}

function calculateOrderTotal(items: OrderItemRequest[]) {
  return items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
}

function cleanText(value: string) {
  return value.trim();
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isValidOrderRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Переданы некорректные данные заказа.",
        },
        { status: 400 },
      );
    }

    const fullName = cleanText(body.customer.fullName);
    const phone = cleanText(body.customer.phone);
    const email = cleanText(body.customer.email);
    const address = cleanText(body.customer.address);

    if (!fullName || !phone || !email || !address) {
      return NextResponse.json(
        {
          success: false,
          error: "Заполните все обязательные поля.",
        },
        { status: 400 },
      );
    }

    const session = await auth();

    const totalPrice = calculateOrderTotal(body.items);

    const order = await prisma.order.create({
      data: {
        customerName: fullName,
        phone,
        email,
        address,
        country: "",
        city: "",
        totalAmount: totalPrice,
        userId: session?.user?.id ?? null,

        items: {
          create: body.items.map((item) => ({
            productSlug: item.slug,
            productName: item.name,
            unitPrice: item.price,
            quantity: item.quantity,
            lineTotal: item.price * item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Внутренняя ошибка сервера.",
      },
      {
        status: 500,
      },
    );
  }
}


export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminSession();

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Не удалось получить заказы.",
      },
      { status: 500 },
    );
  }
}
