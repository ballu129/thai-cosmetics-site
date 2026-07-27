"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password !== passwordRepeat) {
      setError("Пароли не совпадают.");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Не удалось создать пользователя.",
        );
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("Не удалось выполнить регистрацию. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container">
      <section
        style={{
          maxWidth: "500px",
          margin: "60px auto",
        }}
      >
        <h1>Регистрация</h1>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <input
            type="text"
            name="name"
            placeholder="Имя"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
            disabled={isSubmitting}
            style={{
              padding: "14px",
              fontSize: "16px",
            }}
          />

          <input
            type="email"
            name="email"
            placeholder="E-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={isSubmitting}
            style={{
              padding: "14px",
              fontSize: "16px",
            }}
          />

          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isSubmitting}
            style={{
              padding: "14px",
              fontSize: "16px",
            }}
          />

          <input
            type="password"
            name="passwordRepeat"
            placeholder="Повторите пароль"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isSubmitting}
            style={{
              padding: "14px",
              fontSize: "16px",
            }}
          />

          {error ? (
            <p
              role="alert"
              style={{
                margin: 0,
                color: "#a00000",
                fontSize: "15px",
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "14px",
              fontSize: "16px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
      </section>
    </main>
  );
}