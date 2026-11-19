import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  MapPin,
  Menu,
  Phone,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import PazuriBrand from './components/PazuriBrand/PazuriBrand.jsx'

type Category = 'All Products' | 'Fish Butchery' | 'Kitchen' | 'Combos' | 'Drinks'

type HomepageCategory = {
  id: number
  name: string
  image_url: string
  display_order: number
  is_active: boolean
  show_on_homepage: boolean
}

type Product = {
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
}

type CartItem = Product & {
  quantity: number
}

type Offer = {
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
}

type HeroContent = {
  title: string
  subtitle: string
  description?: string
  image_url: string
  cta_label?: string
  cta_url?: string
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const apiUrl = (path: string) => `${API_BASE_URL}/${path.replace(/^\//, '')}`
const knownLocalImages: Record<string, string> = {
  'photo-1544943910-4c1dc44aab77': '/images/products/fresh-fish.jpg',
  'photo-1519708227418-c8fd9a32b7a2': '/images/products/fresh-fish.jpg',
  'photo-1546173159-315724a31696': '/images/products/fresh-drink.jpg',
  'photo-1510130387422-82bed34b37e9': '/images/products/fish-cuts.jpg',
  'photo-1559847844-5315695dadae': '/images/products/kitchen-meal.jpg',
  'photo-1579208030886-b937da0925dc': '/images/products/fish-and-chips.jpg',
  'photo-1515516969-d4008cc6241a': '/images/products/family-combo.jpg',
  'photo-1535399831218-d5bd36d1a6b3': '/images/products/nile-perch.jpg',
}
const localImage = (source?: string, fallback = '/images/products/fresh-fish.jpg') => {
  if (!source) return fallback
  const photoId = source.match(/photo-[\w-]+/)?.[0]
  return photoId && knownLocalImages[photoId] ? knownLocalImages[photoId] : source
}

const uploadAdminImage = async (file: File) => {
  const token = localStorage.getItem('pazuri-admin-token')
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl('admin/uploads'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Unable to upload image.')
  return String(payload.image_url || payload.url || '')
}

const defaultHero: HeroContent = {
  title: 'Fresh Catch Delivered Every Day',
  subtitle: 'SOURCED FROM LAKE VICTORIA',
  description: 'Buy fresh tilapia and nile perch, carefully selected from our fish butchery. Shop for cooked fish dishes from our Kitchen.',
  image_url: '/images/products/fresh-fish.jpg',
}

const CATEGORIES: Category[] = ['All Products', 'Fish Butchery', 'Kitchen', 'Combos', 'Drinks']
const DEFAULT_SHOP_CATEGORIES: HomepageCategory[] = [
  { id: -1, name: 'Fish Butchery', image_url: '/images/products/fish-cuts.jpg', display_order: 0, is_active: true, show_on_homepage: true },
  { id: -2, name: 'Combos', image_url: '/images/products/family-combo.jpg', display_order: 1, is_active: true, show_on_homepage: true },
  { id: -3, name: 'Kitchen', image_url: '/images/products/kitchen-meal.jpg', display_order: 2, is_active: true, show_on_homepage: true },
  { id: -4, name: 'Drinks', image_url: '/images/products/fresh-drink.jpg', display_order: 3, is_active: true, show_on_homepage: true },
]
const categorySlugFor = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const getShopCategories = (categories: HomepageCategory[], includeHidden = false) => {
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

const formatKsh = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value)

const formatCountdown = (expiresAt?: string, currentTime = Date.now()) => {
  if (!expiresAt) return ''

  const target = new Date(expiresAt).getTime()
  const diff = Math.max(target - currentTime, 0)
  const seconds = Math.floor(diff / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const days = Math.floor(hours / 24)

  if (seconds <= 0) return 'Offer ending soon'
  if (days > 0) return `${days}d ${hours % 24}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

function StorefrontPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('All Products')
  const [query, setQuery] = useState('')
  const [basketOpen, setBasketOpen] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [offers, setOffers] = useState<Offer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [heroSlides, setHeroSlides] = useState<HeroContent[]>([defaultHero])
  const [heroSwipeStart, setHeroSwipeStart] = useState<number | null>(null)
  const [homepageCategories, setHomepageCategories] = useState<HomepageCategory[]>(DEFAULT_SHOP_CATEGORIES)
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []

    try {
      const raw = localStorage.getItem('pazuri-cart-v1')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({ full_name: '', phone: '', location: '', instructions: '' })
  const [orderSuccess, setOrderSuccess] = useState<{ order_number?: string } | null>(null)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)

  const hero = heroSlides[heroIndex] ?? defaultHero
  const resolvedHeroImageUrl = localImage(hero.image_url, defaultHero.image_url)
  const heroImageUrl = resolvedHeroImageUrl === defaultHero.image_url
    ? '/images/hero-seafood.png'
    : resolvedHeroImageUrl

  useEffect(() => {
    localStorage.setItem('pazuri-cart-v1', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (heroSlides.length < 2) return
    const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let sliderTimer = 0
    const updateTimer = () => {
      window.clearInterval(sliderTimer)
      if (motionPreference?.matches) return
      sliderTimer = window.setInterval(() => {
        setHeroIndex((current) => (current + 1) % heroSlides.length)
      }, 2500)
    }
    updateTimer()
    motionPreference?.addEventListener('change', updateTimer)

    return () => {
      window.clearInterval(sliderTimer)
      motionPreference?.removeEventListener('change', updateTimer)
    }
  }, [heroSlides.length])

  useEffect(() => {
    if (window.location.hash === '#basket' || window.location.hash === '#checkout') setBasketOpen(true)
    if (window.location.hash === '#checkout') setCheckoutOpen(true)
  }, [])

  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => window.clearInterval(clockTimer)
  }, [])

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [productsRes, heroRes, offersRes, categoriesRes] = await Promise.all([
          fetch(apiUrl('products')),
          fetch(apiUrl('content/hero')),
          fetch(apiUrl('offers')),
          fetch(apiUrl('categories/homepage')),
        ])

        let loadedProducts: Product[] = []
        if (productsRes.ok) {
          const productPayload = await productsRes.json().catch(() => ({}))
          loadedProducts = Array.isArray(productPayload.products) ? productPayload.products : []
          setProducts(loadedProducts)
        }

        if (heroRes.ok) {
          const heroPayload = await heroRes.json().catch(() => ({}))
          const slides = Array.isArray(heroPayload.slides) ? heroPayload.slides : heroPayload.hero ? [heroPayload.hero] : [defaultHero]
          setHeroSlides(slides.filter((slide: HeroContent) => slide && slide.image_url))
        }

        if (offersRes.ok) {
          const offersPayload = await offersRes.json().catch(() => ({}))
          const activeOffers = Array.isArray(offersPayload.offers)
            ? offersPayload.offers.filter((offer: Offer) => offer.id !== 0 && offer.is_published !== false)
            : []
          setOffers(activeOffers)
        } else {
          setOffers([])
        }

        if (categoriesRes.ok) {
          const categoriesPayload = await categoriesRes.json().catch(() => ({}))
          const categories = Array.isArray(categoriesPayload.categories) ? categoriesPayload.categories : []
          setHomepageCategories(getShopCategories(categories))
        } else {
          setHomepageCategories(DEFAULT_SHOP_CATEGORIES)
        }
      } catch {
        setProducts([])
        setHeroSlides([defaultHero])
        setOffers([])
        setHomepageCategories(DEFAULT_SHOP_CATEGORIES)
      }
    }

    void loadContent()
  }, [])

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'All Products' || product.category === selectedCategory
      const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase()
      const matchesQuery = haystack.includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [products, query, selectedCategory])

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price ?? item.selling_price ?? 0) * item.quantity, 0), [cart])
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const addToCart = (product: Product) => {
    const stockAvailable = Number(product.stock_quantity ?? 0)
    const existingQty = cart.find((item) => item.id === product.id)?.quantity ?? 0
    if (product.is_available === false || stockAvailable <= 0) {
      window.alert(`${product.name} is currently unavailable.`)
      return
    }
    if (existingQty >= stockAvailable) {
      window.alert(`Only ${stockAvailable} units of ${product.name} are available.`)
      return
    }

    setBasketOpen(true)
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...current, { ...product, quantity: 1, price: Number(product.price ?? product.selling_price ?? 0), image: localImage(product.image_url || product.image) }]
    })
    setRecentlyAddedId(product.id)
    window.setTimeout(() => setRecentlyAddedId((current) => current === product.id ? null : current), 1400)
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return [item]
        const nextQuantity = item.quantity + delta
        if (nextQuantity <= 0) return []
        if (Number(item.stock_quantity ?? 0) > 0 && nextQuantity > Number(item.stock_quantity)) return [item]
        return [{ ...item, quantity: nextQuantity }]
      }),
    )
  }

  const removeFromCart = (productId: number) => {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  const clearCart = () => setCart([])

  const handleCheckoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (checkoutSubmitting || !checkoutForm.full_name.trim() || !checkoutForm.phone.trim()) return
    if (cart.length === 0) return

    setCheckoutSubmitting(true)
    setCheckoutError('')
    try {
      const response = await fetch(apiUrl('orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: Number(item.price ?? item.selling_price ?? 0),
          })),
          delivery_area: checkoutForm.location || 'Nairobi',
          customer: {
            name: checkoutForm.full_name,
            phone: checkoutForm.phone,
            address: checkoutForm.location,
            location: checkoutForm.location,
            instructions: checkoutForm.instructions,
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to create order.')

      setCart([])
      setCheckoutOpen(false)
      setCheckoutForm({ full_name: '', phone: '', location: '', instructions: '' })
      setOrderSuccess({ order_number: typeof payload.order?.order_number === 'string' ? payload.order.order_number : undefined })
      setBasketOpen(false)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to complete order.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  return (
    <div className="site-shell" id="top">
      <div className="announcement-bar">Fresh Delivery Everyday <span>|</span> Special Offers on Selected Fish Products</div>

      <header className="topbar storefront-topbar">
        <a className="brand-block" href="#top" aria-label="Pazuri Fish home">
          <PazuriBrand />
        </a>

        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#top">Home</a>
          {homepageCategories.map((category) => <a key={category.name} href={`/shop/${categorySlugFor(category.name)}`}>{category.name}</a>)}
        </nav>

        <label className="header-search">
          <Search size={16} />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" />
        </label>

        <button type="button" aria-label="Open shopping basket" className="basket-button" onClick={() => setBasketOpen(true)}>
          <ShoppingBasket size={21} strokeWidth={1.8} />
          {totalItems > 0 ? <span className="cart-count" aria-label={`${totalItems} items in basket`}>{totalItems}</span> : null}
        </button>
      </header>

      <main>
        <section className="hero-section freshco-hero" onTouchStart={(event) => setHeroSwipeStart(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => {
          if (heroSwipeStart === null) return
          const end = event.changedTouches[0]?.clientX ?? heroSwipeStart
          const distance = end - heroSwipeStart
          if (Math.abs(distance) > 45) setHeroIndex((current) => distance < 0 ? (current + 1) % heroSlides.length : (current - 1 + heroSlides.length) % heroSlides.length)
          setHeroSwipeStart(null)
        }}>
          <div className="hero-copy freshco-hero-copy">
            <p className="eyebrow">Sourced from Lake Victoria.</p>
            <h1>Fresh Catch Delivered Every Day</h1>
            {hero.description ? <p className="hero-description">{hero.description}</p> : null}
            <a className="hero-shop-link" href={hero.cta_url || '#shop'}>{hero.cta_label || 'Shop Fresh Fish'} <ArrowRight size={15} /></a>
          </div>
          <div className="freshco-hero-image">
            <img key={hero.image_url} src={heroImageUrl} alt="Fresh seafood from Pazuri Fish" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultHero.image_url }} />
          </div>
          <div className="hero-dots" aria-label="Hero slide indicators">
            {heroSlides.map((slide, index) => (
              <button key={`${slide.image_url}-${index}`} type="button" className={index === heroIndex ? 'hero-dot active' : 'hero-dot'} aria-label={`Show slide ${index + 1}`} onClick={() => setHeroIndex(index)} />
            ))}
          </div>
          {heroSlides.length > 1 ? <div className="hero-slider-controls"><button type="button" aria-label="Previous promotional slide" onClick={() => setHeroIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next promotional slide" onClick={() => setHeroIndex((current) => (current + 1) % heroSlides.length)}><ChevronRight size={18} /></button></div> : null}
        </section>

        <section className="category-section" id="categories">
          <div className="category-section-heading">
            <div><p className="section-kicker">EXPLORE</p><h2>Shop by Category</h2></div>
          </div>
          <div className="category-carousel">
            {homepageCategories.map((category) => (
              <button key={category.name} type="button" className="category-card" onClick={() => navigate(`/shop/${categorySlugFor(category.name)}`)}>
                <img src={localImage(category.image_url || products.find((product) => product.category.toLowerCase() === category.name.toLowerCase())?.image_url, defaultHero.image_url)} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultHero.image_url }} />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="promotion-cards" id="offers" aria-label="Promotions">
          <div className="section-heading featured-heading promotion-section-heading">
            <div><p className="section-kicker">GOOD CATCHES, GREAT VALUE</p><h2>Offers</h2></div>
          </div>
          {offers.slice(0, 3).map((offer, index) => (
            <article key={offer.id} className={`promotion-card ${index === 0 ? 'promotion-blue' : index === 1 ? 'promotion-orange' : 'promotion-cream'}`}>
              {(() => {
                const product = products.find((item) => item.id === offer.product_id)
                return (
                  <>
                    <div className="promotion-copy">
                      <h3>{offer.title}</h3><p>{offer.description}</p>
                      {offer.promo_price ? <div className="promotion-prices"><strong>{formatKsh(Number(offer.promo_price))}</strong>{offer.original_price ? <del>{formatKsh(Number(offer.original_price))}</del> : null}</div> : null}
                      {product ? <button type="button" className="promotion-add-button" onClick={() => addToCart(product)}>Add to Cart <ArrowRight size={14} /></button> : <button type="button" className="promotion-add-button" onClick={() => navigate(offer.title.toLowerCase().includes('combo') ? '/shop/combos' : '/shop/fish-butchery')}>{offer.cta_label || 'Browse products'} <ArrowRight size={14} /></button>}
                    </div>
                    <img src={localImage(offer.image_url || product?.image_url, defaultHero.image_url)} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultHero.image_url }} />
                  </>
                )
              })()}
            </article>
          ))}
        </section>

        <section id="shop" className="featured-section">
          <div className="section-heading featured-heading">
            <div><p className="section-kicker">PICK YOUR FAVOURITES</p><h2>Featured Products</h2></div>
            <a href="#shop" onClick={() => setSelectedCategory('All Products')}>View All <ArrowRight size={15} /></a>
          </div>

          <div className="featured-toolbar">
            <div className="category-tabs" aria-label="Product categories">
              {(['All Products', ...homepageCategories.map((category) => category.name)] as Category[]).map((category) => (
                <button key={category} type="button" className={selectedCategory === category ? 'category-tab active' : 'category-tab'} onClick={() => setSelectedCategory(category)}>{category}</button>
              ))}
            </div>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="empty-state"><p>No products match your search just yet.</p><button type="button" onClick={() => setQuery('')}>Clear search</button></div>
          ) : (
            <div className="featured-grid">
              {visibleProducts.slice(0, 6).map((product) => (
                <article key={product.id} className="freshco-product-card">
                  <div className="availability-row"><span>{Number(product.stock_quantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock'}</span></div>
                  <button type="button" className="product-image-button" onClick={() => navigate(`/products/${product.id}`)}><img src={localImage(product.image_url || product.image)} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultHero.image_url }} /></button>
                  <div className="freshco-product-info">
                    <h3>{product.name}</h3><p>{product.unit}</p>
                    <div className="price-row"><strong>{formatKsh(Number(product.price ?? product.selling_price ?? 0))}</strong></div>
                    <button type="button" className="add-cart-button" onClick={() => addToCart(product)} disabled={product.is_available === false || Number(product.stock_quantity ?? 0) <= 0}>{recentlyAddedId === product.id ? 'Added to basket' : 'Add to Cart'} <ShoppingBasket size={15} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="deals-section">
          <div className="section-heading featured-heading">
            <div><p className="section-kicker">LIMITED-TIME PRICES</p><h2>Deals of the Week</h2></div>
          </div>
          {(() => {
            const combo = products.find((product) => product.name.toLowerCase().includes('family fish combo'))
            const familyOffer = offers.find((offer) => offer.title.toLowerCase().includes('family fish combo'))
            const comboOffer = familyOffer?.product_id === combo?.id ? familyOffer : undefined
            const regularPrice = Number(comboOffer?.original_price ?? combo?.selling_price ?? combo?.price ?? familyOffer?.original_price ?? 0)
            const discountedPrice = Number(comboOffer?.promo_price ?? (!combo ? familyOffer?.promo_price : 0) ?? 0)
            const hasDiscount = Boolean(discountedPrice > 0 && regularPrice > discountedPrice)
            const discount = hasDiscount ? Number(comboOffer?.discount_value ?? familyOffer?.discount_value ?? Math.round((1 - discountedPrice / regularPrice) * 100)) : 0
            return combo || familyOffer ? (
              <article className="deal-feature-card">
                <div className="deal-feature-image"><img src={localImage(combo?.image_url || combo?.image || familyOffer?.image_url, '/images/products/family-combo.jpg')} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/products/family-combo.jpg' }} /></div>
                <div className="deal-feature-copy">
                  {hasDiscount ? <span className="deal-badge">SAVE {discount}%</span> : null}
                  <p className="section-kicker">FAMILY FAVOURITE</p>
                  <h3>{combo?.name || familyOffer?.title}</h3><p>{combo?.description || familyOffer?.description}</p>
                  <div className="deal-feature-price"><strong>{formatKsh(hasDiscount ? discountedPrice : regularPrice)}</strong>{hasDiscount ? <span>{formatKsh(regularPrice)}</span> : null}</div>
                  {combo ? <button type="button" className="add-cart-button" onClick={() => addToCart(combo)} disabled={combo.is_available === false || Number(combo.stock_quantity ?? 0) <= 0}>{recentlyAddedId === combo.id ? 'Added to basket' : 'Add to Cart'} <ShoppingBasket size={16} /></button> : <button type="button" className="add-cart-button" onClick={() => navigate('/shop/combos')}>Explore combo options <ArrowRight size={16} /></button>}
                </div>
              </article>
            ) : <p className="empty-state">The Family Fish Combo is not available right now.</p>
          })()}
        </section>

        <section className="bottom-promo">
          <div className="bottom-promo-copy"><p className="section-kicker">FRESH DELIVERY EVERYDAY</p><h2>Ready to Check Out?</h2><p>Order your fresh fish online and enjoy convenient delivery straight to your doorstep.</p><a href="#shop">Shop Now <ArrowRight size={15} /></a></div>
          <img src="/images/products/family-combo.jpg" alt="Fresh seafood package" loading="lazy" />
        </section>
      </main>

      <footer className="site-footer freshco-footer" id="contact">
        <div className="footer-brand"><a className="brand-block" href="#top"><PazuriBrand /></a><p>Fresh Delivery Everyday</p></div>
        <div className="footer-links"><h4>Explore</h4><ul><li><a href="#top">Home</a></li><li><a href="#shop">Shop</a></li><li><a href="#categories">Categories</a></li><li><a href="#offers">Offers</a></li></ul></div>
        <div className="footer-contact"><h4>Contact</h4><ul><li><Phone size={15} /><a href="tel:+254792198117">+254 792 198 117</a></li><li><MapPin size={15} /><span>Soleri Apartments, Shop No. 3, Maboko Road, Langata, Nairobi</span></li></ul></div>
        <div className="footer-actions"><h4>Follow Us</h4><div className="social-links"><a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok"><FaTiktok aria-hidden="true" /></a><a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF aria-hidden="true" /></a><a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram aria-hidden="true" /></a></div></div>
        <div className="copyright-bar"><span>© 2026 Pazuri Fish. All rights reserved.</span><div><a href="#privacy">Privacy Policy</a><a href="#terms">Terms and Conditions</a></div></div>
      </footer>

      {basketOpen ? <button type="button" className="basket-overlay" aria-label="Dismiss basket overlay" onClick={() => setBasketOpen(false)} /> : null}
      <aside className={basketOpen ? 'basket-drawer open' : 'basket-drawer'} id="basket" aria-live="polite">
        <div className="basket-header">
          <h3>Your basket</h3>
          <button type="button" aria-label="Close basket" onClick={() => setBasketOpen(false)}><X size={18} /></button>
        </div>

        {cart.length === 0 ? (
          <div className="basket-empty"><p>Your basket is empty.</p><button type="button" onClick={() => setBasketOpen(false)}>Continue shopping</button></div>
        ) : (
          <>
            <div className="basket-items">
              {cart.map((item) => (
                <div key={item.id} className="basket-item">
                  <img className="basket-item-image" src={localImage(item.image_url || item.image)} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultHero.image_url }} />
                  <div>
                    <h4>{item.name}</h4>
                    <p>{formatKsh(Number(item.price ?? item.selling_price ?? 0))} each</p>
                  </div>
                  <div className="basket-controls">
                    <div className="quantity-box">
                      <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Decrease quantity for ${item.name}`}><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Increase quantity for ${item.name}`}><Plus size={14} /></button>
                    </div>
                    <button type="button" className="inline-remove" onClick={() => removeFromCart(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="basket-summary">
              <div><span>Subtotal</span><strong>{formatKsh(subtotal)}</strong></div>
              <button type="button" className="clear-button" onClick={clearCart}>Remove all</button>
            </div>
            <button type="button" className="checkout-button" onClick={() => setCheckoutOpen(true)}>CHECKOUT</button>
            <button type="button" className="continue-shopping" onClick={() => setBasketOpen(false)}>Continue shopping</button>
          </>
        )}
      </aside>

      {checkoutOpen ? (
        <div className="checkout-modal-backdrop" onClick={() => setCheckoutOpen(false)}>
          <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="basket-header">
              <h3>Checkout</h3>
              <button type="button" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="checkout-form">
              <div className="checkout-order-items" aria-label="Items in your order">
                {cart.map((item) => (
                  <div className="checkout-order-item" key={item.id}>
                    <img src={localImage(item.image_url || item.image)} alt="" />
                    <span>{item.name} · {formatKsh(Number(item.price ?? item.selling_price ?? 0))} each × {item.quantity}</span>
                    <strong>{formatKsh(Number(item.price ?? item.selling_price ?? 0) * item.quantity)}</strong>
                  </div>
                ))}
              </div>
              <label>
                <span>Full name</span>
                <input autoComplete="name" required value={checkoutForm.full_name} onChange={(event) => { setCheckoutError(''); setCheckoutForm({ ...checkoutForm, full_name: event.target.value }) }} />
              </label>
              <label>
                <span>Mobile phone number</span>
                <input type="tel" autoComplete="tel" required value={checkoutForm.phone} onChange={(event) => { setCheckoutError(''); setCheckoutForm({ ...checkoutForm, phone: event.target.value }) }} />
              </label>
              <label>
                <span>Delivery location</span>
                <input autoComplete="street-address" required value={checkoutForm.location} onChange={(event) => { setCheckoutError(''); setCheckoutForm({ ...checkoutForm, location: event.target.value }) }} placeholder="Langata, Nairobi" />
              </label>
              <label>
                <span>Additional order instructions</span>
                <textarea value={checkoutForm.instructions} onChange={(event) => setCheckoutForm({ ...checkoutForm, instructions: event.target.value })} rows={4} />
              </label>
              <div className="checkout-summary-row"><span>Subtotal</span><strong>{formatKsh(subtotal)}</strong></div>
              <div className="checkout-summary-row"><span>Delivery fee</span><strong>To be confirmed</strong></div>
              <div className="checkout-summary-row checkout-total-row"><span>Total before delivery</span><strong>{formatKsh(subtotal)}</strong></div>
              <p className="checkout-payment-note">Delivery charges and available payment methods are confirmed by our team after the order is placed. The total shown excludes any delivery fee.</p>
              {checkoutError ? <p className="checkout-error" role="alert">{checkoutError}</p> : null}
              <button type="submit" className="primary-button" disabled={checkoutSubmitting}>{checkoutSubmitting ? 'Placing order…' : 'Place Order'}</button>
            </form>
          </div>
        </div>
      ) : null}

      {orderSuccess ? (
        <div className="checkout-success" role="status">
          <div>
            <p className="section-kicker">Order placed</p>
            <h3>Order Successfully Placed!</h3>
            <p>Thank you for shopping with Pazuri Fish. Your order has been received successfully.</p>
            {orderSuccess.order_number ? <p>Your order reference is <strong>{orderSuccess.order_number}</strong>.</p> : null}
          </div>
          <button type="button" onClick={() => { setOrderSuccess(null); navigate('/#shop') }} className="primary-button">Continue Shopping</button>
        </div>
      ) : null}

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[{ label: 'Home', href: '#top', icon: Home, category: 'All Products' as Category }, ...homepageCategories.slice(0, 3).map((category) => ({ label: category.name, href: `/shop/${categorySlugFor(category.name)}`, icon: PackageCheck, category: category.name as Category }))].map(({ label, href, icon: Icon, category }) => (
          <a key={label} href={href} className={selectedCategory === category ? 'mobile-link active' : 'mobile-link'} aria-label={label} onClick={() => setSelectedCategory(category)}>
            <Icon size={18} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}

function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(apiUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to sign in.')
      if (payload.token) localStorage.setItem('pazuri-admin-token', payload.token)
      navigate('/admin/dashboard')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-auth-shell">
      <div className="auth-visual-panel">
        <div className="auth-overlay" />
        <div className="auth-copy">
          <div className="brand-block light-brand"><PazuriBrand iconSize={58} light /></div>
          <p className="section-kicker dark">Lake Victoria fresh supply</p>
          <h1>Fresh fish operations, managed with clarity.</h1>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="brand-block auth-brand"><PazuriBrand iconSize={52} /></div>
          <h2>Admin Login</h2>
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@pazurifish.local" required />
            </label>
            <label>
              <span>Password</span>
              <div className="password-field">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}

function OverviewSection() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, completed: 0, pending: 0, totalProducts: 0, lowStock: 0, outOfStock: 0 })

  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) return

    const load = async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          fetch(apiUrl('orders'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl('products'), { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const orderPayload = ordersRes.ok ? await ordersRes.json() : { orders: [] }
        const productPayload = productsRes.ok ? await productsRes.json() : { products: [] }
        const orders = Array.isArray(orderPayload.orders) ? orderPayload.orders : []
        const products = Array.isArray(productPayload.products) ? productPayload.products : []

        setStats({
          revenue: orders.filter((order: { order_status: string }) => order.order_status !== 'CANCELLED').reduce((sum: number, order: { total: number }) => sum + Number(order.total || 0), 0),
          orders: orders.length,
          completed: orders.filter((order: { order_status: string }) => order.order_status === 'COMPLETED').length,
          pending: orders.filter((order: { order_status: string }) => ['PENDING_CONFIRMATION', 'PENDING'].includes(order.order_status)).length,
          totalProducts: products.length,
          lowStock: products.filter((product: { stock_quantity: number; minimum_stock: number }) => Number(product.stock_quantity) <= Number(product.minimum_stock || 0)).length,
          outOfStock: products.filter((product: { stock_quantity: number }) => Number(product.stock_quantity) <= 0).length,
        })
      } catch {
        setStats({ revenue: 0, orders: 0, completed: 0, pending: 0, totalProducts: 0, lowStock: 0, outOfStock: 0 })
      }
    }

    load()
  }, [])

  return (
    <div className="admin-grid">
      <div className="admin-card stat-card"><span>Total revenue</span><strong>{formatKsh(stats.revenue)}</strong></div>
      <div className="admin-card stat-card"><span>Total orders</span><strong>{stats.orders}</strong></div>
      <div className="admin-card stat-card"><span>Completed orders</span><strong>{stats.completed}</strong></div>
      <div className="admin-card stat-card"><span>Pending orders</span><strong>{stats.pending}</strong></div>
      <div className="admin-card stat-card"><span>Total products</span><strong>{stats.totalProducts}</strong></div>
      <div className="admin-card stat-card"><span>Low-stock products</span><strong>{stats.lowStock}</strong></div>
      <div className="admin-card stat-card"><span>Out-of-stock products</span><strong>{stats.outOfStock}</strong></div>
    </div>
  )
}

function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<HomepageCategory[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', description: '', category: 'Fish Butchery', selling_price: '', unit: 'per kg', image_url: '', stock_quantity: '0', minimum_stock: '0', is_available: true })

  const load = async () => {
    const token = localStorage.getItem('pazuri-admin-token')
    const headers = { Authorization: `Bearer ${token}` }
    const [productRes, categoryRes] = await Promise.all([
      fetch(apiUrl('admin/products'), { headers }),
      fetch(apiUrl('admin/categories'), { headers }),
    ])
    if (productRes.ok) setProducts((await productRes.json()).products || [])
    if (categoryRes.ok) setCategories((await categoryRes.json()).categories || [])
  }

  useEffect(() => {
    void load()
  }, [])

  const reset = () => {
    setEditing(null)
    setForm({ name: '', description: '', category: categories[0]?.name || 'Fish Butchery', selling_price: '', unit: 'per kg', image_url: '', stock_quantity: '0', minimum_stock: '0', is_available: true })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('pazuri-admin-token')
    const payload = {
      ...form,
      selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity),
      minimum_stock: Number(form.minimum_stock),
    }
    const response = await fetch(apiUrl(editing ? `products/${editing.id}` : 'products'), {
      method: editing ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.ok) { reset(); await load() }
  }

  const remove = async (productId: number) => {
    const token = localStorage.getItem('pazuri-admin-token')
    await fetch(apiUrl(`products/${productId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await load()
  }

  return (
    <div className="offers-admin-layout">
      <form className="offer-admin-form admin-card" onSubmit={submit}>
        <h3>{editing ? 'Edit product' : 'Add product'}</h3>
        <div className="offer-form-grid">
          <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
          <label className="wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label>
          <label><span>Price (KSh)</span><input type="number" min="0" value={form.selling_price} onChange={(event) => setForm({ ...form, selling_price: event.target.value })} required /></label>
          <label><span>Unit</span><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} required /></label>
          <label className="wide"><span>Image URL</span><input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} /><span>Or upload</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAdminImage(file).then((url) => setForm((current) => ({ ...current, image_url: url }))).catch((error) => window.alert(error instanceof Error ? error.message : 'Upload failed')) }} /></label>
          <label><span>Stock</span><input type="number" min="0" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })} /></label>
          <label><span>Minimum stock</span><input type="number" min="0" value={form.minimum_stock} onChange={(event) => setForm({ ...form, minimum_stock: event.target.value })} /></label>
          <label><span>Availability</span><select value={form.is_available ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, is_available: event.target.value === 'yes' })}><option value="yes">Available</option><option value="no">Unavailable</option></select></label>
        </div>
        <div className="offer-form-actions"><button type="submit" className="primary-button">{editing ? 'Save product' : 'Create product'}</button>{editing && <button type="button" onClick={reset}>Cancel</button>}</div>
      </form>
      <div className="admin-card offer-admin-list"><h3>Products</h3>{products.map((product) => (
        <article className="mini-offer admin-mini-offer" key={product.id}>
          <img src={localImage(product.image_url || product.image)} alt="" />
          <div><h4>{product.name}</h4><p>{product.category} · {formatKsh(Number(product.selling_price || product.price || 0))} · Stock {product.stock_quantity}</p></div>
          <div className="admin-mini-actions"><button type="button" onClick={() => { setEditing(product); setForm({ name: product.name, description: product.description, category: product.category, selling_price: String(product.selling_price || product.price || 0), unit: product.unit, image_url: product.image_url || '', stock_quantity: String(product.stock_quantity || 0), minimum_stock: String(product.minimum_stock || 0), is_available: product.is_available !== false }) }}>Edit</button><button type="button" onClick={() => void remove(product.id)}>Delete</button></div>
        </article>
      ))}</div>
    </div>
  )
}

