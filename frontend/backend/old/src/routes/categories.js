import express from "express"
import { db } from "../config/supabase.js"
import { validateCategory } from "../validators/category.js"
import { logger } from "../utils/logger.js"

const router = express.Router()

// GET /api/categories - Get all categories
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query

    logger.info("Fetching categories", { page, limit, search })

    let query = db.supabaseAdmin
      .from("categories")
      .select(`
        *,
        inventory(id)
      `)
      .eq("is_active", true)

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Pagination
    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("name").range(offset, offset + Number.parseInt(limit) - 1)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    // Add product count to each category
    const categoriesWithCount = data.map((category) => ({
      ...category,
      product_count: category.inventory?.length || 0,
      inventory: undefined, // Remove the inventory array from response
    }))

    res.json({
      success: true,
      data: categoriesWithCount,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error("Error fetching categories:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    })
  }
})

// GET /api/categories/:id - Get single category
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await db.supabaseAdmin
      .from("categories")
      .select(`
        *,
        inventory(
          id,
          product_name,
          sku,
          barcode,
          unit_price,
          warehouse_inventory(current_stock)
        )
      `)
      .eq("id", id)
      .eq("is_active", true)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        })
      }
      throw error
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    logger.error("Error fetching category:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    })
  }
})

// POST /api/categories - Create new category
router.post("/", validateCategory, async (req, res) => {
  try {
    const categoryData = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    }

    const { data, error } = await db.supabaseAdmin.from("categories").insert(categoryData).select().single()

    if (error) {
      throw error
    }

    logger.info("Created category:", data.name)

    res.status(201).json({
      success: true,
      data,
      message: "Category created successfully",
    })
  } catch (error) {
    logger.error("Error creating category:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    })
  }
})

// PUT /api/categories/:id - Update category
router.put("/:id", validateCategory, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await db.supabaseAdmin
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .eq("is_active", true)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        })
      }
      throw error
    }

    logger.info("Updated category:", data.name)

    res.json({
      success: true,
      data,
      message: "Category updated successfully",
    })
  } catch (error) {
    logger.error("Error updating category:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    })
  }
})

// DELETE /api/categories/:id - Soft delete category
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Check if category has products
    const { count: productCount } = await db.supabaseAdmin
      .from("inventory")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id)
      .eq("is_active", true)

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${productCount} products assigned to it.`,
      })
    }

    const { data, error } = await db.supabaseAdmin
      .from("categories")
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
          message: "Category not found",
        })
      }
      throw error
    }

    logger.info("Deleted category:", data.name)

    res.json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    logger.error("Error deleting category:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    })
  }
})

export default router
