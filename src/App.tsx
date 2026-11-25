import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Phone,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Truck,
  X,
} from 'lucide-react'
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import PazuriBrand from './components/PazuriBrand/PazuriBrand.jsx'
import {
  apiUrl,
  categorySlugFor,
  DEFAULT_SHOP_CATEGORIES,
  FALLBACK_PRODUCT_IMAGE,
  fetchApiJson,
  formatKsh,
  getShopCategories,
  localImage,
  StorefrontImage,
  type CartItem,
  type Category,
  type HeroContent,
  type HomepageCategory,
  type Offer,
  type Product,
} from './storefront/shared'

const LazyCategoryShopPage = lazy(() => import('./storefront/CategoryShopPage'))

const HERO_IMAGES: HeroContent[] = [
  { title: 'Sourced from Lake Victoria\'s waters', subtitle: 'FRESH CATCH', image_url: '/images/products/fresh-fish.jpg' },
  { title: 'Fresh catch delivered every day', subtitle: 'FRESH CATCH', image_url: '/images/categories/combos/family-feast.jpg' },
  { title: 'Fresh catch delivered every day', subtitle: 'FRESH CATCH', image_url: '/images/categories/kitchen/grilled-tilapia.jpg' },
  { title: 'Fresh catch delivered every day', subtitle: 'FRESH CATCH', image_url: '/images/categories/drinks/tropical-cooler.jpg' },
  { title: 'Fresh catch delivered every day', subtitle: 'FRESH CATCH', image_url: '/images/products/fish-cuts.jpg' },
  { title: 'Fresh catch delivered every day', subtitle: 'FRESH CATCH', image_url: '/images/products/fish-and-chips.jpg' },
]

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

function StorefrontPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('All Products')
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [query, setQuery] = useState('')
  const [basketOpen, setBasketOpen] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [offers, setOffers] = useState<Offer[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [heroSlides, setHeroSlides] = useState<HeroContent[]>(HERO_IMAGES)
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
  const [trackingCopied, setTrackingCopied] = useState(false)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)
  const featuredProductsRef = useRef<HTMLDivElement>(null)
  const checkoutIdempotencyRef = useRef('')

  const hero = heroSlides[heroIndex] ?? defaultHero
  const resolvedHeroImageUrl = localImage(hero.image_url, defaultHero.image_url)
  const heroImageUrl = hero === defaultHero
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
      }, 2000)
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
    const loadContent = async () => {
      const results = await Promise.allSettled([
        fetchApiJson<{ products?: Product[] }>('products'),
        fetchApiJson<{ hero?: HeroContent; slides?: HeroContent[] }>('content/hero'),
        fetchApiJson<{ offers?: Offer[] }>('offers'),
        fetchApiJson<{ categories?: HomepageCategory[] }>('categories/homepage'),
        fetchApiJson<{ deals?: any[] }>('deals'),
      ])
      const [productsResult, heroResult, offersResult, categoriesResult, dealsResult] = results
      if (productsResult.status === 'fulfilled') {
        setProducts(Array.isArray(productsResult.value.products) ? productsResult.value.products : [])
      } else {
        console.error('Unable to load storefront products.', productsResult.reason)
        setProducts([])
      }

      if (heroResult.status === 'fulfilled') {
        const slides = Array.isArray(heroResult.value.slides)
          ? heroResult.value.slides
          : heroResult.value.hero
            ? [heroResult.value.hero]
            : []
        const returnedSlides = slides.filter((slide) => slide && slide.image_url)
        setHeroSlides(returnedSlides.length ? HERO_IMAGES : HERO_IMAGES)
      } else {
        console.error('Unable to load homepage hero content.', heroResult.reason)
        setHeroSlides(HERO_IMAGES)
      }

      if (offersResult.status === 'fulfilled') {
        const activeOffers = Array.isArray(offersResult.value.offers)
          ? offersResult.value.offers.filter((offer) => offer.id !== 0 && offer.is_published !== false)
          : []
        setOffers(activeOffers)
      } else {
        console.error('Unable to load active offers.', offersResult.reason)
        setOffers([])
      }

      if (categoriesResult.status === 'fulfilled') {
        const categories = Array.isArray(categoriesResult.value.categories) ? categoriesResult.value.categories : []
        setHomepageCategories(getShopCategories(categories))
      } else {
        console.error('Unable to load homepage categories.', categoriesResult.reason)
        setHomepageCategories(DEFAULT_SHOP_CATEGORIES)
      }

      if (dealsResult.status === 'fulfilled') {
        setDeals(Array.isArray(dealsResult.value.deals) ? dealsResult.value.deals : [])
      } else {
        console.error('Unable to load active deals.', dealsResult.reason)
        setDeals([])
      }
    }

    void loadContent()
  }, [])

  const liveOfferCards = useMemo(() => offers.flatMap((offer) => {
    const product = products.find((item) => item.id === offer.product_id)
    const promoPrice = Number(offer.promo_price ?? 0)
    const originalPrice = Number(offer.original_price ?? 0)
    const livePrice = Number(product?.price ?? product?.selling_price ?? 0)
    if (!product || product.demo_only || promoPrice <= 0 || originalPrice <= promoPrice || Math.abs(livePrice - promoPrice) > 0.01) return []
    return [{ ...offer, product, demo_only: false }]
  }), [offers, products])

  const offerCards = useMemo(() => liveOfferCards.slice(0, 4), [liveOfferCards])

  const featuredProducts = useMemo(() => {
    const featuredOrder = ['fresh whole tilapia', 'fresh nile perch', 'tilapia fillet', 'family fish combo']
    return products
      .filter((product) => !product.demo_only && product.is_available !== false && Number(product.stock_quantity ?? 0) > 0)
      .sort((left, right) => {
        const leftIndex = featuredOrder.indexOf(left.name.toLowerCase())
        const rightIndex = featuredOrder.indexOf(right.name.toLowerCase())
        return (leftIndex < 0 ? featuredOrder.length : leftIndex) - (rightIndex < 0 ? featuredOrder.length : rightIndex)
      })
      .slice(0, 4)
  }, [products])

  const visibleProducts = useMemo(() => {
    const catalog = showAllProducts || query.trim() || selectedCategory !== 'All Products' ? products : featuredProducts
    return catalog.filter((product) => {
      const matchesCategory = selectedCategory === 'All Products' || product.category === selectedCategory
      const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase()
      const matchesQuery = haystack.includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [featuredProducts, products, query, selectedCategory, showAllProducts])

  useEffect(() => {
    const cards = featuredProductsRef.current?.querySelectorAll<HTMLElement>('.featured-product-row')
    if (!cards) return

    if (typeof IntersectionObserver === 'undefined') {
      cards.forEach((card) => card.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12 })
    cards.forEach((card) => observer.observe(card))

    return () => observer.disconnect()
  }, [visibleProducts])

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price ?? item.selling_price ?? 0) * item.quantity, 0), [cart])
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const hasDemoCartItems = cart.some((item) => item.demo_only)

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
    if (cart.some((item) => item.demo_only)) {
      setCheckoutError('Demo items are for presentation only. Remove them before placing an order.')
      return
    }

    setCheckoutSubmitting(true)
    setCheckoutError('')
    if (!checkoutIdempotencyRef.current) {
      checkoutIdempotencyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${cart.length}`
    }
    try {
      const response = await fetch(apiUrl('orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: checkoutIdempotencyRef.current,
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
      checkoutIdempotencyRef.current = ''
      setCheckoutOpen(false)
      setCheckoutForm({ full_name: '', phone: '', location: '', instructions: '' })
      setOrderSuccess({ order_number: typeof payload.order?.tracking_number === 'string' ? payload.order.tracking_number : payload.order?.order_number })
      setBasketOpen(false)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to complete order.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  return (
    <div className="site-shell" id="top">
      <header className="topbar storefront-topbar">
        <a className="brand-block" href="#top" aria-label="Pazuri Fish home">
          <PazuriBrand />
        </a>

        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#top">Home</a>
          {homepageCategories.map((category) => <Link key={category.name} to={`/shop/${categorySlugFor(category.name)}`}>{category.name}</Link>)}
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
            <p className="hero-animated-line hero-line-one">
              {'Sourced from Lake Victoria\'s waters'.split(' ').map((word, index) => (
                <span key={`${word}-${index}`} style={{ animationDelay: `${index * 90}ms` }}>{word}</span>
              ))}
            </p>
            <h1 className="hero-animated-line hero-line-two">
              {'Fresh catch delivered every day'.split(' ').map((word, index) => (
                <span key={`${word}-${index}`} style={{ animationDelay: `${700 + index * 90}ms` }}>{word}</span>
              ))}
            </h1>
          </div>
          <div className="freshco-hero-images" aria-label="Pazuri Fish hero slideshow">
            {heroSlides.length === 6 ? heroSlides.map((slide, index) => (
              <StorefrontImage
                key={`${slide.image_url}-${index}`}
                className={index === heroIndex ? 'hero-slide active' : 'hero-slide'}
                source={localImage(slide.image_url, '/images/hero-seafood.png')}
                alt={index === heroIndex ? 'Fresh seafood from Pazuri Fish' : ''}
                fallback="/images/hero-seafood.png"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                sizes="100vw"
              />
            )) : null}
          </div>
          <div className="hero-dots" aria-label="Hero slide indicators">
            {heroSlides.map((slide, index) => (
              <button key={`${slide.image_url}-${index}`} type="button" className={index === heroIndex ? 'hero-dot active' : 'hero-dot'} aria-label={`Show slide ${index + 1}`} onClick={() => setHeroIndex(index)} />
            ))}
          </div>
          {heroSlides.length > 1 ? <div className="hero-slider-controls"><button type="button" aria-label="Previous promotional slide" onClick={() => setHeroIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next promotional slide" onClick={() => setHeroIndex((current) => (current + 1) % heroSlides.length)}><ChevronRight size={18} /></button></div> : null}
        </section>

        <section className="category-section" id="categories" aria-label="Product categories">
          <div className="category-carousel">
            {homepageCategories.map((category) => (
              <button key={category.name} type="button" className="category-card" onClick={() => navigate(`/shop/${categorySlugFor(category.name)}`)}>
                <StorefrontImage
                  source={category.image_url || products.find((product) => product.category.toLowerCase() === category.name.toLowerCase())?.image_url}
                  alt=""
                  aria-hidden="true"
                  fallback={defaultHero.image_url}
                  sizes="(max-width: 760px) 45vw, (max-width: 980px) 23vw, 25vw"
                />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="promotion-cards" id="offers" aria-label="Promotions">
          <div className="section-heading featured-heading promotion-section-heading">
            <div><h2>Offers</h2></div>
          </div>
          {offerCards.map((offer, index) => {
            const product = offer.product
            const promoPrice = Number(offer.promo_price ?? 0)
            const originalPrice = Number(offer.original_price ?? 0)
            const discount = originalPrice > 0 && promoPrice > 0
              ? Math.round((1 - promoPrice / originalPrice) * 100)
              : Number(offer.discount_value ?? 0)

            return (
              <article key={offer.id} className={`promotion-card ${index === 0 ? 'promotion-blue' : index === 1 ? 'promotion-orange' : 'promotion-cream'}`}>
                <div className="promotion-copy">
                  <span className={offer.demo_only ? 'promotion-label demo-label' : 'promotion-label'}>{offer.demo_only ? 'DEMO OFFER' : offer.badge || 'SPECIAL OFFER'}</span>
                  <h3>{offer.title || product.name}</h3>
                  {offer.title !== product.name ? <p className="promotion-product-name">{product.name}</p> : null}
                  <p>{offer.description}</p>
                  <div className="promotion-prices">
                    <strong>{formatKsh(promoPrice)}</strong>
                    <del>{formatKsh(originalPrice)}</del>
                    {discount > 0 ? <span className="promotion-discount">{discount}% off</span> : null}
                  </div>
                  <button type="button" className="promotion-add-button" onClick={() => addToCart(product)}>
                    {recentlyAddedId === product.id ? 'Added to Basket' : 'Add to Cart'} <ShoppingBasket size={14} />
                  </button>
                </div>
                <StorefrontImage
                  source={offer.image_url || product.image_url}
                  alt={`${product.name} offer`}
                  fallback={defaultHero.image_url}
                  sizes="(max-width: 760px) 92vw, (max-width: 980px) 45vw, 33vw"
                />
              </article>
            )
          })}
        </section>

        <section id="shop" className="featured-section">
          <div className="section-heading featured-heading">
            <div>
              <h2>Products</h2>
              <h3 className="featured-subheading">{showAllProducts ? 'All Products' : 'Featured Products'}</h3>
            </div>
            <button type="button" className="featured-view-all" onClick={() => {
              setSelectedCategory('All Products')
              setQuery('')
              setShowAllProducts((showAll) => !showAll)
            }}>
              {showAllProducts ? 'Show Featured' : 'View All'} <ArrowRight size={15} />
            </button>
          </div>

          <div className="featured-toolbar">
            <div className="category-tabs" aria-label="Product categories">
              {(['All Products', ...homepageCategories.map((category) => category.name)] as Category[]).map((category) => (
                <button key={category} type="button" className={selectedCategory === category ? 'category-tab active' : 'category-tab'} onClick={() => {
                  setSelectedCategory(category)
                  setShowAllProducts(false)
                }}>{category}</button>
              ))}
            </div>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="empty-state"><p>No products match your search just yet.</p><button type="button" className="brand-action-button" onClick={() => { setQuery(''); setShowAllProducts(false) }}>Clear Search</button></div>
          ) : (
            <div className="featured-grid featured-product-list" ref={featuredProductsRef}>
              {visibleProducts.map((product) => {
                const productOffer = liveOfferCards.find((offer) => offer.product.id === product.id)
                const currentPrice = Number(product.price ?? product.selling_price ?? 0)
                const originalPrice = Number(productOffer?.original_price ?? 0)
                const discount = originalPrice > currentPrice
                  ? Math.round((1 - currentPrice / originalPrice) * 100)
                  : 0

                return (
                <article key={product.id} className="freshco-product-card featured-product-row">
                  <button type="button" className="product-image-button" onClick={() => navigate(`/products/${product.id}`)} aria-label={`View ${product.name}`}>
                    <StorefrontImage source={product.image_url || product.image} alt={product.name} fallback={defaultHero.image_url} sizes="(max-width: 760px) 38vw, 44vw" />
                  </button>
                  <div className="freshco-product-info">
                    <h3>{product.name}</h3>
                    <div className="price-row">
                      <strong>{formatKsh(currentPrice)}</strong>
                      {originalPrice > currentPrice ? <del>{formatKsh(originalPrice)}</del> : null}
                      {discount > 0 ? <span className="promotion-discount">{discount}% off</span> : null}
                    </div>
                    <div className="product-card-actions">
                      <button type="button" className="add-cart-button" onClick={() => addToCart(product)} disabled={product.is_available === false || Number(product.stock_quantity ?? 0) <= 0}>{recentlyAddedId === product.id ? 'Added to Basket' : 'Add to Cart'} <ShoppingBasket size={15} /></button>
                    </div>
                  </div>
                </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="deals-section">
          <div className="section-heading featured-heading">
            <div><h2>Deals of the Week</h2></div>
          </div>
          <div className="weekly-deals-grid">
            {deals.slice(0, 3).map((deal, index) => {
              const product = products.find((item) => deal.product_ids?.includes(item.id)) || products.find((item) => item.category === 'Combos') || products[0]
              const promoPrice = Number(deal.deal_price ?? 0)
              const originalPrice = Number(deal.original_price ?? product?.price ?? product?.selling_price ?? 0)
              const discount = originalPrice > promoPrice && promoPrice > 0
                ? Math.round((1 - promoPrice / originalPrice) * 100)
                : 0
              return (
                <article className="weekly-deal-card" key={`${deal.id}-${index}`}>
                  <StorefrontImage source={deal.image_url || product?.image_url || product?.image} alt={deal.title || product?.name || 'Pazuri deal'} fallback="/images/products/family-combo.jpg" sizes="(max-width: 760px) 92vw, 33vw" />
                  <div className="weekly-deal-copy">
                    {discount > 0 ? <span className="deal-badge">SAVE {discount}%</span> : null}
                    <h3>{deal.title || product?.name || 'Pazuri deal'}</h3>
                    <p>{deal.description || product?.description || ''}</p>
                    <div className="deal-feature-price"><strong>{formatKsh(promoPrice || originalPrice)}</strong>{promoPrice > 0 && originalPrice > promoPrice ? <span>{formatKsh(originalPrice)}</span> : null}</div>
                    <div className="deal-card-actions">
                      <button type="button" className="view-product-button" onClick={() => product?.id > 0 ? navigate(`/products/${product.id}`) : navigate('/shop/combos')}>View Deal</button>
                      {product ? <button type="button" className="add-cart-button" onClick={() => addToCart({ ...product, price: promoPrice || originalPrice, selling_price: promoPrice || originalPrice })}>Add to Cart</button> : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="bottom-promo">
          <div className="bottom-promo-copy"><p className="section-kicker">FRESH DELIVERY EVERYDAY</p><h2>Ready to Check Out?</h2><p>Order your fresh fish online and enjoy convenient delivery straight to your doorstep.</p><a href="#shop">Shop Now <ArrowRight size={15} /></a></div>
          <StorefrontImage source="/images/products/family-combo.jpg" alt="Seafood meal served with rice" fallback={defaultHero.image_url} sizes="(max-width: 760px) 100vw, 55vw" />
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
          <div className="basket-empty"><p>Your basket is empty.</p><button type="button" className="brand-action-button" onClick={() => setBasketOpen(false)}>Continue Shopping</button></div>
        ) : (
          <>
            <div className="basket-items">
              {cart.map((item) => (
                <div key={item.id} className="basket-item">
                  <StorefrontImage className="basket-item-image" source={item.image_url || item.image} alt="" sizes="58px" loading="eager" />
                  <div>
                    <h4>{item.name}</h4>
                    <p>{formatKsh(Number(item.price ?? item.selling_price ?? 0))} each</p>
                    {item.demo_only ? <span className="demo-cart-label">Demo item · not orderable</span> : null}
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
                    <StorefrontImage source={item.image_url || item.image} alt="" sizes="42px" loading="eager" />
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
              {hasDemoCartItems ? <p className="checkout-error" role="alert">Demo items are for presentation only. Remove them before placing an order.</p> : null}
              {checkoutError ? <p className="checkout-error" role="alert">{checkoutError}</p> : null}
              <button type="submit" className="primary-button" disabled={checkoutSubmitting || hasDemoCartItems}>{checkoutSubmitting ? 'Placing order…' : 'Place Order'}</button>
            </form>
          </div>
        </div>
      ) : null}

      {orderSuccess ? (
        <div className="checkout-success-backdrop" role="dialog" aria-modal="true" aria-labelledby="order-success-heading">
          <div className="checkout-success-modal">
            <button type="button" className="checkout-success-close" aria-label="Close order confirmation" onClick={() => setOrderSuccess(null)}><X size={20} /></button>
            <p className="section-kicker">Order placed</p>
            <h3 id="order-success-heading">Your Order Has Been Received!</h3>
            <p>Your order has been successfully placed. Save your tracking number to follow your delivery.</p>
            {orderSuccess.order_number ? <strong className="tracking-number-display">{orderSuccess.order_number}</strong> : null}
            <div className="checkout-success-actions">
              {orderSuccess.order_number ? (
                <button type="button" className="secondary-button" onClick={async () => {
                  await navigator.clipboard?.writeText(orderSuccess.order_number || '')
                  setTrackingCopied(true)
                }}>{trackingCopied ? 'Copied' : 'Copy Tracking Number'}</button>
              ) : null}
              <button type="button" className="primary-button" onClick={() => {
                setOrderSuccess(null)
                navigate(`/track/${encodeURIComponent(orderSuccess.order_number || '')}`)
              }}>Next — Track My Order</button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[{ label: 'Home', href: '/', icon: Home, category: 'All Products' as Category }, ...homepageCategories.slice(0, 3).map((category) => ({ label: category.name, href: `/shop/${categorySlugFor(category.name)}`, icon: PackageCheck, category: category.name as Category }))].map(({ label, href, icon: Icon, category }) => (
          <Link key={label} to={href} className={selectedCategory === category ? 'mobile-link active' : 'mobile-link'} aria-label={label} onClick={() => setSelectedCategory(category)}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
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
  const [stats, setStats] = useState({ revenue: 0, orders: 0, completed: 0, pending: 0, totalProducts: 0, totalCategories: 0, activeOffers: 0, activeDeals: 0, lowStock: 0, outOfStock: 0 })

  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) return

    const load = async () => {
      try {
        const [ordersRes, productsRes, categoriesRes, offersRes, dealsRes] = await Promise.all([
          fetch(apiUrl('orders'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl('admin/products'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl('admin/categories'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl('admin/offers'), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl('admin/deals'), { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const orderPayload = ordersRes.ok ? await ordersRes.json() : { orders: [] }
        const productPayload = productsRes.ok ? await productsRes.json() : { products: [] }
        const orders = Array.isArray(orderPayload.orders) ? orderPayload.orders : []
        const products = Array.isArray(productPayload.products) ? productPayload.products : []
        const categoriesPayload = categoriesRes.ok ? await categoriesRes.json() : { categories: [] }
        const offersPayload = offersRes.ok ? await offersRes.json() : { offers: [] }
        const dealsPayload = dealsRes.ok ? await dealsRes.json() : { deals: [] }
        const categories = Array.isArray(categoriesPayload.categories) ? categoriesPayload.categories : []
        const offers = Array.isArray(offersPayload.offers) ? offersPayload.offers : []
        const deals = Array.isArray(dealsPayload.deals) ? dealsPayload.deals : []

        setStats({
          revenue: orders.filter((order: { order_status: string }) => order.order_status !== 'CANCELLED').reduce((sum: number, order: { total: number }) => sum + Number(order.total || 0), 0),
          orders: orders.length,
          completed: orders.filter((order: { order_status: string }) => order.order_status === 'COMPLETED').length,
          pending: orders.filter((order: { order_status: string }) => ['PENDING_CONFIRMATION', 'PENDING'].includes(order.order_status)).length,
          totalProducts: products.length,
          totalCategories: categories.length,
          activeOffers: offers.filter((offer: { is_published: boolean }) => offer.is_published).length,
          activeDeals: deals.filter((deal: { is_active: boolean }) => deal.is_active).length,
          lowStock: products.filter((product: { stock_quantity: number; minimum_stock: number }) => Number(product.stock_quantity) <= Number(product.minimum_stock || 0)).length,
          outOfStock: products.filter((product: { stock_quantity: number }) => Number(product.stock_quantity) <= 0).length,
        })
      } catch {
        setStats({ revenue: 0, orders: 0, completed: 0, pending: 0, totalProducts: 0, totalCategories: 0, activeOffers: 0, activeDeals: 0, lowStock: 0, outOfStock: 0 })
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
      <div className="admin-card stat-card"><span>Total categories</span><strong>{stats.totalCategories}</strong></div>
      <div className="admin-card stat-card"><span>Active offers</span><strong>{stats.activeOffers}</strong></div>
      <div className="admin-card stat-card"><span>Active deals</span><strong>{stats.activeDeals}</strong></div>
      <div className="admin-card stat-card"><span>Low-stock products</span><strong>{stats.lowStock}</strong></div>
      <div className="admin-card stat-card"><span>Out-of-stock products</span><strong>{stats.outOfStock}</strong></div>
    </div>
  )
}

function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<HomepageCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Fish Butchery')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', description: '', specifications: '', category: 'Fish Butchery', selling_price: '', discount_price: '', unit: 'per kg', image_url: '', stock_quantity: '0', minimum_stock: '0', is_available: true, featured: false, status: 'Active', sku: '', serving_sizes: [] as string[], custom_category: '' })

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
    setForm({ name: '', description: '', specifications: '', category: categories[0]?.name || 'Fish Butchery', selling_price: '', discount_price: '', unit: 'per kg', image_url: '', stock_quantity: '0', minimum_stock: '0', is_available: true, featured: false, status: 'Active', sku: '', serving_sizes: [], custom_category: '' })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('pazuri-admin-token')
    let category = form.category
    if (category === 'Other') {
      category = form.custom_category.trim()
      if (!category) {
        window.alert('Enter a custom category name.')
        return
      }
      await fetch(apiUrl('admin/categories'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: category, is_active: true, show_on_homepage: true, display_order: categories.length }),
      })
    }
    const payload = {
      ...form,
      category,
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
    if (!window.confirm('Delete this product?')) return
    const token = localStorage.getItem('pazuri-admin-token')
    await fetch(apiUrl(`products/${productId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await load()
  }

  return (
    <div className="offers-admin-layout">
      <div className="admin-card wide admin-category-toolbar">
        <h3>Product categories</h3>
        <div className="shop-category-nav" aria-label="Product categories">
          {['Fish Butchery', 'Combos', 'Kitchen', 'Drinks', 'Others', ...categories.filter((category) => !['Fish Butchery', 'Combos', 'Kitchen', 'Drinks', 'Others', 'Other'].includes(category.name)).map((category) => category.name)].map((categoryName) => (
            <button key={categoryName} type="button" className={selectedCategory === categoryName ? 'active' : ''} onClick={() => setSelectedCategory(categoryName)}>{categoryName}</button>
          ))}
        </div>
        <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label>
      </div>
      <form className="offer-admin-form admin-card" onSubmit={submit}>
        <h3>{editing ? 'Edit product' : 'Add product'}</h3>
        <div className="offer-form-grid">
          <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
          {form.category === 'Other' ? (
            <label><span>Enter Custom Category Name</span><input value={form.custom_category} onChange={(event) => setForm({ ...form, custom_category: event.target.value })} required /></label>
          ) : null}
          <label className="wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label>
          <label className="wide"><span>Specifications</span><textarea rows={2} value={form.specifications} onChange={(event) => setForm({ ...form, specifications: event.target.value })} /></label>
          <label><span>SKU</span><input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
          <label><span>Price (KSh)</span><input type="number" min="0" value={form.selling_price} onChange={(event) => setForm({ ...form, selling_price: event.target.value })} required /></label>
          <label><span>Discount price (optional)</span><input type="number" min="0" value={form.discount_price} onChange={(event) => setForm({ ...form, discount_price: event.target.value })} /></label>
          <label><span>Unit</span><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} required /></label>
          <label className="wide"><span>Product Image</span>{form.image_url ? <img className="admin-image-preview" src={localImage(form.image_url)} alt="Product preview" /> : null}<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAdminImage(file).then((url) => setForm((current) => ({ ...current, image_url: url }))).catch((error) => window.alert(error instanceof Error ? error.message : 'Upload failed')) }} /></label>
          <label><span>Stock</span><input type="number" min="0" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })} /></label>
          <label><span>Minimum stock</span><input type="number" min="0" value={form.minimum_stock} onChange={(event) => setForm({ ...form, minimum_stock: event.target.value })} /></label>
          <label><span>Availability</span><select value={form.is_available ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, is_available: event.target.value === 'yes' })}><option value="yes">Available</option><option value="no">Unavailable</option></select></label>
          <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="Active">Active</option><option value="Draft">Draft</option><option value="Out of Stock">Out of Stock</option></select></label>
          <label><span>Featured product</span><select value={form.featured ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, featured: event.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></label>
          {form.category === 'Kitchen' ? (
            <fieldset className="wide serving-admin-fieldset">
              <legend>Serving sizes</legend>
              {['1 Person', '2–3 People', '4–5 People', '6–7 People'].map((size) => (
                <label key={size}>
                  <input
                    type="checkbox"
                    checked={form.serving_sizes.includes(size)}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      serving_sizes: event.target.checked
                        ? [...current.serving_sizes, size]
                        : current.serving_sizes.filter((item) => item !== size),
                    }))}
                  />
                  <span>{size}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
        <div className="offer-form-actions"><button type="submit" className="primary-button">{editing ? 'Save product' : 'Create product'}</button>{editing && <button type="button" onClick={reset}>Cancel</button>}</div>
      </form>
      <div className="admin-card offer-admin-list"><h3>{selectedCategory} products</h3>{products.filter((product) => {
        if (selectedCategory === 'Others') return !['Fish Butchery', 'Combos', 'Kitchen', 'Drinks'].includes(product.category)
        return product.category === selectedCategory
      }).filter((product) => `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase())).map((product) => (
        <article className="mini-offer admin-mini-offer" key={product.id}>
          <img src={localImage(product.image_url || product.image)} alt="" />
          <div><h4>{product.name}</h4><p>{product.category} · {formatKsh(Number(product.selling_price || product.price || 0))} · Stock {product.stock_quantity}</p></div>
          <div className="admin-mini-actions"><button type="button" onClick={() => { setEditing(product); setForm({ name: product.name, description: product.description, specifications: product.specifications || '', category: product.category, selling_price: String(product.selling_price || product.price || 0), discount_price: product.discount_price == null ? '' : String(product.discount_price), unit: product.unit, image_url: product.image_url || '', stock_quantity: String(product.stock_quantity || 0), minimum_stock: String(product.minimum_stock || 0), is_available: product.is_available !== false, featured: product.featured === true, status: product.status || 'Active', sku: product.sku || '', serving_sizes: product.serving_sizes || [], custom_category: '' }) }}>Edit</button><button type="button" onClick={() => void remove(product.id)}>Delete</button></div>
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
    if (!window.confirm('Delete this category?')) return
    const token = localStorage.getItem('pazuri-admin-token')
    let response = await fetch(apiUrl(`admin/categories/${categoryId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (response.status === 409) {
      const payload = await response.json().catch(() => ({}))
      const reassignment = window.prompt(`This category contains ${payload.product_count || 'some'} products. Enter a target category ID to reassign and delete:`)
      if (reassignment) {
        response = await fetch(apiUrl(`admin/categories/${categoryId}?reassign_to=${encodeURIComponent(reassignment)}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      }
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      window.alert(payload.error || 'Unable to delete category.')
    }
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

function DealsSection() {
  const [deals, setDeals] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({ title: '', description: '', image_url: '', deal_type: 'bundle', original_price: '', deal_price: '', discount_info: '', product_ids: [] as number[], start_date: '', end_date: '', is_active: true, is_featured: false, display_order: '0' })

  const load = async () => {
    const token = localStorage.getItem('pazuri-admin-token')
    const headers = { Authorization: `Bearer ${token}` }
    const [dealRes, productRes] = await Promise.all([fetch(apiUrl('admin/deals'), { headers }), fetch(apiUrl('admin/products'), { headers })])
    if (dealRes.ok) setDeals((await dealRes.json()).deals || [])
    if (productRes.ok) setProducts((await productRes.json()).products || [])
  }

  useEffect(() => { void load() }, [])

  const reset = () => setEditing(null)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('pazuri-admin-token')
    const payload = { ...form, original_price: Number(form.original_price || 0), deal_price: Number(form.deal_price || 0), display_order: Number(form.display_order || 0) }
    const response = await fetch(apiUrl(editing ? `admin/deals/${editing}` : 'admin/deals'), {
      method: editing ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.ok) {
      setEditing(null)
      setForm({ title: '', description: '', image_url: '', deal_type: 'bundle', original_price: '', deal_price: '', discount_info: '', product_ids: [], start_date: '', end_date: '', is_active: true, is_featured: false, display_order: '0' })
      await load()
    }
  }

  const remove = async (dealId: number) => {
    if (!window.confirm('Delete this deal?')) return
    const token = localStorage.getItem('pazuri-admin-token')
    await fetch(apiUrl(`admin/deals/${dealId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await load()
  }

  return (
    <div className="offers-admin-layout">
      <form className="offer-admin-form admin-card" onSubmit={submit}>
        <h3>{editing ? 'Edit deal' : 'Create deal'}</h3>
        <div className="offer-form-grid">
          <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <label><span>Deal type</span><select value={form.deal_type} onChange={(event) => setForm({ ...form, deal_type: event.target.value })}><option value="bundle">Bundle</option><option value="discount">Discount</option><option value="fixed-price">Fixed price</option></select></label>
          <label className="wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label><span>Original price</span><input type="number" min="0" value={form.original_price} onChange={(event) => setForm({ ...form, original_price: event.target.value })} /></label>
          <label><span>Deal price</span><input type="number" min="0" value={form.deal_price} onChange={(event) => setForm({ ...form, deal_price: event.target.value })} /></label>
          <label><span>Discount / label</span><input value={form.discount_info} onChange={(event) => setForm({ ...form, discount_info: event.target.value })} /></label>
          <label><span>Display order</span><input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} /></label>
          <label><span>Start date</span><input type="datetime-local" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></label>
          <label><span>End date</span><input type="datetime-local" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></label>
          <label><span>Image URL</span><input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} /></label>
          <label><span>Status</span><select value={form.is_active ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, is_active: event.target.value === 'active' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>
        <label className="wide"><span>Included products</span><select multiple value={form.product_ids.map(String)} onChange={(event) => setForm({ ...form, product_ids: Array.from(event.currentTarget.selectedOptions).map((option) => Number(option.value)) })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <div className="offer-form-actions"><button type="submit" className="primary-button">{editing ? 'Save deal' : 'Create deal'}</button>{editing ? <button type="button" onClick={() => { reset(); setForm({ title: '', description: '', image_url: '', deal_type: 'bundle', original_price: '', deal_price: '', discount_info: '', product_ids: [], start_date: '', end_date: '', is_active: true, is_featured: false, display_order: '0' }) }}>Cancel</button> : null}</div>
      </form>
      <div className="admin-card offer-admin-list"><h3>Deals</h3>{deals.length === 0 ? <p>No deals have been created.</p> : deals.map((deal) => (
        <article className="mini-offer admin-mini-offer" key={deal.id}>
          <div><h4>{deal.title}</h4><p>{deal.is_active ? 'Active' : 'Inactive'} · {formatKsh(Number(deal.deal_price || 0))}</p></div>
          <div className="admin-mini-actions"><button type="button" onClick={() => { setEditing(deal.id); setForm({ title: deal.title, description: deal.description || '', image_url: deal.image_url || '', deal_type: deal.deal_type || 'bundle', original_price: String(deal.original_price || ''), deal_price: String(deal.deal_price || ''), discount_info: deal.discount_info || '', product_ids: deal.product_ids || [], start_date: deal.start_date ? deal.start_date.slice(0, 16) : '', end_date: deal.end_date ? deal.end_date.slice(0, 16) : '', is_active: deal.is_active !== false, is_featured: deal.is_featured === true, display_order: String(deal.display_order || 0) }) }}>Edit</button><button type="button" onClick={() => void remove(deal.id)}>Delete</button></div>
        </article>
      ))}</div>
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
  const [authLoading, setAuthLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) {
      setAuthenticated(false)
      setAuthLoading(false)
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
      } finally {
        setAuthLoading(false)
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

  if (authLoading) return <div className="admin-auth-loading" role="status">Verifying administrator access…</div>
  if (!authenticated) return <Navigate to="/admin" replace />

  return (
    <div className="admin-shell-layout">
      <aside className={`admin-sidebar${drawerOpen ? ' drawer-open' : ''}`}>
        <div className="brand-block admin-brand-block"><PazuriBrand iconSize={52} /></div>
        <nav className="sidebar-nav" aria-label="Admin sections">
          {['Overview', 'Offers', 'Products', 'Deals', 'Orders', 'Settings', 'Logout'].map((item) => {
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
          {section === 'Inventory' && <ProductsSection />}
          {section === 'Orders' && <OrdersSection />}
          {section === 'Orders & Tracking' && <OrdersSection />}
          {section === 'POS' && <PosSection />}
          {section === 'Offers' && <OffersSection />}
          {section === 'Deals' && <DealsSection />}
          {section === 'Categories' && <CategoriesSection />}
          {section === 'WhatsApp' && <WhatsAppSection />}
          {section === 'Reports' && <ReportsSection />}
          {section === 'Settings' && <SettingsSection />}
          {section === 'Profile' && <AdminProfileSection />}
          {section === 'Hero Slides' && <HeroSlidesSection />}
        </div>
      </main>
    </div>
  )
}

function OrderTrackingPage() {
  const { trackingNumber: routeTrackingNumber } = useParams()
  const [trackingNumber, setTrackingNumber] = useState(routeTrackingNumber ? decodeURIComponent(routeTrackingNumber) : '')
  const [order, setOrder] = useState<any | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const trackOrder = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const normalized = trackingNumber.trim()
    if (!normalized) return
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const response = await fetch(apiUrl(`orders/tracking/${encodeURIComponent(normalized)}`))
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to find that tracking number.')
      setOrder(payload.order)
    } catch (trackingError) {
      setError(trackingError instanceof Error ? trackingError.message : 'Unable to track this order.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (routeTrackingNumber) void trackOrder()
  }, [routeTrackingNumber])

  const stages = [
    ['PENDING_CONFIRMATION', 'Order Received'],
    ['PROCESSING', 'Order Confirmed'],
    ['PREPARING', 'Preparing Your Order'],
    ['READY', 'Ready for Dispatch'],
    ['DISPATCHED', 'Out for Delivery'],
    ['COMPLETED', 'Delivered'],
  ]
  const activeIndex = order ? stages.findIndex(([status]) => status === order.status) : -1

  return (
    <main className="tracking-page">
      <header className="tracking-brand"><PazuriBrand iconSize={62} /></header>
      <section className="tracking-search-card">
        <p className="section-kicker">Pazuri Fish delivery</p>
        <h1>Track Your Order</h1>
        <p>Enter your order tracking number below to see the latest status of your delivery.</p>
        <form onSubmit={trackOrder}>
          <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="PAZ-2026-000123" aria-label="Tracking number" />
          <button type="submit" className="primary-button" disabled={loading || !trackingNumber.trim()}>{loading ? 'Tracking…' : 'Track Order'}</button>
        </form>
        {error ? <p className="checkout-error" role="alert">{error}</p> : null}
      </section>

      {order ? (
        <section className="tracking-result">
          <div className="tracking-summary">
            <div><span>Tracking number</span><strong>{order.tracking_number}</strong></div>
            <div><span>Order date</span><strong>{order.order_date ? new Date(order.order_date).toLocaleString() : 'Not available'}</strong></div>
            <div><span>Current status</span><strong>{stages[activeIndex]?.[1] || order.status}</strong></div>
            <div><span>Total</span><strong>{formatKsh(Number(order.total || 0))}</strong></div>
          </div>
          <ol className="tracking-timeline">
            {stages.map(([status, label], index) => {
              const statusUpdate = order.status_history?.find((item: any) => item.status === status)
              return (
                <li key={status} className={index < activeIndex ? 'complete' : index === activeIndex ? 'active' : ''}>
                  <span className="timeline-dot" />
                  <div><strong>{label}</strong><small>{statusUpdate?.created_at ? new Date(statusUpdate.created_at).toLocaleString() : index <= activeIndex ? 'Updated' : 'Pending'}</small></div>
                </li>
              )
            })}
          </ol>
          <div className="tracking-items">
            <h2>Products ordered</h2>
            {order.items.map((item: any) => (
              <div key={item.product_id || item.product_name}><span>{item.product_name} × {item.quantity}</span><strong>{formatKsh(Number(item.total_price || 0))}</strong></div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [detailQuantity, setDetailQuantity] = useState(1)

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
    setActionError('')
    if (product.is_available === false || Number(product.stock_quantity ?? 0) <= 0) {
      setActionError(`${product.name} is currently unavailable.`)
      return false
    }
    let cart: CartItem[]
    try {
      const savedCart: unknown = JSON.parse(localStorage.getItem('pazuri-cart-v1') || '[]')
      if (!Array.isArray(savedCart)) throw new Error('Saved basket is not a list.')
      cart = savedCart as CartItem[]
    } catch (loadError) {
      console.error('Unable to update the saved basket.', loadError)
      setActionError('Unable to update your basket. Please refresh and try again.')
      return false
    }
    const existing = cart.find((entry) => entry.id === product.id)
    if (existing) {
      const available = Number(product.stock_quantity ?? 0)
      if (available > 0 && existing.quantity + detailQuantity > available) {
        setActionError(`Only ${available} units of ${product.name} are available.`)
        return false
      }
      existing.quantity += detailQuantity
    } else {
      cart.push({ ...product, quantity: detailQuantity, price: Number(product.price ?? product.selling_price ?? 0), image: localImage(product.image_url || product.image) })
    }
    localStorage.setItem('pazuri-cart-v1', JSON.stringify(cart))
    return true
  }

  const buyProductNow = () => {
    if (addProductToBasket()) navigate('/#checkout')
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
          <div className="detail-quantity" aria-label="Product quantity">
            <button type="button" onClick={() => setDetailQuantity((quantity) => Math.max(1, quantity - 1))} aria-label="Decrease quantity">-</button>
            <span>{detailQuantity}</span>
            <button type="button" onClick={() => setDetailQuantity((quantity) => Math.min(Number(product.stock_quantity ?? 99), quantity + 1))} aria-label="Increase quantity">+</button>
          </div>
          <div className="detail-actions">
            <button type="button" className="primary-button" onClick={addProductToBasket} disabled={product.is_available === false || Number(product.stock_quantity ?? 0) <= 0}>Add to Cart</button>
            <button type="button" className="buy-now-button" onClick={buyProductNow} disabled={product.is_available === false || Number(product.stock_quantity ?? 0) <= 0}>Buy Now</button>
          </div>
          {actionError ? <p className="product-action-error" role="alert">{actionError}</p> : null}
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
        <Route path="/track" element={<OrderTrackingPage />} />
        <Route path="/track/:trackingNumber" element={<OrderTrackingPage />} />
        <Route path="/shop/:categorySlug" element={<Suspense fallback={<div className="empty-state" role="status"><p>Loading category…</p></div>}><LazyCategoryShopPage /></Suspense>} />
        <Route path="/shop/:categorySlug/:servingSlug" element={<Suspense fallback={<div className="empty-state" role="status"><p>Loading category…</p></div>}><LazyCategoryShopPage /></Suspense>} />
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
  const [business, setBusiness] = useState({ business_name: '', contact_phone: '', contact_email: '', business_location: '', delivery_information: '', opening_hours: '', website_announcement: '', currency: 'KES', delivery_fee: '0' })

  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    fetch(apiUrl('auth/me'), { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : { user: null })
      .then((payload) => setProfile(payload.user || { full_name: '', email: '', role: '' }))
    fetch(apiUrl('admin/settings'), { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : { settings: {} })
      .then((payload) => setBusiness((current) => ({ ...current, ...payload.settings })))
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
      <form className="offer-admin-form admin-card" onSubmit={async (event) => {
        event.preventDefault()
        const token = localStorage.getItem('pazuri-admin-token')
        const response = await fetch(apiUrl('admin/settings'), {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(business),
        })
        const payload = await response.json().catch(() => ({}))
        setMessage(response.ok ? 'Business settings saved.' : payload.error || 'Unable to save settings.')
      }}>
        <h3>Business settings</h3>
        <div className="offer-form-grid">
          {[
            ['business_name', 'Business name'],
            ['contact_phone', 'Contact phone'],
            ['contact_email', 'Contact email'],
            ['business_location', 'Business location'],
            ['opening_hours', 'Opening hours'],
            ['delivery_fee', 'Delivery fee'],
            ['currency', 'Currency'],
          ].map(([key, label]) => (
            <label key={key}><span>{label}</span><input value={String(business[key as keyof typeof business] || '')} onChange={(event) => setBusiness((current) => ({ ...current, [key]: event.target.value }))} /></label>
          ))}
          <label className="wide"><span>Delivery information</span><textarea rows={3} value={business.delivery_information} onChange={(event) => setBusiness({ ...business, delivery_information: event.target.value })} /></label>
          <label className="wide"><span>Website announcement</span><textarea rows={2} value={business.website_announcement} onChange={(event) => setBusiness({ ...business, website_announcement: event.target.value })} /></label>
        </div>
        <div className="offer-form-actions"><button type="submit" className="primary-button">Save business settings</button></div>
      </form>
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

function AdminProfileSection() {
  return <SettingsSection />
}
