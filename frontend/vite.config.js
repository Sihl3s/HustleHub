import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Content Security Policy for the React app. Scripts, styles, images and API
// calls may only come from this origin, so injected <script> tags or links to
// attacker-controlled hosts are blocked by the browser. The API is reached
// through the same-origin /api proxy, which is why connect-src stays 'self'.
const productionCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

// The dev server injects an inline React Refresh script and inline <style>
// tags, and talks to the browser over a websocket for hot reload. Only the
// dev policy allows those; `npm run preview` serves the strict policy.
const developmentCsp = productionCsp
  .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
  .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
  .replace("connect-src 'self'", "connect-src 'self' ws://localhost:* ws://127.0.0.1:*")

const sharedHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const apiProxy = {
  '/api': {
    target: 'https://127.0.0.1:3443',
    changeOrigin: true,
    // The local API uses a self-signed certificate.
    secure: false,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: { ...sharedHeaders, 'Content-Security-Policy': developmentCsp },
    proxy: apiProxy,
  },
  preview: {
    headers: { ...sharedHeaders, 'Content-Security-Policy': productionCsp },
    proxy: apiProxy,
  },
})