function OrdersSection() {
  const [orders, setOrders] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const load = () => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) return
    fetch(apiUrl('orders'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setOrders(Array.isArray(payload.orders) ? payload.orders : []))
      .catch(() => setOrders([]))
  }
  useEffect(() => { load() }, [])

  const updateStatus = async (orderId: number, nextStatus: string) => {
    const token = localStorage.getItem('pazuri-admin-token')
    await fetch(apiUrl(`admin/orders/${orderId}/status`), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    load()
  }

  const visible = status ? orders.filter((order) => order.order_status === status) : orders
  return (
    <div className="admin-card">
      <div className="admin-section-toolbar"><h3>Orders</h3><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['PENDING_CONFIRMATION','PROCESSING','READY','DISPATCHED','COMPLETED','CANCELLED'].map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      {visible.length === 0 ? <p>No orders match this view.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reference</th><th>Customer</th><th>Contact</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map((order) => <tr key={order.id}><td>{order.order_number}</td><td>{order.customer_name}</td><td>{order.customer_phone}</td><td>{formatKsh(Number(order.total || 0))}</td><td>{order.payment_status}</td><td>{order.order_status}</td><td><select value={order.order_status} onChange={(event) => void updateStatus(order.id, event.target.value)}>{['PENDING_CONFIRMATION','PROCESSING','READY','DISPATCHED','COMPLETED','CANCELLED'].map((item) => <option key={item} value={item}>{item}</option>)}</select></td></tr>)}</tbody></table></div>}
    </div>
  )
}

