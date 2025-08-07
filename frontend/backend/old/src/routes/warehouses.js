import express from "express"
import { db } from "../config/supabase.js"
import { logger } from "../utils/logger.js"
import { validateWarehouse } from "../validators/warehouse.js"

const router = express.Router()

// GET /api/warehouses - Get all warehouses
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query

    logger.info("Fetching warehouses", { page, limit, search })

    let query = db.supabaseAdmin
      .from("warehouses")
      .select(`
        *,
        warehouse_inventory(
          inventory_id,
          current_stock,
          inventory(product_name)
        )
      `)
      .eq("is_active", true)

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,location.ilike.%${search}%`)
    }

    // Pagination
    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("name").range(offset, offset + Number.parseInt(limit) - 1)

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
    logger.error("Error fetching warehouses:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouses",
      error: error.message,
    })
  }
})

// GET /api/warehouses/:id - Get single warehouse
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await db.supabaseAdmin
      .from("warehouses")
      .select(`
        *,
        warehouse_inventory(
          id,
          current_stock,
          reserved_stock,
          available_stock,
          last_updated,
          inventory(id, product_name, sku, barcode, categories(name))
        )
      `)
      .eq("id", id)
      .eq("is_active", true)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        })
      }
      throw error
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    logger.error("Error fetching warehouse:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse",
      error: error.message,
    })
  }
})

// POST /api/warehouses - Create new warehouse
router.post("/", validateWarehouse, async (req, res) => {
  try {
    const warehouseData = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    }

    const { data, error } = await db.supabaseAdmin.from("warehouses").insert(warehouseData).select().single()

    if (error) {
      throw error
    }

    logger.info("Created warehouse:", data.name)

    res.status(201).json({
      success: true,
      data,
      message: "Warehouse created successfully",
    })
  } catch (error) {
    logger.error("Error creating warehouse:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create warehouse",
      error: error.message,
    })
  }
})

// PUT /api/warehouses/:id - Update warehouse
router.put("/:id", validateWarehouse, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await db.supabaseAdmin
      .from("warehouses")
      .update(updateData)
      .eq("id", id)
      .eq("is_active", true)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        })
      }
      throw error
    }

    logger.info("Updated warehouse:", data.name)

    res.json({
      success: true,
      data,
      message: "Warehouse updated successfully",
    })
  } catch (error) {
    logger.error("Error updating warehouse:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update warehouse",
      error: error.message,
    })
  }
})

// DELETE /api/warehouses/:id - Soft delete warehouse
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await db.supabaseAdmin
      .from("warehouses")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_active", true)
      .select("id, name")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        })
      }
      throw error
    }

    logger.info("Deleted warehouse:", data.name)

    res.json({
      success: true,
      message: "Warehouse deleted successfully",
    })
  } catch (error) {
    logger.error("Error deleting warehouse:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete warehouse",
      error: error.message,
    })
  }
})

// GET /api/warehouses/:id/inventory - Get warehouse inventory
router.get("/:id/inventory", async (req, res) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 50, search } = req.query

    let query = db.supabaseAdmin
      .from("warehouse_inventory")
      .select(`
        *,
        inventory(
          id,
          product_name,
          sku,
          barcode,
          unit_cost,
          unit_price,
          categories(name)
        )
      `)
      .eq("warehouse_id", id)

    if (search) {
      query = query.or(`inventory.product_name.ilike.%${search}%,inventory.sku.ilike.%${search}%`)
    }

    // Pagination
    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("inventory(product_name)").range(offset, offset + Number.parseInt(limit) - 1)

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
    logger.error("Error fetching warehouse inventory:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse inventory",
      error: error.message,
    })
  }
})

export default router
