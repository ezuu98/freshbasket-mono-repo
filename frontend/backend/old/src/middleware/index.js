import { logger } from "../utils/logger.js"

export function setupMiddleware(app) {
  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now()

    res.on("finish", () => {
      const duration = Date.now() - start
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`)
    })

    next()
  })

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error("Middleware error:", err)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    })
  })
}
