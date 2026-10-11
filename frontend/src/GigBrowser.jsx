import { useEffect, useState } from 'react'

const categories = ['Design', 'Development', 'Writing', 'Marketing']
const emptyForm = {
  title: '',
  category: 'Design',
  description: '',
  price: '',
  deliveryDays: '3',
}

function getAuthHeaders(extraHeaders = {}) {
  const token = sessionStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
//(React,2026)
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: getAuthHeaders(options.headers || {}),
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : {}

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Request failed')
  }

  return data
}

export default function GigBrowser({ user, onLogout }) {
  const [view, setView] = useState('browse')
  const [search, setSearch] = useState('')
  const [gigs, setGigs] = useState([])
  const [myGigs, setMyGigs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [bookings, setBookings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [income, setIncome] = useState({
    currency: 'ZAR',
    totalIncome: 0,
    transactionCount: 0,
    monthly: [],
  })
  const [selectedGig, setSelectedGig] = useState(null)
  const [bookingDate, setBookingDate] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadGigs() {
    try {
      const data = await apiRequest('/api/gigs?limit=20')
      setGigs(data.gigs || [])
    } catch (error) {
      setGigs(sampleGigs)
      setSuccessMessage(error.message)
    }
  }

  async function loadMyGigs() {
    try {
      const data = await apiRequest('/api/gigs/mine')
      setMyGigs(data.gigs || [])
    } catch (error) {
      setMyGigs([])
      setSuccessMessage(error.message)
    }
  }

  async function loadBookings() {
    try {
      const data = await apiRequest('/api/bookings/mine')
      const nextBookings = data.bookings || []

      setBookings(
        nextBookings.map((booking) => ({
          id: booking.id,
          gigTitle: booking.gig?.title || 'Gig',
          seller: booking.freelancer?.fullName || 'Freelancer',
          price: booking.price,
          date: booking.createdAt ? new Date(booking.createdAt).toISOString().slice(0, 10) : '',
          details: booking.notes || '',
          status: booking.status || 'confirmed',
          confirmationReference: booking.confirmationReference,
        })),
      )
    } catch (error) {
      setBookings([])
      setSuccessMessage(error.message)
    }
  }

  async function loadTransactions() {
    try {
      const data = await apiRequest('/api/transactions/mine')
      setTransactions(data.transactions || [])
    } catch (error) {
      setTransactions([])
      setSuccessMessage(error.message)
    }
  }

  async function loadIncome() {
    try {
      const data = await apiRequest('/api/transactions/income')
      setIncome(data.income || {
        currency: 'ZAR',
        totalIncome: 0,
        transactionCount: 0,
        monthly: [],
      })
    } catch (error) {
      setIncome({
        currency: 'ZAR',
        totalIncome: 0,
        transactionCount: 0,
        monthly: [],
      })
      setSuccessMessage(error.message)
    }
  }

  useEffect(() => {
    loadGigs()

    if (user.role === 'freelancer') {
      loadMyGigs()
      loadIncome()
    }

    if (user.role === 'client' || user.role === 'freelancer') {
      loadBookings()
      loadTransactions()
    }
  }, [user.role])

  const allGigs = gigs
  const filteredGigs = allGigs.filter((gig) =>
    `${gig.title} ${gig.category} ${gig.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function saveGig(event) {
    event.preventDefault()

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price),
      deliveryDays: Number(form.deliveryDays || 3),
    }

    try {
      if (editingId) {
        const data = await apiRequest(`/api/gigs/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })

        setMyGigs((currentGigs) =>
          currentGigs.map((gig) => (gig.id === editingId ? data.gig : gig)),
        )
        setSuccessMessage('Gig updated successfully.')
      } else {
        const data = await apiRequest('/api/gigs', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        setMyGigs((currentGigs) => [data.gig, ...currentGigs])
        setSuccessMessage('Service created successfully.')
      }

      resetForm()
      await loadGigs()
    } catch (error) {
      setSuccessMessage(error.message)
    }
  }

  function editGig(gig) {
    setForm({
      title: gig.title,
      category: gig.category,
      description: gig.description,
      price: gig.price,
      deliveryDays: gig.deliveryDays || 3,
    })
    setEditingId(gig.id)
  }

  async function deleteGig(gigId) {
    try {
      await apiRequest(`/api/gigs/${gigId}`, { method: 'DELETE' })
      setMyGigs((currentGigs) => currentGigs.filter((gig) => gig.id !== gigId))
      setSuccessMessage('Gig deleted.')

      if (editingId === gigId) {
        resetForm()
      }

      await loadGigs()
    } catch (error) {
      setSuccessMessage(error.message)
    }
  }

  async function toggleGigStatus(gig) {
    try {
      const nextState = !gig.isActive
      const data = await apiRequest(`/api/gigs/${gig.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: nextState }),
      })

      setMyGigs((currentGigs) =>
        currentGigs.map((item) => (item.id === gig.id ? data.gig : item)),
      )
      setSuccessMessage(nextState ? 'Gig is now live in the marketplace.' : 'Gig is hidden from the marketplace.')
      await loadGigs()
    } catch (error) {
      setSuccessMessage(error.message)
    }
  }

  function startBooking(gig) {
    setSelectedGig(gig)
    setBookingDate('')
    setProjectDetails('')
    setSuccessMessage('')
    setView('booking')
  }

  async function submitBooking(event) {
    event.preventDefault()

    try {
      const data = await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          gigId: selectedGig.id,
          notes: projectDetails.trim(),
        }),
      })

      setBookings((currentBookings) => [
        {
          id: data.booking.id,
          gigTitle: data.booking.gig?.title || selectedGig.title,
          seller: data.booking.freelancer?.fullName || selectedGig.freelancer?.fullName || 'Freelancer',
          price: data.booking.price,
          date: data.booking.createdAt ? new Date(data.booking.createdAt).toISOString().slice(0, 10) : bookingDate,
          details: data.booking.notes || projectDetails,
          status: data.booking.status,
          confirmationReference: data.booking.confirmationReference,
        },
        ...currentBookings,
      ])

      setSelectedGig(null)
      setView('bookings')
      setSuccessMessage('Booking confirmed. Payment was simulated and a transaction was recorded.')
      await loadTransactions()
    } catch (error) {
      setSuccessMessage(error.message)
    }
  }

  return (
    <div className="market-shell">
      <header className="market-topbar">
        <strong className="market-brand">HustleHub</strong>

        <nav className="market-nav" aria-label="Main navigation">
          <button
            type="button"
            className={view === 'browse' ? 'nav-button active' : 'nav-button'}
            onClick={() => setView('browse')}
          >
            Browse gigs
          </button>

          {(user.role === 'client' || user.role === 'freelancer') && (
            <button
              type="button"
              className={view === 'bookings' ? 'nav-button active' : 'nav-button'}
              onClick={() => setView('bookings')}
            >
              My bookings
            </button>
          )}

          {user.role === 'freelancer' && (
            <button
              type="button"
              className={view === 'manage' ? 'nav-button active' : 'nav-button'}
              onClick={() => setView('manage')}
            >
              Manage gigs
            </button>
          )}
        </nav>

        <div className="market-account">
          <span>{user.fullName}</span>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </header>

      {view === 'booking' && user.role === 'client' && selectedGig ? (
        <main className="management-content">
          <p className="market-eyebrow">Booking request</p>
          <h1>Request a service</h1>

          <section className="booking-summary">
            <h2>{selectedGig.title}</h2>
            <p>Freelancer: {selectedGig.freelancer?.fullName || selectedGig.seller || 'Freelancer'}</p>
            <strong>Price: R{selectedGig.price}</strong>
          </section>

          <form className="gig-form booking-form" onSubmit={submitBooking}>
            <label>
              Requested date
              <input
                type="date"
                value={bookingDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setBookingDate(event.target.value)}
                required
              />
            </label>

            <label>
              What do you need done?
              <textarea
                value={projectDetails}
                onChange={(event) => setProjectDetails(event.target.value)}
                rows={5}
                maxLength={500}
                required
              />
            </label>

            <button className="auth-submit" type="submit">
              Send booking request
            </button>

            <button
              className="cancel-edit"
              type="button"
              onClick={() => setView('browse')}
            >
              Back to gigs
            </button>
          </form>
        </main>
      ) : view === 'bookings' && (user.role === 'client' || user.role === 'freelancer') ? (
        <main className="management-content">
          <p className="market-eyebrow">{user.role === 'client' ? 'Client workspace' : 'Freelancer workspace'}</p>
          <h1>{user.role === 'client' ? 'My bookings' : 'Bookings on your gigs'}</h1>

          {successMessage && (
            <p className="success-message" role="status">{successMessage}</p>
          )}

          {bookings.length === 0 ? (
            <p>
              {user.role === 'client'
                ? 'You haven’t requested any gigs yet. Browse gigs to get started.'
                : 'No bookings have been made on your gigs yet.'}
            </p>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => (
                <article className="manage-gig" key={booking.id}>
                  <div>
                    <p className="gig-category">{booking.status}</p>
                    <h3>{booking.gigTitle}</h3>
                    <p>
                      {user.role === 'client'
                        ? `Freelancer: ${booking.seller}`
                        : `Client: ${booking.seller}`}
                    </p>
                    {booking.confirmationReference && (
                      <p>Reference: {booking.confirmationReference}</p>
                    )}
                    <p>Requested date: {booking.date}</p>
                    <p>{booking.details}</p>
                    <strong>R{booking.price}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      ) : view === 'manage' && user.role === 'freelancer' ? (
        <main className="management-content">
          <p className="market-eyebrow">Freelancer workspace</p>
          <h1>Manage your gigs</h1>
          {successMessage && (
            <p className="success-message" role="status">{successMessage}</p>
          )}

          <div className="income-summary">
            <h2>Income summary</h2>
            <p>
              Total income: <strong>R{income.totalIncome}</strong>
            </p>
            <p>
              Transactions: <strong>{income.transactionCount}</strong>
            </p>
            {income.monthly.length > 0 && (
              <ul>
                {income.monthly.map((month) => (
                  <li key={month.month}>
                    {month.month}: R{month.income} ({month.transactionCount} bookings)
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="market-intro">
            Create a service listing or update the ones you have added.
          </p>

          <div className="management-layout">
            <form className="gig-form" onSubmit={saveGig}>
              <h2>{editingId ? 'Edit gig' : 'Create a gig'}</h2>

              <label>
                Gig title
                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  rows={4}
                  maxLength={300}
                  required
                />
              </label>

              <label>
                Price in rand (R)
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="1"
                  value={form.price}
                  onChange={updateForm}
                  required
                />
              </label>

              <label>
                Delivery days
                <input
                  name="deliveryDays"
                  type="number"
                  min="1"
                  max="365"
                  value={form.deliveryDays}
                  onChange={updateForm}
                  required
                />
              </label>

              <button className="auth-submit" type="submit">
                {editingId ? 'Save changes' : 'Add gig'}
              </button>

              {editingId && (
                <button
                  className="cancel-edit"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel editing
                </button>
              )}
            </form>

            <section className="my-gig-list">
              <h2>Your gigs</h2>

              {myGigs.length === 0 ? (
                <p>You haven’t added any gigs yet.</p>
              ) : (
                myGigs.map((gig) => (
                  <article className="manage-gig" key={gig.id}>
                    <div>
                      <p className="gig-category">{gig.isActive ? 'Live' : 'Hidden'}</p>
                      <h3>{gig.title}</h3>
                      <p>{gig.description}</p>
                      <strong>R{gig.price}</strong>
                    </div>

                    <div className="manage-actions">
                      <button type="button" onClick={() => editGig(gig)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => toggleGigStatus(gig)}>
                        {gig.isActive ? 'Hide' : 'Show'}
                      </button>
                      <button
                        className="delete-action"
                        type="button"
                        onClick={() => deleteGig(gig.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        </main>
      ) : (
        <main className="market-content">
          <p className="dashboard-greeting">Welcome, {user.fullName}!</p>

          <p className="market-eyebrow">Find independent talent</p>
          <h1>Browse freelance services</h1>

          <label className="search-label">
            Search gigs
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Try “website” or “design”"
            />
          </label>

          <div className="gig-results-heading">
            <h2>Available gigs</h2>
            <span>{filteredGigs.length} services</span>
          </div>

          {filteredGigs.length > 0 ? (
            <div className="gig-grid">
              {filteredGigs.map((gig) => (
                <article className="gig-card" key={gig.id}>
                  <p className="gig-category">{gig.category}</p>
                  <h3>{gig.title}</h3>
                  <p className="gig-description">{gig.description}</p>
                  <div className="gig-footer">
                    <span>{gig.freelancer?.fullName || gig.seller || 'Freelancer'}</span>
                    <strong>From R{gig.price}</strong>
                  </div>

                  {user.role === 'client' && (
                    <button
                      className="book-gig-button"
                      type="button"
                      onClick={() => startBooking(gig)}
                    >
                      Book this gig
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p>No gigs match your search.</p>
          )}
        </main>
      )}
    </div>
  )
}