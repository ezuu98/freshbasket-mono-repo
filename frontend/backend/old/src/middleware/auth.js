// Authentication middleware - currently disabled for development
// This file can be used later when authentication is needed

export function authenticateToken(req, res, next) {
  // Skip authentication for now - development mode
  req.user = {
    id: "dev-user-123",
    email: "dev@freshbasket.com",
    profile: {
      role: "admin",
      full_name: "Development User",
    },
  }
  next()
}

export function requireRole(roles) {
  return (req, res, next) => {
    // Skip role checking for now - development mode
    next()
  }
}

// Optional authentication middleware - no authentication required
export function optionalAuth(req, res, next) {
  req.user = null
  next()
}

// No authentication required - pass through
export function noAuth(req, res, next) {
  next()
}
