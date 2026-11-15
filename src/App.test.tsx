import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('Pazuri Fish storefront', () => {
  it('renders the main homepage sections', () => {
    render(<App />)

    expect(screen.getByText('FRESH CATCH, DELIVERED EVERY DAY.')).toBeInTheDocument()
    expect(screen.getByText('Shop our fresh fish')).toBeInTheDocument()
    expect(screen.getByText('Fresh Delivery Everyday.')).toBeInTheDocument()
  })

  it('filters products by search input', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText('Search products')
    await user.type(searchInput, 'tilapia')

    expect(screen.getByText('Fresh Whole Tilapia')).toBeInTheDocument()
  })

  it('adds products to the basket and updates the total', async () => {
    const user = userEvent.setup()
    render(<App />)

    const addButtons = screen.getAllByRole('button', { name: 'Add to basket' })
    await user.click(addButtons[0])

    expect(screen.getByText('Your basket')).toBeInTheDocument()
    expect(screen.getAllByText('Fresh Whole Tilapia').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/KSh/i).length).toBeGreaterThan(0)
  })
})
