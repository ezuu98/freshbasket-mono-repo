import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SyncOrchestrator } from '../services/syncOrchestrator';
import { syncHandlers } from '../services/odooSync';
import { SyncMetadataService } from '../services/syncMetadata';
import { DataType } from '../types/sync';

// Initialize sync orchestrator
const syncOrchestrator = new SyncOrchestrator({
  maxRetries: 3,
  retryDelayMs: 1000,
  batchSize: 1000,
  parallelSyncs: 3
});

// Register sync handlers
Object.values(syncHandlers).forEach(handler => {
  syncOrchestrator.registerHandler(handler as any);
});

export class SyncController {
  static async syncProducts(req: AuthRequest, res: Response) {
    try {
      const result = await syncOrchestrator.runSync('products');
      
      res.json({
        success: result.success,
        message: `Products sync ${result.success ? 'completed' : 'failed'}`,
        data: {
          recordsProcessed: result.recordsProcessed,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          errors: result.errors
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync products',
      });
    }
  }

  static async syncCategories(req: AuthRequest, res: Response) {
    try {
      const result = await syncOrchestrator.runSync('categories');
      
      res.json({
        success: result.success,
        message: `Categories sync ${result.success ? 'completed' : 'failed'}`,
        data: {
          recordsProcessed: result.recordsProcessed,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          errors: result.errors
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync categories',
      });
    }
  }

  static async syncWarehouses(req: AuthRequest, res: Response) {
    try {
      const result = await syncOrchestrator.runSync('warehouses');
      
      res.json({
        success: result.success,
        message: `Warehouses sync ${result.success ? 'completed' : 'failed'}`,
        data: {
          recordsProcessed: result.recordsProcessed,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          errors: result.errors
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync warehouses',
      });
    }
  }

  static async syncPurchases(req: AuthRequest, res: Response) {
    try {
      const result = await syncOrchestrator.runSync('purchases');
      
      res.json({
        success: result.success,
        message: `Purchases sync ${result.success ? 'completed' : 'failed'}`,
        data: {
          recordsProcessed: result.recordsProcessed,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          errors: result.errors
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync purchases',
      });
    }
  }

  static async syncSales(req: AuthRequest, res: Response) {
    try {
      const result = await syncOrchestrator.runSync('sales');
      
      res.json({
        success: result.success,
        message: `Sales sync ${result.success ? 'completed' : 'failed'}`,
        data: {
          recordsProcessed: result.recordsProcessed,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          errors: result.errors
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync sales',
      });
    }
  }

  static async syncTransfers(req: AuthRequest, res: Response) {
    try {
      const result = await syncOrchestrator.runSync('transfers');
      
      res.json({
        success: result.success,
        message: `Transfers sync ${result.success ? 'completed' : 'failed'}`,
        data: {
          recordsProcessed: result.recordsProcessed,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          errors: result.errors
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync transfers',
      });
    }
  }

  static async syncAll(req: AuthRequest, res: Response) {
    try {
      const results = await syncOrchestrator.runAllSyncs();
      
      const summary = {
        totalSyncs: results.length,
        successfulSyncs: results.filter(r => r.success).length,
        totalRecordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
        totalRecordsInserted: results.reduce((sum, r) => sum + r.recordsInserted, 0),
        totalRecordsUpdated: results.reduce((sum, r) => sum + r.recordsUpdated, 0),
        totalRecordsSkipped: results.reduce((sum, r) => sum + r.recordsSkipped, 0),
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        errors: results.flatMap(r => r.errors)
      };

      res.json({
        success: summary.successfulSyncs === summary.totalSyncs,
        message: `Sync completed: ${summary.successfulSyncs}/${summary.totalSyncs} successful`,
        data: summary,
        details: results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync all data',
      });
    }
  }

  static async getSyncStatus(req: AuthRequest, res: Response) {
    try {
      const status = await syncOrchestrator.getSyncStatus();
      const metadata = await SyncMetadataService.getAllSyncMetadata();
      
      res.json({
        success: true,
        data: {
          status,
          metadata
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get sync status',
      });
    }
  }

  static async resetSync(req: AuthRequest, res: Response) {
    try {
      const { dataType } = req.params;
      
      if (!dataType || !['products', 'categories', 'warehouses', 'purchases', 'sales', 'transfers'].includes(dataType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid data type. Must be one of: products, categories, warehouses, purchases, sales, transfers'
        });
      }

      await syncOrchestrator.resetSync(dataType as DataType);
      
      return res.json({
        success: true,
        message: `Sync metadata reset for ${dataType}`
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to reset sync',
      });
    }
  }

  // Legacy methods for backward compatibility - now implemented
  static async syncPurchaseReturns(req: AuthRequest, res: Response) {
    res.status(501).json({
      success: false,
      error: 'Purchase returns sync not yet implemented. Use syncAll endpoint.',
    });
  }

  static async syncSalesReturns(req: AuthRequest, res: Response) {
    res.status(501).json({
      success: false,
      error: 'Sales returns sync not yet implemented. Use syncAll endpoint.',
    });
  }
} 