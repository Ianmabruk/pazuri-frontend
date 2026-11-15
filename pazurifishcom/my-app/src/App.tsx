import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Clock3,
  Home,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import './App.css'

type Category = 'All Products' | 'Fish Butchery' | 'Kitchen' | 'Combos' | 'Drinks'

type Product = {
  id: number
  name: string
  category: Exclude<Category, 'All Products'>
  description: string
  price: number
  unit: string
  image: string
}

type CartItem = Product & {
  quantity: number
}

const NAV_ITEMS = [
  { label: 'Home', href: '#top' },
  { label: 'Fish Butchery', href: '#shop' },
  { label: 'Kitchen', href: '#shop' },
  { label: 'Bulk Orders', href: '#bulk' },
  { label: 'Contact', href: '#contact' },
]

const PRODUCT_DATA: Product[] = [
  {
    id: 1,
    name: 'Fresh Whole Tilapia',
    category: 'Fish Butchery',
    description: 'Fresh whole tilapia, selected for your table.',
    price: 650,
    unit: 'per kg',
    image:
      'https://images.unsplash.com/photo-1544943910-4c1dc44aab77?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Fresh Nile Perch',
    category: 'Fish Butchery',
    description: 'Quality Nile perch, prepared to order.',
    price: 850,
    unit: 'per kg',
    image:
      'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Tilapia Fillet',
    category: 'Fish Butchery',
    description: 'Convenient fillets for everyday cooking.',
    price: 1100,
    unit: 'per kg',
    image:
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'Fish Fingers',
    category: 'Fish Butchery',
    description: 'Easy-to-prepare fish portions.',
    price: 750,
    unit: 'per pack',
    image:
      'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    name: 'Grilled Tilapia',
    category: 'Kitchen',
    description: 'A freshly prepared kitchen favourite.',
    price: 1200,
    unit: 'per serving',
    image:
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 6,
    name: 'Fish and Chips',
    category: 'Kitchen',
    description: 'A satisfying classic meal.',
    price: 950,
    unit: 'per serving',
    image:
      'https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 7,
    name: 'Family Fish Combo',
    category: 'Combos',
    description: 'A generous selection for sharing.',
    price: 2400,
    unit: 'per combo',
    image:
      'https://images.unsplash.com/photo-1515516969-d4008cc6241a?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 8,
    name: 'Fresh Juice',
    category: 'Drinks',
    description: 'A refreshing drink to complete your meal.',
    price: 250,
    unit: 'per bottle',
    image:
      'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=900&q=80',
  },
]

const BENEFITS = [
  {
    icon: Sparkles,
    title: 'Fresh fish',
    text: 'Quality you can trust.',
  },
  {
    icon: MessageCircle,
    title: 'Easy ordering',
    text: 'Order directly on WhatsApp.',
  },
  {
    icon: Truck,
    title: 'Convenient delivery',
    text: 'Ask about your location.',
  },
]

const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '#top', icon: Home },
  { label: 'Shop', href: '#shop', icon: Search },
  { label: 'Search', href: '#shop', icon: Search },
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

