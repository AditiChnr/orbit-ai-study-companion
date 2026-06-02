import { useEffect, useState } from 'react'
import axios from 'axios'

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function buildCalendar(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days  = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return cells
}

function pad(n) { return String(n).padStart(2, '0') }

export default function Attendance() {
  const [subjects,  setSubjects]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [newName,   setNewName]   = useState('')
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [stats,     setStats]     = useState(null)
  const today = new Date()

  const load = async () => {
    const res = await axios.get('/att/data')
    setSubjects(res.data)
    if (selected) {
      const found = res.data.find(s => s.name === selected.name)
      if (found) setSelected(found)
    }
  }

  const loadStats = async (name) => {
    const res = await axios.get(`/att/stats/${encodeURIComponent(name)}`)
    setStats(res.data)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadStats(selected.name) }, [selected, subjects])

  const addSubject = async () => {
    if (!newName.trim()) return
    await axios.post('/att/add', { name: newName.trim() })
    setNewName('')
    load()
  }

  const removeSubject = async (name) => {
    await axios.post('/att/remove', { name })
    if (selected?.name === name) { setSelected(null); setStats(null) }
    load()
  }

  const toggleDay = async (d) => {
    if (!selected) return
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`
    await axios.post('/att/toggle', { name: selected.name, date: dateStr })
    load()
  }

  const cells = buildCalendar(viewYear, viewMonth)

  const statusColor = (pct) => {
    if (pct >= 75) return '#4CAF50'
    if (pct >= 60) return '#FFA500'
    return '#e74c3c'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ color: '#fff', marginBottom: 16, fontSize: 20 }}>Attendance</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10 }}>Add Subject</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubject()}
                placeholder="Subject name"
                style={{
                  flex: 1, background: '#0e1117', border: '1px solid #333',
                  borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 13
                }}
              />
              <button onClick={addSubject} style={{
                background: '#4CAF50', color: '#fff', border: 'none',
                borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13
              }}>Add</button>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10 }}>Subjects</div>
            {subjects.length === 0 && (
              <div style={{ color: '#555', fontSize: 13 }}>No subjects yet</div>
            )}
            {subjects.map(s => (
              <div key={s.name}
                onClick={() => { setSelected(s); setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 6, marginBottom: 4, cursor: 'pointer',
                  background: selected?.name === s.name ? '#2a2a3e' : 'transparent',
                  border: `1px solid ${selected?.name === s.name ? '#4CAF50' : 'transparent'}`,
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ fontSize: 14, color: '#ddd' }}>{s.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); removeSubject(s.name) }}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16 }}
                >x</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="card" style={{ color: '#555', fontSize: 14, textAlign: 'center', padding: 40 }}>
              Select a subject to view its calendar
            </div>
          ) : (
            <>
              {stats && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: '#888' }}>Total: <b style={{ color: '#ddd' }}>{stats.total}</b></span>
                    <span style={{ fontSize: 14, color: '#4CAF50' }}>Present: <b>{stats.present}</b></span>
                    <span style={{ fontSize: 14, color: '#e74c3c' }}>Absent: <b>{stats.absent}</b></span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: statusColor(stats.pct) }}>{stats.pct}%</span>
                    {stats.pct < 75 && stats.needed_for_75 > 0 && (
                      <span style={{ fontSize: 13, color: '#FFA500' }}>
                        Attend {stats.needed_for_75} more class{stats.needed_for_75 > 1 ? 'es' : ''} to reach 75%
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <button
                    onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }}
                    style={{ background: 'none', border: '1px solid #333', color: '#aaa', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                  >Prev</button>
                  <span style={{ color: '#ddd', fontWeight: 600 }}>{MONTHS[viewMonth]} {viewYear} — {selected.name}</span>
                  <button
                    onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }}
                    style={{ background: 'none', border: '1px solid #333', color: '#aaa', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                  >Next</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 4, marginBottom: 4 }}>
                  {DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#555', fontWeight: 600 }}>{d}</div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 4 }}>
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} />
                    const dateStr = `${viewYear}-${pad(viewMonth+1)}-${pad(d)}`
                    const status  = selected.records?.[dateStr] || ''
                    const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
                    const isFuture = new Date(viewYear, viewMonth, d) > today
                    return (
                      <div
                        key={i}
                        className={`cal-day ${status === 'P' ? 'present' : status === 'A' ? 'absent' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => !isFuture && toggleDay(d)}
                        style={{ opacity: isFuture ? 0.3 : 1, cursor: isFuture ? 'default' : 'pointer' }}
                      >
                        {status || d}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#666' }}>
                  <span><span style={{ color: '#4CAF50' }}>P</span> = Present</span>
                  <span><span style={{ color: '#e74c3c' }}>A</span> = Absent</span>
                  <span>Click to cycle</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}