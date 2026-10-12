// Small wrapper around fetch for the HustleHub+ API (MDN, 2026).
// Requests go to the same-origin /api proxy, so the CSP connect-src 'self' applies.

let unauthorizedHandler = null

// Called when a request made with a token comes back 401 (expired or invalid token).
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

function buildHeaders(extraHeaders = {}) {
  const token = sessionStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function errorMessage(data) {
  const message = data.error?.message || data.message || 'Request failed'
  const details = Array.isArray(data.error?.details)
    ? data.error.details.map((item) => item.message).filter(Boolean)
    : []

  return details.length > 0 ? `${message}: ${details.join('. ')}` : message
}

export async function apiRequest(url, options = {}) {
  const headers = buildHeaders(options.headers || {})
  const response = await fetch(url, { ...options, headers })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : {}

  if (!response.ok) {
    if (response.status === 401 && headers.Authorization && unauthorizedHandler) {
      unauthorizedHandler()
    }
    throw new Error(errorMessage(data))
  }

  return data
}

// The API HTML-escapes free text before storing it (XSS defence). Reverse that
// for display and for edit forms; React escapes again when rendering, so this
// never turns stored text into markup.
const ENTITIES = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#x5C;': '\\',
  '&#96;': '`',
}

export function decodeHtml(value) {
  if (typeof value !== 'string') {
    return value
  }

  return value
    .replace(/&lt;|&gt;|&quot;|&#x27;|&#x2F;|&#x5C;|&#96;/g, (entity) => ENTITIES[entity])
    .replace(/&amp;/g, '&')
}
