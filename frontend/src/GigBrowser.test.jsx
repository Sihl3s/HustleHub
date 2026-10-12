import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import GigBrowser from './GigBrowser.jsx'
import { jsonResponse, mockApi, requestsTo } from './test/mockApi.js'

const client = { id: 'c1', fullName: 'Cara Client', role: 'client' }
const freelancer = { id: 'f1', fullName: 'Fiona Freelancer', role: 'freelancer' }

// Text arrives HTML-escaped from the API, exactly as the backend stores it.
const gig = {
  id: 'g1',
  title: 'Logo &amp; brand kit',
  description: 'I&#x27;ll design a logo &lt;b&gt;fast&lt;&#x2F;b&gt;.',
  category: 'Design',
  price: 250,
  deliveryDays: 3,
  isActive: true,
  freelancer: { id: 'f1', fullName: 'Fiona Freelancer' },
}

const booking = {
  id: 'b1',
  confirmationReference: 'HH-1234ABCD',
  gig: { id: 'g1', title: 'Logo &amp; brand kit' },
  client: { id: 'c1', fullName: 'Cara Client' },
  freelancer: { id: 'f1', fullName: 'Fiona Freelancer' },
  price: 250,
  notes: 'Blue tones please',
  requestedDate: '2099-01-15T00:00:00.000Z',
  status: 'confirmed',
  createdAt: '2026-10-12T09:00:00.000Z',
}

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

describe('GigBrowser role-based views', () => {
  test('a client can browse and book gigs but cannot manage gigs', async () => {
    mockApi({ 'GET /api/gigs': { gigs: [gig] } })
    render(<GigBrowser user={client} onLogout={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Book this gig' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'My bookings' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Manage gigs' })).not.toBeInTheDocument()
  })

  test('a freelancer can manage gigs but cannot book', async () => {
    const fetchMock = mockApi({ 'GET /api/gigs': { gigs: [gig] } })
    render(<GigBrowser user={freelancer} onLogout={vi.fn()} />)

    expect(await screen.findByText('Logo & brand kit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage gigs' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Book this gig' })).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET', '/api/transactions/income')).toHaveLength(1)
  })

  test('escaped text from the API is shown as plain text, never as HTML', async () => {
    mockApi({ 'GET /api/gigs': { gigs: [gig] } })
    const { container } = render(<GigBrowser user={client} onLogout={vi.fn()} />)

    expect(await screen.findByText('Logo & brand kit')).toBeInTheDocument()
    expect(screen.getByText('I\'ll design a logo <b>fast</b>.')).toBeInTheDocument()
    expect(container.querySelector('.gig-description b')).toBeNull()
  })

  test('search filters the gig list', async () => {
    const other = { ...gig, id: 'g2', title: 'Website build', description: 'A responsive site.', category: 'Development' }
    mockApi({ 'GET /api/gigs': { gigs: [gig, other] } })
    const user = userEvent.setup()
    render(<GigBrowser user={client} onLogout={vi.fn()} />)

    expect(await screen.findByText('2 services')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search gigs'), 'website')

    expect(screen.getByText('1 services')).toBeInTheDocument()
    expect(screen.queryByText('Logo & brand kit')).not.toBeInTheDocument()
  })
})

