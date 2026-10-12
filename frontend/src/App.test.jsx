import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import App from './App.jsx'
import { jsonResponse, mockApi, requestsTo } from './test/mockApi.js'

const client = { id: 'c1', email: 'cara@example.com', fullName: 'Cara Client', role: 'client' }

async function fillLogin(user) {
  await user.type(screen.getByLabelText('Email'), 'cara@example.com')
  await user.type(screen.getByPlaceholderText('Enter your password'), 'Str0ngPass!')
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('App authentication screens', () => {
  test('renders the login form and switches to registration', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toBeRequired()
    expect(screen.getByLabelText('I am joining as')).toHaveValue('client')
    expect(screen.getByRole('option', { name: 'Freelancer' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /admin/i })).not.toBeInTheDocument()
  })

  test('shows the password only when the user asks to', async () => {
    const user = userEvent.setup()
    render(<App />)
    const password = screen.getByPlaceholderText('Enter your password')

    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  test('shows the API error when login fails and stores no token', async () => {
    mockApi({
      'POST /api/auth/login': jsonResponse(401, { error: { message: 'Invalid email or password' } }),
    })
    const user = userEvent.setup()
    render(<App />)

    await fillLogin(user)

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  test('shows field-level validation messages from the API', async () => {
    mockApi({
      'POST /api/auth/register': jsonResponse(400, {
        error: {
          message: 'Invalid request data',
          details: [{ field: 'password', message: 'Password must be between 8 and 72 characters' }],
        },
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))
    await user.type(screen.getByLabelText('Full name'), 'Cara Client')
    await user.type(screen.getByLabelText('Email'), 'cara@example.com')
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'Str0ngPass!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Invalid request data: Password must be between 8 and 72 characters'),
    ).toBeInTheDocument()
  })

  test('logs in, stores the token for the session and opens the marketplace', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/login': jsonResponse(200, { token: 'jwt-token', user: client }),
    })
    const user = userEvent.setup()
    render(<App />)

    await fillLogin(user)

    expect(await screen.findByText('Welcome, Cara Client!')).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBe('jwt-token')

    const [, options] = requestsTo(fetchMock, 'POST', '/api/auth/login')[0]
    expect(JSON.parse(options.body)).toEqual({ email: 'cara@example.com', password: 'Str0ngPass!' })
    expect(options.headers.Authorization).toBeUndefined()

    const [, gigOptions] = requestsTo(fetchMock, 'GET', '/api/gigs')[0]
    expect(gigOptions.headers.Authorization).toBe('Bearer jwt-token')
  })

  test('logs the user out when the session token has expired', async () => {
    sessionStorage.setItem('token', 'expired-token')
    sessionStorage.setItem('user', JSON.stringify(client))
    mockApi({
      'GET /api/gigs': jsonResponse(401, { error: { message: 'Invalid or expired token' } }),
    })

    render(<App />)

    expect(await screen.findByText('Your session has expired. Please log in again.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  test('log out clears the session', async () => {
    sessionStorage.setItem('token', 'jwt-token')
    sessionStorage.setItem('user', JSON.stringify(client))
    mockApi()
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('user')).toBeNull()
  })
})
