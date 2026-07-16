import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer(){
  return <footer className={styles.footer}>
    <div><strong>SIAM CARE</strong><p>Оригинальная сертифицированная косметика из Таиланда.</p></div>
    <div><strong>Покупателям</strong><Link href="/catalog">Каталог</Link><Link href="/delivery">Доставка</Link></div>
    <div><strong>Компания</strong><Link href="/about">О нас</Link><Link href="/contacts">Контакты</Link></div>
    <div><strong>Важно</strong><p>Информация на сайте не заменяет консультацию специалиста.</p></div>
  </footer>
}
