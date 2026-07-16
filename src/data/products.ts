export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  description: string;
  healing?: boolean;
  activeIngredients: string[];
};

export const products: Product[] = [
  {
    slug: 'herbal-balm-wang-prom',
    name: 'Тайский травяной бальзам Wang Prom',
    brand: 'Wang Prom',
    category: 'Тайские бальзамы',
    price: 1290,
    description: 'Травяной косметический бальзам для массажа и ухода за кожей.',
    healing: true,
    activeIngredients: ['ментол', 'камфора', 'тайские травы'],
  },
  {
    slug: 'snail-repair-cream',
    name: 'Восстанавливающий крем с муцином улитки',
    brand: 'Thai Nature',
    category: 'Уход за лицом',
    price: 1890,
    description: 'Крем для ежедневного ухода, увлажнения и восстановления защитного барьера кожи.',
    activeIngredients: ['муцин улитки', 'ниацинамид', 'гиалуроновая кислота'],
  },
  {
    slug: 'herbal-anti-dandruff-shampoo',
    name: 'Травяной шампунь против перхоти',
    brand: 'Khaolaor',
    category: 'Уход за волосами',
    price: 1490,
    description: 'Косметический шампунь для ухода за кожей головы, склонной к шелушению.',
    healing: true,
    activeIngredients: ['имбирь', 'каффир-лайм', 'алоэ вера'],
  },
];
