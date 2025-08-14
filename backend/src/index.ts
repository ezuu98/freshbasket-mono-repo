import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authRoutes } from './routes/auth';
import { inventoryRoutes } from './routes/inventory';
import { stockMovementsRoutes } from './routes/stockMovements';
import { warehousesRoutes } from './routes/warehouses';
import { stockCorrectionsRoutes } from './routes/stockCorrections';
import { scheduledSyncService } from './services/scheduledSync';
import syncRoutes from './routes/sync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://freshbasket-dashboard.s3-website-us-east-1.amazonaws.com',
  'https://freshbasket-dashboard.s3-website-us-east-1.amazonaws.com',
  'http://www.freshbasket.site',
  'https://www.freshbasket.site',
  'http://freshbasket.site',
  'https://freshbasket.site'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stock-movements', stockMovementsRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/stock-corrections', stockCorrectionsRoutes);
app.use('/api/sync', syncRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FreshBasket Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('\n📅 Initializing scheduled sync service...');
  try {
    // Use direct scheduler (recommended) - or use startApiScheduler() if you prefer API calls
    scheduledSyncService.startDirectScheduler();
    console.log('✅ Scheduled sync service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize scheduled sync service:', error);
  }
});

export default app; 
