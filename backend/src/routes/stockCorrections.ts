
import { Router } from 'express';
import { StockCorrectionsController } from '../controllers/stockCorrections';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// POST /api/stock-corrections/upload - Upload bulk stock corrections with warehouse mapping
router.post('/upload', StockCorrectionsController.uploadCorrections);

// GET /api/stock-corrections/test-function - Test if database function exists
router.get('/test-function', StockCorrectionsController.testFunction);

// GET /api/stock-corrections/variance/:productId - Get stock variance per warehouse
router.get('/variance/:productId', StockCorrectionsController.getStockVariance);

// GET /api/stock-corrections/variance-with-totals/:productId - Get stock variance per warehouse with totals
router.get('/variance-with-totals/:productId', StockCorrectionsController.getStockVarianceWithTotals);

// GET /api/stock-corrections/opening-stock/:productId - Get opening stock per warehouse
router.get('/opening-stock/:productId', StockCorrectionsController.getOpeningStock);

// GET /api/stock-corrections/product/:productId - Get all corrections for a product
router.get('/product/:productId', StockCorrectionsController.getProductCorrections);

// GET /api/stock-corrections/overview - Get corrections overview for dashboard
router.get('/overview', StockCorrectionsController.getCorrectionsOverview);

// PUT /api/stock-corrections/:correctionId - Update a stock correction
router.put('/:correctionId', StockCorrectionsController.updateCorrection);

// DELETE /api/stock-corrections/:correctionId - Delete a stock correction
router.delete('/:correctionId', StockCorrectionsController.deleteCorrection);

export { router as stockCorrectionsRoutes };




