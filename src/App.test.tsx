import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import { clearApiCache } from './storefront/shared'

const addLiveTilapiaProductToBasket = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByText('Fresh Tilapia Special')
  const featuredSection = document.getElementById('shop')
  if (!featuredSection) throw new Error('Expected the featured products section.')
  const productCard = within(featuredSection).getByRole('heading', { name: 'Fresh Whole Tilapia' }).closest('article')
  if (!(productCard instanceof HTMLElement)) throw new Error('Expected the Fresh Whole Tilapia product card.')
  await user.click(within(productCard).getByRole('button', { name: /add to cart/i }))
}

describe('Pazuri Fish storefront', () => {
  beforeEach(() => {
    clearApiCache()
    window.history.pushState({}, '', '/')
    localStorage.clear()
    const products = [{ id: 1, name: 'Fresh Whole Tilapia', description: 'Fresh lake tilapia', category: 'Fish Butchery', price: 760, unit: 'per kg', stock_quantity: 20, image_url: '' }]
    const offers = [{ id: 1, product_id: 1, product_name: 'Fresh Whole Tilapia', title: 'Fresh Tilapia Special', description: 'Special prices on selected fresh tilapia.', image_url: '', promo_price: 760, original_price: 850, is_published: true }]
    const categories = [{ id: 1, name: 'Fish Butchery', image_url: '', display_order: 0, is_active: true, show_on_homepage: true }]
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/products/')) return { ok: true, json: async () => ({ product: products[0] }) } as Response
      if (url.includes('/products')) return { ok: true, json: async () => ({ products }) } as Response
      if (url.includes('/offers')) return { ok: true, json: async () => ({ offers }) } as Response
      if (url.includes('/content/hero')) return { ok: true, json: async () => ({ hero: null, slides: [] }) } as Response
      if (url.includes('/categories')) return { ok: true, json: async () => ({ categories }) } as Response
      if (url.includes('/orders')) return { ok: true, json: async () => ({ order: { order_number: 'PF-TEST-1' } }) } as Response
      return { ok: true, json: async () => ({}) } as Response
    }))
  })

  it('renders homepage sections in the requested order without testimonials', () => {
    render(<App />)

    expect(screen.getByText('Fresh Catch Delivered Every Day')).toBeInTheDocument()
    const heroImage = screen.getByAltText('Fresh seafood from Pazuri Fish')
    expect(heroImage).toHaveAttribute('src', '/images/hero-seafood-1000.webp')
    expect(heroImage).toHaveAttribute('srcset', '/images/hero-seafood-640.webp 640w, /images/hero-seafood-1000.webp 1000w')
    expect(heroImage).toHaveAttribute('width', '1000')
    expect(heroImage).toHaveAttribute('height', '667')
    for (const category of ['Fish Butchery', 'Combos', 'Kitchen', 'Drinks']) {
      expect(screen.getByRole('button', { name: category })).toBeInTheDocument()
    }
    expect(Array.from(document.querySelectorAll('.category-card span')).map((category) => category.textContent)).toEqual([
      'Fish Butchery',
      'Combos',
      'Kitchen',
      'Drinks',
    ])
    expect(screen.getAllByText('All Products').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://www.tiktok.com')
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com')
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com')
    expect(screen.getByText('FRESH DELIVERY EVERYDAY')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /customer testimonials/i })).not.toBeInTheDocument()
    const mainSections = Array.from(document.querySelectorAll('main > section'))
    expect(mainSections.map((section) => section.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Offers'),
      expect.stringContaining('Featured Products'),
      expect.stringContaining('Deals of the Week'),
      expect.stringContaining('FRESH DELIVERY EVERYDAY'),
    ]))
    expect(mainSections.map((section) => section.className)).toEqual([
      'hero-section freshco-hero',
      'category-section',
      'promotion-cards',
      'featured-section',
      'deals-section',
      'bottom-promo',
    ])
    expect(screen.getByRole('heading', { name: 'Offers' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.queryByText('Shop by Category')).not.toBeInTheDocument()
    expect(screen.queryByText('EXPLORE')).not.toBeInTheDocument()
    expect(screen.queryByText('GOOD CATCHES, GREAT VALUE')).not.toBeInTheDocument()
    expect(screen.queryByText('PICK YOUR FAVOURITES')).not.toBeInTheDocument()
    expect(screen.queryByText(/bulk orders|Bulk Orders/i)).not.toBeInTheDocument()
  })

  it('automatically rotates through six distinct hero images', async () => {
    const originalFetch = vi.mocked(fetch).getMockImplementation()
    const imagePaths = [
      '/images/hero-seafood.png',
      '/images/products/fresh-fish.jpg',
      '/images/products/nile-perch.jpg',
      '/images/products/fish-cuts.jpg',
      '/images/products/family-combo.jpg',
      '/images/products/fish-and-chips.jpg',
    ]
    vi.mocked(fetch).mockImplementation(async (input, ...init) => {
      if (String(input).includes('/content/hero')) {
        return {
          ok: true,
          json: async () => ({ slides: imagePaths.map((image_url, index) => ({ title: `Slide ${index + 1}`, subtitle: '', image_url })) }),
        } as Response
      }
      if (originalFetch) return originalFetch(input, ...init)
      return { ok: true, json: async () => ({}) } as Response
    })
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })

    const { unmount } = render(<App />)
    try {
      expect(await screen.findByRole('button', { name: 'Show slide 6' })).toBeInTheDocument()
      expect(document.querySelector('.freshco-hero-image img')).toHaveAttribute('src', '/images/hero-seafood-1000.webp')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500)
      })

      expect(document.querySelector('.hero-dot.active')).toHaveAttribute('aria-label', 'Show slide 2')
      expect(document.querySelector('.freshco-hero-image img')).toHaveAttribute('src', '/images/products/fresh-fish-1000.webp')
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it('shows four promotional offers and four featured products', async () => {
    render(<App />)

    expect(await screen.findAllByText('DEMO OFFER')).toHaveLength(3)
    await waitFor(() => {
      expect(document.querySelectorAll('.promotion-cards .promotion-card')).toHaveLength(4)
      expect(document.querySelectorAll('#shop .freshco-product-card')).toHaveLength(4)
    })
    expect(screen.getAllByText('Demonstration item · not in the live catalog')).toHaveLength(3)
  })

  it('filters products by search input', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText('Search products')
    await user.type(searchInput, 'tilapia')

    expect(screen.getAllByText('Fresh Whole Tilapia').length).toBeGreaterThan(0)
  })

  it('adds the linked promotional product to the basket', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText('Fresh Tilapia Special')
    const liveOffer = document.querySelector('.promotion-card')
    if (!(liveOffer instanceof HTMLElement)) throw new Error('Expected the live tilapia offer card.')
    await user.click(within(liveOffer).getByRole('button', { name: /add to cart/i }))

    expect(screen.getByText('Your basket')).toBeInTheDocument()
    expect(screen.getAllByText('Fresh Whole Tilapia').length).toBeGreaterThan(0)
  })

  it('adds products to the basket and updates the total', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addLiveTilapiaProductToBasket(user)

    expect(screen.getByText('Your basket')).toBeInTheDocument()
    expect(screen.getAllByText('Fresh Whole Tilapia').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/KSh/i).length).toBeGreaterThan(0)
  })

  it('opens category dashboards directly without unnecessary filters', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Kitchen' }))

    expect(await screen.findByRole('heading', { name: 'Kitchen' })).toBeInTheDocument()
    expect(await screen.findByText('No products are available in Kitchen right now.')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    for (const category of ['Fish Butchery', 'Combos', 'Kitchen', 'Drinks']) {
      expect(screen.getByRole('button', { name: category })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Pazuri Fish home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open shopping basket/i })).toBeInTheDocument()
    expect(screen.queryByText('Back to Store')).not.toBeInTheDocument()
  })

  it.each([
    ['fish-butchery', 'Fish Butchery'],
    ['combos', 'Combos'],
    ['kitchen', 'Kitchen'],
    ['drinks', 'Drinks'],
  ])('loads the %s category route', async (slug, name) => {
    window.history.pushState({}, '', `/shop/${slug}`)
    render(<App />)

    expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
  })

  it('opens the shared basket and checkout from a category dashboard', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/shop/fish-butchery')
    render(<App />)

    const addButton = await screen.findByRole('button', { name: /add to cart/i })
    await user.click(addButton)
    expect(screen.getByText('Your basket')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss basket overlay' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fresh Whole Tilapia', level: 4 })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Checkout' }))
    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument()
    expect(screen.getByText(/Fresh Whole Tilapia.*× 1/)).toBeInTheDocument()
    expect(screen.getByText('To be confirmed')).toBeInTheDocument()
  })

  it.each([
    ['Combos', 'combos'],
    ['Kitchen', 'kitchen'],
    ['Drinks', 'drinks'],
  ])('keeps items added from %s in the shared basket after returning home', async (category, slug) => {
    const originalFetch = vi.mocked(fetch).getMockImplementation()
    const categoryProduct = {
      id: 501,
      name: `${category} Demo Sample`,
      description: 'A sample category product',
      category,
      price: 600,
      unit: 'per serving',
      stock_quantity: 8,
      is_available: true,
      demo_only: true,
      image_url: '/images/products/fresh-fish.jpg',
    }
    vi.mocked(fetch).mockImplementation(async (input, ...init) => {
      if (String(input).endsWith('/products')) {
        return { ok: true, json: async () => ({ products: [categoryProduct] }) } as Response
      }
      if (originalFetch) return originalFetch(input, ...init)
      return { ok: true, json: async () => ({}) } as Response
    })
    window.history.pushState({}, '', `/shop/${slug}`)

    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /add to cart/i }))
    expect(screen.getByRole('heading', { name: `${category} Demo Sample`, level: 4 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close basket' }))
    await user.click(screen.getByRole('button', { name: 'Pazuri Fish home' }))

    const homeBasketButton = await screen.findByRole('button', { name: 'Open shopping basket' })
    expect(homeBasketButton).toHaveTextContent('1')
    await user.click(homeBasketButton)
    expect(screen.getByRole('heading', { name: `${category} Demo Sample`, level: 4 })).toBeInTheDocument()
  })

  it('updates cart quantities and submits an order through the API', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addLiveTilapiaProductToBasket(user)
    await user.click(screen.getByRole('button', { name: 'Increase quantity for Fresh Whole Tilapia' }))
    expect(screen.getByText('Ksh 1,520')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'CHECKOUT' }))
    await user.type(screen.getByLabelText('Full name'), 'Alex Customer')
    await user.type(screen.getByLabelText('Mobile phone number'), '+254700000000')
    await user.type(screen.getByLabelText('Delivery location'), 'Langata, Nairobi')
    await user.click(screen.getByRole('button', { name: 'Place Order' }))

    expect(await screen.findByText('PF-TEST-1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Order Successfully Placed!' })).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/orders'), expect.objectContaining({ method: 'POST' }))
  })

  it('prevents demo items from being submitted to the orders API', async () => {
    const user = userEvent.setup()
    render(<App />)

    const demoCard = screen.getByRole('heading', { name: 'Seafood Dinner' }).closest('article')
    if (!demoCard) throw new Error('Expected the Seafood Dinner demo card.')
    await user.click(within(demoCard).getByRole('button', { name: /add to cart/i }))
    await user.click(screen.getByRole('button', { name: 'CHECKOUT' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Demo items are for presentation only.')
    expect(screen.getByRole('button', { name: 'Place Order' })).toBeDisabled()
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/orders'), expect.anything())
  })

  it('keeps the basket and shows an error when the backend rejects an order', async () => {
    const mockedFetch = vi.mocked(fetch)
    const originalFetch = mockedFetch.getMockImplementation()
    mockedFetch.mockImplementation(async (input, ...init) => {
      if (String(input).includes('/orders')) {
        return { ok: false, json: async () => ({ error: 'Product is unavailable.' }) } as Response
      }
      if (originalFetch) return originalFetch(input, ...init)
      return { ok: true, json: async () => ({}) } as Response
    })

    const user = userEvent.setup()
    render(<App />)
    await addLiveTilapiaProductToBasket(user)
    await user.click(screen.getByRole('button', { name: 'CHECKOUT' }))
    await user.type(screen.getByLabelText('Full name'), 'Alex Customer')
    await user.type(screen.getByLabelText('Mobile phone number'), '+254700000000')
    await user.type(screen.getByLabelText('Delivery location'), 'Langata, Nairobi')
    await user.click(screen.getByRole('button', { name: 'Place Order' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Product is unavailable.')
    expect(screen.queryByRole('heading', { name: 'Order Successfully Placed!' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fresh Whole Tilapia', level: 4 })).toBeInTheDocument()
  })
})
