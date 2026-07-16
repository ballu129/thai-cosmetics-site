import type { Metadata } from 'next';
import ProductCard from '@/components/ProductCard';
import { products } from '@/data/products';
export const metadata:Metadata={title:'Лечебная косметика из Таиланда',description:'Сертифицированная тайская лечебная косметика и средства для проблемной кожи и волос.'};
export default function Healing(){const items=products.filter(p=>p.healing);return <section className="container"><span className="eyebrow">Специальный уход</span><h1 className="pageTitle">Лечебная косметика</h1><p className="lead">Косметические средства для ухода за проблемной, чувствительной и требующей особого внимания кожей и волосами.</p><p className="notice"><strong>Важно:</strong> товары размещаются только после проверки сертификатов и статуса продукции. На сайте не будут использоваться обещания лечения заболеваний, если они не подтверждены регистрационными документами.</p><div className="grid">{items.map(p=><ProductCard key={p.slug} product={p}/>)}</div></section>}
