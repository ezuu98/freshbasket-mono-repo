#!/usr/bin/env node

import { odooAPI } from "../config/odoo.js"
import { db } from "../config/supabase.js"
import { logger } from "../utils/logger.js"

async function syncOdooData() {
  try {
    logger.info("Starting Odoo data synchronization...")

    // Test Odoo connection
    await odooAPI.authenticate()
    logger.info("✅ Odoo connection successful")

    // Get data from Odoo
    const odooData = await odooAPI.getFullInventoryData()
    logger.info(`📦 Retrieved ${odooData.products.length} products from Odoo`)

    // Sync categories
    logger.info("🏷️  Syncing categories...")
    let categorySyncCount = 0

    for (const category of odooData.categories) {
      try {
        const { data: existing } = await db.supabaseAdmin
          .from("categories")
          .select("id")
          .eq("name", category.name)
          .single()

        if (!existing) {
          await db.supabaseAdmin.from("categories").insert({
            name: category.name,
            description: category.complete_name,
            is_active: true,
          })
          categorySyncCount++
        }
      } catch (error) {
        logger.error(`Error syncing category ${category.name}:`, error)
      }
    }
    logger.info(`✅ Synced ${categorySyncCount} new categories`)

    // Sync warehouses
    logger.info("🏪 Syncing warehouses...")
    let warehouseSyncCount = 0

    for (const warehouse of odooData.warehouses) {
      try {
        const { data: existing } = await db.supabaseAdmin
          .from("warehouses")
          .select("id")
          .eq("code", warehouse.code)
          .single()

        if (!existing) {
          await db.supabaseAdmin.from("warehouses").insert({
            code: warehouse.code,
            name: warehouse.name,
            is_active: warehouse.active,
          })
          warehouseSyncCount++
        }
      } catch (error) {
        logger.error(`Error syncing warehouse ${warehouse.name}:`, error)
      }
    }
    logger.info(`✅ Synced ${warehouseSyncCount} new warehouses`)

    // Sync products
    logger.info("📦 Syncing products...")
    let productSyncCount = 0

    for (const product of odooData.products) {
      try {
        const barcode = product.barcode || product.default_code || `ODOO-${product.id}`

        const { data: existing } = await db.supabaseAdmin.from("inventory").select("id").eq("barcode", barcode).single()

        // Find category ID
        const categoryName = product.categ_id?.[1]
        const { data: category } = await db.supabaseAdmin
          .from("categories")
          .select("id")
          .eq("name", categoryName)
          .single()

        const productData = {
          barcode,
          product_name: product.name,
          description: product.description || "",
          category_id: category?.id,
          unit_of_measure: product.uom_id?.[1] || "pieces",
          unit_cost: product.standard_price || 0,
          selling_price: product.list_price || 0,
          reorder_level: 10,
          is_active: product.active,
        }

        if (!existing) {
          await db.supabaseAdmin.from("inventory").insert(productData)
          productSyncCount++
        } else {
          // Update existing product
          await db.supabaseAdmin.from("inventory").update(productData).eq("id", existing.id)
        }
      } catch (error) {
        logger.error(`Error syncing product ${product.name}:`, error)
      }
    }
    logger.info(`✅ Synced ${productSyncCount} products`)

    logger.info("🎉 Odoo synchronization completed successfully!")
  } catch (error) {
    logger.error("❌ Odoo synchronization failed:", error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncOdooData()
}

export { syncOdooData }
