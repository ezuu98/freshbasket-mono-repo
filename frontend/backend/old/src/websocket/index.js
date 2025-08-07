import { Server } from "socket.io"
import { logger } from "../utils/logger.js"

export function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  io.on("connection", (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`)

    // Join inventory room for real-time updates
    socket.on("join-inventory", () => {
      socket.join("inventory")
      logger.info(`Client ${socket.id} joined inventory room`)
    })

    // Join dashboard room for real-time stats
    socket.on("join-dashboard", () => {
      socket.join("dashboard")
      logger.info(`Client ${socket.id} joined dashboard room`)
    })

    // Handle stock movement updates
    socket.on("stock-movement", (data) => {
      logger.info("Stock movement received:", data)
      // Broadcast to all clients in inventory room
      socket.to("inventory").emit("stock-updated", data)
      socket.to("dashboard").emit("stats-updated", data)
    })

    // Handle inventory updates
    socket.on("inventory-updated", (data) => {
      logger.info("Inventory updated:", data)
      socket.to("inventory").emit("inventory-changed", data)
      socket.to("dashboard").emit("stats-updated", data)
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`)
    })

    // Handle errors
    socket.on("error", (error) => {
      logger.error(`WebSocket error for client ${socket.id}:`, error)
    })
  })

  // Broadcast functions for server-side events
  const broadcast = {
    stockMovement: (data) => {
      io.to("inventory").emit("stock-updated", data)
      io.to("dashboard").emit("stats-updated", data)
    },

    inventoryUpdate: (data) => {
      io.to("inventory").emit("inventory-changed", data)
      io.to("dashboard").emit("stats-updated", data)
    },

    lowStockAlert: (data) => {
      io.to("inventory").emit("low-stock-alert", data)
      io.to("dashboard").emit("low-stock-alert", data)
    },

    systemNotification: (data) => {
      io.emit("system-notification", data)
    },
  }
  return { io, broadcast }
}
