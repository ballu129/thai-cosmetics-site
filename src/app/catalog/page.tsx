import type { Metadata } from 'next';
import ProductCard from '@/components/ProductCard';
import { products } from '@/data/products';
export const metadata:Metadata={title:'Каталог тайской косметики',description:'Каталог оригинальной сертифицированной косметики из Таиланда.'};
export default function Catalog(){return <section className="container"><span className="eyebrow">Более 2000 товаров</span><h1 className="pageTitle">Каталог тайской косметики</h1><p className="lead">На первом этапе подключены демонстрационные карточки. Архитектура подготовлена для импорта товаров вручную, через Excel, CSV, XML и API поставщиков.</p><div className="grid">{products.map(p=><ProductCard key={p.slug} product={p}/>)}</div></section>}
