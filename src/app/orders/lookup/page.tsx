"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const GENERIC_LOOKUP_ERROR =
  "Заказ не найден. Проверьте номер заказа и email.";

export default function GuestOrderLookupPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders/guest/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          orderId: orderId.trim(),
          email: email.trim(),
        }),
      });
      const data = await response.json().catch(() => null);

      if (
        !response.ok ||
        !data?.success ||
        typeof data.orderAccessUrl !== "string"
      ) {
        setError(data?.error ?? GENERIC_LOOKUP_ERROR);
        return;
      }

      window.location.href = data.orderAccessUrl;
    } catch {
      setError("Не удалось найти заказ. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container">
      <section
        style={{
          maxWidth: 720,
          margin: "48px auto",
          padding: 24,
        }}
      >
        <Link href="/catalog">
          ← Вернуться в каталог
        </Link>

        <h1 style={{ marginTop: 24 }}>
          Найти гостевой заказ
        </h1>

        <p style={{ color: "#64748b", lineHeight: 1.5 }}>
          Введите номер заказа и email, указанный при оформлении.
          Если данные совпадут, мы откроем защищённую страницу заказа.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 16,
            marginTop: 24,
          }}
        >
          <label>
            Номер заказа
            <input
              type="text"
              required
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 8,
                padding: 12,
              }}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 8,
                padding: 12,
              }}
            />
          </label>

          {error ? (
            <p role="alert" style={{ color: "red", margin: 0 }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px 18px",
              border: "1px solid #254b3f",
              borderRadius: 8,
              background: "#254b3f",
              color: "#ffffff",
              cursor: isSubmitting ? "default" : "pointer",
              fontWeight: 700,
            }}
          >
            {isSubmitting ? "Проверяем..." : "Посмотреть заказ"}
          </button>
        </form>
      </section>
    </main>
  );
}
