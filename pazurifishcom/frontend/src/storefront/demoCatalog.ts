import type { Offer, Product } from './shared'

type DemoOffer = Offer & {
  product: Product
  demo_only: true
}

const demoProduct = (
  id: number,
  name: string,
  category: string,
  description: string,
  price: number,
  unit: string,
  image_url: string,
): Product => ({
  id,
  name,
  category,
  description,
  price,
  selling_price: price,
  unit,
  image_url,
  stock_quantity: 20,
  is_available: true,
  demo_only: true,
})

export const DEMO_OFFERS: DemoOffer[] = [
  {
    id: -1101,
    title: 'Grilled Salmon Plate',
    description: 'A sample salmon dinner offer for presentation.',
    badge: 'DEMO OFFER',
    original_price: 1450,
    promo_price: 1290,
    discount_type: 'percentage',
    discount_value: 11,
    image_url: '/images/products/fresh-fish.jpg',
    product: demoProduct(-1101, 'Grilled Salmon Plate', 'Kitchen', 'Grilled salmon served with fresh vegetables.', 1290, 'per serving', '/images/products/fresh-fish.jpg'),
    demo_only: true,
  },
  {
    id: -1102,
    title: 'Fish and Chips',
    description: 'A classic fish supper at a sample promotional price.',
    badge: 'DEMO OFFER',
    original_price: 950,
    promo_price: 820,
    discount_type: 'percentage',
    discount_value: 14,
    image_url: '/images/products/fish-and-chips.jpg',
    product: demoProduct(-1102, 'Fish and Chips', 'Kitchen', 'Battered fish served with golden chips.', 820, 'per serving', '/images/products/fish-and-chips.jpg'),
    demo_only: true,
  },
  {
    id: -1103,
    title: 'Whole Fish Pair',
    description: 'A sample offer featuring a pair of fresh whole fish.',
    badge: 'DEMO OFFER',
    original_price: 1800,
    promo_price: 1550,
    discount_type: 'percentage',
    discount_value: 14,
    image_url: '/images/products/fish-cuts.jpg',
    product: demoProduct(-1103, 'Whole Fish Pair', 'Fish Butchery', 'Two fresh whole fish, shown as a presentation example.', 1550, 'per pair', '/images/products/fish-cuts.jpg'),
    demo_only: true,
  },
]

export const DEMO_FEATURED_PRODUCTS: Product[] = [
  demoProduct(-1201, 'Seafood Dinner', 'Kitchen', 'A seafood dinner shown as a presentation example.', 1450, 'per serving', '/images/products/family-combo.jpg'),
  demoProduct(-1202, 'Nile Perch Fillet', 'Fish Butchery', 'Fresh Nile perch fillets, shown as a presentation example.', 1250, 'per kg', '/images/products/nile-perch.jpg'),
  demoProduct(-1203, 'Fresh Juice', 'Drinks', 'A refreshing drink shown as a presentation example.', 250, 'per bottle', '/images/products/fresh-drink.jpg'),
  demoProduct(-1204, 'Seafood Combo', 'Combos', 'A seafood combo shown as a presentation example.', 2200, 'per combo', '/images/hero-seafood.png'),
]
