import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export const metadata = {
  title: "Личный кабинет",
  description: "Личный кабинет покупателя SIAM CARE.",
};

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  return (
    <main className="container">
      <section
        style={{
          padding: "48px 0 72px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              marginBottom: "32px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              Личный кабинет
            </p>

            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "36px",
                lineHeight: 1.2,
              }}
            >
              Добро пожаловать
              {session.user.name ? `, ${session.user.name}` : ""}
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: "650px",
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              Здесь хранится история ваших заказов и их текущие статусы.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "20px",
            }}
          >
            <AccountCard
              title="Мои заказы"
              description="История покупок и статус текущих заказов."
              href="/account/orders"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

type AccountCardProps = {
  title: string;
  description: string;
  href: string;
};

function AccountCard({
  title,
  description,
  href,
}: AccountCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "24px",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        background: "#ffffff",
        color: "inherit",
        textDecoration: "none",
        boxShadow: "0 4px 18px rgba(15, 23, 42, 0.05)",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: "20px",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: 0,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </Link>
  );
}
