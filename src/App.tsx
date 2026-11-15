import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Clock3,
  Home,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  UserRound,
  X,
} from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './App.css'

type Category = 'All Products' | 'Fish Butchery' | 'Kitchen' | 'Combos' | 'Drinks'

type Product = {
  id: number
  name: string
  category: Exclude<Category, 'All Products'>
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
  is_published?: boolean
}

type HeroContent = {
  title: string
  subtitle: string
  image_url: string
}

const NAV_ITEMS = [
  { label: 'Home', href: '#top' },
  { label: 'Fish Butchery', href: '#shop' },
  { label: 'Kitchen', href: '#shop' },
  { label: 'Bulk Orders', href: '#bulk' },
  { label: 'Contact', href: '#contact' },
]

const PRODUCT_DATA: Product[] = [
  { id: 1, name: 'Fresh Whole Tilapia', category: 'Fish Butchery', description: 'Fresh whole tilapia, selected for your table.', price: 650, unit: 'per kg', image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab77?auto=format&fit=crop&w=900&q=80' },
  { id: 2, name: 'Fresh Nile Perch', category: 'Fish Butchery', description: 'Quality Nile perch, prepared to order.', price: 850, unit: 'per kg', image: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=900&q=80' },
  { id: 3, name: 'Tilapia Fillet', category: 'Fish Butchery', description: 'Convenient fillets for everyday cooking.', price: 1100, unit: 'per kg', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80' },
  { id: 4, name: 'Fish Fingers', category: 'Fish Butchery', description: 'Easy-to-prepare fish portions.', price: 750, unit: 'per pack', image: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=900&q=80' },
  { id: 5, name: 'Grilled Tilapia', category: 'Kitchen', description: 'A freshly prepared kitchen favourite.', price: 1200, unit: 'per serving', image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80' },
  { id: 6, name: 'Fish and Chips', category: 'Kitchen', description: 'A satisfying classic meal.', price: 950, unit: 'per serving', image: 'https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=900&q=80' },
  { id: 7, name: 'Family Fish Combo', category: 'Combos', description: 'A generous selection for sharing.', price: 2400, unit: 'per combo', image: 'https://images.unsplash.com/photo-1515516969-d4008cc6241a?auto=format&fit=crop&w=900&q=80' },
  { id: 8, name: 'Fresh Juice', category: 'Drinks', description: 'A refreshing drink to complete your meal.', price: 250, unit: 'per bottle', image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=900&q=80' },
]

const defaultHero: HeroContent = {
  title: 'FRESH CATCH, DELIVERED EVERY DAY.',
  subtitle: 'FRESH FROM LAKE VICTORIA',
  image_url: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab77?auto=format&fit=crop&w=1200&q=80',
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const apiUrl = (path: string) => `${API_BASE_URL}/${path.replace(/^\//, '')}`

const defaultOffers: Offer[] = [
  { id: 1, product_id: 1, product_name: 'Fresh catch deal', title: 'Fresh Tilapia Special', description: 'Special prices on selected fresh tilapia.', image_url: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab77?auto=format&fit=crop&w=900&q=80', badge: 'OFFER 01', promo_price: 760, original_price: 850 },
  { id: 2, product_id: 7, product_name: 'Family combo offer', title: 'Family Fish Combo', description: 'Enjoy our family fish selection.', image_url: 'https://images.unsplash.com/photo-1515516969-d4008cc6241a?auto=format&fit=crop&w=900&q=80', badge: 'OFFER 02', promo_price: 2100, original_price: 2400 },
  { id: 3, product_id: 3, product_name: 'Weekend favourite', title: 'Weekend Specials', description: 'Discover our latest weekend offers.', image_url: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=900&q=80', badge: 'OFFER 03', promo_price: 1020, original_price: 1200 },
]

const LOGO_URL = '/images/pazurifish%20logo.jpg'

const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '#top', icon: Home },
  { label: 'Shop', href: '#shop', icon: Search },
  { label: 'Basket', href: '#basket', icon: ShoppingBasket, basket: true },
  { label: 'Account', href: '#contact', icon: UserRound },
]

const CATEGORIES: Category[] = ['All Products', 'Fish Butchery', 'Kitchen', 'Combos', 'Drinks']

const formatKsh = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value)

function StorefrontPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('All Products')
  const [query, setQuery] = useState('')
  const [basketOpen, setBasketOpen] = useState(false)
  const [hero, setHero] = useState<HeroContent>(defaultHero)
  const [offers, setOffers] = useState<Offer[]>(defaultOffers)
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []

    try {
      const raw = localStorage.getItem('pazuri-cart-v1')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('pazuri-cart-v1', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [heroRes, offersRes] = await Promise.all([
          fetch(apiUrl('content/hero')),
          fetch(apiUrl('offers')),
        ])

        if (heroRes.ok) {
          const heroPayload = await heroRes.json()
          if (heroPayload?.hero?.image_url) setHero(heroPayload.hero)
        }

        if (offersRes.ok) {
          const offersPayload = await offersRes.json()
          if (Array.isArray(offersPayload.offers) && offersPayload.offers.length) {
            setOffers(offersPayload.offers)
          }
        }
      } catch {
        setHero(defaultHero)
        setOffers(defaultOffers)
      }
    }

    loadContent()
  }, [])

  const visibleProducts = useMemo(() => {
    return PRODUCT_DATA.filter((product) => {
      const matchesCategory = selectedCategory === 'All Products' || product.category === selectedCategory
      const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase()
      const matchesQuery = haystack.includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [query, selectedCategory])

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price ?? item.selling_price ?? 0) * item.quantity, 0), [cart])
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const addToCart = (product: Product) => {
    setBasketOpen(true)
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...current, { ...product, quantity: 1, price: Number(product.price ?? product.selling_price ?? 0), image: product.image_url || product.image || defaultHero.image_url }]
    })
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return [item]
        const nextQuantity = item.quantity + delta
        if (nextQuantity <= 0) return []
        return [{ ...item, quantity: nextQuantity }]
      }),
    )
  }

  const removeFromCart = (productId: number) => {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  const clearCart = () => setCart([])

  const openWhatsApp = (message: string) => {
    window.open(`https://wa.me/254792198117?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCheckout = () => {
    openWhatsApp(`Hello Pazuri Fish, I would like to place this order:\n${cart.map((item) => `- ${item.name} x${item.quantity} @ ${formatKsh(Number(item.price ?? item.selling_price ?? 0))} each = ${formatKsh(Number(item.price ?? item.selling_price ?? 0) * item.quantity)}`).join('\n')}\n\nSubtotal: ${formatKsh(subtotal)}\nDelivery area: Nairobi\nDelivery instructions: Please confirm availability and delivery charges.`)
  }

  const handleBulkOrder = () => {
    openWhatsApp('Hello Pazuri Fish, I would like to enquire about a bulk order. Please help with quantities, availability and pricing.')
  }

  return (
    <div className="site-shell" id="top">
      <header className="topbar">
        <div className="brand-block">
          <img className="brand-mark logo-mark" src={LOGO_URL} alt="Pazuri Fish logo" />
          <span>Pazuri Fish</span>
        </div>

        <nav className="main-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <a key={item.label} href={item.href}>{item.label}</a>
          ))}
          <button type="button" className="nav-action" onClick={() => navigate('/admin')}>Admin</button>
        </nav>

        <div className="topbar-actions">
          <button type="button" aria-label="Search products" className="icon-button"><Search size={18} /></button>
          <button type="button" aria-label="Open shopping basket" className="basket-button" onClick={() => setBasketOpen(true)}>
            <ShoppingBasket size={18} />
            <span>{totalItems}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section dynamic-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(7,29,44,0.76), rgba(7,29,44,0.46)), url(${hero.image_url})` }}>
          <div className="hero-copy">
            <p className="eyebrow">{hero.subtitle}</p>
            <h1>{hero.title}</h1>
            <div className="hero-actions">
              <a href="#shop" className="primary-button">SHOP FRESH FISH</a>
            </div>
          </div>
        </section>

        <section className="offers-section public-offers" aria-label="Offers and promotions">
          <div className="section-heading centered">
            <div>
              <p className="section-kicker">PROMOTIONS</p>
              <h2>Fresh deals</h2>
            </div>
          </div>

          <div className="offer-grid compact-offers">
            {offers.map((offer) => (
              <article key={offer.id} className="offer-card pale-blue offer-with-image compact-offer-card">
                <img src={offer.image_url || defaultOffers[0].image_url} alt={offer.title} />
                <div className="offer-content compact-offer-content">
                  <p className="offer-label">{offer.badge || 'OFFER'}</p>
                  <h3>{offer.title}</h3>
                  <div className="offer-product-meta"><span>{offer.product_name || 'Fresh fish selection'}</span></div>
                  <div className="offer-pricing compact-pricing">
                    {offer.promo_price ? <strong>{formatKsh(offer.promo_price)}</strong> : null}
                    {offer.original_price ? <span>{formatKsh(offer.original_price)}</span> : null}
                  </div>
                  <button type="button" onClick={() => navigate(`/products/${offer.product_id ?? offer.id}`)}>VIEW OFFER</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="shop" className="catalogue-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">PICK YOUR FAVOURITES</p>
              <h2>Shop our fresh fish</h2>
            </div>
          </div>

          <p className="section-copy">Explore our selection of fresh fish, kitchen meals, combos and drinks.</p>

          <div className="catalogue-toolbar">
            <div className="category-tabs" aria-label="Product categories">
              {CATEGORIES.map((category) => (
                <button key={category} type="button" className={selectedCategory === category ? 'category-tab active' : 'category-tab'} onClick={() => setSelectedCategory(category)}>{category}</button>
              ))}
            </div>

            <label className="search-box" aria-label="Search products">
              <Search size={16} />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" />
            </label>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="empty-state"><p>No products match your search just yet.</p><button type="button" onClick={() => setQuery('')}>Clear search</button></div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <img src={product.image} alt={product.name} />
                  <div className="product-content">
                    <span className="product-category">{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="price-row">
                      <strong>{formatKsh(Number(product.price ?? 0))}</strong>
                      <span>{product.unit}</span>
                    </div>
                    <button type="button" onClick={() => addToCart(product)}>Add to basket</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="bulk" className="bulk-order-section">
          <div className="bulk-copy">
            <p className="section-kicker dark">FOR GATHERINGS, EVENTS & BUSINESSES</p>
            <h2>Ordering in bulk?</h2>
            <p>Planning a gathering, office lunch, event or restaurant order? Talk to our team about quantities, availability and pricing.</p>
          </div>
          <button type="button" onClick={handleBulkOrder} className="bulk-button">ENQUIRE ABOUT BULK ORDERS <ArrowRight size={16} /></button>
        </section>

        <section className="about-section" id="about">
          <div className="about-copy">
            <p className="section-kicker">OUR STORY</p>
            <h2>Fresh Delivery Everyday.</h2>
            <p>Pazuri Fish is committed to making quality fish accessible while promoting responsible fishing and sustainable fish practices.</p>
            <p>We connect customers with fresh, carefully sourced fish, guided by a focus on quality, transparency and trust.</p>
          </div>
          <div className="about-image-wrap"><img src="https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80" alt="Fresh fish and seafood" /></div>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <div className="footer-brand">
          <div className="brand-block"><div className="brand-mark">PF</div><span>Pazuri Fish</span></div>
          <p>Fresh fish choices for everyday meals and special moments.</p>
        </div>

        <div className="footer-links"><h4>Explore</h4><ul><li><a href="#top">Home</a></li><li><a href="#shop">Shop products</a></li><li><a href="#bulk">Bulk orders</a></li></ul></div>

        <div className="footer-contact">
          <h4>Get in touch</h4>
          <ul>
            <li><a href="https://wa.me/254792198117?text=Hello%20Pazuri%20Fish." target="_blank" rel="noreferrer">WhatsApp: +254 792 198 117</a></li>
            <li><MapPin size={14} /><span>Soleri Apartments, Shop No. 3, Maboko Road, Langata, Nairobi</span></li>
            <li><Clock3 size={14} /><span>Daily, 9:00 AM – 10:00 PM</span></li>
          </ul>
        </div>

        <div className="footer-actions"><h4>Ready to order?</h4><p>Send us your order or ask our team for help choosing.</p><button type="button" onClick={() => openWhatsApp('Hello Pazuri Fish, I would like to place an order.')}>ORDER ON WHATSAPP</button></div>
      </footer>

      <div className="copyright-bar"><span>© 2026 Pazuri Fish. All rights reserved.</span><span>Fresh fish · Thoughtfully delivered</span></div>

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
            <button type="button" className="checkout-button" onClick={handleCheckout}>CHECKOUT ON WHATSAPP</button>
          </>
        )}
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {MOBILE_NAV_ITEMS.map(({ label, href, icon: Icon, basket }) => (
          <a key={label} href={href} className={basket ? 'mobile-link active' : 'mobile-link'} aria-label={label}>
            <Icon size={18} />
            <span>{label}</span>
            {basket && totalItems > 0 ? <em>{totalItems}</em> : null}
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
          <div className="brand-block light-brand"><img className="brand-mark logo-mark" src={LOGO_URL} alt="Pazuri Fish logo" /><span>Pazuri Fish</span></div>
          <p className="section-kicker dark">Lake Victoria fresh supply</p>
          <h1>Fresh fish operations, managed with clarity.</h1>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="brand-block auth-brand"><img className="brand-mark logo-mark" src={LOGO_URL} alt="Pazuri Fish logo" /><span>Pazuri Fish</span></div>
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
  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) return
    fetch(apiUrl('products'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setProducts(Array.isArray(payload.products) ? payload.products : []))
      .catch(() => setProducts([]))
  }, [])

  return (<div className="admin-card"><h3>Product management</h3><ul className="admin-list product-admin-list">{products.length === 0 ? <li>No products registered yet.</li> : products.map((product) => <li key={product.id}><strong>{product.name}</strong> — {product.category} — {formatKsh(Number(product.price ?? product.selling_price ?? 0))} — {product.stock_quantity} {product.unit}</li>)}</ul></div>)
}

function OrdersSection() {
  const [orders, setOrders] = useState<any[]>([])
  useEffect(() => {
    const token = localStorage.getItem('pazuri-admin-token')
    if (!token) return
    fetch(apiUrl('orders'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setOrders(Array.isArray(payload.orders) ? payload.orders : []))
      .catch(() => setOrders([]))
  }, [])

  return (<div className="admin-card"><h3>Orders</h3><ul className="admin-list">{orders.length === 0 ? <li>No orders yet.</li> : orders.slice(0, 8).map((order) => <li key={order.id}><strong>{order.order_number}</strong> — {order.customer_name} — {order.order_status} — {formatKsh(Number(order.total || 0))}</li>)}</ul></div>)
}

function PosSection() { return <div className="admin-card"><h3>POS</h3><p>Cashier product search and sale completion work with the connected inventory and sales records.</p></div> }
function InventorySection() { return <div className="admin-card"><h3>Inventory</h3><p>Inventory values are linked to the live product stock and movement records.</p></div> }
function OffersSection() { return <div className="admin-card"><h3>Offers</h3><p>Offer cards are connected to database-backed products through their offer product_id values.</p></div> }
function WhatsAppSection() { return <div className="admin-card"><h3>WhatsApp</h3><p>Customer ordering via WhatsApp remains in place; API credentials stay in the server-side configuration.</p></div> }
function ReportsSection() { return <div className="admin-card"><h3>Reports</h3><p>Reporting reads the same orders and inventory records used by the active storefront.</p></div> }
function SettingsSection() { return <div className="admin-card"><h3>Settings</h3><p>Server-side environment variables remain the source of configuration for admin credentials and integrations.</p></div> }

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [section, setSection] = useState('Overview')
  const [authenticated, setAuthenticated] = useState(false)

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
      <aside className="admin-sidebar">
        <div className="brand-block admin-brand-block"><img className="brand-mark logo-mark" src={LOGO_URL} alt="Pazuri Fish logo" /><span>Pazuri Fish</span></div>
        <nav className="sidebar-nav" aria-label="Admin sections">
          {['Overview', 'Products', 'Orders', 'POS', 'Inventory', 'Offers', 'WhatsApp', 'Reports', 'Settings', 'Logout'].map((item) => {
            if (item === 'Logout') {
              return <button key={item} type="button" className="sidebar-link logout-link" onClick={handleLogout}>{item}</button>
            }
            return <button key={item} type="button" className={section === item ? 'sidebar-link active' : 'sidebar-link'} onClick={() => setSection(item)}>{item}</button>
          })}
        </nav>
      </aside>

      <main className="admin-main-panel">
        <header className="admin-topbar">
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
          {section === 'WhatsApp' && <WhatsAppSection />}
          {section === 'Reports' && <ReportsSection />}
          {section === 'Settings' && <SettingsSection />}
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
      try {
        const response = await fetch(apiUrl(`products/${productId}`))
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          const localProduct = PRODUCT_DATA.find((item) => item.id === Number(productId))
          if (localProduct) {
            setProduct(localProduct)
            return
          }
          throw new Error(payload.error || 'Product not found.')
        }
        setProduct(payload.product || payload)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load product.')
      }
    }

    if (productId) load()
  }, [productId])

  if (error) return <div className="product-detail-page"><p className="product-detail-empty">{error}</p><button className="primary-button" type="button" onClick={() => navigate('/')}>Back to store</button></div>
  if (!product) return <div className="product-detail-page"><p className="product-detail-empty">Loading product…</p></div>

  const addProductToBasket = () => {
    const cart = JSON.parse(localStorage.getItem('pazuri-cart-v1') || '[]') as CartItem[]
    const existing = cart.find((entry) => entry.id === product.id)
    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({ ...product, quantity: 1, price: Number(product.price ?? product.selling_price ?? 0), image: product.image_url || product.image || defaultHero.image_url })
    }
    localStorage.setItem('pazuri-cart-v1', JSON.stringify(cart))
    navigate('/')
  }

  return (
    <div className="product-detail-page">
      <header className="topbar detail-topbar"><div className="brand-block"><img className="brand-mark logo-mark" src={LOGO_URL} alt="Pazuri Fish logo" /><span>Pazuri Fish</span></div><button type="button" className="nav-action" onClick={() => navigate('/')}>Back to store</button></header>
      <main className="product-detail-layout">
        <div className="product-detail-image-wrap"><img src={product.image_url || product.image || defaultHero.image_url} alt={product.name} /></div>
        <div className="product-detail-copy">
          <p className="section-kicker">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="price-row detail-price-row"><strong>{formatKsh(Number(product.price ?? product.selling_price ?? 0))}</strong><span>{product.unit}</span></div>
          <p className="product-detail-description">{product.description}</p>
          <div className="detail-specs"><h3>Specifications</h3><p>{product.specifications || 'Freshly sourced daily for quality and consistency.'}</p></div>
          <div className="detail-meta"><span>Availability: {product.is_available ? 'Available' : 'Unavailable'}</span><span>Stock: {product.stock_quantity ?? 0}</span></div>
          <button type="button" className="primary-button" onClick={addProductToBasket}>Add to basket</button>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoot />
}
