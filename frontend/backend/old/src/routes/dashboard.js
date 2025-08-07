import express from "express"
import { db } from "../config/supabase.js"
import { logger } from "../utils/logger.js"

const router = express.Router()

// GET /api/dashboard/stats - Get dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    logger.info("Fetching dashboard statistics")

    // Get basic counts
    const [{ count: totalProducts }, { count: totalCategories }, { count: totalWarehouses }] = await Promise.all([
      db.supabaseAdmin.from("inventory").select("*", { count: "exact", head: true }).eq("is_active", true),
      db.supabaseAdmin.from("categories").select("*", { count: "exact", head: true }).eq("is_active", true),
      db.supabaseAdmin.from("warehouses").select("*", { count: "exact", head: true }).eq("is_active", true),
    ])

    // Get inventory with stock levels
    const { data: inventoryData, error: inventoryError } = await db.supabaseAdmin
      .from("inventory")
      .select(`
        id,
        product_name,
        unit_cost,
        unit_price,
        reorder_level,
        warehouse_inventory(current_stock, available_stock)
      `)
      .eq("is_active", true)

    if (inventoryError) {
      throw inventoryError
    }

    // Calculate statistics
    let totalValue = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalStock = 0

    inventoryData.forEach((item) => {
      const itemTotalStock = item.warehouse_inventory.reduce((sum, wh) => sum + (wh.current_stock || 0), 0)
      const itemValue = itemTotalStock * (item.unit_cost || 0)

      totalStock += itemTotalStock
      totalValue += itemValue

      if (itemTotalStock === 0) {
        outOfStockCount++
      } else if (itemTotalStock <= (item.reorder_level || 0)) {
        lowStockCount++
      }
    })

    // Get recent stock movements
    const { data: recentMovements, error: movementsError } = await db.supabaseAdmin
      .from("stock_movements")
      .select(`
        id,
        movement_type,
        quantity,
        reason,
        created_at,
        inventory(product_name),
        warehouses(name)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    if (movementsError) {
      logger.warn("Error fetching recent movements:", movementsError)
    }

    const stats = {
      totalProducts: totalProducts || 0,
      totalCategories: totalCategories || 0,
      totalWarehouses: totalWarehouses || 0,
      totalStock,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockCount,
      outOfStockCount,
      recentMovements: recentMovements || [],
    }

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    })
  }
})

// GET /api/dashboard/low-stock - Get low stock items
router.get("/low-stock", async (req, res) => {
  try {
    const { limit = 20 } = req.query

    const { data, error } = await db.supabaseAdmin
      .from("inventory")
      .select(`
        id,
        product_name,
        sku,
        reorder_level,
        categories(name),
        warehouse_inventory(
          current_stock,
          warehouses(name)
        )
      `)
      .eq("is_active", true)
      .order("product_name")

    if (error) {
      throw error
    }

    // Filter items with low stock
    const lowStockItems = data
      .filter((item) => {
        const totalStock = item.warehouse_inventory.reduce((sum, wh) => sum + (wh.current_stock || 0), 0)
        return totalStock <= (item.reorder_level || 0) && totalStock > 0
      })
      .slice(0, Number.parseInt(limit))

    res.json({
      success: true,
      data: lowStockItems,
    })
  } catch (error) {
    logger.error("Error fetching low stock items:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock items",
      error: error.message,
    })
  }
})

// GET /api/dashboard/out-of-stock - Get out of stock items
router.get("/out-of-stock", async (req, res) => {
  try {
    const { limit = 20 } = req.query

    const { data, error } = await db.supabaseAdmin
      .from("inventory")
      .select(`
        id,
        product_name,
        sku,
        categories(name),
        warehouse_inventory(
          current_stock,
          warehouses(name)
        )
      `)
      .eq("is_active", true)
      .order("product_name")

    if (error) {
      throw error
    }

    // Filter items with zero stock
    const outOfStockItems = data
      .filter((item) => {
        const totalStock = item.warehouse_inventory.reduce((sum, wh) => sum + (wh.current_stock || 0), 0)
        return totalStock === 0
      })
      .slice(0, Number.parseInt(limit))

    res.json({
      success: true,
      data: outOfStockItems,
    })
  } catch (error) {
    logger.error("Error fetching out of stock items:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch out of stock items",
      error: error.message,
    })
  }
})

// GET /api/dashboard/top-products - Get top products by value
router.get("/top-products", async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const { data, error } = await db.supabaseAdmin
      .from("inventory")
      .select(`
        id,
        product_name,
        sku,
        unit_cost,
        unit_price,
        categories(name),
        warehouse_inventory(current_stock)
      `)
      .eq("is_active", true)

    if (error) {
      throw error
    }

    // Calculate value and sort
    const productsWithValue = data
      .map((item) => {
        const totalStock = item.warehouse_inventory.reduce((sum, wh) => sum + (wh.current_stock || 0), 0)
        const totalValue = totalStock * (item.unit_cost || 0)
        return {
          ...item,
          totalStock,
          totalValue: Math.round(totalValue * 100) / 100,
        }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, Number.parseInt(limit))

    res.json({
      success: true,
      data: productsWithValue,
    })
  } catch (error) {
    logger.error("Error fetching top products:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch top products",
      error: error.message,
    })
  }
})

export default router
