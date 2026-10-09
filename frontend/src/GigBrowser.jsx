import { useEffect, useState } from 'react'

const sampleGigs = [
  {
    id: 1,
    title: 'Logo and brand identity',
    category: 'Design',
    seller: 'Amara N.',
    description: 'A logo and color palette for your business.',
    price: '85',
  },
  {
    id: 2,
    title: 'Build a responsive website',
    category: 'Development',
    seller: 'Leo M.',
    description: 'A mobile-friendly website for a small business.',
    price: '240',
  },
  {
    id: 3,
    title: 'Proofread your writing',
    category: 'Writing',
    seller: 'Zanele K.',
    description: 'Careful proofreading for reports and web pages.',
    price: '35',
  },
]

const categories = ['Design', 'Development', 'Writing', 'Marketing']
const emptyForm = {
  title: '',
  category: 'Design',
  description: '',
  price: '',
}

export default function GigBrowser({ user, onLogout }) {
  const [view, setView] = useState('browse')
  const [search, setSearch] = useState('')
  const [myGigs, setMyGigs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [bookings, setBookings] = useState([])
  const [selectedGig, setSelectedGig] = useState(null)
  const [bookingDate, setBookingDate] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  

  const allGigs = [...sampleGigs, ...myGigs]
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

  function saveGig(event) {
    event.preventDefault()

    const gig = {
      ...form,
      id: editingId ?? Date.now(),
      seller: user.fullName,
    }

    if (editingId) {
      setMyGigs(myGigs.map((item) => item.id === editingId ? gig : item))
    } else {
      setMyGigs([...myGigs, gig])
    }
    const wasEditing = editingId !== null
    resetForm()

    setSuccessMessage(
        wasEditing ? 'Gig updated successfully.' : 'Service created successfully.',
        )
  }

  function editGig(gig) {
    setForm({
      title: gig.title,
      category: gig.category,
      description: gig.description,
      price: gig.price,
    })
    setEditingId(gig.id)
  }

  function startBooking(gig){
    setSelectedGig(gig)
    setBookingDate('')
    setProjectDetails('')
    setSuccessMessage('Booking request sent successfully.')
    setView('booking')
  }

  function submitBooking(event){
    event.preventDefault()

    setBookings((currentBookings) => [
        ...currentBookings,
        {
            id: Date.now(),
            gigTitle: selectedGig.title,
            seller: selectedGig.seller,
            price: selectedGig.price,
            date: bookingDate,
            details: projectDetails,
            status: 'Requested',
        },
    ])

    setSelectedGig(null)
    setView('bookings')
  }

  function removeBooking(bookingId) {
  setBookings((currentBookings) =>
    currentBookings.filter((booking) => booking.id !== bookingId),
  )
  setSuccessMessage('Booking removed.')
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

            {user.role === 'client' && (
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
            <p>Freelancer: {selectedGig.seller}</p>
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
    ) : view === 'bookings' && user.role === 'client' ? (
  <main className="management-content">
    <p className="market-eyebrow">Client workspace</p>
    <h1>My bookings</h1>

    {successMessage && (
        <p className="success-message" role="status">{successMessage}</p>
    )}

    {bookings.length === 0 ? (
      <p>You haven’t requested any gigs yet. Browse gigs to get started.</p>
    ) : (
      <div className="booking-list">
        {bookings.map((booking) => (
          <article className="manage-gig" key={booking.id}>
            <div>
              <p className="gig-category">{booking.status}</p>
              <h3>{booking.gigTitle}</h3>
              <p>Freelancer: {booking.seller}</p>
              <p>Requested date: {booking.date}</p>
              <p>{booking.details}</p>
              <strong>R{booking.price}</strong>
              <button
                className="booking-remove-button"
                type="button"
                onClick={() => removeBooking(booking.id)}
                >
                Remove booking
              </button>

            </div>
          </article>
        ))}
      </div>
      )}
  </main>
  //Freelancer Management screen
        ) : view === 'manage' && user.role === 'freelancer' ? (
        <main className="management-content">
          <p className="market-eyebrow">Freelancer workspace</p>
          <h1>Manage your gigs</h1>
          {successMessage && (
            <p className="success-message" role="status">{successMessage}</p>
          )}
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
                      <p className="gig-category">{gig.category}</p>
                      <h3>{gig.title}</h3>
                      <p>{gig.description}</p>
                      <strong>R{gig.price}</strong>
                    </div>

                    <div className="manage-actions">
                      <button type="button" onClick={() => editGig(gig)}>
                        Edit
                      </button>
                      <button
                        className="delete-action"
                        type="button"
                        onClick={() => {
                          setMyGigs(myGigs.filter((item) => item.id !== gig.id))
                          if (editingId === gig.id) resetForm()
                        }}
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
                    <span>{gig.seller}</span>
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