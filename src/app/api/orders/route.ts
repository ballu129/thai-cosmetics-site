import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import {
  assertGuestOrderAccessConfigured,
  buildGuestOrderPath,
  createGuestOrderAccessToken,
} from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

type OrderItemRequest = {
  slug: string;
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
      typeof item.quantity === "number" &&
      Number.isSafeInteger(item.quantity) &&
      item.quantity > 0
    );
  });
}

function calculateOrderTotal(
  items: Array<{
    lineTotal: number;
  }>,
) {
  return items.reduce((total, item) => {
    return total + item.lineTotal;
  }, 0);
}

function cleanText(value: string) {
  return value.trim();
}

function createDatabaseId() {
  return `cm${randomBytes(16).toString("hex")}`;
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

    const quantityBySlug = new Map<string, number>();

    for (const item of body.items) {
      const slug = cleanText(item.slug);

      if (!slug) {
        return NextResponse.json(
          {
            success: false,
            error: "Переданы некорректные данные заказа.",
          },
          { status: 400 },
        );
      }

      quantityBySlug.set(
        slug,
        (quantityBySlug.get(slug) ?? 0) + item.quantity,
      );
    }

    const requestedSlugs = Array.from(quantityBySlug.keys());

    const products = await prisma.product.findMany({
      where: {
        slug: {
          in: requestedSlugs,
        },
        brand: {
          is: {
            isActive: true,
          },
        },
      },
      select: {
        slug: true,
        name: true,
        price: true,
      },
    });

    const productsBySlug = new Map(
      products.map((product) => [product.slug, product]),
    );

    if (requestedSlugs.some((slug) => !productsBySlug.has(slug))) {
      return NextResponse.json(
        {
          success: false,
          error: "Один или несколько товаров недоступны для оформления.",
        },
        { status: 400 },
      );
    }

    const orderItems = requestedSlugs.map((slug) => {
      const product = productsBySlug.get(slug)!;
      const quantity = quantityBySlug.get(slug)!;
      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * quantity;

      return {
        productSlug: product.slug,
        productName: product.name,
        unitPrice,
        quantity,
        lineTotal,
      };
    });

    if (
      orderItems.some((item) => {
        return (
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice < 0 ||
          !Number.isFinite(item.lineTotal)
        );
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Один или несколько товаров недоступны для оформления.",
        },
        { status: 400 },
      );
    }

    const totalPrice = calculateOrderTotal(orderItems);
    const isGuestOrder = !session?.user?.id;

    if (isGuestOrder) {
      assertGuestOrderAccessConfigured();
    }

    const order = {
      id: createDatabaseId(),
    };

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.$executeRaw`
        INSERT INTO "Order" (
          "id",
          "customerName",
          "phone",
          "email",
          "country",
          "city",
          "address",
          "totalAmount",
          "status",
          "createdAt",
          "updatedAt",
          "userId"
        )
        VALUES (
          ${order.id},
          ${fullName},
          ${phone},
          ${email},
          ${""},
          ${""},
          ${address},
          ${totalPrice},
          'NEW'::"OrderStatus",
          ${now},
          ${now},
          ${session?.user?.id ?? null}
        )
      `;

      for (const item of orderItems) {
        await tx.$executeRaw`
          INSERT INTO "OrderItem" (
            "id",
            "productSlug",
            "productName",
            "unitPrice",
            "quantity",
            "lineTotal",
            "orderId",
            "createdAt"
          )
          VALUES (
            ${createDatabaseId()},
            ${item.productSlug},
            ${item.productName},
            ${item.unitPrice},
            ${item.quantity},
            ${item.lineTotal},
            ${order.id},
            ${now}
          )
        `;
      }
    });

    const orderAccessToken = isGuestOrder
      ? createGuestOrderAccessToken(order.id, email)
      : null;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      isGuestOrder,
      orderAccessUrl: orderAccessToken
        ? buildGuestOrderPath(order.id, orderAccessToken)
        : "/account/orders",
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
      select: {
        id: true,
        customerName: true,
        phone: true,
        email: true,
        address: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productSlug: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