function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All Products')
  const [query, setQuery] = useState('')
  const [basketOpen, setBasketOpen] = useState(false)
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

  const visibleProducts = useMemo(() => {
    return PRODUCT_DATA.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All Products' || product.category === selectedCategory
      const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase()
      const matchesQuery = haystack.includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [query, selectedCategory])

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const addToCart = (product: Product) => {
    setBasketOpen(true)
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...current, { ...product, quantity: 1 }]
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

  const checkoutMessage = `Hello Pazuri Fish, I would like to place this order:\n${cart
    .map(
      (item) =>
        `- ${item.name} x${item.quantity} @ ${formatKsh(item.price)} each = ${formatKsh(
          item.price * item.quantity,
        )}`,
    )
    .join('\n')}\n\nSubtotal: ${formatKsh(subtotal)}\nDelivery area: Nairobi\nDelivery instructions: Please confirm availability and delivery charges.`

  const openWhatsApp = (message: string) => {
    window.open(`https://wa.me/254792198117?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCheckout = () => {
    openWhatsApp(checkoutMessage)
  }

  const handleBulkOrder = () => {
    openWhatsApp(
      'Hello Pazuri Fish, I would like to enquire about a bulk order. Please help with quantities, availability and pricing.',
    )
  }

  return (
    <div className="site-shell" id="top">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">PF</div>
          <span>Pazuri Fish</span>
        </div>

        <nav className="main-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="topbar-actions">
          <button type="button" aria-label="Search products" className="icon-button">
            <Search size={18} />
          </button>
          <button
            type="button"
            aria-label="Open shopping basket"
            className="basket-button"
            onClick={() => setBasketOpen(true)}
          >
            <ShoppingBasket size={18} />
            <span>{totalItems}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">FRESH FROM LAKE VICTORIA</p>
            <h1>Fresh Catch, Delivered Everyday.</h1>
            <p className="hero-subtitle">
              Fresh fish for your everyday meals. Shop our fish butchery, explore the kitchen
              menu and order with ease.
            </p>
            <div className="hero-actions">
              <a href="#shop" className="primary-button">
                SHOP FRESH FISH
              </a>
            </div>
            <p className="hero-note">Fresh choices. Easy ordering. Everyday.</p>
          </div>

          <div className="hero-visual" aria-label="Fresh fish display">
            <div className="hero-image-card">
              <img
                src="https://images.unsplash.com/photo-1544943910-4c1dc44aab77?auto=format&fit=crop&w=1200&q=80"
                alt="Fresh fish selection"
              />
            </div>
          </div>
        </section>

        <section className="benefits-section" aria-label="Benefits">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="benefit-item">
              <div className="benefit-icon">
                <Icon size={18} />
              </div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </section>

        <section id="shop" className="catalogue-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">PICK YOUR FAVOURITES</p>
              <h2>Shop our fresh fish</h2>
            </div>
            <button
              type="button"
              className="catalogue-link"
              onClick={() => openWhatsApp('Hello Pazuri Fish, please share your latest product catalogue.')}
            >
              View WhatsApp catalogue
            </button>
          </div>

          <p className="section-copy">
            Explore our selection of fresh fish, kitchen meals, combos and drinks.
          </p>

          <div className="catalogue-toolbar">
            <div className="category-tabs" aria-label="Product categories">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={selectedCategory === category ? 'category-tab active' : 'category-tab'}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <label className="search-box" aria-label="Search products">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
              />
            </label>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="empty-state">
              <p>No products match your search just yet.</p>
              <button type="button" onClick={() => setQuery('')}>
                Clear search
              </button>
            </div>
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
                      <strong>{formatKsh(product.price)}</strong>
                      <span>{product.unit}</span>
                    </div>
                    <button type="button" onClick={() => addToCart(product)}>
                      Add to basket
                    </button>
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
            <p>
              Planning a gathering, office lunch, event or restaurant order? Talk to our team
              about quantities, availability and pricing.
            </p>
          </div>
          <button type="button" onClick={handleBulkOrder} className="bulk-button">
            ENQUIRE ABOUT BULK ORDERS <ArrowRight size={16} />
          </button>
        </section>

        <section className="promo-hero-section">
          <div className="promo-overlay" />
          <div className="promo-copy">
            <p className="section-kicker accent">FRESH · QUALITY · LOCAL</p>
            <h2>Make fish the best part.</h2>
            <p>
              Make every meal memorable with fresh fish choices for your table. Find your
              favourite and let us help with the rest.
            </p>
            <button type="button" onClick={() => openWhatsApp('Hello Pazuri Fish, help me choose fish for my table.')}>
              CHAT WITH US
            </button>
          </div>
        </section>

        <section className="offers-section">
          <div className="section-heading centered">
            <div>
              <p className="section-kicker">A LITTLE SOMETHING EXTRA</p>
              <h2>Offers & highlights</h2>
            </div>
          </div>

          <div className="offer-grid">
            <article className="offer-card pale-blue">
              <p className="offer-label">FRESH PICKS</p>
              <h3>Make a fresh choice.</h3>
              <p>Explore our selection and find something for your next meal.</p>
              <button type="button" onClick={() => openWhatsApp('Hello Pazuri Fish, I would like to explore your fresh picks.')}>
                SHOP PRODUCTS
              </button>
            </article>

            <article className="offer-card cream">
              <p className="offer-label">FOR YOUR TABLE</p>
              <h3>Good food brings us together.</h3>
              <p>Planning for family or friends? Ask us about portions and combos.</p>
              <button type="button" onClick={() => openWhatsApp('Hello Pazuri Fish, please advise on a family meal order.')}>
                ASK OUR TEAM
              </button>
            </article>

            <article className="offer-card dark">
              <p className="offer-label">QUICK & SIMPLE</p>
              <h3>Your order, one message away.</h3>
              <p>Build your basket and send your order through WhatsApp.</p>
              <button type="button" onClick={() => handleCheckout()}>
                OPEN YOUR BASKET
              </button>
            </article>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-copy">
            <p className="section-kicker">OUR STORY</p>
            <h2>Fresh Delivery Everyday.</h2>
            <p>
              Pazuri Fish is committed to making quality fish accessible while promoting
              responsible fishing and sustainable fish practices. We connect customers with fresh,
              carefully sourced fish, guided by a focus on quality, transparency and trust.
            </p>
            <p>
              Through traceability, we aim to give customers greater confidence in where their fish
              comes from and how it reaches their plate. We recognize the importance of protecting
              aquatic ecosystems, supporting responsible fishing practices and preserving fish
              resources for future generations.
            </p>
            <p>
              Our impact goes beyond providing great fish. We strive to build a more transparent and
              sustainable fish supply chain and contribute to a future where communities and
              aquatic environments can thrive together.
            </p>
          </div>
          <div className="about-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80"
              alt="Fresh fish and seafood"
            />
          </div>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <div className="footer-brand">
          <div className="brand-block">
            <div className="brand-mark">PF</div>
            <span>Pazuri Fish</span>
          </div>
          <p>Fresh fish choices for everyday meals and special moments.</p>
        </div>

        <div className="footer-links">
          <h4>Explore</h4>
          <ul>
            <li><a href="#top">Home</a></li>
            <li><a href="#shop">Shop products</a></li>
            <li><a href="#bulk">Bulk orders</a></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4>Get in touch</h4>
          <ul>
            <li>
              <a href="https://wa.me/254792198117?text=Hello%20Pazuri%20Fish." target="_blank" rel="noreferrer">
                WhatsApp: +254 792 198 117
              </a>
            </li>
            <li>
              <a href="https://wa.me/254792198117?text=Hello%20Pazuri%20Fish%2C%20I%20have%20a%20question%20about%20delivery." target="_blank" rel="noreferrer">
                Ask about delivery
              </a>
            </li>
            <li className="with-icon">
              <MapPin size={14} />
              <span>Soleri Apartments, Shop No. 3, Maboko Road, Langata, Nairobi</span>
            </li>
            <li className="with-icon">
              <Clock3 size={14} />
              <span>Daily, 9:00 AM – 10:00 PM</span>
            </li>
          </ul>
        </div>

        <div className="footer-actions">
          <h4>Ready to order?</h4>
          <p>Send us your order or ask our team for help choosing.</p>
          <button type="button" onClick={() => openWhatsApp('Hello Pazuri Fish, I would like to place an order.')}>
            ORDER ON WHATSAPP
          </button>
        </div>
      </footer>

      <div className="copyright-bar">
        <span>© 2026 Pazuri Fish. All rights reserved.</span>
        <span>Fresh fish · Thoughtfully delivered</span>
      </div>

      <aside className={basketOpen ? 'basket-drawer open' : 'basket-drawer'} id="basket" aria-live="polite">
        <div className="basket-header">
          <h3>Your basket</h3>
          <button type="button" aria-label="Close basket" onClick={() => setBasketOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="basket-empty">
            <p>Your basket is empty.</p>
            <button type="button" onClick={() => setBasketOpen(false)}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="basket-items">
              {cart.map((item) => (
                <div key={item.id} className="basket-item">
                  <div>
                    <h4>{item.name}</h4>
                    <p>{formatKsh(item.price)} each</p>
                  </div>

                  <div className="basket-controls">
                    <div className="quantity-box">
                      <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Decrease quantity for ${item.name}`}>
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Increase quantity for ${item.name}`}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <button type="button" className="inline-remove" onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="basket-summary">
              <div>
                <span>Subtotal</span>
                <strong>{formatKsh(subtotal)}</strong>
              </div>
              <button type="button" className="clear-button" onClick={clearCart}>
                Remove all
              </button>
            </div>

            <button type="button" className="checkout-button" onClick={handleCheckout}>
              CHECKOUT ON WHATSAPP
            </button>
          </>
        )}
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {MOBILE_NAV_ITEMS.map(({ label, href, icon: Icon, basket }) => (
          <a
            key={label}
            href={href}
            className={basket ? 'mobile-link active' : 'mobile-link'}
            aria-label={label}
          >
            <Icon size={18} />
            <span>{label}</span>
            {basket && totalItems > 0 ? <em>{totalItems}</em> : null}
          </a>
        ))}
      </nav>
    </div>
  )
}

export default App
