import { vi } from 'vitest'

export function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  }
}

const emptyIncome = { currency: 'ZAR', totalIncome: 0, transactionCount: 0, monthly: [] }

const isResponse = (value) => value && typeof value.json === 'function'

// Replaces fetch with a tiny fake API. `routes` maps "METHOD /path" to a
// response, a plain JSON body (sent as 200) or a function returning either;
// anything unmatched gets an empty list.
export function mockApi(routes = {}) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const path = url.split('?')[0]
    const handler = routes[`${method} ${path}`]

    if (handler) {
      const result = typeof handler === 'function' ? handler(url, options) : handler
      return isResponse(result) ? result : jsonResponse(200, result)
    }

    const defaults = {
      'GET /api/gigs': { gigs: [] },
      'GET /api/gigs/mine': { gigs: [] },
      'GET /api/bookings/mine': { bookings: [] },
      'GET /api/transactions/mine': { transactions: [] },
      'GET /api/transactions/income': { income: emptyIncome },
    }
    return jsonResponse(200, defaults[`${method} ${path}`] || {})
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function requestsTo(fetchMock, method, path) {
  return fetchMock.mock.calls.filter(
    ([url, options = {}]) => url.split('?')[0] === path && (options.method || 'GET') === method,
  )
}
