require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const { logger } = require('./utils/logger')

const campaignRoutes = require('./routes/campaignRoutes')
const leadRoutes = require('./routes/leadRoutes')
const webhookRoutes = require('./routes/webhookRoutes')

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use('/webhooks/stripe', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}))

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.use('/api/campaigns', campaignRoutes)
app.use('/api/leads', leadRoutes)
app.use('/webhooks', webhookRoutes)

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack })
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  })
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found' },
  })
})

app.listen(PORT, () => {
  logger.info(`🚀 Revendr API running on port ${PORT}`)
  logger.info(`📌 Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app
