import { odooClient } from '../config/odoo';
import { supabase } from '../config/supabase';
import { BaseSyncHandler } from './baseSyncHandler';
import { DataType } from '../types/sync';

export class OdooSyncService {
  // This class will be replaced by individual handlers
  // Keeping for backward compatibility with existing controller
}

export class ProductsSyncHandler extends BaseSyncHandler {
  getDataType(): DataType {
    return 'products';
  }

  async fetchIncrementalData(lastSync: Date): Promise<any[]> {
    this.logSyncProgress('Fetching products from Odoo...');

    try {
      const domain = [
        ['write_date', '>=', this.formatDateTimeForOdoo(lastSync)],
        ['active', '=', true],
        ['type', '=', 'product']
      ];

      const fields = [
        'id', 'name', 'barcode', 'categ_id', 'uom_id', 'standard_price',
        'list_price', 'reordering_min_qty', 'reordering_max_qty',
        'write_date', 'create_date', 'active'
      ]
      
      if (!domain.every(tuple => Array.isArray(tuple) && tuple.length === 3 && typeof tuple[0] === 'string' && typeof tuple[1] === 'string')) {
        throw new Error(`Invalid domain format for product.product: ${JSON.stringify(domain)}`);
      }

      const response = await this.withRetry(async () => {
        return await odooClient.searchRead('product.product', domain, fields);
      });

      this.logSyncProgress(`Found ${response.length} products to sync`);
      return response;
    } catch (error: any) {
      this.handleApiError(error, 'fetching products');
    }
  }

  async transformData(rawData: any[]): Promise<any[]> {
    this.logSyncProgress('Transforming products data...');

    return rawData.map(product => ({
      odoo_id: product.id,
      name: product.name,
      barcode: product.barcode,
      category_id: product.categ_id?.[0] || null,
      uom_name: product.uom_id?.[1] || 'Unit',
      standard_price: product.standard_price || 0,
      list_price: product.list_price || 0,
      reordering_min_qty: product.reordering_min_qty || 0,
      reordering_max_qty: product.reordering_max_qty || 0,
      active: product.active || true,
      type: 'product',
      created_at: product.create_date,
      updated_at: product.write_date
    }));
  }

  async upsertData(transformedData: any[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }> {
    this.logSyncProgress(`Upserting ${transformedData.length} products...`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const product of transformedData) {
      try {
        const { data: existing, error: selectError } = await supabase
          .from('inventory')
          .select('id')
          .eq('odoo_id', product.odoo_id)
          .single();

        if (selectError && selectError.code !== 'PGRST116') { // Not found error
          throw selectError;
        }

        if (existing) {
          // Update existing product
          const { error: updateError } = await supabase
            .from('inventory')
            .update(product)
            .eq('odoo_id', product.odoo_id);

          if (updateError) throw updateError;
          updated++;
        } else {
          // Insert new product
          const { error: insertError } = await supabase
            .from('inventory')
            .insert(product);

          if (insertError) throw insertError;
          inserted++;
        }
      } catch (error: any) {
        this.logSyncProgress(`Error upserting product ${product.odoo_id}: ${error.message}`);
        skipped++;
      }
    }

    this.logSyncProgress(`Products sync result: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    return { inserted, updated, skipped };
  }
}

export class CategoriesSyncHandler extends BaseSyncHandler {
  getDataType(): DataType {
    return 'categories';
  }

  async fetchIncrementalData(lastSync: Date): Promise<any[]> {
    this.logSyncProgress('Fetching categories from Odoo...');

    try {
      const domain = [['write_date', '>=', this.formatDateTimeForOdoo(lastSync)]];
      const fields = ['id', 'name', 'display_name', 'parent_id', 'write_date', 'create_date'];
      if (!domain.every(tuple => Array.isArray(tuple) && tuple.length === 3 && typeof tuple[0] === 'string' && typeof tuple[1] === 'string')) {
        throw new Error(`Invalid domain format for product.category: ${JSON.stringify(domain)}`);
      }
      const response = await this.withRetry(async () => {
        return await odooClient.searchRead('product.category', domain, fields)
      })

      this.logSyncProgress(`Found ${response.length} categories to sync`);
      return response;
    } catch (error: any) {
      this.handleApiError(error, 'fetching categories');
      throw error
    }
  }

  async transformData(rawData: any[]): Promise<any[]> {
    this.logSyncProgress('Transforming categories data...');
    return rawData.map(category => ({
      odoo_id: category.id,
      name: category.name,
      display_name: category.display_name,
      parent_id: category.parent_id?.[0] || null,
      created_at: category.create_date,
      updated_at: category.write_date
    }));
  }

  async upsertData(transformedData: any[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }> {
    this.logSyncProgress(`Upserting ${transformedData.length} categories...`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const category of transformedData) {
      try {
        const { data: existing, error: selectError } = await supabase
          .from('categories')
          .select('id')
          .eq('odoo_id', category.odoo_id)
          .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        if (existing) {
          const { error: updateError } = await supabase
            .from('categories')
            .update(category)
            .eq('odoo_id', category.odoo_id);

          if (updateError) throw updateError;
          updated++;
        } else {
          const { error: insertError } = await supabase
            .from('categories')
            .insert(category);

          if (insertError) throw insertError;
          inserted++;
        }
      } catch (error: any) {
        this.logSyncProgress(`Error upserting category ${category.odoo_id}: ${error.message}`);
        skipped++;
      }
    }

    this.logSyncProgress(`Categories sync result: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    return { inserted, updated, skipped };
  }
}

// Import additional handlers
import { PurchasesSyncHandler } from './purchasesSyncHandler';
import { SalesSyncHandler } from './salesSyncHandler';
import { TransfersSyncHandler } from './transfersSyncHandler';
import { WarehousesSyncHandler } from './warehousesSyncHandler';

// Export individual handlers for use with orchestrator
export const syncHandlers: { [key: string]: any } = {
  products: new ProductsSyncHandler(),
  categories: new CategoriesSyncHandler(),
  warehouses: new WarehousesSyncHandler(),
  purchases: new PurchasesSyncHandler(),
  sales: new SalesSyncHandler(),
  transfers: new TransfersSyncHandler(),
}; 