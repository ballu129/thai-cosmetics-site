export const metadata = {
  title: "Регистрация",
  description: "Регистрация нового пользователя",
};

export default function RegisterPage() {
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
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <input
            type="text"
            placeholder="Имя"
            style={{ padding: "14px", fontSize: "16px" }}
          />

          <input
            type="email"
            placeholder="E-mail"
            style={{ padding: "14px", fontSize: "16px" }}
          />

          <input
            type="password"
            placeholder="Пароль"
            style={{ padding: "14px", fontSize: "16px" }}
          />

          <input
            type="password"
            placeholder="Повторите пароль"
            style={{ padding: "14px", fontSize: "16px" }}
          />

          <button
            type="submit"
            style={{
              padding: "14px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Зарегистрироваться
          </button>
        </form>
      </section>
    </main>
  );
}