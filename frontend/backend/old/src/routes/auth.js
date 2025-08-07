import express from "express"
import { logger } from "../utils/logger.js"

const router = express.Router()

// POST /api/auth/login - Mock login (no authentication required)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      })
    }

    // Mock authentication - always successful for development
    const mockUser = {
      id: "dev-user-123",
      email: email,
      full_name: "Development User",
      role: "admin",
      created_at: new Date().toISOString(),
    }

    const mockToken = "dev-token-" + Date.now()

    logger.info("Mock login successful for:", email)

    res.json({
      success: true,
      data: {
        user: mockUser,
        token: mockToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
      message: "Login successful (development mode)",
    })
  } catch (error) {
    logger.error("Error during login:", error)
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    })
  }
})

// POST /api/auth/register - Mock registration
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name } = req.body

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and full name are required",
      })
    }

    // Mock registration - always successful for development
    const mockUser = {
      id: "dev-user-" + Date.now(),
      email: email,
      full_name: full_name,
      role: "user",
      created_at: new Date().toISOString(),
    }

    const mockToken = "dev-token-" + Date.now()

    logger.info("Mock registration successful for:", email)

    res.status(201).json({
      success: true,
      data: {
        user: mockUser,
        token: mockToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
      message: "Registration successful (development mode)",
    })
  } catch (error) {
    logger.error("Error during registration:", error)
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    })
  }
})

// POST /api/auth/logout - Mock logout
router.post("/logout", async (req, res) => {
  try {
    logger.info("Mock logout")

    res.json({
      success: true,
      message: "Logout successful",
    })
  } catch (error) {
    logger.error("Error during logout:", error)
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    })
  }
})

// GET /api/auth/me - Get current user (mock)
router.get("/me", async (req, res) => {
  try {
    const mockUser = {
      id: "dev-user-123",
      email: "dev@freshbasket.com",
      full_name: "Development User",
      role: "admin",
      created_at: new Date().toISOString(),
    }

    res.json({
      success: true,
      data: mockUser,
    })
  } catch (error) {
    logger.error("Error getting user profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
      error: error.message,
    })
  }
})

export default router
