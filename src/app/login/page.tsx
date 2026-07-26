export const metadata = {
  title: "Вход",
  description: "Вход в личный кабинет",
};

export default function LoginPage() {
  return (
    <main className="container">
      <section
        style={{
          maxWidth: "420px",
          margin: "60px auto",
        }}
      >
        <h1>Вход в личный кабинет</h1>

        <form
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <input
            type="email"
            placeholder="E-mail"
            style={{
              padding: "14px",
              fontSize: "16px",
            }}
          />

          <input
            type="password"
            placeholder="Пароль"
            style={{
              padding: "14px",
              fontSize: "16px",
            }}
          />

          <button
            type="submit"
            style={{
              padding: "14px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Войти
          </button>
        </form>
      </section>
    </main>
  );
}