function CategoriesSection() {
  const [categories, setCategories] = useState<HomepageCategory[]>([])
  const [editing, setEditing] = useState<HomepageCategory | null>(null)
  const [form, setForm] = useState({ name: '', image_url: '', display_order: '0', is_active: true, show_on_homepage: true })

  const load = async () => {
    const token = localStorage.getItem('pazuri-admin-token')
    const response = await fetch(apiUrl('admin/categories'), { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) setCategories((await response.json()).categories || [])
  }
  useEffect(() => { void load() }, [])

  const reset = () => {
    setEditing(null)
    setForm({ name: '', image_url: '', display_order: '0', is_active: true, show_on_homepage: true })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('pazuri-admin-token')
    const response = await fetch(apiUrl(editing ? `admin/categories/${editing.id}` : 'admin/categories'), {
      method: editing ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, display_order: Number(form.display_order) }),
    })
    if (response.ok) { reset(); await load() }
  }

  const remove = async (categoryId: number) => {
    const token = localStorage.getItem('pazuri-admin-token')
    await fetch(apiUrl(`admin/categories/${categoryId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await load()
  }

  return (
    <div className="offers-admin-layout">
      <form className="offer-admin-form admin-card" onSubmit={submit}>
        <h3>{editing ? 'Edit category' : 'Add category'}</h3>
        <div className="offer-form-grid">
          <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label><span>Display order</span><input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} /></label>
          <label className="wide"><span>Image URL</span><input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} /><span>Or upload</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAdminImage(file).then((url) => setForm((current) => ({ ...current, image_url: url }))).catch((error) => window.alert(error instanceof Error ? error.message : 'Upload failed')) }} /></label>
          <label><span>Active</span><select value={form.is_active ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, is_active: event.target.value === 'yes' })}><option value="yes">Active</option><option value="no">Inactive</option></select></label>
          <label><span>Homepage</span><select value={form.show_on_homepage ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, show_on_homepage: event.target.value === 'yes' })}><option value="yes">Visible</option><option value="no">Hidden</option></select></label>
        </div>
        <div className="offer-form-actions"><button type="submit" className="primary-button">{editing ? 'Save category' : 'Create category'}</button>{editing && <button type="button" onClick={reset}>Cancel</button>}</div>
      </form>
      <div className="admin-card offer-admin-list"><h3>Categories</h3>{categories.map((category) => (
        <article className="mini-offer admin-mini-offer" key={category.id}><img src={category.image_url || defaultHero.image_url} alt="" /><div><h4>{category.name}</h4><p>{category.is_active ? 'Active' : 'Inactive'} · Order {category.display_order} · {category.show_on_homepage ? 'Homepage' : 'Hidden'}</p></div><div className="admin-mini-actions"><button type="button" onClick={() => { setEditing(category); setForm({ name: category.name, image_url: category.image_url || '', display_order: String(category.display_order), is_active: category.is_active, show_on_homepage: category.show_on_homepage }) }}>Edit</button><button type="button" onClick={() => void remove(category.id)}>Delete</button></div></article>
      ))}</div>
    </div>
  )
}

function PosSection() { return <div className="admin-card"><h3>POS</h3><p>Cashier product search and sale completion work with the connected inventory and sales records.</p></div> }
function InventorySection() { return <div className="admin-card"><h3>Inventory</h3><p>Inventory values are linked to the live product stock and movement records.</p></div> }
function OffersSection() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Offer | null>(null)
  const [form, setForm] = useState({ title: '', description: '', image_url: '', badge: 'OFFER', product_id: '', promo_price: '', original_price: '', start_date: '', expiry_date: '', cta_label: 'Shop Offers', cta_url: '#offers', is_published: true })

  const load = async () => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    const [offerRes, productRes] = await Promise.all([fetch(apiUrl('admin/offers'), { headers }), fetch(apiUrl('products'), { headers })])
    const offerPayload = offerRes.ok ? await offerRes.json() : { offers: [] }
    const productPayload = productRes.ok ? await productRes.json() : { products: [] }
    setOffers(Array.isArray(offerPayload.offers) ? offerPayload.offers : [])
    setProducts(Array.isArray(productPayload.products) ? productPayload.products : [])
  }

  useEffect(() => { void load() }, [])

  const reset = () => {
    setEditing(null)
    setForm({ title: '', description: '', image_url: '', badge: 'OFFER', product_id: '', promo_price: '', original_price: '', start_date: '', expiry_date: '', cta_label: 'Shop Offers', cta_url: '#offers', is_published: true })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('pazuri-admin-token')
    const payload = {
      ...form,
      product_id: form.product_id ? Number(form.product_id) : null,
      promo_price: Number(form.promo_price || 0),
      original_price: Number(form.original_price || 0),
    }
    const response = await fetch(apiUrl(editing ? `admin/offers/${editing.id}` : 'admin/offers'), {
      method: editing ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.ok) { reset(); await load() }
  }

  const edit = (offer: Offer) => {
    setEditing(offer)
    setForm({
      title: offer.title,
      description: offer.description,
      image_url: offer.image_url || '',
      badge: offer.badge || 'OFFER',
      product_id: offer.product_id ? String(offer.product_id) : '',
      promo_price: offer.promo_price ? String(offer.promo_price) : '',
      original_price: offer.original_price ? String(offer.original_price) : '',
      start_date: offer.start_date ? offer.start_date.slice(0, 16) : '',
      expiry_date: offer.expiry_date ? offer.expiry_date.slice(0, 16) : '',
      cta_label: offer.cta_label || 'Shop Offers',
      cta_url: offer.cta_url || '#offers',
      is_published: offer.is_published !== false,
    })
  }

  const remove = async (offerId: number) => {
    const token = localStorage.getItem('pazuri-admin-token')
    await fetch(apiUrl(`admin/offers/${offerId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await load()
  }

  return (
    <div className="offers-admin-layout">
      <form className="offer-admin-form admin-card" onSubmit={submit}>
        <h3>{editing ? 'Edit promotion' : 'Create promotion'}</h3>
        <div className="offer-form-grid">
          <label><span>Heading</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <label><span>Small label</span><input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} /></label>
          <label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
          <label className="wide"><span>Background image URL</span><input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} /><span>Or upload</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAdminImage(file).then((url) => setForm((current) => ({ ...current, image_url: url }))).catch((error) => window.alert(error instanceof Error ? error.message : 'Upload failed')) }} /></label>
          <label><span>Linked product</span><select value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })}><option value="">No linked product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label><span>Published</span><select value={form.is_published ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, is_published: event.target.value === 'yes' })}><option value="yes">Published</option><option value="no">Deactivated</option></select></label>
          <label><span>Start date</span><input type="datetime-local" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></label>
          <label><span>End date</span><input type="datetime-local" value={form.expiry_date} onChange={(event) => setForm({ ...form, expiry_date: event.target.value })} /></label>
          <label><span>CTA label</span><input value={form.cta_label} onChange={(event) => setForm({ ...form, cta_label: event.target.value })} /></label>
          <label><span>CTA destination</span><input value={form.cta_url} onChange={(event) => setForm({ ...form, cta_url: event.target.value })} /></label>
          <label><span>Promotion price</span><input type="number" value={form.promo_price} onChange={(event) => setForm({ ...form, promo_price: event.target.value })} /></label>
          <label><span>Original price</span><input type="number" value={form.original_price} onChange={(event) => setForm({ ...form, original_price: event.target.value })} /></label>
        </div>
        <div className="offer-form-actions"><button type="submit" className="primary-button">{editing ? 'Save promotion' : 'Create promotion'}</button>{editing ? <button type="button" onClick={reset}>Cancel</button> : null}</div>
      </form>

      <div className="admin-card offer-admin-list">
        <h3>Campaigns</h3>
        {offers.length === 0 ? <p>No promotions have been created.</p> : offers.map((offer) => (
          <article className="mini-offer admin-mini-offer" key={offer.id}>
            <img src={offer.image_url || defaultHero.image_url} alt="" />
            <div><h4>{offer.title}</h4><p>{offer.is_published ? 'Published' : 'Deactivated'} · {offer.start_date ? 'Scheduled' : 'Always active'}</p></div>
            <div className="admin-mini-actions"><button type="button" onClick={() => edit(offer)}>Edit</button><button type="button" onClick={() => void remove(offer.id)}>Delete</button></div>
          </article>
        ))}
      </div>
    </div>
  )
}
function HeroSlidesSection() {
  const [slides, setSlides] = useState<Array<HeroContent & { id: number; sort_order?: number; is_published?: boolean }>>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({ title: 'Sourced from Lake Victoria.', subtitle: 'Sourced from Lake Victoria.', description: '', image_url: '', cta_label: '', cta_url: '', sort_order: '0', is_published: true })

  const load = async () => {
    const token = localStorage.getItem('pazuri-admin-token')
    const response = await fetch(apiUrl('admin/content/hero'), { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      const payload = await response.json()
      setSlides(Array.isArray(payload.slides) ? payload.slides : [])
    }
  }

  useEffect(() => { void load() }, [])

  const reset = () => {
    setEditing(null)
    setForm({ title: 'Sourced from Lake Victoria.', subtitle: 'Sourced from Lake Victoria.', description: '', image_url: '', cta_label: '', cta_url: '', sort_order: '0', is_published: true })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('pazuri-admin-token')
    const payload = { ...form, sort_order: Number(form.sort_order || 0) }
    const response = await fetch(apiUrl(editing ? 'admin/content/hero' : 'admin/content/hero'), {
      method: editing ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { ...payload, id: editing } : payload),
    })
    if (response.ok) { reset(); await load() }
  }

  const remove = async (slideId: number) => {
    const token = localStorage.getItem('pazuri-admin-token')
    await fetch(apiUrl(`admin/content/hero?id=${slideId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await load()
  }

  return (
    <div className="offers-admin-layout">
      <form className="offer-admin-form admin-card" onSubmit={submit}>
        <h3>{editing ? 'Edit promotional slide' : 'Create promotional slide'}</h3>
        <div className="offer-form-grid">
          <label className="wide"><span>Slide image URL</span><input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} required /><span>Or upload</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAdminImage(file).then((url) => setForm((current) => ({ ...current, image_url: url }))).catch((error) => window.alert(error instanceof Error ? error.message : 'Upload failed')) }} /></label>
          <label><span>Optional title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label><span>Optional description</span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label><span>Optional CTA label</span><input value={form.cta_label} onChange={(event) => setForm({ ...form, cta_label: event.target.value })} /></label>
          <label><span>Optional CTA URL</span><input value={form.cta_url} onChange={(event) => setForm({ ...form, cta_url: event.target.value })} /></label>
          <label><span>Display order</span><input type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} /></label>
          <label><span>Status</span><select value={form.is_published ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, is_published: event.target.value === 'active' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>
        <div className="offer-form-actions"><button type="submit" className="primary-button">{editing ? 'Save slide' : 'Create slide'}</button>{editing ? <button type="button" onClick={reset}>Cancel</button> : null}</div>
      </form>
      <div className="admin-card offer-admin-list"><h3>Promotional slides</h3>{slides.map((slide) => (
        <article className="mini-offer admin-mini-offer" key={slide.id}><img src={slide.image_url || defaultHero.image_url} alt="" /><div><h4>{slide.title || 'Promotional slide'}</h4><p>{slide.is_published ? 'Active' : 'Inactive'} · Order {slide.sort_order ?? 0}</p></div><div className="admin-mini-actions"><button type="button" onClick={() => { setEditing(slide.id); setForm({ title: slide.title || '', subtitle: slide.subtitle || '', description: slide.description || '', image_url: slide.image_url || '', cta_label: slide.cta_label || '', cta_url: slide.cta_url || '', sort_order: String(slide.sort_order ?? 0), is_published: slide.is_published !== false }) }}>Edit</button><button type="button" onClick={() => void remove(slide.id)}>Delete</button></div></article>
      ))}</div>
    </div>
  )
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [section, setSection] = useState('Overview')
  const [authenticated, setAuthenticated] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) {
      setAuthenticated(false)
      return
    }

    const verify = async () => {
      try {
        const response = await fetch(apiUrl('auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        setAuthenticated(response.ok)
        if (!response.ok) localStorage.removeItem('pazuri-admin-token')
      } catch {
        setAuthenticated(false)
        localStorage.removeItem('pazuri-admin-token')
      }
    }

    verify()
  }, [])

  const handleLogout = async () => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (token) {
      await fetch(apiUrl('auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined)
    }
    localStorage.removeItem('pazuri-admin-token')
    navigate('/admin')
  }

  if (!authenticated) return <Navigate to="/admin" replace />

  return (
    <div className="admin-shell-layout">
      <aside className={`admin-sidebar${drawerOpen ? ' drawer-open' : ''}`}>
        <div className="brand-block admin-brand-block"><PazuriBrand iconSize={52} /></div>
        <nav className="sidebar-nav" aria-label="Admin sections">
          {['Overview', 'Hero Slides', 'Products', 'Orders', 'POS', 'Inventory', 'Offers', 'Categories', 'WhatsApp', 'Reports', 'Settings', 'Logout'].map((item) => {
            if (item === 'Logout') {
              return <button key={item} type="button" className="sidebar-link logout-link" onClick={handleLogout}>{item}</button>
            }
            return <button key={item} type="button" className={section === item ? 'sidebar-link active' : 'sidebar-link'} onClick={() => { setSection(item); setDrawerOpen(false) }}>{item}</button>
          })}
        </nav>
      </aside>

      <main className="admin-main-panel">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-button" aria-label="Open admin navigation" onClick={() => setDrawerOpen((open) => !open)}>Menu</button>
          <div>
            <p className="section-kicker">Dashboard</p>
            <h1>{section}</h1>
          </div>
          <button type="button" className="nav-action light-button" onClick={() => navigate('/')}>Storefront</button>
        </header>

        <div className="admin-content-panel">
          {section === 'Overview' && <OverviewSection />}
          {section === 'Products' && <ProductsSection />}
          {section === 'Orders' && <OrdersSection />}
          {section === 'POS' && <PosSection />}
          {section === 'Inventory' && <InventorySection />}
          {section === 'Offers' && <OffersSection />}
          {section === 'Categories' && <CategoriesSection />}
          {section === 'WhatsApp' && <WhatsAppSection />}
          {section === 'Reports' && <ReportsSection />}
          {section === 'Settings' && <SettingsSection />}
          {section === 'Hero Slides' && <HeroSlidesSection />}
        </div>
      </main>
    </div>
  )
}

function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!productId) {
        setError('Product not found.')
        return
      }

      try {
        const response = await fetch(apiUrl(`products/${productId}`))
        if (!response.ok) {
          setError('Product not found.')
          return
        }

        const payload = await response.json().catch(() => ({}))
        const serverProduct = payload.product || payload

        if (serverProduct && typeof serverProduct === 'object' && 'id' in serverProduct) {
          setProduct(serverProduct as Product)
          return
        }

        setProduct(null)
      } catch {
        setProduct(null)
      }
    }

    void load()
  }, [productId])

  if (error) return <div className="product-detail-page"><p className="product-detail-empty">{error}</p><button className="primary-button" type="button" onClick={() => navigate('/')}>Back to store</button></div>
  if (!product) return <div className="product-detail-page"><p className="product-detail-empty">Loading product…</p></div>

  const addProductToBasket = () => {
    if (product.is_available === false || Number(product.stock_quantity ?? 0) <= 0) return
    const cart = JSON.parse(localStorage.getItem('pazuri-cart-v1') || '[]') as CartItem[]
    const existing = cart.find((entry) => entry.id === product.id)
    if (existing) {
      if (Number(product.stock_quantity ?? 0) > 0 && existing.quantity >= Number(product.stock_quantity)) return
      existing.quantity += 1
    } else {
      cart.push({ ...product, quantity: 1, price: Number(product.price ?? product.selling_price ?? 0), image: localImage(product.image_url || product.image) })
    }
    localStorage.setItem('pazuri-cart-v1', JSON.stringify(cart))
    navigate('/#basket')
  }

  return (
    <div className="product-detail-page">
      <header className="topbar detail-topbar"><div className="brand-block"><PazuriBrand iconSize={52} /></div><button type="button" className="nav-action" onClick={() => navigate('/')}>Back to store</button></header>
      <main className="product-detail-layout">
        <div className="product-detail-image-wrap"><img src={localImage(product.image_url || product.image)} alt={product.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultHero.image_url }} /></div>
        <div className="product-detail-copy">
          <p className="section-kicker">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="price-row detail-price-row"><strong>{formatKsh(Number(product.price ?? product.selling_price ?? 0))}</strong><span>{product.unit}</span></div>
          <p className="product-detail-description">{product.description}</p>
          <div className="detail-specs"><h3>Specifications</h3><p>{product.specifications || 'Freshly sourced daily for quality and consistency.'}</p></div>
          <div className="detail-meta"><span>Availability: {product.is_available ? 'Available' : 'Unavailable'}</span><span>Stock: {product.stock_quantity ?? 0}</span></div>
          <button type="button" className="primary-button" onClick={addProductToBasket} disabled={product.is_available === false || Number(product.stock_quantity ?? 0) <= 0}>{product.is_available === false || Number(product.stock_quantity ?? 0) <= 0 ? 'Currently unavailable' : 'Add to basket'}</button>
        </div>
      </main>
    </div>
  )
}

function AppRoot() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StorefrontPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/shop/:categorySlug" element={<CategoryShopPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoot />
}

function WhatsAppSection() { return <div className="admin-card"><h3>WhatsApp</h3><p>Customer ordering remains connected to the server-side WhatsApp configuration.</p></div> }
function ReportsSection() { return <div className="admin-card"><h3>Reports</h3><p>Reporting reads the live orders and inventory records.</p></div> }
function SettingsSection() {
  const [profile, setProfile] = useState({ full_name: '', email: '', role: '' })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    fetch(apiUrl('auth/me'), { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : { user: null })
      .then((payload) => setProfile(payload.user || { full_name: '', email: '', role: '' }))
  }, [])

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    const token = localStorage.getItem('pazuri-admin-token')
    const response = await fetch(apiUrl('auth/password'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(passwords),
    })
    const payload = await response.json().catch(() => ({}))
    setMessage(response.ok ? payload.message : payload.error || 'Unable to change password.')
    if (response.ok) setPasswords({ current_password: '', new_password: '' })
  }

  return (
    <div className="offers-admin-layout">
      <div className="admin-card">
        <h3>Administrator profile</h3>
        <p><strong>{profile.full_name}</strong></p>
        <p>{profile.email}</p>
        <p>Role: {profile.role}</p>
      </div>
      <form className="offer-admin-form admin-card" onSubmit={changePassword}>
        <h3>Change password</h3>
        <div className="offer-form-grid">
          <label className="wide"><span>Current password</span><input type="password" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} required /></label>
          <label className="wide"><span>New password</span><input type="password" minLength={8} value={passwords.new_password} onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })} required /></label>
        </div>
        {message ? <p>{message}</p> : null}
        <div className="offer-form-actions"><button type="submit" className="primary-button">Update password</button></div>
      </form>
    </div>
  )
}

function CategoryShopPage() {
  const { categorySlug } = useParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<HomepageCategory[]>(DEFAULT_SHOP_CATEGORIES)
  const [categoryName, setCategoryName] = useState(() =>
    DEFAULT_SHOP_CATEGORIES.find((category) => categorySlugFor(category.name) === categorySlug)?.name
      || (categorySlug ? categorySlug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Shop'),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pazuri-cart-v1') || '[]') as CartItem[]
    } catch {
      return []
    }
  })
  const [basketOpen, setBasketOpen] = useState(false)
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [productResponse, categoryResponse] = await Promise.all([
          fetch(apiUrl('products')),
          fetch(apiUrl('categories')),
        ])
        if (!productResponse.ok) throw new Error('Unable to load products.')
        const productPayload = await productResponse.json()
        const categoryPayload = categoryResponse.ok ? await categoryResponse.json() : { categories: [] }
        const categoryList = Array.isArray(categoryPayload.categories) ? categoryPayload.categories as HomepageCategory[] : []
        const shopCategories = getShopCategories(categoryList, true)
        const category = shopCategories.find((item) => categorySlugFor(item.name) === categorySlug)
        const resolvedName = category?.name || (categorySlug ? categorySlug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Shop')
        setCategoryName(resolvedName)
        const serverProducts = Array.isArray(productPayload.products) ? productPayload.products as Product[] : []
        setProducts(serverProducts)
        setCategories(shopCategories)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this category.')
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [categorySlug])

  useEffect(() => {
    localStorage.setItem('pazuri-cart-v1', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product: Product) => {
    const stock = Number(product.stock_quantity ?? 0)
    const currentQuantity = cart.find((item) => item.id === product.id)?.quantity ?? 0
    if (product.is_available === false || stock <= 0 || currentQuantity >= stock) return
    setBasketOpen(true)
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1, price: Number(product.price ?? product.selling_price ?? 0), image: localImage(product.image_url || product.image) }]
    })
    setRecentlyAddedId(product.id)
    window.setTimeout(() => setRecentlyAddedId((current) => current === product.id ? null : current), 1400)
  }

  const categoryProducts = products.filter((product) => product.category.toLowerCase() === categoryName.toLowerCase())
  const cartTotal = cart.reduce((total, item) => total + Number(item.price ?? item.selling_price ?? 0) * item.quantity, 0)
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)
  const updateQuantity = (productId: number, delta: number) => {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== productId) return [item]
      const quantity = item.quantity + delta
      if (quantity <= 0) return []
      if (Number(item.stock_quantity ?? 0) > 0 && quantity > Number(item.stock_quantity)) return [item]
      return [{ ...item, quantity }]
    }))
  }
  const removeFromCart = (productId: number) => setCart((current) => current.filter((item) => item.id !== productId))

  return (
    <div className="category-shop-page">
      <header className="topbar detail-topbar">
        <button type="button" className="brand-block category-shop-brand" onClick={() => navigate('/')} aria-label="Pazuri Fish home"><PazuriBrand iconSize={52} /></button>
        <button type="button" className="basket-button" aria-label={`Open basket with ${cartItemCount} items`} onClick={() => setBasketOpen(true)}><ShoppingBasket size={20} />{cartItemCount > 0 ? <span className="cart-count">{cartItemCount}</span> : null}</button>
        <button type="button" className="nav-action" onClick={() => navigate('/')}>Back to store</button>
      </header>
      <main className="category-shop-main">
        <div className="category-shop-heading"><h1>{categoryName}</h1></div>
        <nav className="shop-category-nav" aria-label="Product categories">
          {categories.map((category) => <button key={category.name} type="button" className={category.name === categoryName ? 'active' : ''} onClick={() => navigate(`/shop/${categorySlugFor(category.name)}`)}>{category.name}</button>)}
        </nav>
        {loading ? <div className="empty-state"><p>Loading products…</p></div> : error ? <div className="empty-state"><p>{error}</p></div> : categoryProducts.length === 0 ? <div className="empty-state"><p>No products are available in {categoryName} right now.</p><button type="button" onClick={() => navigate('/')}>Browse all products</button></div> : (
          <div className="featured-grid category-product-grid">
            {categoryProducts.map((product) => (
              <article key={product.id} className="freshco-product-card">
                <div className="availability-row"><span>{Number(product.stock_quantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock'}</span></div>
                <button type="button" className="product-image-button" onClick={() => navigate(`/products/${product.id}`)}><img src={localImage(product.image_url || product.image)} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultHero.image_url }} /></button>
                <div className="freshco-product-info"><h3>{product.name}</h3><p>{product.unit}</p><p className="shop-product-description">{product.description}</p><div className="price-row"><strong>{formatKsh(Number(product.price ?? product.selling_price ?? 0))}</strong></div><button type="button" className="add-cart-button" onClick={() => addToCart(product)} disabled={product.is_available === false || Number(product.stock_quantity ?? 0) <= 0}>{recentlyAddedId === product.id ? 'Added to basket' : 'Add to Cart'} <ShoppingBasket size={15} /></button></div>
              </article>
            ))}
          </div>
        )}
      </main>
      {basketOpen ? <button type="button" className="basket-overlay" aria-label="Dismiss basket overlay" onClick={() => setBasketOpen(false)} /> : null}
      <aside className={basketOpen ? 'basket-drawer open' : 'basket-drawer'} aria-live="polite">
        <div className="basket-header"><h3>Your basket</h3><button type="button" aria-label="Close basket" onClick={() => setBasketOpen(false)}><X size={18} /></button></div>
        {cart.length === 0 ? <div className="basket-empty"><p>Your basket is empty.</p><button type="button" onClick={() => setBasketOpen(false)}>Continue shopping</button></div> : <>
          <div className="basket-items">{cart.map((item) => <div key={item.id} className="basket-item">
            <img className="basket-item-image" src={localImage(item.image_url || item.image)} alt="" />
            <div className="basket-item-copy"><h4>{item.name}</h4><p>{formatKsh(Number(item.price ?? item.selling_price ?? 0))} each</p></div>
            <div className="basket-controls"><div className="quantity-box"><button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Decrease quantity for ${item.name}`}><Minus size={14} /></button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Increase quantity for ${item.name}`}><Plus size={14} /></button></div><button type="button" className="inline-remove" onClick={() => removeFromCart(item.id)}>Remove</button></div>
          </div>)}</div>
          <div className="basket-summary"><div><span>Subtotal</span><strong>{formatKsh(cartTotal)}</strong></div></div>
          <button type="button" className="checkout-button" onClick={() => navigate('/#checkout')}>Checkout</button>
          <button type="button" className="continue-shopping" onClick={() => setBasketOpen(false)}>Continue shopping</button>
        </>}
      </aside>
    </div>
  )
}
