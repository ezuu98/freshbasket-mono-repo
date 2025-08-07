import { Router } from 'express';
import { InventoryController } from '../controllers/inventory';
import { InventoryService } from '../services/inventory';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all inventory routes
router.use(authenticateToken);

// GET /api/inventory - Get all inventory with warehouse details
router.get('/', InventoryController.getInventory);

// GET /api/inventory/search - Search inventory
router.get('/search', InventoryController.searchInventory);

// GET /api/inventory/stock-counts - Get low stock counts
router.get('/stock-counts', InventoryController.getStockCounts);

// GET /api/inventory/stock-movements/:productId - Get stock movement details
router.get('/stock-movements/:productId', InventoryController.getStockMovementDetails);

export { router as inventoryRoutes }; 