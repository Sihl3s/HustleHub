import { useEffect, useState } from 'react'
import { apiRequest, decodeHtml } from './api.js'

const categories = ['Design', 'Development', 'Writing', 'Marketing']
const emptyForm = {
  title: '',
  category: 'Design',
  description: '',
  price: '',
  deliveryDays: '3',
}
const emptyIncome = {
  currency: 'ZAR',
  totalIncome: 0,
  transactionCount: 0,
  monthly: [],
}

function normalizeGig(gig) {
  return {
    ...gig,
    title: decodeHtml(gig.title),
    description: decodeHtml(gig.description),
    category: decodeHtml(gig.category),
    freelancer: gig.freelancer
      ? { ...gig.freelancer, fullName: decodeHtml(gig.freelancer.fullName) }
      : gig.freelancer,
  }
}

function toDateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

// Clients see who they booked; freelancers see which client booked them.
function normalizeBooking(booking, role) {
  const otherParty = role === 'freelancer' ? booking.client : booking.freelancer

  return {
    id: booking.id,
    gigTitle: decodeHtml(booking.gig?.title) || 'Gig',
    otherParty: decodeHtml(otherParty?.fullName) || (role === 'freelancer' ? 'Client' : 'Freelancer'),
    price: booking.price,
    requestedDate: toDateOnly(booking.requestedDate),
    bookedOn: toDateOnly(booking.createdAt),
    details: decodeHtml(booking.notes) || '',
    status: booking.status || 'confirmed',
    confirmationReference: booking.confirmationReference,
  }
}

function normalizeTransaction(transaction) {
  return {
    id: transaction.id,
    gigTitle: decodeHtml(transaction.gig?.title) || 'Gig',
    client: decodeHtml(transaction.client?.fullName) || 'Client',
    freelancer: decodeHtml(transaction.freelancer?.fullName) || 'Freelancer',
    amount: transaction.amount,
    status: transaction.status,
    date: toDateOnly(transaction.createdAt),
  }
}

// Fetches everything the current role can see. Each request is independent,
// so one failure (for example a rate limit) does not blank the whole page.
async function loadDashboard(role) {
  const isParty = role === 'client' || role === 'freelancer'
  const requests = {
    gigs: apiRequest('/api/gigs?limit=50').then((data) => (data.gigs || []).map(normalizeGig)),
    myGigs: role === 'freelancer'
      ? apiRequest('/api/gigs/mine').then((data) => (data.gigs || []).map(normalizeGig))
      : Promise.resolve([]),
    bookings: isParty
      ? apiRequest('/api/bookings/mine').then((data) => (data.bookings || []).map((b) => normalizeBooking(b, role)))
      : Promise.resolve([]),
    transactions: isParty
      ? apiRequest('/api/transactions/mine').then((data) => (data.transactions || []).map(normalizeTransaction))
      : Promise.resolve([]),
    income: role === 'freelancer'
      ? apiRequest('/api/transactions/income').then((data) => data.income || emptyIncome)
      : Promise.resolve(emptyIncome),
  }

  const keys = Object.keys(requests)
  const settled = await Promise.allSettled(Object.values(requests))
  const result = { error: '' }

  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      result[keys[index]] = outcome.value
    } else {
      result[keys[index]] = keys[index] === 'income' ? emptyIncome : []
      result.error = result.error || outcome.reason.message
    }
  })

  return result
}

