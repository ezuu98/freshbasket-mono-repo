import express from 'express';
import { SyncController } from '../controllers/sync';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all sync routes
// router.use(authenticateToken); // Temporarily disabled for testing

// Sync individual data types
router.post('/products', SyncController.syncProducts);
router.post('/categories', SyncController.syncCategories);
router.post('/warehouses', SyncController.syncWarehouses);
router.post('/purchases', SyncController.syncPurchases);
router.post('/sales', SyncController.syncSales);
router.post('/transfers', SyncController.syncTransfers);

// Sync all data types
router.post('/all', SyncController.syncAll);

// Get sync status and metadata
router.get('/status', SyncController.getSyncStatus);

// Reset sync metadata for a specific data type
router.post('/reset/:dataType', SyncController.resetSync);

// Legacy endpoints (for backward compatibility)
router.post('/purchase-returns', SyncController.syncPurchaseReturns);
router.post('/sales-returns', SyncController.syncSalesReturns);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Sync service is running'
  });
});

export default router; 