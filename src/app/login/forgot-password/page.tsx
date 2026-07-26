export const metadata = {
  title: "Восстановление пароля",
  description: "Восстановление доступа к аккаунту",
};

export default function ForgotPasswordPage() {
  return (
    <main className="container">
      <section
        style={{
          maxWidth: "500px",
          margin: "60px auto",
        }}
      >
        <h1>Восстановление пароля</h1>

        <p style={{ margin: "16px 0 24px" }}>
          Введите адрес электронной почты. Мы отправим ссылку для сброса пароля.
        </p>

        <form
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
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

          <button
            type="submit"
            style={{
              padding: "14px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Отправить ссылку
          </button>
        </form>
      </section>
    </main>
  );
}