import type { ImgHTMLAttributes } from 'react'

export type Category = 'All Products' | 'Fish Butchery' | 'Kitchen' | 'Combos' | 'Drinks'

export type HomepageCategory = {
  id: number
  name: string
  image_url: string
  display_order: number
  is_active: boolean
  show_on_homepage: boolean
}

export type Product = {
  id: number
  name: string
  category: string
  description: string
  price?: number
  selling_price?: number
  unit: string
  image?: string
  image_url?: string
  stock_quantity?: number
  minimum_stock?: number
  is_available?: boolean
  specifications?: string
  demo_only?: boolean
}

export type CartItem = Product & {
  quantity: number
}

export type Offer = {
  id: number
  product_id?: number
  product_name?: string
  title: string
  description: string
  image_url?: string
  badge?: string
  promo_price?: number
  original_price?: number
  discount_type?: string
  discount_value?: number
  is_published?: boolean
  ends_at?: string
  start_date?: string
  expiry_date?: string
  cta_label?: string
  cta_url?: string
  product?: Product
  demo_only?: boolean
}

export type HeroContent = {
  title: string
  subtitle: string
  description?: string
  image_url: string
  cta_label?: string
  cta_url?: string
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')
).replace(/\/+$/, '')

export const apiUrl = (path: string) => `${API_BASE_URL}/${path.replace(/^\//, '')}`

const resourceCache = new Map<string, { expiresAt: number; request: Promise<unknown> }>()
const RESOURCE_CACHE_MS = 30_000

export function clearApiCache() {
  resourceCache.clear()
}

export function fetchApiJson<T>(path: string): Promise<T> {
  const url = apiUrl(path)
  const cached = resourceCache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.request as Promise<T>

  const request = (async () => {
    const response = await fetch(url)
    if (!response.ok) {
      const payload = await response.json().catch(() => undefined)
      const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Unable to load ${path} (${response.status}).`
      throw new Error(message)
    }

    return await response.json() as T
  })()

  const entry = { expiresAt: Date.now() + RESOURCE_CACHE_MS, request }
  resourceCache.set(url, entry)
  void request.catch(() => {
    if (resourceCache.get(url) === entry) resourceCache.delete(url)
  })

  return request
}

export const DEFAULT_SHOP_CATEGORIES: HomepageCategory[] = [
  { id: -1, name: 'Fish Butchery', image_url: '/images/products/fish-cuts.jpg', display_order: 0, is_active: true, show_on_homepage: true },
  { id: -2, name: 'Combos', image_url: '/images/products/family-combo.jpg', display_order: 1, is_active: true, show_on_homepage: true },
  { id: -3, name: 'Kitchen', image_url: '/images/products/fish-and-chips.jpg', display_order: 2, is_active: true, show_on_homepage: true },
  { id: -4, name: 'Drinks', image_url: '/images/products/fresh-drink.jpg', display_order: 3, is_active: true, show_on_homepage: true },
]

export const categorySlugFor = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const getShopCategories = (categories: HomepageCategory[], includeHidden = false) => {
  const activeCategories = categories.filter((category) => category.is_active !== false)
  const defaultCategories = DEFAULT_SHOP_CATEGORIES.map((fallback) => {
    const category = activeCategories.find((item) => item.name.toLowerCase() === fallback.name.toLowerCase())
    return category ? { ...fallback, ...category, image_url: category.image_url || fallback.image_url } : fallback
  })
  const additionalCategories = activeCategories.filter((category) =>
    (includeHidden || category.show_on_homepage !== false)
    && !DEFAULT_SHOP_CATEGORIES.some((fallback) => fallback.name.toLowerCase() === category.name.toLowerCase()),
  )

  return [...defaultCategories, ...additionalCategories]
}

export const formatKsh = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value)

const knownLocalImages: Record<string, string> = {
  'photo-1544943910-4c1dc44aab77': '/images/products/fish-cuts.jpg',
  'photo-1519708227418-c8fd9a32b7a2': '/images/products/fresh-fish.jpg',
  'photo-1546173159-315724a31696': '/images/products/fresh-drink.jpg',
  'photo-1510130387422-82bed34b37e9': '/images/products/nile-perch.jpg',
  'photo-1559847844-5315695dadae': '/images/products/fish-and-chips.jpg',
  'photo-1579208030886-b937da0925dc': '/images/products/fish-and-chips.jpg',
  'photo-1515516969-d4008cc6241a': '/images/products/family-combo.jpg',
  'photo-1535399831218-d5bd36d1a6b3': '/images/products/nile-perch.jpg',
}

const imageDimensions: Record<string, { width: number; height: number }> = {
  '/images/hero-seafood.png': { width: 1000, height: 667 },
  '/images/products/family-combo.jpg': { width: 1000, height: 1500 },
  '/images/products/fish-and-chips.jpg': { width: 1000, height: 667 },
  '/images/products/fish-cuts.jpg': { width: 1000, height: 1333 },
  '/images/products/fresh-drink.jpg': { width: 1000, height: 1500 },
  '/images/products/fresh-fish.jpg': { width: 1000, height: 667 },
  '/images/products/kitchen-meal.jpg': { width: 1000, height: 676 },
  '/images/products/nile-perch.jpg': { width: 1000, height: 667 },
}

export const FALLBACK_PRODUCT_IMAGE = '/images/products/fresh-fish.jpg'

export const localImage = (source?: string, fallback = FALLBACK_PRODUCT_IMAGE) => {
  if (!source) return fallback
  const photoId = source.match(/photo-[\w-]+/)?.[0]
  return photoId && knownLocalImages[photoId] ? knownLocalImages[photoId] : source
}

type StorefrontImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'width' | 'height'> & {
  source?: string
  fallback?: string
  sizes?: string
}

export function StorefrontImage({
  source,
  fallback = FALLBACK_PRODUCT_IMAGE,
  sizes = '(max-width: 760px) 72vw, (max-width: 980px) 30vw, 25vw',
  loading = 'lazy',
  decoding = 'async',
  onError,
  ...imageProps
}: StorefrontImageProps) {
  const image = localImage(source, fallback)
  const fallbackImage = localImage(fallback, fallback)
  const dimensions = imageDimensions[image]
  const optimizedImage = dimensions
    ? image.replace(/\.(?:jpg|png)$/i, '-1000.webp')
    : image
  const srcSet = dimensions
    ? `${image.replace(/\.(?:jpg|png)$/i, '-640.webp')} 640w, ${optimizedImage} 1000w`
    : undefined

  return (
    <img
      {...imageProps}
      src={optimizedImage}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={dimensions?.width}
      height={dimensions?.height}
      loading={loading}
      decoding={decoding}
      onError={(event) => {
        onError?.(event)
        const target = event.currentTarget
        if (target.dataset.fallbackApplied) return
        target.dataset.fallbackApplied = 'true'
        target.removeAttribute('srcset')
        target.removeAttribute('sizes')
        target.src = fallbackImage
      }}
    />
  )
}
