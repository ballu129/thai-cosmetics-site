import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.top}>Доставка оригинальной тайской косметики из Таиланда в Россию и СНГ</div>
      <div className={styles.navbar}>
        <Link className={styles.logo} href="/">SIAM CARE</Link>
        <nav className={styles.nav}>
          <Link href="/catalog">Каталог</Link>
          <Link href="/healing-cosmetics">Лечебная косметика</Link>
          <Link href="/brands">Бренды</Link>
          <Link href="/delivery">Доставка</Link>
          <Link href="/about">О компании</Link>
        </nav>
        <Link className={styles.account} href="/contacts">Связаться</Link>
      </div>
    </header>
  );
}
