import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory';
import { AuthRequest } from '../middleware/auth';

export class InventoryController {
  static async getInventory(req: AuthRequest, res: Response) {
    try {
      const { q: query, category, status, page = 1, limit = 30 } = req.query;

      // If we have filters, use the filtered method
      if (query || category || status) {
        const { data, total } = await InventoryService.getInventoryWithFilters(
          query as string,
          category as string,
          status as string,
          parseInt(page as string),
          parseInt(limit as string)
        );

        return res.json({
          success: true,
          data,
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
        });
      }

      // Otherwise, get all inventory
      const { data, total } = await InventoryService.getInventoryWithWarehouses();

      return res.json({
        success: true,
        data,
        total,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch inventory',
      });
    }
  }

  static async searchInventory(req: AuthRequest, res: Response) {
    try {
      const { q: query, page = 1, limit = 30 } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }

      const { data, total } = await InventoryService.searchInventory(
        query,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.json({
        success: true,
        data,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to search inventory',
      });
    }
  }

  static async getStockCounts(req: AuthRequest, res: Response) {
    try {
      const { lowStockCount, outOfStockCount } = await InventoryService.getLowStockCount();

      return res.json({
        success: true,
        data: {
          lowStockCount,
          outOfStockCount,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stock counts',
      });
    }
  }

  static async getStockMovementDetailsByDateRange(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { start_date, end_date } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required',
        });
      }

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          error: 'Both start_date and end_date are required',
        });
      }

      const { data, opening_stocks } = await InventoryService.getStockMovementDetailsByDateRange(
        productId           ,
        start_date as string,
        end_date as string
      );
      
      return res.json({
        success: true,
        data,
        opening_stocks,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stock movement details',
      });
    }
  }


  static async getStockMovementDetails(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { month, year } = req.query;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required',
        });
      }

      const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();

      const { data } = await InventoryService.getStockMovementDetails(
        productId,
        monthNum,
        yearNum
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stock movement details',
      });
    }
  }
} 
