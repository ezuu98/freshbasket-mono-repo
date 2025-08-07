import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import dotenv from "dotenv"
import { createServer } from "http"
import { setupWebSocket } from "./websocket/index.js"
import { setupRoutes } from "./routes/index.js"
import { setupMiddleware } from "./middleware/index.js"
import { logger } from "./utils/logger.js"
import { setupCronJobs } from "./jobs/index.js"
import { connectSupabase } from "./config/supabase.js"

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(compression())

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Setup custom middleware
setupMiddleware(app)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  })
})

// API routes
setupRoutes(app)

// WebSocket setup for real-time updates
setupWebSocket(server)

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err)
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  })
})

// Start server
async function startServer() {
  try {
    // Test Supabase connection
    await connectSupabase()
    logger.info("Connected to Supabase successfully")

    // Setup cron jobs for Odoo sync
    setupCronJobs()
    logger.info("Cron jobs initialized")

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`)
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully")
  server.close(() => {
    logger.info("Process terminated")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully")
  server.close(() => {
    logger.info("Process terminated")
    process.exit(0)
  })
})

startServer()
