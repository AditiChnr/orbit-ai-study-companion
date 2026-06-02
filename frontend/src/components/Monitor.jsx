import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import SleepReminder from './SleepReminder'

function fmt(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function Mascot({ status, studyMins, phoneAlert }) {
  const [bounce, setBounce] = useState(false)

  const getImage = () => {
    if (phoneAlert)                              return { src: '/mascot-phone.png',    label: 'Put the phone down!' }
    if (status === 'SLEEPING')                   return { src: '/mascot-sleeping.png', label: 'Sleeping...' }
    if (status === 'INACTIVE')                   return { src: '/mascot-idle.png',     label: 'Idle' }
    if (status === 'STUDYING' && studyMins > 45) return { src: '/mascot-dancing.png',  label: 'Absolutely crushing it!' }
    if (status === 'STUDYING' && studyMins > 20) return { src: '/mascot-happy.png',    label: 'On fire!' }
    if (status === 'STUDYING')                   return { src: '/mascot-focused.png',  label: 'Focused' }
    return                                              { src: '/mascot-idle.png',     label: 'Idle' }
  }

  const emotion = getImage()

  useEffect(() => {
    setBounce(true)
    const t = setTimeout(() => setBounce(false), 600)
    return () => clearTimeout(t)
  }, [status, phoneAlert])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <img
        src={emotion.src}
        alt="Orbit mascot"
        style={{
          width: 90, height: 90,
          objectFit: 'contain',
          borderRadius: 12,
          transform: bounce ? 'scale(1.15)' : status === 'STUDYING' ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.3s ease',
          animation: status === 'STUDYING' ? 'mascotFloat 3s ease-in-out infinite' : 'none',
          filter: 'drop-shadow(0 0 8px rgba(255,200,50,0.25))'
        }}
      />
      <span style={{
        fontSize: 11,
        color: status === 'STUDYING' ? '#4CAF50' : '#888',
        letterSpacing: '0.05em'
      }}>
        {emotion.label}
      </span>
    </div>
  )
}

