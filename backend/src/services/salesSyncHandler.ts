import { odooClient } from '../config/odoo';
import { supabase } from '../config/supabase';
import { BaseSyncHandler } from './baseSyncHandler';
import { DataType } from '../types/sync';
import sql from 'mssql';

// Database configuration for SQL Server
const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'CisCis_1920fb',
  server: process.env.DB_SERVER || '54.93.208.63',
  port: parseInt(process.env.DB_PORT || '55355'),
  database: process.env.DB_NAME || 'test',
  options: {
    encrypt: process.env.DB_OPTIONS_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_OPTIONS_TRUST_SERVER_CERTIFICATE === 'true',
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000')
  }
};

// Branch to warehouse mapping
const branchToWarehouseMap = {
  '001': 9,
  '005': 4,
  '006': 10,
  '008': 12,
  '009': 18,
  '007': 4,
};

export class SalesSyncHandler extends BaseSyncHandler {
  getDataType(): DataType {
    return 'sales';
  }

  async fetchIncrementalData(lastSync: Date): Promise<any[]> {
    this.logSyncProgress('Fetching sales from SQL Server...');
    
    let pool;
    try {
      pool = await sql.connect(sqlConfig);
      this.logSyncProgress('✅ Connected to SQL Server');

      // Query sales data with date filtering
      const salesQuery = `
        SELECT 
          dbo.INV_PointofSalesDetailTAB.BranchCode, 
          dbo.INV_PointofSalesDetailTAB.BarCode, 
          dbo.INV_PointofSalesDetailTAB.Quantity, 
          dbo.INV_PointofSalesDetailTAB.BillDate
        FROM dbo.INV_PointofSalesDetailTAB 
        INNER JOIN dbo.INV_ItemTAB ON dbo.INV_PointofSalesDetailTAB.BarCode = dbo.INV_ItemTAB.BarCode 
        INNER JOIN dbo.GEN_BranchTAB ON dbo.INV_PointofSalesDetailTAB.BranchCode = dbo.GEN_BranchTAB.BranchCode 
        INNER JOIN dbo.GEN_LocationTAB ON dbo.INV_ItemTAB.LocationCode = dbo.GEN_LocationTAB.LocationCode 
        INNER JOIN dbo.INV_PointofSalesMasterTAB ON dbo.INV_PointofSalesDetailTAB.BranchCode = dbo.INV_PointofSalesMasterTAB.BranchCode 
          AND dbo.INV_PointofSalesDetailTAB.BillNo = dbo.INV_PointofSalesMasterTAB.BillNo 
        LEFT OUTER JOIN dbo.GL_ChartOfAccountTAB ON dbo.INV_ItemTAB.SupplierCode = dbo.GL_ChartOfAccountTAB.AccountCode
        WHERE dbo.INV_PointofSalesDetailTAB.BillDate >= @lastSync
          AND dbo.INV_PointofSalesDetailTAB.BillDate BETWEEN '2025-07-01' AND '2025-08-01'
      `;

      const request = pool.request();
      request.input('lastSync', sql.DateTime, lastSync);
      
      const salesResult = await request.query(salesQuery);
      const records = salesResult.recordset;

              const enriched = records.map((record: any) => ({
          barcode: record.BarCode,
          quantity: record.Quantity,
          date: record.BillDate,
          warehouse_id: branchToWarehouseMap[record.BranchCode as keyof typeof branchToWarehouseMap] || null,
        }));

        const filtered = enriched.filter((e: any) => e.warehouse_id);
      this.logSyncProgress(`Found ${filtered.length} sales records to sync`);
      return filtered;

    } catch (error: any) {
      this.logSyncProgress(`❌ Error fetching sales: ${error.message}`);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
        this.logSyncProgress('🔒 SQL Server connection closed');
      }
    }
  }

  async transformData(rawData: any[]): Promise<any[]> {
    this.logSyncProgress('Transforming sales data...');
    
    // Get unique barcodes to fetch product mappings
    const uniqueBarcodes = [...new Set(rawData.map(item => item.barcode))].filter(Boolean);
    
    if (uniqueBarcodes.length === 0) {
      this.logSyncProgress('No valid barcodes found');
      return [];
    }

    // Fetch product mappings from Supabase
    const { data: products, error } = await supabase
      .from('inventory')
      .select('odoo_id, barcode')
      .in('barcode', uniqueBarcodes);

    if (error) {
      this.logSyncProgress(`Error fetching products: ${error.message}`);
      throw error;
    }

    const barcodeMap = new Map(products.map(p => [p.barcode, p.odoo_id]));
    this.logSyncProgress(`Mapped ${barcodeMap.size} barcodes to product IDs`);

    return rawData
      .map(item => {
        const product_id = barcodeMap.get(item.barcode);
        if (!product_id) {
          this.logSyncProgress(`⚠️ No product found for barcode: ${item.barcode}`);
          return null;
        }

        return {
          product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
          date: item.date,
          movement_type: 'sales',
          barcode: item.barcode
        };
      })
      .filter(Boolean); // Remove null entries
  }

  async upsertData(transformedData: any[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }> {
    this.logSyncProgress(`Upserting ${transformedData.length} sales movements...`);
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const movement of transformedData) {
      try {
        // Check if movement already exists
        const { data: existing, error: selectError } = await supabase
          .from('stock_movements')
          .select('id')
          .eq('product_id', movement.product_id)
          .eq('warehouse_id', movement.warehouse_id)
          .eq('movement_type', 'sales')
          .eq('date', movement.date)
          .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        if (existing) {
          // Update existing movement
          const { error: updateError } = await supabase
            .from('stock_movements')
            .update(movement)
            .eq('id', existing.id);

          if (updateError) throw updateError;
          updated++;
        } else {
          // Insert new movement
          const { error: insertError } = await supabase
            .from('stock_movements')
            .insert(movement);

          if (insertError) throw insertError;
          inserted++;
        }
      } catch (error: any) {
        this.logSyncProgress(`Error upserting sales movement: ${error.message}`);
        skipped++;
      }
    }

    this.logSyncProgress(`Sales sync result: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    return { inserted, updated, skipped };
  }
} 