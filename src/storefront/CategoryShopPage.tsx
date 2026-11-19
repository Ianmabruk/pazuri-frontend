import { useEffect, useState } from 'react'
import { Home, Minus, Plus, ShoppingBasket, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DEFAULT_SHOP_CATEGORIES,
  FALLBACK_PRODUCT_IMAGE,
  formatKsh,
  getShopCategories,
  categorySlugFor,
  fetchApiJson,
  localImage,
  StorefrontImage,
  type CartItem,
  type HomepageCategory,
  type Product,
} from './shared'

export default function CategoryShopPage() {
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
    } catch (loadError) {
      console.error('Unable to read the saved basket.', loadError)
      return []
    }
  })
  const [basketOpen, setBasketOpen] = useState(false)
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [productPayload, categoryPayload] = await Promise.all([
          fetchApiJson<{ products?: Product[] }>('products'),
          fetchApiJson<{ categories?: HomepageCategory[] }>('categories'),
        ])
        if (!active) return

        const serverProducts = Array.isArray(productPayload.products) ? productPayload.products : []
        const categoryList = Array.isArray(categoryPayload.categories) ? categoryPayload.categories : []
        const shopCategories = getShopCategories(categoryList, true)
        const category = shopCategories.find((item) => categorySlugFor(item.name) === categorySlug)
        const resolvedName = category?.name || (categorySlug ? categorySlug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Shop')

        setCategoryName(resolvedName)
        setProducts(serverProducts)
        setCategories(shopCategories)
      } catch (loadError) {
        if (!active) return
        console.error('Unable to load category products.', loadError)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this category.')
        setProducts([])
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
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
        <button type="button" className="category-home-button" onClick={() => navigate('/')} aria-label="Pazuri Fish home">
          <Home size={21} aria-hidden="true" />
        </button>
        <button type="button" className="basket-button" aria-label={`Open shopping basket with ${cartItemCount} items`} onClick={() => setBasketOpen(true)}>
          <ShoppingBasket size={20} />
          {cartItemCount > 0 ? <span className="cart-count">{cartItemCount}</span> : null}
        </button>
      </header>

      <main className="category-shop-main">
        <div className="category-shop-heading"><h1>{categoryName}</h1></div>
        <nav className="shop-category-nav" aria-label="Product categories">
          {categories.map((category) => (
            <button key={category.name} type="button" className={category.name === categoryName ? 'active' : ''} onClick={() => navigate(`/shop/${categorySlugFor(category.name)}`)}>
              {category.name}
            </button>
          ))}
        </nav>

        {loading ? <div className="empty-state" role="status"><p>Loading products…</p></div> : error ? (
          <div className="empty-state" role="alert"><p>{error}</p></div>
        ) : categoryProducts.length === 0 ? (
          <div className="empty-state">
            <p>No products are available in {categoryName} right now.</p>
            <button type="button" className="brand-action-button" onClick={() => navigate('/')}>Browse All Products</button>
          </div>
        ) : (
          <div className="featured-grid category-product-grid">
            {categoryProducts.map((product) => (
              <article key={product.id} className="freshco-product-card">
                <div className="availability-row"><span>{Number(product.stock_quantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock'}</span></div>
                <button type="button" className="product-image-button" onClick={() => navigate(`/products/${product.id}`)}>
                  <StorefrontImage source={product.image_url || product.image} alt={product.name} fallback={FALLBACK_PRODUCT_IMAGE} sizes="(max-width: 760px) 84vw, (max-width: 980px) 45vw, 25vw" />
                </button>
                <div className="freshco-product-info">
                  <h3>{product.name}</h3>
                  <p>{product.unit}</p>
                  {product.demo_only ? <p className="demo-product-note">Demonstration sample</p> : null}
                  <p className="shop-product-description">{product.description}</p>
                  <div className="price-row"><strong>{formatKsh(Number(product.price ?? product.selling_price ?? 0))}</strong></div>
                  <button type="button" className="add-cart-button" onClick={() => addToCart(product)} disabled={product.is_available === false || Number(product.stock_quantity ?? 0) <= 0}>
                    {recentlyAddedId === product.id ? 'Added to Basket' : 'Add to Cart'} <ShoppingBasket size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {basketOpen ? <button type="button" className="basket-overlay" aria-label="Dismiss basket overlay" onClick={() => setBasketOpen(false)} /> : null}
      <aside className={basketOpen ? 'basket-drawer open' : 'basket-drawer'} aria-live="polite">
        <div className="basket-header">
          <h3>Your basket</h3>
          <button type="button" aria-label="Close basket" onClick={() => setBasketOpen(false)}><X size={18} /></button>
        </div>
        {cart.length === 0 ? <div className="basket-empty"><p>Your basket is empty.</p><button type="button" className="brand-action-button" onClick={() => setBasketOpen(false)}>Continue Shopping</button></div> : (
          <>
            <div className="basket-items">
              {cart.map((item) => (
                <div key={item.id} className="basket-item">
                  <StorefrontImage className="basket-item-image" source={item.image_url || item.image} alt="" sizes="58px" loading="eager" />
                  <div className="basket-item-copy">
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
            <div className="basket-summary"><div><span>Subtotal</span><strong>{formatKsh(cartTotal)}</strong></div></div>
            <button type="button" className="checkout-button" onClick={() => navigate('/#checkout')}>Checkout</button>
            <button type="button" className="continue-shopping" onClick={() => setBasketOpen(false)}>Continue Shopping</button>
          </>
        )}
      </aside>
    </div>
  )
}
