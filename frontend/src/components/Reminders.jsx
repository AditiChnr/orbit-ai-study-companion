import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Reminders() {
  const [reminders, setReminders] = useState([])
  const [title,     setTitle]     = useState('')
  const [note,      setNote]      = useState('')
  const [datetime,  setDatetime]  = useState('')
  const [filter,    setFilter]    = useState('upcoming') // upcoming | done | all
  const [error,     setError]     = useState('')

  const load = async () => {
    try {
      const res = await axios.get('/reminders')
      setReminders(res.data)
    } catch { }
  }

  useEffect(() => { load() }, [])

  // Check for due reminders every 30 seconds
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date()
      reminders.forEach(r => {
        if (!r.done && r.datetime) {
          const due = new Date(r.datetime)
          const diff = due - now
          if (diff >= 0 && diff <= 30000) {
            // Due within next 30 seconds
            if (Notification.permission === 'granted') {
              new Notification('ORBIT Reminder', {
                body: r.title + (r.note ? '\n' + r.note : ''),
                icon: '/orbit-logo.png'
              })
            }
          }
        }
      })
    }, 30000)
    return () => clearInterval(t)
  }, [reminders])

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const addReminder = async () => {
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    try {
      await axios.post('/reminders/add', { title, note, datetime })
      setTitle('')
      setNote('')
      setDatetime('')
      load()
    } catch { setError('Failed to add reminder') }
  }

  const deleteReminder = async (id) => {
    await axios.post('/reminders/delete', { id })
    load()
  }

  const markDone = async (id) => {
    await axios.post('/reminders/done', { id })
    load()
  }

  const filtered = reminders.filter(r => {
    if (filter === 'upcoming') return !r.done
    if (filter === 'done')     return r.done
    return true
  }).sort((a, b) => {
    if (!a.datetime) return 1
    if (!b.datetime) return -1
    return new Date(a.datetime) - new Date(b.datetime)
  })

  const isOverdue = (r) => {
    if (!r.datetime || r.done) return false
    return new Date(r.datetime) < new Date()
  }

  const isDueSoon = (r) => {
    if (!r.datetime || r.done) return false
    const diff = new Date(r.datetime) - new Date()
    return diff >= 0 && diff <= 60 * 60 * 1000 // within 1 hour
  }

  const formatDT = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ color: '#fff', marginBottom: 16, fontSize: 20 }}>Reminders</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>

        {/* Add reminder form */}
        <div>
          <div className="card">
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 14, fontWeight: 600 }}>
              Add Reminder
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Title</div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addReminder()}
                placeholder="What do you need to do?"
                style={{
                  width: '100%', background: '#0e1117',
                  border: '1px solid #333', borderRadius: 8,
                  padding: '9px 12px', color: '#fff', fontSize: 13,
                  outline: 'none', transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#4CAF50'}
                onBlur={e  => e.target.style.borderColor = '#333'}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>
                Note (optional)
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Extra details..."
                rows={3}
                style={{
                  width: '100%', background: '#0e1117',
                  border: '1px solid #333', borderRadius: 8,
                  padding: '9px 12px', color: '#fff', fontSize: 13,
                  outline: 'none', resize: 'none',
                  fontFamily: 'inherit', transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#4CAF50'}
                onBlur={e  => e.target.style.borderColor = '#333'}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>
                Date and Time
              </div>
              <input
                type="datetime-local"
                value={datetime}
                onChange={e => setDatetime(e.target.value)}
                style={{
                  width: '100%', background: '#0e1117',
                  border: '1px solid #333', borderRadius: 8,
                  padding: '9px 12px', color: '#fff', fontSize: 13,
                  outline: 'none', colorScheme: 'dark',
                  transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#4CAF50'}
                onBlur={e  => e.target.style.borderColor = '#333'}
              />
            </div>

            {error && (
              <div style={{
                background: '#3a1a1a', border: '1px solid #e74c3c',
                color: '#e74c3c', borderRadius: 8, padding: '8px 12px',
                fontSize: 12, marginBottom: 12
              }}>{error}</div>
            )}

            <button
              onClick={addReminder}
              style={{
                width: '100%', background: '#4CAF50', border: 'none',
                color: '#fff', borderRadius: 8, padding: '10px',
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.target.style.background = '#43a047'}
              onMouseOut={e  => e.target.style.background = '#4CAF50'}
            >
              Add Reminder
            </button>
          </div>

          {/* Stats */}
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#4CAF50' }}>
                  {reminders.filter(r => !r.done).length}
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#FFA500' }}>
                  {reminders.filter(r => isOverdue(r)).length}
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>Overdue</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#888' }}>
                  {reminders.filter(r => r.done).length}
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>Done</div>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder list */}
        <div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['upcoming', 'done', 'all'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${filter === f ? '#4CAF50' : '#333'}`,
                background: filter === f ? '#1a3a1a' : 'transparent',
                color: filter === f ? '#4CAF50' : '#888',
                fontSize: 13, textTransform: 'capitalize'
              }}>{f}</button>
            ))}
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 && (
              <div className="card" style={{
                color: '#555', textAlign: 'center',
                padding: 40, fontSize: 14
              }}>
                {filter === 'upcoming' ? 'No upcoming reminders' :
                 filter === 'done'     ? 'No completed reminders' :
                 'No reminders yet'}
              </div>
            )}

            {filtered.map(r => (
              <div key={r.id} className="card" style={{
                border: `1px solid ${
                  isOverdue(r)  ? '#e74c3c' :
                  isDueSoon(r)  ? '#FFA500' :
                  r.done        ? '#2a2a3e' :
                  '#2a2a3e'
                }`,
                opacity: r.done ? 0.6 : 1,
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 15, fontWeight: 600,
                        color: r.done ? '#555' : '#fff',
                        textDecoration: r.done ? 'line-through' : 'none'
                      }}>
                        {r.title}
                      </span>
                      {isOverdue(r) && (
                        <span style={{
                          fontSize: 10, background: '#3a1a1a',
                          color: '#e74c3c', border: '1px solid #e74c3c',
                          borderRadius: 4, padding: '2px 6px'
                        }}>OVERDUE</span>
                      )}
                      {isDueSoon(r) && (
                        <span style={{
                          fontSize: 10, background: '#3a2e00',
                          color: '#FFA500', border: '1px solid #FFA500',
                          borderRadius: 4, padding: '2px 6px'
                        }}>DUE SOON</span>
                      )}
                      {r.done && (
                        <span style={{
                          fontSize: 10, background: '#1a2a1a',
                          color: '#4CAF50', border: '1px solid #4CAF50',
                          borderRadius: 4, padding: '2px 6px'
                        }}>DONE</span>
                      )}
                    </div>

                    {r.note && (
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                        {r.note}
                      </div>
                    )}

                    {r.datetime && (
                      <div style={{
                        fontSize: 12,
                        color: isOverdue(r) ? '#e74c3c' : isDueSoon(r) ? '#FFA500' : '#555',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        {formatDT(r.datetime)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                    {!r.done && (
                      <button
                        onClick={() => markDone(r.id)}
                        style={{
                          background: '#1a3a1a', border: '1px solid #4CAF50',
                          color: '#4CAF50', borderRadius: 6,
                          padding: '5px 12px', cursor: 'pointer', fontSize: 12
                        }}
                      >
                        Done
                      </button>
                    )}
                    <button
                      onClick={() => deleteReminder(r.id)}
                      style={{
                        background: 'none', border: '1px solid #333',
                        color: '#e74c3c', borderRadius: 6,
                        padding: '5px 10px', cursor: 'pointer', fontSize: 12
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}