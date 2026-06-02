import { useState, useEffect } from 'react'
import Monitor     from './components/Monitor'
import Attendance  from './components/Attendance'
import Graph       from './components/Graph'
import AIAssistant from './components/AIAssistant'
import Reminders   from './components/Reminders'
import Login       from './components/Login'

const TABS = ['Monitor', 'Attendance', 'Graph', 'Reminders', 'AI Assistant']

export default function App() {
  const [tab,      setTab]      = useState('Monitor')
  const [loggedIn, setLoggedIn] = useState(false)
  const [user,     setUser]     = useState('')

  useEffect(() => {
    if (localStorage.getItem('orbit_logged_in') === 'true') {
      setLoggedIn(true)
      setUser(localStorage.getItem('orbit_user') || 'admin')
    }
  }, [])

  const handleLogin = (username) => {
    setLoggedIn(true)
    setUser(username)
  }

  const handleLogout = () => {
    localStorage.removeItem('orbit_logged_in')
    localStorage.removeItem('orbit_user')
    setLoggedIn(false)
    setUser('')
  }

  if (!loggedIn) return <Login onLogin={handleLogin} />

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117' }}>
      <div className="tab-bar">
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
          <img
            src="/orbit-logo.png"
            alt="ORBIT"
            style={{ height: 44, width: 44, objectFit: 'contain', borderRadius: 8 }}
          />
          <span style={{
            color: '#fff', fontWeight: 800, fontSize: 18,
            marginLeft: 8, letterSpacing: '0.08em'
          }}>ORBIT</span>
          <span style={{
            color: '#4CAF50', fontSize: 10, marginLeft: 6,
            letterSpacing: '0.15em', alignSelf: 'flex-end', marginBottom: 2
          }}>AI STUDY COMPANION</span>
        </div>

        <div style={{ width: 1, height: 28, background: '#2a2a3e', marginRight: 12 }} />

        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >{t}</button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{user}</span>
          <button onClick={handleLogout} style={{
            background: 'none', border: '1px solid #333', color: '#888',
            borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12
          }}>Sign out</button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {tab === 'Monitor'      && <Monitor />}
        {tab === 'Attendance'   && <Attendance />}
        {tab === 'Graph'        && <Graph />}
        {tab === 'Reminders'    && <Reminders />}
        {tab === 'AI Assistant' && <AIAssistant />}
      </div>
    </div>
  )
}