function PomodoroSettings({ workMins, breakMins, onSave, onClose }) {
  const [w, setW] = useState(workMins)
  const [b, setB] = useState(breakMins)
  const [wInput, setWInput] = useState(String(workMins))
  const [bInput, setBInput] = useState(String(breakMins))

  const handleWChange = (val) => {
    setWInput(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1 && n <= 120) setW(n)
  }

  const handleBChange = (val) => {
    setBInput(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1 && n <= 60) setB(n)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="card" style={{ width: 340, padding: 24 }}>
        <div style={{ fontSize: 16, color: '#fff', fontWeight: 600, marginBottom: 20 }}>
          Pomodoro Settings
        </div>

        {/* Work duration */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
            Work duration (minutes) — type or use buttons
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { const v = Math.max(1, w - 5); setW(v); setWInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>-5</button>
            <button
              onClick={() => { const v = Math.max(1, w - 1); setW(v); setWInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>-1</button>
            <input
              type="number"
              value={wInput}
              onChange={e => handleWChange(e.target.value)}
              min={1} max={120}
              style={{
                flex: 1, background: '#0e1117', border: '1px solid #4CAF50',
                borderRadius: 8, padding: '8px', color: '#4CAF50',
                fontSize: 20, fontWeight: 700, fontFamily: 'monospace',
                textAlign: 'center', outline: 'none',
                MozAppearance: 'textfield'
              }}
            />
            <button
              onClick={() => { const v = Math.min(120, w + 1); setW(v); setWInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>+1</button>
            <button
              onClick={() => { const v = Math.min(120, w + 5); setW(v); setWInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>+5</button>
          </div>
        </div>

        {/* Break duration */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
            Break duration (minutes) — type or use buttons
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { const v = Math.max(1, b - 5); setB(v); setBInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>-5</button>
            <button
              onClick={() => { const v = Math.max(1, b - 1); setB(v); setBInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>-1</button>
            <input
              type="number"
              value={bInput}
              onChange={e => handleBChange(e.target.value)}
              min={1} max={60}
              style={{
                flex: 1, background: '#0e1117', border: '1px solid #FFA500',
                borderRadius: 8, padding: '8px', color: '#FFA500',
                fontSize: 20, fontWeight: 700, fontFamily: 'monospace',
                textAlign: 'center', outline: 'none',
                MozAppearance: 'textfield'
              }}
            />
            <button
              onClick={() => { const v = Math.min(60, b + 1); setB(v); setBInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>+1</button>
            <button
              onClick={() => { const v = Math.min(60, b + 5); setB(v); setBInput(String(v)) }}
              style={{ background: '#2a2a3e', border: '1px solid #333', color: '#fff',
                       borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>+5</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, background: '#2a2a3e', border: '1px solid #333', color: '#aaa',
                     borderRadius: 8, padding: '10px', cursor: 'pointer', fontSize: 14 }}>
            Cancel
          </button>
          <button onClick={() => onSave(w, b)}
            style={{ flex: 1, background: '#4CAF50', border: 'none', color: '#fff',
                     borderRadius: 8, padding: '10px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function BreakPopup({ type, workMins, breakMins, onYes, onNo }) {
  const isBreakEnd = type === 'break_end'
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#1e1e2e',
        border: `1px solid ${isBreakEnd ? '#4CAF50' : '#FFA500'}`,
        borderRadius: 20, padding: '36px 40px', width: 420, textAlign: 'center',
        boxShadow: `0 0 40px ${isBreakEnd ? 'rgba(76,175,80,0.2)' : 'rgba(255,165,0,0.2)'}`
      }}>
        <img
          src="/mascot-focused.png"
          alt=""
          style={{
            width: 80, height: 80, objectFit: 'contain',
            marginBottom: 16,
            animation: 'mascotFloat 2s ease-in-out infinite'
          }}
        />
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
          {isBreakEnd ? 'Break is over!' : 'Time for a break!'}
        </div>
        <div style={{ fontSize: 15, color: '#aaa', marginBottom: 28, lineHeight: 1.6 }}>
          {isBreakEnd
            ? 'Have you started studying again?'
            : `You studied for ${workMins} minutes. Want 5 more minutes?`}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onNo} style={{
            flex: 1, background: '#2a2a3e', border: '1px solid #444',
            color: '#aaa', borderRadius: 10, padding: '12px',
            cursor: 'pointer', fontSize: 15, fontWeight: 600
          }}>
            {isBreakEnd ? 'Not yet' : 'Take break'}
          </button>
          <button onClick={onYes} style={{
            flex: 1, background: isBreakEnd ? '#4CAF50' : '#FFA500',
            border: 'none', color: '#fff', borderRadius: 10, padding: '12px',
            cursor: 'pointer', fontSize: 15, fontWeight: 600
          }}>
            {isBreakEnd ? 'Yes, studying!' : '5 more mins'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MotivationalPopup({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#1e1e2e', border: '2px solid #e74c3c',
        borderRadius: 20, padding: '36px 40px', width: 420, textAlign: 'center',
        boxShadow: '0 0 60px rgba(231,76,60,0.3)',
        animation: 'shake 0.5s ease'
      }}>
        <img
          src="/mascot-phone.png"
          alt=""
          style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }}
        />
        <div style={{
          fontSize: 32, fontWeight: 900, color: '#e74c3c',
          marginBottom: 12, letterSpacing: '0.05em'
        }}>
          LOCK INNN!!!!
        </div>
        <div style={{ fontSize: 15, color: '#aaa', marginBottom: 28 }}>
          You didn't start studying yet. Get back to work!
        </div>
        <button onClick={onClose} style={{
          background: '#e74c3c', border: 'none', color: '#fff',
          borderRadius: 10, padding: '12px 32px',
          cursor: 'pointer', fontSize: 15, fontWeight: 700
        }}>
          OK I will study now
        </button>
      </div>
    </div>
  )
}

export default function Monitor() {
  const [stats,        setStats]        = useState(null)
  const [alerts,       setAlerts]       = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [workMins,     setWorkMins]     = useState(25)
  const [breakMins,    setBreakMins]    = useState(5)
  const [breakPopup,   setBreakPopup]   = useState(null)
  const [onBreak,      setOnBreak]      = useState(false)
  const [breakLeft,    setBreakLeft]    = useState(0)
  const [showMotivate, setShowMotivate] = useState(false)
  const [extended,     setExtended]     = useState(0)
  const [frozenStudy,  setFrozenStudy]  = useState(null)
  const intervalRef      = useRef(null)
  const pomodoroFiredRef = useRef(false)

  const studyMins    = stats ? Math.floor((frozenStudy ?? stats.study) / 60) : 0
  const displayStudy = onBreak && frozenStudy !== null ? frozenStudy : (stats?.study ?? 0)

  // Freeze study timer during break
  useEffect(() => {
    if (onBreak && stats && frozenStudy === null) {
      setFrozenStudy(stats.study)
    }
    if (!onBreak) {
      setFrozenStudy(null)
    }
  }, [onBreak, stats])

  // Sync pomodoro to backend on first load
  useEffect(() => {
    axios.post('/set_pomodoro', { work_mins: workMins }).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/stats')
        const d   = res.data
        setStats(d)

        if (d.pomodoro_alert && !onBreak && breakPopup === null && !pomodoroFiredRef.current) {
          pomodoroFiredRef.current = true
          setBreakPopup('break_start')
        }
        if (!d.pomodoro_alert) pomodoroFiredRef.current = false

        if (d.phone_alert) addAlert('Phone detected for 2+ minutes — put it away!')
      } catch (e) {}
    }
    fetchStats()
    intervalRef.current = setInterval(fetchStats, 1000)
    return () => clearInterval(intervalRef.current)
  }, [workMins, breakMins, onBreak, breakPopup, extended])

  useEffect(() => {
    if (!onBreak) return
    setBreakLeft(breakMins * 60)
    const t = setInterval(() => {
      setBreakLeft(s => {
        if (s <= 1) {
          clearInterval(t)
          setOnBreak(false)
          setBreakPopup('break_end')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [onBreak, breakMins])

  function addAlert(msg) {
    const id = Date.now()
    setAlerts(a => [...a, { id, msg }])
    setTimeout(() => setAlerts(a => a.filter(x => x.id !== id)), 8000)
  }

  const handleSavePomodoro = async (w, b) => {
    setWorkMins(w)
    setBreakMins(b)
    setShowSettings(false)
    setExtended(0)
    try {
      await axios.post('/set_pomodoro', { work_mins: w })
    } catch (e) {}
  }

  const badgeClass = {
    STUDYING: 'badge badge-studying',
    SLEEPING: 'badge badge-sleeping',
    INACTIVE: 'badge badge-inactive',
  }

  const workSecs = (workMins + extended) * 60
  const bank     = onBreak && frozenStudy !== null
    ? frozenStudy % workSecs
    : stats ? stats.study % workSecs : 0
  const pct  = Math.min((bank / workSecs) * 100, 100)
  const left = workSecs - bank

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      <style>{`
        @keyframes mascotFloat {
          0%,100% { transform: translateY(0px) scale(1.05); }
          50%      { transform: translateY(-10px) scale(1.05); }
        }
        @keyframes shake {
          0%,100%{ transform:translateX(0) }
          20%    { transform:translateX(-10px) }
          40%    { transform:translateX(10px) }
          60%    { transform:translateX(-10px) }
          80%    { transform:translateX(10px) }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 20 }}>Live Monitor</h2>
        <button onClick={() => setShowSettings(true)} style={{
          background: '#1e1e2e', border: '1px solid #333', color: '#aaa',
          borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13
        }}>
          Pomodoro Settings
        </button>
      </div>

      {showSettings && (
        <PomodoroSettings
          workMins={workMins}
          breakMins={breakMins}
          onSave={handleSavePomodoro}
          onClose={() => setShowSettings(false)}
        />
      )}

      {breakPopup === 'break_start' && (
        <BreakPopup
          type="break_start"
          workMins={workMins + extended}
          breakMins={breakMins}
          onYes={() => {
            setExtended(e => e + 5)
            setBreakPopup(null)
            axios.post('/set_pomodoro', { work_mins: workMins + extended + 5 }).catch(() => {})
          }}
          onNo={() => { setOnBreak(true); setBreakPopup(null); setExtended(0) }}
        />
      )}

      {breakPopup === 'break_end' && (
        <BreakPopup
          type="break_end"
          workMins={workMins}
          breakMins={breakMins}
          onYes={() => setBreakPopup(null)}
          onNo={() => { setBreakPopup(null); setShowMotivate(true) }}
        />
      )}

      {showMotivate && <MotivationalPopup onClose={() => setShowMotivate(false)} />}

      {alerts.map(a => (
        <div key={a.id} className="alert-banner">{a.msg}</div>
      ))}

      {onBreak && (
        <div style={{
          background: '#3a2e00', border: '1px solid #FFA500',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ color: '#FFA500', fontSize: 14 }}>
            Break time — {fmt(breakLeft)} remaining
          </span>
          <button
            onClick={() => { setOnBreak(false); setBreakPopup(null) }}
            style={{
              background: '#4CAF50', border: 'none', color: '#fff',
              borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 13
            }}
          >
            Resume studying
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Camera */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: '#aaa', fontSize: 13 }}>Camera Feed</span>
            {stats && (
              <span className={badgeClass[stats.status] || 'badge badge-inactive'}>
                {onBreak ? 'ON BREAK' : stats.status}
              </span>
            )}
          </div>
          <img
            src="/video_feed"
            alt="Camera feed"
            style={{
              width: '100%', borderRadius: 8,
              border: '1px solid #2a2a3e', background: '#111'
            }}
          />
          {stats && (
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: stats.face  ? '#4CAF50' : '#666' }}>
                Face: {stats.face ? 'Detected' : 'Not detected'}
              </span>
              <span style={{ fontSize: 12, color: stats.phone ? '#e74c3c' : '#666' }}>
                Phone: {stats.phone ? 'Detected' : 'Not detected'}
              </span>
              <span style={{ fontSize: 12, color: '#888' }}>
                Brightness: {stats.brightness}
              </span>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Mascot + study time */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Mascot
              status={onBreak ? 'INACTIVE' : (stats?.status || 'INACTIVE')}
              studyMins={studyMins}
              phoneAlert={stats?.phone_alert}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                {onBreak ? 'Study time (paused)' : 'Today\'s study time'}
              </div>
              <div style={{
                fontSize: 26, fontWeight: 700,
                color: onBreak ? '#555' : '#4CAF50',
                fontFamily: 'monospace',
                textShadow: !onBreak && stats?.status === 'STUDYING'
                  ? '0 0 20px rgba(76,175,80,0.5)' : 'none',
                transition: 'all 0.5s'
              }}>
                {fmt(displayStudy)}
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                {onBreak
                  ? 'Timer paused during break'
                  : studyMins >= 60
                    ? `${Math.floor(studyMins/60)}h ${studyMins%60}m focused`
                    : `${studyMins}m focused today`}
              </div>
            </div>
          </div>

          {/* Sleep + Away */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card">
              <div style={{ fontSize: 11, color: '#FFA500', marginBottom: 4 }}>
                SLEEP TIME (cumulative)
              </div>
              <div className="timer-display" style={{ color: '#FFA500', fontSize: 20 }}>
                {stats ? fmt(stats.sleep) : '00:00:00'}
              </div>
              <SleepReminder />
            </div>
            <div className="card">
              <div style={{ fontSize: 11, color: '#e74c3c', marginBottom: 4 }}>AWAY TIME</div>
              <div className="timer-display" style={{ color: '#e74c3c', fontSize: 22 }}>
                {stats ? fmt(stats.inactive) : '00:00:00'}
              </div>
            </div>
          </div>

          {/* Pomodoro */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>
                {onBreak ? 'BREAK IN PROGRESS' : 'POMODORO PROGRESS'}
              </span>
              <span style={{ fontSize: 11, color: '#555' }}>
                {workMins + extended} min work / {breakMins} min break
              </span>
            </div>
            {onBreak ? (
              <>
                <div style={{ height: 8, background: '#2a2a3e', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${((breakMins * 60 - breakLeft) / (breakMins * 60)) * 100}%`,
                    height: '100%', background: '#FFA500', borderRadius: 4,
                    transition: 'width 1s linear',
                    boxShadow: '0 0 8px rgba(255,165,0,0.6)'
                  }} />
                </div>
                <div style={{ fontSize: 12, color: '#FFA500', marginTop: 6 }}>
                  Break ends in {fmt(breakLeft)}
                </div>
              </>
            ) : (
              <>
                <div style={{ height: 8, background: '#2a2a3e', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: pct > 80 ? '#FFA500' : '#4CAF50',
                    borderRadius: 4, transition: 'width 1s linear',
                    boxShadow: pct > 80
                      ? '0 0 8px rgba(255,165,0,0.6)'
                      : '0 0 8px rgba(76,175,80,0.4)'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>{fmt(left)} until break</span>
                  <span style={{ fontSize: 12, color: '#555' }}>{Math.round(pct)}%</span>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}