const express = require('express')
const cors = require('cors')
const app = express()
const PORT = 3001

app.use(cors())

// Dummy logs per agent
const agentLogs = {
  'QW32RF45ZA': Array.from({ length: 10 }, (_, i) => ({
    agentId: 'QW32RF45ZA',
    src: `192.168.1.${i + 2}`,
    dst: `8.8.8.${i}`,
    protocol: ['TCP', 'UDP', 'ICMP'][i % 3],
    timestamp: new Date(Date.now() - i * 60000).toISOString()
  })),
  'JU98DE17CD': Array.from({ length: 8 }, (_, i) => ({
    agentId: 'JU98DE17CD',
    src: `192.168.1.${i + 20}`,
    dst: `1.1.1.${i}`,
    protocol: ['TCP', 'UDP', 'ICMP'][i % 3],
    timestamp: new Date(Date.now() - i * 90000).toISOString()
  })),
  'NH65GFER12': Array.from({ length: 12 }, (_, i) => ({
    agentId: 'NH65GFER12',
    src: `192.168.1.${i + 30}`,
    dst: `9.9.9.${i}`,
    protocol: ['TCP', 'UDP', 'ICMP'][i % 3],
    timestamp: new Date(Date.now() - i * 45000).toISOString()
  }))
}

// Dummy stats per agent (MB/sec)
const agentStats = {
  'QW32RF45ZA': { incoming: 1720, outgoing: 1340 },
  'JU98DE17CD': { incoming: 800, outgoing: 650 },
  'NH65GFER12': { incoming: 1900, outgoing: 1700 }
}

// Dummy status per agent
const agentStatus = {
  'QW32RF45ZA': { status: "Active" },
  'JU98DE17CD': { status: "Offline" },
  'NH65GFER12': { status: "Active" }
}

// Dummy agents
const agents = [
  { id: 'QW32RF45ZA', ip: '192.168.1.2', status: 'online', lastSeen: '2025-04-22T09:55:00Z' },
  { id: 'JU98DE17CD', ip: '192.168.1.3', status: 'offline', lastSeen: '2025-04-22T08:12:00Z' },
  { id: 'NH65GFER12', ip: '192.168.1.4', status: 'online', lastSeen: '2025-04-22T09:58:30Z' }
]

// Routes
app.get('/api/logs', (req, res) => {
  const {
    agentId,
    page = 1,
    pageSize = 6,
    protocol,
    src,
    dst,
    after
  } = req.query

  // Fetch logs for the specified agent or all logs
  const logs = agentId && agentLogs[agentId]
    ? agentLogs[agentId]
    : Object.values(agentLogs).flat()

  // Apply filters
  let filtered = logs.filter(log => {
    return (
      (!protocol || log.protocol.toLowerCase().includes(protocol.toLowerCase())) &&
      (!src || log.src.includes(src)) &&
      (!dst || log.dst.includes(dst)) &&
      (!after || new Date(log.timestamp) > new Date(after))
    )
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const start = (page - 1) * pageSize
  const end = start + parseInt(pageSize)

  const paginated = filtered.slice(start, end)

  res.json({
    logs: paginated,
    totalPages
  })
})

app.get('/api/stats', (req, res) => {
  const agentId = req.query.agentId
  if (agentId && agentStats[agentId]) {
    res.json(agentStats[agentId])
  } else {
    res.json({ incoming: 0, outgoing: 0 })
  }
})

app.get('/api/status', (req, res) => {
  const agentId = req.query.agentId
  if (agentId && agentStatus[agentId]) {
    res.json(agentStatus[agentId])
  } else {
    res.json({ status: "Unknown" })
  }
})

app.get('/api/agents', (req, res) => {
  res.json(agents)
})

app.listen(PORT, () => {
  console.log(`Dummy IDS backend running at http://localhost:${PORT}`)
})