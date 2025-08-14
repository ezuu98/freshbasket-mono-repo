import { Request, Response } from 'express';
import { StockCorrectionsService, UploadCorrection } from '../services/stockCorrections';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';

export class StockCorrectionsController {
  /**
   * POST /api/stock-corrections/upload
   * Upload bulk stock corrections from CSV/Excel with warehouse mapping
   */
  static async uploadCorrections(req: AuthRequest, res: Response) {
    try {
      const { corrections }: { corrections: UploadCorrection[] } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Corrections data is required and must be a non-empty array'
        });
      }

      // Validate required fields
      const invalidItems = corrections.filter(
        item => !item.date || !item.barcode || item.stock_quantity === undefined || !item.warehouse_code
      );

      if (invalidItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'All corrections must have date, barcode, stock_quantity, and warehouse_code fields',
          invalid_items: invalidItems
        });
      }

      const result = await StockCorrectionsService.uploadCorrections(corrections, userId);

      return res.json({
        success: true,
        data: result,
        message: `Uploaded ${result.success_count} corrections successfully${result.error_count > 0 ? `, ${result.error_count} failed` : ''}`
      });
    } catch (error: any) {
      console.error('Error in uploadCorrections:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload stock corrections'
      });
    }
  }

  /**
   * GET /api/stock-corrections/variance/:productId
   * Get stock variance for a specific product and date per warehouse
   */
  static async getStockVariance(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { date } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date is required'
        });
      }

      const variance = await StockCorrectionsService.getStockVarianceByWarehouse(
        parseInt(productId),
        date as string
      );

      return res.json({
        success: true,
        data: variance
      });
    } catch (error: any) {
      console.error('Error in getStockVariance:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch stock variance'
      });
    }
  }

  /**
   * GET /api/stock-corrections/variance-with-totals/:productId
   * Get stock variance for a specific product and date per warehouse with totals
   */
  static async getStockVarianceWithTotals(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { date } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date is required'
        });
      }

      const variance = await StockCorrectionsService.getStockVarianceByWarehouseWithTotals(
        parseInt(productId),
        date as string
      );

      return res.json({
        success: true,
        data: variance
      });
    } catch (error: any) {
      console.error('Error in getStockVarianceWithTotals:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch stock variance with totals'
      });
    }
  }

  /**
   * GET /api/stock-corrections/opening-stock/:productId
   * Get opening stock per warehouse for a specific date
   */
  static async getOpeningStock(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { date } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date is required'
        });
      }

      const openingStock = await StockCorrectionsService.getOpeningStockByWarehouse(
        parseInt(productId),
        date as string
      );

      return res.json({
        success: true,
        data: openingStock
      });
    } catch (error: any) {
      console.error('Error in getOpeningStock:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch opening stock'
      });
    }
  }

  /**
   * GET /api/stock-corrections/product/:productId
   * Get all corrections for a specific product
   */
  static async getProductCorrections(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { start_date, end_date, warehouse_id } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      const corrections = await StockCorrectionsService.getProductCorrections(
        parseInt(productId),
        start_date as string,
        end_date as string,
        warehouse_id as string
      );

      return res.json({
        success: true,
        data: corrections
      });
    } catch (error: any) {
      console.error('Error in getProductCorrections:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch product corrections'
      });
    }
  }

  /**
   * GET /api/stock-corrections/overview
   * Get corrections overview for dashboard
   */
  static async getCorrectionsOverview(req: AuthRequest, res: Response) {
    try {
      const { start_date, end_date, warehouse_code } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
      }

      const overview = await StockCorrectionsService.getCorrectionsOverview(
        start_date as string,
        end_date as string,
        warehouse_code as string
      );

      return res.json({
        success: true,
        data: overview
      });
    } catch (error: any) {
      console.error('Error in getCorrectionsOverview:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch corrections overview'
      });
    }
  }

  /**
   * PUT /api/stock-corrections/:correctionId
   * Update a stock correction
   */
  static async updateCorrection(req: AuthRequest, res: Response) {
    try {
      const { correctionId } = req.params;
      const { corrected_stock, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!correctionId) {
        return res.status(400).json({
          success: false,
          error: 'Correction ID is required'
        });
      }

      if (corrected_stock === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Corrected stock is required'
        });
      }

      const updatedCorrection = await StockCorrectionsService.updateCorrection(
        correctionId,
        Number(corrected_stock),
        notes || '',
        userId
      );

      return res.json({
        success: true,
        data: updatedCorrection,
        message: 'Stock correction updated successfully'
      });
    } catch (error: any) {
      console.error('Error in updateCorrection:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update stock correction'
      });
    }
  }

  /**
   * GET /api/stock-corrections/test-function
   * Test if the database function exists
   */
  static async testFunction(req: AuthRequest, res: Response) {
    try {
      // Test if the function exists by calling it with empty data
      const { data, error } = await supabase
        .rpc('bulk_insert_stock_corrections_with_warehouse', {
          corrections_data: [],
          uploader_id: 'test'
        });

      if (error) {
        return res.status(500).json({
          success: false,
          error: `Database function error: ${error.message}`,
          details: error
        });
      }

      return res.json({
        success: true,
        message: 'Database function exists and is working',
        data
      });
    } catch (error: any) {
      console.error('Error testing function:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to test database function'
      });
    }
  }

  /**
   * DELETE /api/stock-corrections/:correctionId
   * Delete a stock correction
   */
  static async deleteCorrection(req: AuthRequest, res: Response) {
    try {
      const { correctionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!correctionId) {
        return res.status(400).json({
          success: false,
          error: 'Correction ID is required'
        });
      }

      await StockCorrectionsService.deleteCorrection(correctionId, userId);

      return res.json({
        success: true,
        message: 'Stock correction deleted successfully'
      });
    } catch (error: any) {
      console.error('Error in deleteCorrection:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete stock correction'
      });
    }
  }
}
