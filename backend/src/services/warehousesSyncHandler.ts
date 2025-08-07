import { odooClient } from '../config/odoo';
import { supabase } from '../config/supabase';
import { BaseSyncHandler } from './baseSyncHandler';
import { DataType } from '../types/sync';

export class WarehousesSyncHandler extends BaseSyncHandler {
  getDataType(): DataType {
    return 'warehouses';
  }

  async fetchIncrementalData(lastSync: Date): Promise<any[]> {
    this.logSyncProgress('Fetching warehouses from Odoo...');

    try {
      const domain = [
        ['write_date', '>=', this.formatDateTimeForOdoo(lastSync)],
        ['active', '=', true]
      ];
      const fields =
        [
          'id', 'name', 'code', 'lot_stock_id', 'view_location_id',
          'write_date', 'create_date', 'active'
        ];

      if (!domain.every(tuple => Array.isArray(tuple) && tuple.length === 3 && typeof tuple[0] === 'string' && typeof tuple[1] === 'string')) {
        throw new Error(`Invalid domain format for stock.warehouse: ${JSON.stringify(domain)}`);
      }
      const warehouses = await this.withRetry(async () => {
        return await odooClient.searchRead('stock.warehouse', domain, fields);
      });


      this.logSyncProgress(`Found ${warehouses.length} warehouses to sync`);
      return warehouses;

    } catch (error: any) {
      this.handleApiError(error, 'fetching warehouses');
    }
  }

  async transformData(rawData: any[]): Promise<any[]> {
    this.logSyncProgress('Transforming warehouses data...');

    return rawData.map(warehouse => ({
      odoo_id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      lot_stock_id: warehouse.lot_stock_id?.[0] || null,
      view_location_id: warehouse.view_location_id?.[0] || null,
      active: warehouse.active || true,
      created_at: warehouse.create_date,
      updated_at: warehouse.write_date
    }));
  }

  async upsertData(transformedData: any[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }> {
    this.logSyncProgress(`Upserting ${transformedData.length} warehouses...`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const warehouse of transformedData) {
      try {
        // Check if warehouse already exists
        const { data: existing, error: selectError } = await supabase
          .from('warehouses')
          .select('id')
          .eq('odoo_id', warehouse.odoo_id)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        if (existing) {
          // Update existing warehouse
          const { error: updateError } = await supabase
            .from('warehouses')
            .update(warehouse)
            .eq('odoo_id', warehouse.odoo_id);

          if (updateError) throw updateError;
          updated++;
        } else {
          // Insert new warehouse
          const { error: insertError } = await supabase
            .from('warehouses')
            .insert(warehouse);

          if (insertError) throw insertError;
          inserted++;
        }
      } catch (error: any) {
        this.logSyncProgress(`Error upserting warehouse ${warehouse.odoo_id}: ${error.message}`);
        skipped++;
      }
    }

    this.logSyncProgress(`Warehouses sync result: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    return { inserted, updated, skipped };
  }
} 