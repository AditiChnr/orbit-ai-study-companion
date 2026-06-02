import { useState } from 'react'

const VALID_USER = 'admin'
const VALID_PASS = 'orbit123'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = () => {
    setError('')
    if (!username || !password) { setError('Please enter username and password'); return }
    setLoading(true)
    setTimeout(() => {
      if (username === VALID_USER && password === VALID_PASS) {
        localStorage.setItem('orbit_logged_in', 'true')
        localStorage.setItem('orbit_user', username)
        onLogin(username)
      } else {
        setError('Invalid username or password')
        setLoading(false)
      }
    }, 800)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0e1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column'
    }}>
      {/* Animated background stars */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        {[...Array(40)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            background: '#fff',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.7 + 0.1,
            animation: `twinkle ${Math.random() * 3 + 2}s infinite alternate`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes twinkle { from { opacity: 0.1; } to { opacity: 0.9; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes orbitRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Login card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#1e1e2e', border: '1px solid #2a2a3e',
        borderRadius: 20, padding: '40px 48px', width: 400,
        boxShadow: '0 0 60px rgba(76,175,80,0.08)'
      }}>

        {/* Logo + mascot */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            {/* Orbit ring animation */}
            <div style={{
              position: 'absolute', inset: -12,
              border: '2px solid transparent',
              borderTopColor: '#4CAF50',
              borderBottomColor: '#9C27B0',
              borderRadius: '50%',
              animation: 'orbitRing 3s linear infinite'
            }} />
            <img
              src="/orbit-logo.png"
              alt="ORBIT"
              style={{
                width: 80, height: 80, objectFit: 'contain',
                borderRadius: 12,
                animation: 'float 3s ease-in-out infinite'
              }}
            />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
            ORBIT
          </div>
          <div style={{ fontSize: 11, color: '#4CAF50', letterSpacing: '0.2em', marginTop: 2 }}>
            AI STUDY COMPANION
          </div>
        </div>

        {/* Fields */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Username</div>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter username"
            autoFocus
            style={{
              width: '100%', background: '#0e1117', border: '1px solid #333',
              borderRadius: 8, padding: '11px 14px', color: '#fff',
              fontSize: 14, outline: 'none', transition: 'border 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#4CAF50'}
            onBlur={e  => e.target.style.borderColor = '#333'}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Password</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter password"
            style={{
              width: '100%', background: '#0e1117', border: '1px solid #333',
              borderRadius: 8, padding: '11px 14px', color: '#fff',
              fontSize: 14, outline: 'none', transition: 'border 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#4CAF50'}
            onBlur={e  => e.target.style.borderColor = '#333'}
          />
        </div>

        {error && (
          <div style={{
            background: '#3a1a1a', border: '1px solid #e74c3c',
            color: '#e74c3c', borderRadius: 8, padding: '10px 14px',
            fontSize: 13, marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#2a2a3e' : '#4CAF50',
            color: loading ? '#555' : '#fff', border: 'none',
            borderRadius: 10, padding: '13px', fontSize: 15,
            fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            transition: 'all 0.2s', letterSpacing: '0.05em'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 12, color: '#444'
        }}>
          Demo credentials: admin / orbit123
        </div>
      </div>
    </div>
  )
}