function Notice({ notice }) {
  if (!notice) {
    return null
  }

  const isError = notice.type === 'error'
  return (
    <p className={isError ? 'error-message' : 'success-message'} role={isError ? 'alert' : 'status'}>
      {notice.text}
    </p>
  )
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
  const [income, setIncome] = useState(emptyIncome)
  const [selectedGig, setSelectedGig] = useState(null)
  const [bookingDate, setBookingDate] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [notice, setNotice] = useState(null)

  const showSuccess = (text) => setNotice({ type: 'success', text })
  const showError = (text) => setNotice({ type: 'error', text })

  function applyDashboard(data) {
    setGigs(data.gigs)
    setMyGigs(data.myGigs)
    setBookings(data.bookings)
    setTransactions(data.transactions)
    setIncome(data.income)
    if (data.error) {
      setNotice({ type: 'error', text: data.error })
    }
  }

  async function refresh() {
    applyDashboard(await loadDashboard(user.role))
  }

  useEffect(() => {
    let cancelled = false

    loadDashboard(user.role).then((data) => {
      if (!cancelled) {
        applyDashboard(data)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user.role])

  const filteredGigs = gigs.filter((gig) =>
    `${gig.title} ${gig.category} ${gig.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  function changeView(nextView) {
    setNotice(null)
    setView(nextView)
  }

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
        await apiRequest(`/api/gigs/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        showSuccess('Gig updated successfully.')
      } else {
        await apiRequest('/api/gigs', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        showSuccess('Service created successfully.')
      }

      resetForm()
      await refresh()
    } catch (error) {
      showError(error.message)
    }
  }

  function editGig(gig) {
    setForm({
      title: gig.title,
      category: categories.includes(gig.category) ? gig.category : categories[0],
      description: gig.description,
      price: String(gig.price),
      deliveryDays: String(gig.deliveryDays || 3),
    })
    setEditingId(gig.id)
  }

  async function deleteGig(gigId) {
    try {
      await apiRequest(`/api/gigs/${gigId}`, { method: 'DELETE' })
      if (editingId === gigId) {
        resetForm()
      }
      showSuccess('Gig deleted.')
      await refresh()
    } catch (error) {
      showError(error.message)
    }
  }

  async function toggleGigStatus(gig) {
    try {
      const nextState = !gig.isActive
      await apiRequest(`/api/gigs/${gig.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: nextState }),
      })
      showSuccess(nextState ? 'Gig is now live in the marketplace.' : 'Gig is hidden from the marketplace.')
      await refresh()
    } catch (error) {
      showError(error.message)
    }
  }

  function startBooking(gig) {
    setSelectedGig(gig)
    setBookingDate('')
    setProjectDetails('')
    changeView('booking')
  }

  async function submitBooking(event) {
    event.preventDefault()

    try {
      const data = await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          gigId: selectedGig.id,
          notes: projectDetails.trim(),
          requestedDate: bookingDate,
        }),
      })

      setSelectedGig(null)
      setView('bookings')
      showSuccess(
        `Booking confirmed (reference ${data.booking.confirmationReference}). Payment was simulated and a transaction was recorded.`,
      )
      await refresh()
    } catch (error) {
      showError(error.message)
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
            onClick={() => changeView('browse')}
          >
            Browse gigs
          </button>

          {(user.role === 'client' || user.role === 'freelancer') && (
            <button
              type="button"
              className={view === 'bookings' ? 'nav-button active' : 'nav-button'}
              onClick={() => changeView('bookings')}
            >
              {user.role === 'client' ? 'My bookings' : 'Bookings'}
            </button>
          )}

          {user.role === 'freelancer' && (
            <button
              type="button"
              className={view === 'manage' ? 'nav-button active' : 'nav-button'}
              onClick={() => changeView('manage')}
            >
              Manage gigs
            </button>
          )}
        </nav>

        <div className="market-account">
          <span>{decodeHtml(user.fullName)}</span>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </header>

      {view === 'booking' && user.role === 'client' && selectedGig ? (
        <main className="management-content">
          <p className="market-eyebrow">Booking request</p>
          <h1>Request a service</h1>
          <Notice notice={notice} />

          <section className="booking-summary">
            <h2>{selectedGig.title}</h2>
            <p>Freelancer: {selectedGig.freelancer?.fullName || 'Freelancer'}</p>
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
                maxLength={1000}
                required
              />
            </label>

            <button className="auth-submit" type="submit">
              Confirm booking
            </button>

            <button
              className="cancel-edit"
              type="button"
              onClick={() => changeView('browse')}
            >
              Back to gigs
            </button>
          </form>
        </main>
      ) : view === 'bookings' && (user.role === 'client' || user.role === 'freelancer') ? (
        <main className="management-content">
          <p className="market-eyebrow">{user.role === 'client' ? 'Client workspace' : 'Freelancer workspace'}</p>
          <h1>{user.role === 'client' ? 'My bookings' : 'Bookings on your gigs'}</h1>
          <Notice notice={notice} />

          {bookings.length === 0 ? (
            <p>
              {user.role === 'client'
                ? 'You haven’t booked any gigs yet. Browse gigs to get started.'
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
                      {user.role === 'client' ? 'Freelancer' : 'Client'}: {booking.otherParty}
                    </p>
                    {booking.confirmationReference && (
                      <p>Reference: {booking.confirmationReference}</p>
                    )}
                    {booking.requestedDate && <p>Requested date: {booking.requestedDate}</p>}
                    <p>Booked on: {booking.bookedOn}</p>
                    {booking.details && <p>{booking.details}</p>}
                    <strong>R{booking.price}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}

          <section className="transaction-list">
            <h2>Transactions</h2>
            {transactions.length === 0 ? (
              <p>No transactions recorded yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Gig</th>
                    <th scope="col">{user.role === 'client' ? 'Freelancer' : 'Client'}</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.date}</td>
                      <td>{transaction.gigTitle}</td>
                      <td>{user.role === 'client' ? transaction.freelancer : transaction.client}</td>
                      <td>R{transaction.amount}</td>
                      <td>{transaction.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      ) : view === 'manage' && user.role === 'freelancer' ? (
        <main className="management-content">
          <p className="market-eyebrow">Freelancer workspace</p>
          <h1>Manage your gigs</h1>
          <Notice notice={notice} />

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
                  minLength={3}
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
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </label>

              <label>
                Price in rand (R)
                <input
                  name="price"
                  type="number"
                  min="1"
                  max="1000000"
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
          <p className="dashboard-greeting">Welcome, {decodeHtml(user.fullName)}!</p>

          <p className="market-eyebrow">Find independent talent</p>
          <h1>Browse freelance services</h1>
          <Notice notice={notice} />

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
            <span>
              {filteredGigs.length} {filteredGigs.length === 1 ? 'service' : 'services'}
            </span>
          </div>

          {filteredGigs.length > 0 ? (
            <div className="gig-grid">
              {filteredGigs.map((gig) => (
                <article className="gig-card" key={gig.id}>
                  <p className="gig-category">{gig.category}</p>
                  <h3>{gig.title}</h3>
                  <p className="gig-description">{gig.description}</p>
                  <div className="gig-footer">
                    <span>{gig.freelancer?.fullName || 'Freelancer'}</span>
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