describe('GigBrowser booking flow', () => {
  test('a client books a gig and sees the confirmation and transaction', async () => {
    let booked = false
    const fetchMock = mockApi({
      'GET /api/gigs': { gigs: [gig] },
      'POST /api/bookings': () => {
        booked = true
        return jsonResponse(201, { booking })
      },
      'GET /api/bookings/mine': () => jsonResponse(200, { bookings: booked ? [booking] : [] }),
      'GET /api/transactions/mine': () => jsonResponse(200, {
        transactions: booked
          ? [{
              id: 't1',
              booking: 'b1',
              gig: { id: 'g1', title: 'Logo &amp; brand kit' },
              client: { id: 'c1', fullName: 'Cara Client' },
              freelancer: { id: 'f1', fullName: 'Fiona Freelancer' },
              amount: 250,
              status: 'completed',
              createdAt: '2026-10-12T09:00:00.000Z',
            }]
          : [],
      }),
    })
    const user = userEvent.setup()
    render(<GigBrowser user={client} onLogout={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Book this gig' }))
    expect(screen.getByRole('heading', { name: 'Request a service' })).toBeInTheDocument()

    const date = tomorrow()
    fireEvent.change(screen.getByLabelText('Requested date'), { target: { value: date } })
    await user.type(screen.getByLabelText('What do you need done?'), 'Blue tones please')
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }))

    expect(
      await screen.findByText(/Booking confirmed \(reference HH-1234ABCD\)/),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My bookings' })).toBeInTheDocument()
    expect(screen.getByText('Requested date: 2099-01-15')).toBeInTheDocument()

    const [, options] = requestsTo(fetchMock, 'POST', '/api/bookings')[0]
    expect(JSON.parse(options.body)).toEqual({ gigId: 'g1', notes: 'Blue tones please', requestedDate: date })

    const table = screen.getByRole('table')
    expect(within(table).getByText('R250')).toBeInTheDocument()
    expect(within(table).getByText('completed')).toBeInTheDocument()
  })

  test('booking errors such as rate limiting are shown to the client', async () => {
    mockApi({
      'GET /api/gigs': { gigs: [gig] },
      'POST /api/bookings': jsonResponse(429, {
        error: { message: 'Too many bookings in a short period. Please try again later.' },
      }),
    })
    const user = userEvent.setup()
    render(<GigBrowser user={client} onLogout={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Book this gig' }))
    fireEvent.change(screen.getByLabelText('Requested date'), { target: { value: tomorrow() } })
    await user.type(screen.getByLabelText('What do you need done?'), 'Logo please')
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many bookings in a short period')
    expect(screen.getByRole('heading', { name: 'Request a service' })).toBeInTheDocument()
  })

  test('a freelancer sees which client booked their gig', async () => {
    mockApi({ 'GET /api/bookings/mine': { bookings: [booking] } })
    const user = userEvent.setup()
    render(<GigBrowser user={freelancer} onLogout={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Bookings' }))

    expect(await screen.findByText('Client: Cara Client')).toBeInTheDocument()
    expect(screen.getByText('Reference: HH-1234ABCD')).toBeInTheDocument()
  })
})

describe('GigBrowser gig management', () => {
  test('a freelancer creates a gig with the form', async () => {
    const created = { ...gig, id: 'g9', title: 'Brand guide', description: 'A full brand guide.' }
    let saved = false
    const fetchMock = mockApi({
      'POST /api/gigs': () => {
        saved = true
        return jsonResponse(201, { gig: created })
      },
      'GET /api/gigs/mine': () => jsonResponse(200, { gigs: saved ? [created] : [] }),
    })
    const user = userEvent.setup()
    render(<GigBrowser user={freelancer} onLogout={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Manage gigs' }))
    await user.type(screen.getByLabelText('Gig title'), 'Brand guide')
    await user.type(screen.getByLabelText('Description'), 'A full brand guide.')
    await user.type(screen.getByLabelText('Price in rand (R)'), '500')
    await user.click(screen.getByRole('button', { name: 'Add gig' }))

    expect(await screen.findByText('Service created successfully.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Brand guide' })).toBeInTheDocument()

    const [, options] = requestsTo(fetchMock, 'POST', '/api/gigs')[0]
    expect(JSON.parse(options.body)).toEqual({
      title: 'Brand guide',
      description: 'A full brand guide.',
      category: 'Design',
      price: 500,
      deliveryDays: 3,
    })
  })

  test('editing a gig fills the form with readable text, not escaped entities', async () => {
    mockApi({ 'GET /api/gigs/mine': { gigs: [gig] } })
    const user = userEvent.setup()
    render(<GigBrowser user={freelancer} onLogout={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Manage gigs' }))
    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Gig title')).toHaveValue('Logo & brand kit')
    expect(screen.getByLabelText('Description')).toHaveValue('I\'ll design a logo <b>fast</b>.')
  })

  test('the freelancer income summary is displayed', async () => {
    mockApi({
      'GET /api/transactions/income': {
        income: {
          currency: 'ZAR',
          totalIncome: 750,
          transactionCount: 3,
          monthly: [{ month: '2026-10', income: 750, transactionCount: 3 }],
        },
      },
    })
    const user = userEvent.setup()
    render(<GigBrowser user={freelancer} onLogout={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Manage gigs' }))

    expect(await screen.findByText('R750')).toBeInTheDocument()
    expect(screen.getByText('2026-10: R750 (3 bookings)')).toBeInTheDocument()
  })
})
