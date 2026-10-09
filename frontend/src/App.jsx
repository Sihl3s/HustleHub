import { useState } from 'react'
import './App.css'
import GigBrowser from './GigBrowser.jsx'

function App() {
  const [mode,setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role,setRole] = useState('client')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState (false)
  const [showPassword, setShowPassword] = useState(false)
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const isRegistering = mode === 'register'

  async function handleSubmint(event){
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try{
      const path = isRegistering
      ? '/api/auth/register'
      : '/api/auth/login'

      const requestBody = {email, password}

      if(isRegistering){
        requestBody.fullName = fullName
        requestBody.role = role
      }

      const response = await fetch(path, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok){
        throw new Error(data.error?.message || 'Request failed')
      }

      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
    }catch(error){
      setMessage(error.message)
    }finally{
      setLoading(false)
    }
  }

  function switchMode(){
    setMode(isRegistering ? 'login' : 'register')
    setMessage('')
  }

  if(user){
    return(
      <GigBrowser
      user={user}
      onLogout={() => {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
        setUser(null)
        setEmail('')
        setPassword('')
        setFullName('')
        setRole('client')
        setMode('login')
        setMessage('')
      }}
      />
    )
  }

  return (
    <div className="market-shell">
      <header className="market-topbar">
        <strong className="market-brand">HustleHub</strong>
        <span>Freelance work, connected.</span>
      </header>

    <main className="auth-content">
      <section className="auth-panel">
      <p className="market-eyebrow">Welcome to HustleHub</p>
      <h1>
        {isRegistering ? 'Create a your account':   'Welcome back'}
      </h1>
      <p className="auth-intro">
        {isRegistering
          ? 'Join the marketplace as a client or freelancer.'
          : 'Log in to find your next opportunity.'}
      </p>

      <form className="auth-form" onSubmit={handleSubmint} >
        {isRegistering && (
          <>
            <label className="auth-field">
              Full name
              <input
                type="text"
                value={fullName}
                placeholder="John Doe"
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>

            <label className="auth-field">
              I am joinging as
              <select                 
                value={role}
                onChange={(event) => setRole(event.target.value)}
                >
                <option value="client">Client</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </label>
          </>
        )}


        <label className="auth-field">
          Email
          <input
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          />
        </label>

        <label className="auth-field">
          Password
          <div className="password-control">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              minLength={isRegistering ? 8 : undefined}
              maxLength={isRegistering ? 72 : undefined}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading 
            ? 'Please wait...'
            : isRegistering
              ? 'Create account'
              : 'Log in'}
        </button>
      </form>

      <p className="auth-message" aria-live="polite">{message}</p>

      <button className="auth-switch" type="button" onClick={switchMode}>
        {isRegistering
          ? 'Already registerd? Log in'
          : 'Need an account? Register'}
      </button>
    </section>
  </main>
</div>


  )
}

export default App