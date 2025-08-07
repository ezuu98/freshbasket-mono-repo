import { odooClient } from '../config/odoo';
import { supabase } from '../config/supabase';
import { BaseSyncHandler } from './baseSyncHandler';
import { DataType } from '../types/sync';

export class TransfersSyncHandler extends BaseSyncHandler {
  getDataType(): DataType {
    return 'transfers';
  }

  async fetchIncrementalData(lastSync: Date): Promise<any[]> {
    this.logSyncProgress('Fetching transfers from Odoo...');

    try {
      // Fetch stock moves (transfers) modified since last sync
      const stockMoves = await this.withRetry(async () => {
        const domain = [
          ['location_id', 'in', [7, 20, 28, 36, 44, 82, 98, 106, 114]],
          ['location_dest_id', 'in', [7, 20, 28, 36, 44, 82, 98, 106, 114]],
          ['location_dest_id', '!=', 'location_id'],
          ['write_date', '>=', this.formatDateTimeForOdoo(lastSync)],
          ['date', '>=', '2024-07-01 00:00']
        ];
        const options = {
          fields: ['id', 'product_id', 'product_qty', 'location_dest_id', 'location_id', 'date', 'write_date']
        };
        return await odooClient.call('stock.move', 'search_read', domain, options);
      });

      if (!stockMoves || stockMoves.length === 0) {
        this.logSyncProgress('No stock moves found');
        return [];
      }

      const warehouses = await this.withRetry(async () => {
        return await odooClient.call('stock.warehouse', 'search_read', [], {
          fields: ['id', 'name', 'lot_stock_id']
        });
      });

      // Create location to warehouse mapping
      const locationToWarehouseMap = new Map<number, number>();
      warehouses.forEach((warehouse: any) => {
        const locationId = warehouse.lot_stock_id?.[0];
        if (locationId) {
          locationToWarehouseMap.set(locationId, warehouse.id);
        }
      });

      // Transform stock moves to transfers
      const transfers = stockMoves
        .map((move: any) => {
          const fromWhId = locationToWarehouseMap.get(move.location_id?.[0]);
          const toWhId = locationToWarehouseMap.get(move.location_dest_id?.[0]);

          if (!fromWhId || !toWhId) {
            this.logSyncProgress(`⚠️ Missing warehouse mapping for move ${move.id}`);
            return null;
          }

          return {
            product_id: move.product_id,
            warehouse_from_id: fromWhId,
            warehouse_to_id: toWhId,
            product_qty: move.product_qty,
            date: move.date,
            odoo_id: move.id
          };
        })
        .filter(Boolean); // Remove null entries

      this.logSyncProgress(`Found ${transfers.length} valid transfers to sync`);
      return transfers;

    } catch (error: any) {
      this.handleApiError(error, 'fetching transfers');
      throw error
    }
  }

  async transformData(rawData: any[]): Promise<any[]> {
    this.logSyncProgress('Transforming transfers data...');

    return rawData.map(transfer => ({
      product_id: transfer.product_id[0],
      warehouse_id: transfer.warehouse_from_id,
      warehouse_dest_id: transfer.warehouse_to_id,
      quantity: transfer.product_qty,
      date: transfer.date,
      movement_type: 'transfer_in',
      odoo_id: transfer.odoo_id
    }));
  }

  async upsertData(transformedData: any[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }> {
    this.logSyncProgress(`Upserting ${transformedData.length} transfer movements...`);

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
          .eq('warehouse_dest_id', movement.warehouse_dest_id)
          .eq('movement_type', 'transfer_in')
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

        // Update warehouse inventory for source warehouse (decrease)
        await this.updateWarehouseInventory(
          movement.product_id,
          movement.warehouse_id,
          -movement.quantity
        );

        // Update warehouse inventory for destination warehouse (increase)
        await this.updateWarehouseInventory(
          movement.product_id,
          movement.warehouse_dest_id,
          movement.quantity
        );

      } catch (error: any) {
        this.logSyncProgress(`Error upserting transfer movement: ${error.message}`);
        skipped++;
      }
    }

    this.logSyncProgress(`Transfers sync result: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    return { inserted, updated, skipped };
  }

  private async updateWarehouseInventory(
    productId: number,
    warehouseId: number,
    quantityDelta: number
  ): Promise<void> {
    try {
      // Check if warehouse inventory record exists
      const { data: existing, error: selectError } = await supabase
        .from('warehouse_inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('wh_id', warehouseId)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (!existing) {
        // Create new warehouse inventory record
        const { error: insertError } = await supabase
          .from('warehouse_inventory')
          .insert({
            product_id: productId,
            wh_id: warehouseId,
            quantity: Math.max(0, quantityDelta) // Ensure non-negative
          });

        if (insertError) throw insertError;
      } else {
        // Update existing warehouse inventory record
        const newQuantity = Math.max(0, existing.quantity + quantityDelta);
        const { error: updateError } = await supabase
          .from('warehouse_inventory')
          .update({ quantity: newQuantity })
          .eq('product_id', productId)
          .eq('wh_id', warehouseId);

        if (updateError) throw updateError;
      }
    } catch (error: any) {
      this.logSyncProgress(`Error updating warehouse inventory: ${error.message}`);
      // Don't throw here to avoid failing the entire sync
    }
  }
} 