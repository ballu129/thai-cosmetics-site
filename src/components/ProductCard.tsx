import Link from 'next/link';
import { Product } from '@/data/products';
import styles from './ProductCard.module.css';

export default function ProductCard({product}:{product:Product}){
  return <article className={styles.card}>
    <div className={styles.image}>{product.healing ? 'Лечебная косметика' : 'Thai Beauty'}</div>
    <div className={styles.body}>
      <span>{product.brand}</span>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className={styles.row}><strong>{product.price.toLocaleString('ru-RU')} ₽</strong><Link href={`/product/${product.slug}`}>Подробнее</Link></div>
    </div>
  </article>
}
