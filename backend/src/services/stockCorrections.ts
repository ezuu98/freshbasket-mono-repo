import { supabase } from '../config/supabase';

export interface StockCorrection {
  id: string;
  product_id: number;
  warehouse_id: string; // UUID is a string
  barcode: string;
  correction_date: string;
  corrected_stock: number;
  uploaded_at: string;
  uploaded_by: string;
  notes?: string;
}

export interface StockVarianceData {
  warehouse_id: string; // UUID is a string
  warehouse_code: string;
  warehouse_name: string;
  calculated_closing_stock: number;
  corrected_closing_stock: number;
  stock_variance: number;
  has_correction: boolean;
}

export interface StockVarianceDataWithTotals extends StockVarianceData {
  is_total: boolean;
}

export interface OpeningStockData {
  warehouse_id: string; // UUID is a string
  warehouse_code: string;
  warehouse_name: string;
  opening_stock: number;
}

export interface UploadResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    barcode: string;
    warehouse_code: string;
    error: string;
  }>;
}

export interface UploadCorrection {
  date: string;
  stock_quantity: number;
  barcode: string;
  warehouse_code: string;
}

export class StockCorrectionsService {
  /**
   * Upload bulk stock corrections from CSV/Excel data with warehouse mapping
   */
  static async uploadCorrections(
    corrections: UploadCorrection[],
    uploaderId: string
  ): Promise<UploadResult> {
    try {
      // Validate input data
      const validatedCorrections = corrections.map(correction => ({
        date: correction.date,
        stock_quantity: Number(correction.stock_quantity),
        barcode: String(correction.barcode).trim(),
        warehouse_code: String(correction.warehouse_code).trim()
      }));

      console.log('Attempting to upload corrections:', {
        count: validatedCorrections.length,
        uploaderId,
        sampleCorrection: validatedCorrections[0]
      });

      // Call the database function to bulk insert
      const { data, error } = await supabase
        .rpc('bulk_insert_stock_corrections_with_warehouse', {
          corrections_data: validatedCorrections,
          uploader_id: uploaderId
        });

      console.log('Database response:', { data, error });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      return {
        success_count: data[0]?.success_count || 0,
        error_count: data[0]?.error_count || 0,
        errors: data[0]?.errors || []
      };
    } catch (error: any) {
      console.error('Error uploading stock corrections:', error);
      throw new Error(`Failed to upload stock corrections: ${error.message || error}`);
    }
  }

  /**
   * Get stock variance for a specific product and date per warehouse
   */
  static async getStockVarianceByWarehouse(
    productId: number,
    date: string
  ): Promise<StockVarianceData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_stock_variance_by_warehouse', {
          p_product_id: parseInt(productId.toString()),
          p_date: date
        });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching stock variance:', error);
      throw new Error('Failed to fetch stock variance data');
    }
  }

  /**
   * Get stock variance for a specific product and date per warehouse with totals
   */
  static async getStockVarianceByWarehouseWithTotals(
    productId: number,
    date: string
  ): Promise<StockVarianceDataWithTotals[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_stock_variance_by_warehouse_with_totals', {
          p_product_id: parseInt(productId.toString()),
          p_date: date
        });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching stock variance with totals:', error);
      throw new Error('Failed to fetch stock variance data with totals');
    }
  }

  /**
   * Get opening stock per warehouse for a specific date
   */
  static async getOpeningStockByWarehouse(
    productId: number,
    date: string
  ): Promise<OpeningStockData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_opening_stock_by_warehouse', {
          p_product_id: parseInt(productId.toString()),
          p_date: date
        });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching opening stock by warehouse:', error);
      throw new Error('Failed to fetch opening stock data');
    }
  }

  /**
   * Get all stock corrections for a specific product
   */
  static async getProductCorrections(
    productId: number,
    startDate?: string,
    endDate?: string,
    warehouseId?: string
  ): Promise<StockCorrection[]> {
    try {
      let query = supabase
        .from('stock_corrections')
        .select(`
          *,
          warehouse:warehouses!stock_corrections_warehouse_id_fkey(code, name)
        `)
        .eq('product_id', productId)
        .order('correction_date', { ascending: false });

      if (startDate) {
        query = query.gte('correction_date', startDate);
      }
      if (endDate) {
        query = query.lte('correction_date', endDate);
      }
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching product corrections:', error);
      throw new Error('Failed to fetch product corrections');
    }
  }

  /**
   * Get corrections for a specific date range (for dashboard overview)
   */
  static async getCorrectionsOverview(
    startDate: string,
    endDate: string,
    warehouseCode?: string
  ): Promise<{
    total_corrections: number;
    total_variance: number;
    corrections_by_date: Array<{
      date: string;
      count: number;
      total_variance: number;
    }>;
  }> {
    try {
      // Get basic corrections count and variance
      let baseQuery = supabase
        .from('stock_corrections')
        .select(`
          correction_date,
          corrected_stock,
          product_id,
          warehouse_id,
          warehouses!stock_corrections_warehouse_id_fkey(code)
        `)
        .gte('correction_date', startDate)
        .lte('correction_date', endDate);

      if (warehouseCode) {
        baseQuery = baseQuery.eq('warehouses.code', warehouseCode);
      }

      const { data: corrections, error } = await baseQuery;

      if (error) throw error;

      // Calculate variance for each correction
      const correctionPromises = (corrections || []).map(async (correction) => {
        const variance = await this.getStockVarianceByWarehouse(
          correction.product_id,
          correction.correction_date
        );
        
        // Find the specific warehouse variance
        const warehouseVariance = variance.find(v => v.warehouse_id === correction.warehouse_id);
        
        return {
          date: correction.correction_date,
          variance: warehouseVariance ? Math.abs(warehouseVariance.stock_variance) : 0
        };
      });

      const varianceResults = await Promise.all(correctionPromises);

      // Group by date
      const byDate = varianceResults.reduce((acc, item) => {
        if (!acc[item.date]) {
          acc[item.date] = { count: 0, total_variance: 0 };
        }
        acc[item.date].count += 1;
        acc[item.date].total_variance += item.variance;
        return acc;
      }, {} as Record<string, { count: number; total_variance: number }>);

      return {
        total_corrections: corrections?.length || 0,
        total_variance: varianceResults.reduce((sum, r) => sum + r.variance, 0),
        corrections_by_date: Object.entries(byDate).map(([date, data]) => ({
          date,
          count: data.count,
          total_variance: data.total_variance
        }))
      };
    } catch (error) {
      console.error('Error fetching corrections overview:', error);
      throw new Error('Failed to fetch corrections overview');
    }
  }

  /**
   * Delete a stock correction
   */
  static async deleteCorrection(
    correctionId: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_corrections')
        .delete()
        .eq('id', correctionId)
        .eq('uploaded_by', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting stock correction:', error);
      throw new Error('Failed to delete stock correction');
    }
  }

  /**
   * Update a stock correction
   */
  static async updateCorrection(
    correctionId: string,
    correctedStock: number,
    notes: string,
    userId: string
  ): Promise<StockCorrection> {
    try {
      const { data, error } = await supabase
        .from('stock_corrections')
        .update({
          corrected_stock: correctedStock,
          notes,
          uploaded_at: new Date().toISOString()
        })
        .eq('id', correctionId)
        .eq('uploaded_by', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating stock correction:', error);
      throw new Error('Failed to update stock correction');
    }
  }
}
