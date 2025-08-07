import express from "express"
import axios from "axios"
import { logger } from "../utils/logger.js"
import { syncInventoryFromOdoo } from "../controllers/syncOdoo.js";
import { checkOdooStatus } from "../controllers/odooStatus.js";

const router = express.Router()

router.post("/status", checkOdooStatus)
router.post("/sync", syncInventoryFromOdoo);




// const mockItem = {
//   barcode: '1234567890123917293',
//   product_name: 'iPhone 15 Pro',
//   category_id: '018ae259-de30-4fd6-8340-2e2cfe63a551',
//   sub_category: 'Smartphones',
//   unit_of_measure:'kg',
//   unit_cost: 999.99,
//   reorder_level: 10,
//   max_stock_level:2000,
//   description: 'Latest iPhone with advanced features',
//   is_active: true,
//   created_at: new Date().toISOString(),
//   updated_at: new Date().toISOString()
// }


//   // Insert the item
//   const result = await db.createInventoryItem(mockItem)
//   console.log(`✅ Created: ${mockItem.product_name} (${mockItem.barcode})`)

//   res.status(200).json({
//     success: true,
//     message: 'Mock data uploaded successfully',
//     item: result
//   })

// } catch (error) {
//   console.error('❌ Mock data upload failed:', error)
//   res.status(500).json({
//     success: false,
//     message: 'Failed to upload mock data',
//     error: error.message
//   })
// }


export default router
