import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

export default function AIAssistant() {
  const [sources,  setSources]  = useState([])
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setError('')
    try {
      const res = await axios.post('/extract_pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data.text) {
        setSources(s => [...s, { name: file.name, text: res.data.text }])
      } else {
        setError(res.data.error || 'Failed to extract text')
      }
    } catch (err) {
      setError('Upload failed — is the backend running?')
    }
    e.target.value = ''
  }

  const sendMessage = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setError('')

    const userMsg    = { role: 'user', content: q }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setLoading(true)

    const context = sources.map(s => `=== ${s.name} ===\n${s.text}`).join('\n\n')

    try {
      const res = await axios.post('/ask_ai', {
        question: q,
        context:  context,
        history:  messages.slice(-10)
      }, { timeout: 30000 })

      if (res.data.answer) {
        setMessages([...newHistory, { role: 'assistant', content: res.data.answer }])
      } else if (res.data.error) {
        setError(`AI error: ${res.data.error}`)
        setMessages([...newHistory, {
          role: 'assistant',
          content: `Sorry, I ran into an error: ${res.data.error}`
        }])
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Network error'
      setError(msg)
      setMessages([...newHistory, {
        role: 'assistant',
        content: `Connection error: ${msg}. Make sure the backend is running and GEMINI_API_KEY is set.`
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{
      maxWidth: 1100, margin: '0 auto',
      height: 'calc(100vh - 120px)',
      display: 'flex', gap: 16
    }}>

      {/* Left panel */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>Upload Sources</div>
          <label style={{
            display: 'block', textAlign: 'center', padding: '16px 12px',
            border: '1px dashed #444', borderRadius: 8, cursor: 'pointer',
            color: '#666', fontSize: 13, transition: 'all 0.15s'
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#4CAF50'; e.currentTarget.style.color = '#4CAF50' }}
            onMouseOut={e  => { e.currentTarget.style.borderColor = '#444';    e.currentTarget.style.color = '#666'    }}
          >
            Click to upload PDF or TXT
            <input type="file" accept=".pdf,.txt" onChange={uploadFile} style={{ display: 'none' }} />
          </label>
          <div style={{ fontSize: 11, color: '#555', marginTop: 8, textAlign: 'center' }}>
            Content sent as context with every message
          </div>
        </div>

        <div className="card" style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10 }}>
            Sources ({sources.length})
          </div>
          {sources.length === 0 && (
            <div style={{ color: '#555', fontSize: 13 }}>No sources uploaded yet</div>
          )}
          {sources.map(s => (
            <div key={s.name} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', padding: '8px 10px',
              background: '#0e1117', borderRadius: 6,
              marginBottom: 6, border: '1px solid #2a2a3e'
            }}>
              <div>
                <div style={{ fontSize: 12, color: '#ddd', wordBreak: 'break-all' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{s.text.length.toLocaleString()} chars</div>
              </div>
              <button
                onClick={() => setSources(s2 => s2.filter(x => x.name !== s.name))}
                style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, marginLeft: 6 }}
              >x</button>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Backend status</div>
          <button
            onClick={async () => {
              try {
                await axios.get('/stats')
                setError('')
                alert('Backend is running!')
              } catch {
                setError('Backend not reachable')
              }
            }}
            style={{
              width: '100%', background: '#0e1117', border: '1px solid #333',
              color: '#888', borderRadius: 6, padding: '6px', cursor: 'pointer', fontSize: 12
            }}
          >Test connection</button>
          {error && (
            <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 6, wordBreak: 'break-all' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card" style={{
          flex: 1, overflow: 'auto',
          display: 'flex', flexDirection: 'column',
          gap: 12, marginBottom: 12, minHeight: 0
        }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexDirection: 'column',
              gap: 10
            }}>
              <img src="/orbit-logo.png" alt="" style={{ width: 56, height: 56, opacity: 0.3 }} />
              <div style={{ fontSize: 16, color: '#444' }}>AI Study Assistant</div>
              <div style={{ fontSize: 13, color: '#333', textAlign: 'center', maxWidth: 300 }}>
                Upload study material and ask questions, or just ask anything
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '75%'
            }}>
              {m.role === 'assistant' && (
                <div style={{ fontSize: 11, color: '#555', marginBottom: 4, marginLeft: 4 }}>
                  Orbit AI
                </div>
              )}
              <div className={m.role === 'user' ? 'bubble-user' : 'bubble-ai'}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4, marginLeft: 4 }}>Orbit AI</div>
              <div className="bubble-ai">
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#4CAF50',
                      animation: `dotbounce 1s infinite ${i * 0.2}s`
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="card" style={{ padding: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
              rows={3}
              style={{
                flex: 1, background: '#0e1117', border: '1px solid #333',
                borderRadius: 8, padding: '10px 14px', color: '#fff',
                fontSize: 14, resize: 'none', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.5,
                transition: 'border 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#4CAF50'}
              onBlur={e  => e.target.style.borderColor = '#333'}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#2a2a3e' : '#4CAF50',
                color: loading || !input.trim() ? '#555' : '#fff',
                border: 'none', borderRadius: 8, padding: '10px 20px',
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                fontSize: 14, fontWeight: 600, alignSelf: 'flex-end',
                transition: 'all 0.2s', minWidth: 70
              }}
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dotbounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}