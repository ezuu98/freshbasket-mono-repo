import express from "express"
import inventoryRoutes from "./inventory.js"
import dashboardRoutes from "./dashboard.js"
import stockMovementRoutes from "./stockMovements.js"
import warehouseRoutes from "./warehouses.js"
import categoryRoutes from "./categories.js"
import authRoutes from "./auth.js"
import odooRoutes from "./odoo.js"

export function setupRoutes(app) {
  const router = express.Router()

  // API routes - no authentication required for development
  router.use("/inventory", inventoryRoutes)
  router.use("/dashboard", dashboardRoutes)
  router.use("/stock-movements", stockMovementRoutes)
  router.use("/warehouses", warehouseRoutes)
  router.use("/categories", categoryRoutes)
  router.use("/auth", authRoutes)
  router.use("/odoo", odooRoutes)

  // Mount all routes under /api
  app.use("/api", router)

  // API documentation endpoint
  app.get("/api", (req, res) => {
    res.json({
      message: "Fresh Basket Inventory API",
      version: "1.0.0",
      endpoints: {
        inventory: "/api/inventory",
        dashboard: "/api/dashboard",
        stockMovements: "/api/stock-movements",
        warehouses: "/api/warehouses",
        categories: "/api/categories",
        auth: "/api/auth",
        odoo: "/api/odoo",
      },
      status: "active",
      timestamp: new Date().toISOString(),
    })
  })
}
