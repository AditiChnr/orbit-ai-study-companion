import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'

export default function Graph() {
  const [days,    setDays]    = useState(7)
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    axios.get(`/graph_data?days=${days}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  const today   = data[data.length - 1]
  const pieData = today ? [
    { name: 'Study', value: today.study,    color: '#4CAF50' },
    { name: 'Sleep', value: today.sleep,    color: '#FFA500' },
    { name: 'Away',  value: today.inactive, color: '#e74c3c' },
  ].filter(d => d.value > 0) : []

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: '#1e1e2e', border: '1px solid #333',
        borderRadius: 8, padding: '10px 14px'
      }}>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.fill, fontSize: 13 }}>
            {p.name}: {Number(p.value).toFixed(2)}h
          </p>
        ))}
      </div>
    )
  }

  // Format date for X axis — show MM/DD
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length < 3) return dateStr
    return `${parts[1]}/${parts[2]}`
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ color: '#fff', marginBottom: 16, fontSize: 20 }}>Daily Graph</h2>

      {/* Range toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[7, 14, 30].map(r => (
          <button key={r} onClick={() => setDays(r)} style={{
            padding: '6px 18px', borderRadius: 6,
            border: `1px solid ${days === r ? '#4CAF50' : '#333'}`,
            background: days === r ? '#1a3a1a' : 'transparent',
            color: days === r ? '#4CAF50' : '#888',
            cursor: 'pointer', fontSize: 13
          }}>Last {r} days</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

        {/* Bar chart */}
        <div className="card">
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 14 }}>
            Hours per Day — Last {days} days
          </div>
          {loading ? (
            <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : data.length === 0 ? (
            <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data}
                margin={{ top: 5, right: 10, left: -10, bottom: 20 }}
                barCategoryGap="20%"
              >
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#666', fontSize: 10 }}
                  tickFormatter={formatDate}
                  angle={-45}
                  textAnchor="end"
                  interval={days > 14 ? 2 : 0}
                  height={50}
                />
                <YAxis
                  tick={{ fill: '#666', fontSize: 11 }}
                  tickFormatter={v => `${v}h`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#888', paddingTop: 8 }}
                />
                <Bar dataKey="study"    name="Study" stackId="a" fill="#4CAF50" />
                <Bar dataKey="sleep"    name="Sleep" stackId="a" fill="#FFA500" />
                <Bar
                  dataKey="inactive"
                  name="Away"
                  stackId="a"
                  fill="#e74c3c"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Doughnut */}
        <div className="card">
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 14 }}>
            Today's Breakdown
          </div>
          {pieData.length === 0 ? (
            <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: 13 }}>
              No data for today yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={v => [`${Number(v).toFixed(2)}h`]}
                    contentStyle={{
                      background: '#1e1e2e', border: '1px solid #333', borderRadius: 8
                    }}
                    itemStyle={{ color: '#ddd' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 13
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: 2,
                        background: d.color, display: 'inline-block'
                      }} />
                      <span style={{ color: '#aaa' }}>{d.name}</span>
                    </span>
                    <span style={{ color: d.color, fontWeight: 600 }}>
                      {Number(d.value).toFixed(2)}h
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}