import express from "express"
import { db } from "../config/supabase.js"
import { logger } from "../utils/logger.js"
import { validateStockMovement } from "../validators/stockMovement.js"

const router = express.Router()

// GET /api/stock-movements - Get all stock movements
router.get("/", async (req, res) => {
  try {
    const { inventory_id, warehouse_id, movement_type, page = 1, limit = 50, start_date, end_date } = req.query

    logger.info("Fetching stock movements", {
      inventory_id,
      warehouse_id,
      movement_type,
      page,
      limit,
      start_date,
      end_date,
    })

    let query = db.supabaseAdmin.from("stock_movements").select(`
        *,
        inventory(id, product_name, sku),
        warehouses(id, name, code)
      `)

    // Apply filters
    if (inventory_id) {
      query = query.eq("inventory_id", inventory_id)
    }

    if (warehouse_id) {
      query = query.eq("warehouse_id", warehouse_id)
    }

    if (movement_type) {
      query = query.eq("movement_type", movement_type)
    }

    if (start_date) {
      query = query.gte("created_at", start_date)
    }

    if (end_date) {
      query = query.lte("created_at", end_date)
    }

    // Pagination
    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("created_at", { ascending: false }).range(offset, offset + Number.parseInt(limit) - 1)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error("Error fetching stock movements:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movements",
      error: error.message,
    })
  }
})

// GET /api/stock-movements/:id - Get single stock movement
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await db.supabaseAdmin
      .from("stock_movements")
      .select(`
        *,
        inventory(id, product_name, sku, barcode),
        warehouses(id, name, code, location)
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Stock movement not found",
        })
      }
      throw error
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    logger.error("Error fetching stock movement:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movement",
      error: error.message,
    })
  }
})

// POST /api/stock-movements - Create new stock movement
router.post("/", validateStockMovement, async (req, res) => {
  try {
    const movementData = {
      ...req.body,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await db.supabaseAdmin
      .from("stock_movements")
      .insert(movementData)
      .select(`
        *,
        inventory(id, product_name, sku),
        warehouses(id, name, code)
      `)
      .single()

    if (error) {
      throw error
    }

    // Update warehouse inventory based on movement
    const { inventory_id, warehouse_id, movement_type, quantity } = movementData

    const { data: currentStock, error: stockError } = await db.supabaseAdmin
      .from("warehouse_inventory")
      .select("current_stock, reserved_stock")
      .eq("inventory_id", inventory_id)
      .eq("warehouse_id", warehouse_id)
      .single()

    if (stockError) {
      logger.warn("Could not find warehouse inventory record:", stockError)
    } else {
      const stockChange = movement_type === "IN" ? quantity : -quantity
      const newStock = currentStock.current_stock + stockChange

      if (newStock >= 0) {
        await db.supabaseAdmin
          .from("warehouse_inventory")
          .update({
            current_stock: newStock,
            available_stock: newStock - currentStock.reserved_stock,
            last_updated: new Date().toISOString(),
          })
          .eq("inventory_id", inventory_id)
          .eq("warehouse_id", warehouse_id)
      }
    }

    logger.info("Created stock movement:", data.id)

    res.status(201).json({
      success: true,
      data,
      message: "Stock movement created successfully",
    })
  } catch (error) {
    logger.error("Error creating stock movement:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create stock movement",
      error: error.message,
    })
  }
})

// GET /api/stock-movements/summary/:inventory_id - Get stock movement summary for an item
router.get("/summary/:inventory_id", async (req, res) => {
  try {
    const { inventory_id } = req.params
    const { days = 30 } = req.query

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number.parseInt(days))

    const { data, error } = await db.supabaseAdmin
      .from("stock_movements")
      .select(`
        movement_type,
        quantity,
        created_at,
        warehouses(name)
      `)
      .eq("inventory_id", inventory_id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // Calculate summary
    const summary = data.reduce(
      (acc, movement) => {
        if (movement.movement_type === "IN") {
          acc.totalIn += movement.quantity
        } else {
          acc.totalOut += movement.quantity
        }
        acc.netChange = acc.totalIn - acc.totalOut
        return acc
      },
      { totalIn: 0, totalOut: 0, netChange: 0 },
    )

    res.json({
      success: true,
      data: {
        summary,
        movements: data,
        period: `${days} days`,
      },
    })
  } catch (error) {
    logger.error("Error fetching stock movement summary:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movement summary",
      error: error.message,
    })
  }
})

export default router
