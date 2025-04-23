const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json()) // to parse JSON bodies

const readJSON = (file) => {
  const filePath = path.join(__dirname, file)
  if (!fs.existsSync(filePath)) return {}
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return content.trim() === '' ? {} : JSON.parse(content)
  } catch (err) {
    console.error(`Failed to parse ${file}:`, err)
    return {}
  }
}

const writeJSON = (file, data) => {
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(data, null, 2))
}

const readAgents = () => readJSON('agents.json')
const writeAgents = (data) => writeJSON('agents.json', data)

const readLogs = () => readJSON('logs.json')
const writeLogs = (data) => writeJSON('logs.json', data)

const readStats = () => readJSON('stats.json')
const writeStats = (data) => writeJSON('stats.json', data)

const readStatus = () => readJSON('status.json')
const writeStatus = (data) => writeJSON('status.json', data)


// === GET logs with filtering + pagination ===
app.get('/api/logs', (req, res) => {
  const { agentId, page = 1, pageSize = 6, protocol, src, dst, after } = req.query
  const logs = readLogs()

  const allLogs = agentId && logs[agentId]
    ? logs[agentId]
    : Object.values(logs).flat()

  let filtered = allLogs.filter(log => {
    return (
      (!protocol || log.protocol.toLowerCase().includes(protocol.toLowerCase())) &&
      (!src || log.src.includes(src)) &&
      (!dst || log.dst.includes(dst)) &&
      (!after || new Date(log.timestamp) > new Date(after))
    )
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  res.json({ logs: paginated, totalPages })
})


// === GET stats for an agent ===
app.get('/api/stats', (req, res) => {
  const stats = readStats()
  const stat = stats[req.query.agentId]
  res.json(stat || { incoming: 0, outgoing: 0 })
})


// === GET status for an agent ===
app.get('/api/status', (req, res) => {
  const status = readStatus()
  const st = status[req.query.agentId]
  res.json(st || { status: 'Unknown' })
})


// === GET all agents ===
app.get('/api/agents', (req, res) => {
  const agents = readAgents()
  res.json(agents)
})


// === ADD a new agent ===
app.post('/api/agents', (req, res) => {
  const newAgent = req.body
  if (!newAgent.id || !newAgent.ip) {
    return res.status(400).json({ error: 'Agent must have an id and ip' })
  }

  const agents = readAgents()
  if (agents.find(a => a.id === newAgent.id)) {
    return res.status(409).json({ error: 'Agent with this ID already exists' })
  }

  const newAgentWithTimestamp = {
    ...newAgent,
    lastSeen: new Date().toISOString()
  }

  // Add to agents.json
  agents.push(newAgentWithTimestamp)
  writeAgents(agents)

  // Initialize logs for new agent
  const logs = readLogs()
  logs[newAgent.id] = Array.from({ length: 5 }, (_, i) => ({
    agentId: newAgent.id,
    src: `192.168.10.${i + 1}`,
    dst: `10.0.0.${i + 1}`,
    protocol: ['TCP', 'UDP', 'ICMP'][i % 3],
    timestamp: new Date(Date.now() - i * 30000).toISOString()
  }))
  writeLogs(logs)

  // Initialize stats
  const stats = readStats()
  stats[newAgent.id] = {
    incoming: Math.floor(Math.random() * 1000),
    outgoing: Math.floor(Math.random() * 1000)
  }
  writeStats(stats)

  // Initialize status
  const status = readStatus()
  status[newAgent.id] = {
    status: newAgent.status === 'online' ? 'Active' : 'Offline'
  }
  writeStatus(status)

  res.status(201).json(newAgentWithTimestamp)
})


// === Start the server ===
app.listen(PORT, () => {
  console.log(`Dummy IDS backend running at http://localhost:${PORT}`)
})
