import { useEffect, useState } from 'react'
import axios from 'axios'

export default function SleepReminder() {
  const [wakeTime,       setWakeTime]       = useState('')
  const [saved,          setSaved]          = useState(false)
  const [hoursLeft,      setHoursLeft]      = useState(null)
  const [showPopup,      setShowPopup]      = useState(false)
  const [lastRemind,     setLastRemind]     = useState(0)
  const [manualSleeping, setManualSleeping] = useState(false)
  const [sleepStart,     setSleepStart]     = useState(null)
  const [sleepElapsed,   setSleepElapsed]   = useState(0)

  // Load saved wake time and sleep state on mount
  useEffect(() => {
    axios.get('/sleep/wake_time')
      .then(r => { if (r.data.wake_time) setWakeTime(r.data.wake_time) })
      .catch(() => {})

    const ms = localStorage.getItem('orbit_manual_sleeping')
    const ss = localStorage.getItem('orbit_sleep_start')
    if (ms === 'true' && ss) {
      setManualSleeping(true)
      setSleepStart(parseInt(ss))
    }
  }, [])

  // Manual sleep elapsed counter
  useEffect(() => {
    if (!manualSleeping || !sleepStart) return
    const t = setInterval(() => {
      setSleepElapsed(Math.floor((Date.now() - sleepStart) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [manualSleeping, sleepStart])

  // Auto reminder check every 60 seconds
  useEffect(() => {
    const check = async () => {
      try {
        const res  = await axios.get('/sleep/check')
        const data = res.data
        setHoursLeft(data.hours_left ?? null)

        if (data.remind) {
          const now = Date.now()
          if (now - lastRemind > 20 * 60 * 1000) {
            setShowPopup(true)
            setLastRemind(now)
            if (Notification.permission === 'granted') {
              new Notification('ORBIT Sleep Reminder', {
                body: `Time to sleep! Wake time is ${data.wake_time}. Only ${data.hours_left}h left.`,
                icon: '/orbit-logo.png'
              })
            }
          }
        }
      } catch {}
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [lastRemind])

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const saveWakeTime = async () => {
    if (!wakeTime) return
    try {
      await axios.post('/sleep/set_wake', { wake_time: wakeTime })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  const startManualSleep = async () => {
    const now = Date.now()
    setManualSleeping(true)
    setSleepStart(now)
    setSleepElapsed(0)
    localStorage.setItem('orbit_manual_sleeping', 'true')
    localStorage.setItem('orbit_sleep_start', String(now))
    try { await axios.post('/sleep/start') } catch {}
  }

  const stopManualSleep = async () => {
    setManualSleeping(false)
    setSleepStart(null)
    setSleepElapsed(0)
    localStorage.removeItem('orbit_manual_sleeping')
    localStorage.removeItem('orbit_sleep_start')
    try { await axios.post('/sleep/stop') } catch {}
  }

  const fmtSleep = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  return (
    <>
      {/* Auto sleep reminder popup */}
      {showPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#1e1e2e', border: '2px solid #9C27B0',
            borderRadius: 20, padding: '36px 40px', width: 420, textAlign: 'center',
            boxShadow: '0 0 60px rgba(156,39,176,0.3)',
            animation: 'sleepPopIn 0.4s ease'
          }}>
            <img src="/mascot-sleeping.png" alt="" style={{
              width: 90, height: 90, objectFit: 'contain', marginBottom: 16,
              animation: 'floatAnim 2s ease-in-out infinite'
            }} />
            <div style={{ fontSize: 24, fontWeight: 800, color: '#CE93D8', marginBottom: 10 }}>
              Time to sleep!
            </div>
            <div style={{ fontSize: 15, color: '#aaa', marginBottom: 8, lineHeight: 1.6 }}>
              Your wake time is <b style={{ color: '#fff' }}>{wakeTime}</b>
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 28 }}>
              You have <b style={{ color: '#CE93D8' }}>{hoursLeft}h</b> left to get a full
              night's rest. Close your books and go to sleep!
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  flex: 1, background: '#2a2a3e', border: '1px solid #444',
                  color: '#aaa', borderRadius: 10, padding: '12px',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600
                }}>
                Remind me later
              </button>
              <button
                onClick={() => { setShowPopup(false); startManualSleep() }}
                style={{
                  flex: 1, background: '#9C27B0', border: 'none',
                  color: '#fff', borderRadius: 10, padding: '12px',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600
                }}>
                Going to sleep
              </button>
            </div>
          </div>
          <style>{`
            @keyframes sleepPopIn {
              0%   { transform: scale(0.8); opacity: 0; }
              100% { transform: scale(1);   opacity: 1; }
            }
            @keyframes floatAnim {
              0%,100% { transform: translateY(0); }
              50%     { transform: translateY(-10px); }
            }
          `}</style>
        </div>
      )}

      {/* Wake time setter */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
          Wake-up time — reminded to sleep 6h before
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="time"
            value={wakeTime}
            onChange={e => setWakeTime(e.target.value)}
            style={{
              flex: 1, background: '#0e1117', border: '1px solid #333',
              borderRadius: 8, padding: '7px 10px', color: '#fff',
              fontSize: 13, outline: 'none', colorScheme: 'dark'
            }}
          />
          <button onClick={saveWakeTime} style={{
            background: saved ? '#1a3a1a' : '#9C27B0',
            border: 'none', color: '#fff', borderRadius: 8,
            padding: '7px 14px', cursor: 'pointer', fontSize: 12,
            fontWeight: 600, transition: 'background 0.3s', minWidth: 60
          }}>
            {saved ? 'Saved!' : 'Set'}
          </button>
        </div>

        {hoursLeft !== null && (
          <div style={{
            fontSize: 11, marginBottom: 8,
            color: hoursLeft <= 6 ? '#CE93D8' : '#555'
          }}>
            {hoursLeft <= 6
              ? `Only ${hoursLeft}h until wake time — sleep now!`
              : `${hoursLeft}h until wake time`}
          </div>
        )}

        {/* Manual sleep button / active sleep display */}
        {!manualSleeping ? (
          <button
            onClick={startManualSleep}
            style={{
              width: '100%', background: '#1a1a2e',
              border: '1px solid #9C27B0', color: '#CE93D8',
              borderRadius: 8, padding: '8px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#2a1a3e'}
            onMouseOut={e  => e.currentTarget.style.background = '#1a1a2e'}
          >
            Going to sleep now
          </button>
        ) : (
          <div style={{
            background: '#1a1a2e', border: '1px solid #9C27B0',
            borderRadius: 8, padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#9C27B0', marginBottom: 2 }}>
                  Sleeping
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: '#CE93D8', fontFamily: 'monospace'
                }}>
                  {fmtSleep(sleepElapsed)}
                </div>
              </div>
              <button
                onClick={stopManualSleep}
                style={{
                  background: '#4CAF50', border: 'none', color: '#fff',
                  borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600
                }}
              >
                Good morning!
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}