import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { products } from '@/data/products';
import styles from './page.module.css';

export default function Home(){
  return <>
    <section className={styles.hero}><div className={styles.heroInner}>
      <div><span className="eyebrow">Оригинальная косметика из Таиланда</span><h1 className="title">Тайский уход, которому можно доверять</h1><p className="lead">Более 2000 сертифицированных товаров для красоты, ежедневного ухода и решения особых потребностей кожи и волос.</p><div className={styles.actions}><Link href="/catalog">Перейти в каталог</Link><Link href="/healing-cosmetics">Лечебная косметика</Link></div></div>
      <div className={styles.visual}>Прямые поставки<br/>из Таиланда</div>
    </div></section>
    <section className="container"><span className="eyebrow">Популярные товары</span><h2>Начните знакомство с брендами Таиланда</h2><div className="grid">{products.map(p=><ProductCard key={p.slug} product={p}/>)}</div></section>
    <section className={styles.benefits}><div><strong>Только сертифицированные товары</strong><p>Документы и маркировка проверяются до публикации товара.</p></div><div><strong>Доставка напрямую</strong><p>Отправка из Таиланда в Россию, Беларусь, Казахстан, Армению и другие страны СНГ.</p></div><div><strong>Экспертный контент</strong><p>Материалы создаются с помощью AI и проходят ручную проверку.</p></div></section>
  </>
}
