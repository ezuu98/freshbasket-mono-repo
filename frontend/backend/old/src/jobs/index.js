import cron from "node-cron"
import { logger } from "../utils/logger.js"
import { db } from "../config/supabase.js"

export function setupCronJobs() {
  // Daily inventory report at 6 AM
  cron.schedule("0 6 * * *", async () => {
    try {
      logger.info("Running daily inventory report job")
      await generateDailyInventoryReport()
    } catch (error) {
      logger.error("Error in daily inventory report job:", error)
    }
  })

  // Weekly low stock alert on Mondays at 9 AM
  cron.schedule("0 9 * * 1", async () => {
    try {
      logger.info("Running weekly low stock alert job")
      await sendLowStockAlerts()
    } catch (error) {
      logger.error("Error in low stock alert job:", error)
    }
  })

  // Monthly data cleanup on the 1st at midnight
  cron.schedule("0 0 1 * *", async () => {
    try {
      logger.info("Running monthly data cleanup job")
      await cleanupOldData()
    } catch (error) {
      logger.error("Error in data cleanup job:", error)
    }
  })

  logger.info("✅ Cron jobs scheduled successfully")
}

async function generateDailyInventoryReport() {
  try {
    const stats = await db.getDashboardStats()
    logger.info("Daily inventory report generated:", stats)

    // Here you could send email reports, save to file, etc.
    // For now, just log the stats
  } catch (error) {
    logger.error("Error generating daily inventory report:", error)
  }
}

async function sendLowStockAlerts() {
  try {
    const { data: lowStockItems } = await db.supabaseAdmin
      .from("inventory")
      .select(`
        id,
        product_name,
        sku,
        reorder_level,
        warehouse_inventory(current_stock, warehouses(name))
      `)
      .eq("is_active", true)

    const alertItems = lowStockItems.filter((item) => {
      const totalStock = item.warehouse_inventory.reduce((sum, wh) => sum + (wh.current_stock || 0), 0)
      return totalStock <= item.reorder_level && totalStock > 0
    })

    if (alertItems.length > 0) {
      logger.warn(`Low stock alert: ${alertItems.length} items need restocking`, {
        items: alertItems.map((item) => ({
          name: item.product_name,
          sku: item.sku,
          current_stock: item.warehouse_inventory.reduce((sum, wh) => sum + (wh.current_stock || 0), 0),
          reorder_level: item.reorder_level,
        })),
      })

      // Here you could send email alerts, push notifications, etc.
    }
  } catch (error) {
    logger.error("Error sending low stock alerts:", error)
  }
}

async function cleanupOldData() {
  try {
    // Clean up old stock movements (older than 1 year)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const { count } = await db.supabaseAdmin.from("stock_movements").delete().lt("created_at", oneYearAgo.toISOString())

    logger.info(`Cleaned up ${count || 0} old stock movement records`)

    // Here you could add more cleanup tasks
    // - Archive old data
    // - Clean up temporary files
    // - Optimize database
  } catch (error) {
    logger.error("Error in data cleanup:", error)
  }
}
