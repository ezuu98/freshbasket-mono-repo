import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all stock movement routes
router.use(authenticateToken);

// GET /api/stock-movements
router.get('/', (req, res) => {
  res.json({ 
    message: 'Stock movements endpoint - to be implemented',
    status: 'pending'
  });
});

// GET /api/stock-movements/:id
router.get('/:id', (req, res) => {
  res.json({ 
    message: 'Stock movement details endpoint - to be implemented',
    id: req.params.id,
    status: 'pending'
  });
});

// POST /api/stock-movements
router.post('/', (req, res) => {
  res.json({ 
    message: 'Create stock movement endpoint - to be implemented',
    status: 'pending'
  });
});

export { router as stockMovementsRoutes }; 