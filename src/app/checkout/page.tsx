"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import styles from "./Checkout.module.css";

type CheckoutForm = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  comment: string;
};

const initialForm: CheckoutForm = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  comment: "",
};

export default function CheckoutPage() {
  const { items, clearCart } = useCart();

  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [orderAccessUrl, setOrderAccessUrl] = useState("");
  const [isGuestOrder, setIsGuestOrder] = useState(false);
  const [error, setError] = useState("");

  const totalPrice = useMemo(() => {
    return items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }, [items]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedOrderId("");
    setOrderAccessUrl("");
    setIsGuestOrder(false);

    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.address.trim()
    ) {
      setError("Заполните все обязательные поля.");
      return;
    }

    if (items.length === 0) {
      setError("Корзина пуста.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            comment: form.comment.trim(),
          },
          items,
          totalPrice,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Не удалось оформить заказ.",
        );
      }

      if (typeof result?.orderId !== "string" || !result.orderId) {
        throw new Error("Не удалось получить номер заказа.");
      }

      clearCart();
      setCreatedOrderId(result.orderId);
      setOrderAccessUrl(
        typeof result.orderAccessUrl === "string"
          ? result.orderAccessUrl
          : "/account/orders",
      );
      setIsGuestOrder(Boolean(result.isGuestOrder));
      setForm(initialForm);
      setIsSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Произошла ошибка при оформлении заказа.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <div className={styles.success}>
            <h1 className={styles.title}>Спасибо за заказ!</h1>

            <p className={styles.text}>
              Заказ успешно оформлен. Мы свяжемся с вами в ближайшее время.
            </p>

            <p className={styles.text}>
              Номер заказа: {createdOrderId}
            </p>

            {isGuestOrder ? (
              <>
                <p className={styles.text}>
                  Заказ оформлен без регистрации. Вы можете открыть его
                  по защищённой ссылке ниже без логина и пароля.
                </p>

                <p className={styles.text}>
                  Чтобы в будущем видеть все заказы в личном кабинете,
                  создайте аккаунт или войдите перед оформлением.
                </p>
              </>
            ) : null}

            <Link
              className={styles.button}
              href={orderAccessUrl || "/account/orders"}
            >
              {isGuestOrder
                ? "Посмотреть заказ"
                : "Перейти к моим заказам"}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <div className={styles.empty}>
            <h1 className={styles.title}>Оформление заказа</h1>

            <p className={styles.text}>
              Ваша корзина пуста.
            </p>

            <Link className={styles.button} href="/catalog">
              Перейти в каталог
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <h1 className={styles.title}>Оформление заказа</h1>

        <div className={styles.content}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>ФИО *</span>
              <input
                className={styles.input}
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Иван Иванов"
                autoComplete="name"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Телефон *</span>
              <input
                className={styles.input}
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+7 999 000-00-00"
                autoComplete="tel"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Электронная почта *</span>
              <input
                className={styles.input}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="mail@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Адрес доставки *</span>
              <input
                className={styles.input}
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Город, улица, дом, квартира"
                autoComplete="street-address"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Комментарий</span>
              <textarea
                className={styles.textarea}
                name="comment"
                value={form.comment}
                onChange={handleChange}
                placeholder="Дополнительная информация к заказу"
                rows={5}
              />
            </label>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <button
              className={styles.button}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Отправляем заказ..."
                : "Подтвердить заказ"}
            </button>
          </form>

          <aside className={styles.summary}>
            <h2 className={styles.subtitle}>Ваш заказ</h2>

            <div className={styles.items}>
              {items.map((item, index) => (
                <div className={styles.item} key={`${item.name}-${index}`}>
                  <div>
                    <p className={styles.itemName}>{item.name}</p>
                    <p className={styles.itemQuantity}>
                      Количество: {item.quantity}
                    </p>
                  </div>

                  <p className={styles.itemPrice}>
                    {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              ))}
            </div>

            <div className={styles.total}>
              <span>Итого:</span>
              <strong>{totalPrice.toLocaleString("ru-RU")} ₽</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

