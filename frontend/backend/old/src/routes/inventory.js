import express from "express"
import { db } from "../config/supabase.js"
import { logger } from "../utils/logger.js"
import { validateInventoryItem } from "../validators/inventory.js"

const router = express.Router()

// GET /api/inventory - Get all inventory items
router.get("/", async (req, res) => {
  try {
    const { search, category_id, warehouse_id, page = 1, limit = 50 } = req.query
    const parsedPage = Number.parseInt(page)
    const parsedLimit = Number.parseInt(limit)
    const offset = (parsedPage - 1) * parsedLimit
    const to = offset + parsedLimit - 1

    let query = db.supabaseAdmin
      .from("inventory")
      .select(`
        *,
        categories(id, name),
        warehouse_inventory(
          id,
          current_stock,
          reserved_stock,
          available_stock,
          warehouses(id, name, code)
        )
      `, {count: "exact"})
      .eq("is_active", true)

    // Apply filters
    if (search) {
      query = query.or(`product_name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
    }

    if (category_id) {
      query = query.eq("category_id", category_id)
    }

    // Pagination
    query = query.range(offset, to).order("product_name", {ascending: true})

    const { data, error, count } = await query

    if (error) { throw error}

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count || 0,
        pages: Math.ceil((count || 0) / parsedlimit),
      },
    })
  } catch (error) {
    logger.error("Error fetching inventory:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
      error: error.message,
    })
  }
})

// GET /api/inventory/:id - Get single inventory item
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await db.supabaseAdmin
      .from("inventory")
      .select(`
        *,
        categories(id, name, description),
        warehouse_inventory(
          id,
          current_stock,
          reserved_stock,
          available_stock,
          last_updated,
          warehouses(id, name, code, location)
        )
      `)
      .eq("id", id)
      .eq("is_active", true)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Inventory item not found",
        })
      }
      throw error
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    logger.error("Error fetching inventory item:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory item",
      error: error.message,
    })
  }
})

// POST /api/inventory - Create new inventory item
router.post("/", validateInventoryItem, async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    }

    const { data, error } = await db.supabaseAdmin
      .from("inventory")
      .insert(inventoryData)
      .select(`
        *,
        categories(id, name),
        warehouse_inventory(
          id,
          current_stock,
          reserved_stock,
          available_stock,
          warehouses(id, name, code)
        )
      `)
      .single()

    if (error) {
      throw error
    }

    logger.info("Created inventory item:", data.product_name)

    res.status(201).json({
      success: true,
      data,
      message: "Inventory item created successfully",
    })
  } catch (error) {
    logger.error("Error creating inventory item:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create inventory item",
      error: error.message,
    })
  }
})

// PUT /api/inventory/:id - Update inventory item
router.put("/:id", validateInventoryItem, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await db.supabaseAdmin
      .from("inventory")
      .update(updateData)
      .eq("id", id)
      .eq("is_active", true)
      .select(`
        *,
        categories(id, name),
        warehouse_inventory(
          id,
          current_stock,
          reserved_stock,
          available_stock,
          warehouses(id, name, code)
        )
      `)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Inventory item not found",
        })
      }
      throw error
    }

    logger.info("Updated inventory item:", data.product_name)

    res.json({
      success: true,
      data,
      message: "Inventory item updated successfully",
    })
  } catch (error) {
    logger.error("Error updating inventory item:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update inventory item",
      error: error.message,
    })
  }
})

// DELETE /api/inventory/:id - Soft delete inventory item
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await db.supabaseAdmin
      .from("inventory")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_active", true)
      .select("id, product_name")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Inventory item not found",
        })
      }
      throw error
    }

    logger.info("Deleted inventory item:", data.product_name)

    res.json({
      success: true,
      message: "Inventory item deleted successfully",
    })
  } catch (error) {
    logger.error("Error deleting inventory item:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete inventory item",
      error: error.message,
    })
  }
})

// POST /api/inventory/:id/stock-adjustment - Adjust stock levels
router.post("/:id/stock-adjustment", async (req, res) => {
  try {
    const { id } = req.params
    const { warehouse_id, quantity_change, reason, reference } = req.body

    if (!warehouse_id || quantity_change === undefined) {
      return res.status(400).json({
        success: false,
        message: "warehouse_id and quantity_change are required",
      })
    }

    // Get current stock
    const { data: currentStock, error: stockError } = await db.supabaseAdmin
      .from("warehouse_inventory")
      .select("*")
      .eq("inventory_id", id)
      .eq("warehouse_id", warehouse_id)
      .single()

    if (stockError) {
      throw stockError
    }

    const newStock = currentStock.current_stock + Number.parseInt(quantity_change)

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock for this adjustment",
      })
    }

    // Update warehouse inventory
    const { error: updateError } = await db.supabaseAdmin
      .from("warehouse_inventory")
      .update({
        current_stock: newStock,
        available_stock: newStock - currentStock.reserved_stock,
        last_updated: new Date().toISOString(),
      })
      .eq("inventory_id", id)
      .eq("warehouse_id", warehouse_id)

    if (updateError) {
      throw updateError
    }

    // Create stock movement record
    const { error: movementError } = await db.supabaseAdmin.from("stock_movements").insert({
      inventory_id: id,
      warehouse_id: warehouse_id,
      movement_type: quantity_change > 0 ? "IN" : "OUT",
      quantity: Math.abs(quantity_change),
      reason: reason || "Manual Adjustment",
      reference: reference || null,
      created_at: new Date().toISOString(),
    })

    if (movementError) {
      throw movementError
    }

    logger.info(`Stock adjusted for inventory ${id}: ${quantity_change}`)

    res.json({
      success: true,
      message: "Stock adjusted successfully",
      data: {
        previous_stock: currentStock.current_stock,
        new_stock: newStock,
        adjustment: quantity_change,
      },
    })
  } catch (error) {
    logger.error("Error adjusting stock:", error)
    res.status(500).json({
      success: false,
      message: "Failed to adjust stock",
      error: error.message,
    })
  }
})

export default router
