import type { Metadata } from "next";
import WholesaleRequestForm from "./WholesaleRequestForm";
import styles from "./wholesale.module.css";

export const metadata: Metadata = {
  title: "Оптовые поставки тайской косметики",
  description:
    "Оптовые поставки оригинальной косметики из Таиланда для магазинов, салонов, аптек, маркетплейсов и дистрибьюторов.",
};

export default function WholesalePage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>SIAM CARE для бизнеса</p>
        <h1>Оптовые поставки тайской косметики</h1>
        <p>
          Оставьте заявку, и мы свяжемся с вами для обсуждения ассортимента,
          объёма поставки и условий сотрудничества.
        </p>
      </header>

      <section className={styles.benefits} aria-labelledby="wholesale-benefits">
        <div>
          <h2 id="wholesale-benefits">Сотрудничество с SIAM CARE</h2>
          <p>
            Поставляем оригинальную косметику из Таиланда и помогаем подобрать
            ассортимент под формат вашего бизнеса.
          </p>
        </div>
        <ul>
          <li>Работаем с магазинами, салонами, аптеками и интернет-магазинами.</li>
          <li>Сотрудничаем с продавцами маркетплейсов и дистрибьюторами.</li>
          <li>Индивидуально подбираем ассортимент.</li>
          <li>Организуем доставку в Россию и страны СНГ.</li>
          <li>Условия обсуждаем после рассмотрения заявки.</li>
        </ul>
      </section>

      <section className={styles.formSection} aria-labelledby="wholesale-form-title">
        <div className={styles.formIntro}>
          <p className={styles.eyebrow}>Оптовая заявка</p>
          <h2 id="wholesale-form-title">Расскажите о вашей задаче</h2>
          <p>Поля со знаком * обязательны.</p>
        </div>
        <WholesaleRequestForm />
      </section>
    </main>
  );
}
