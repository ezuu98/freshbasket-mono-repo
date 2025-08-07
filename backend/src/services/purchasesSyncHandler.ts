import { odooClient } from '../config/odoo';
import { supabase } from '../config/supabase';
import { BaseSyncHandler } from './baseSyncHandler';
import { DataType } from '../types/sync';

interface PurchaseOrder {
  id: number;
  order_line: number[];
  date_order: string;
  state: string;
  picking_type_id: [number, string];
}

interface PickingType {
  id: number;
  warehouse_id: [number, string];
}

interface PurchaseOrderLine {
  id: number;
  order_id: [number, string];
  product_id: [number, string];
  product_qty: number;
  state: string;
}

interface RawPurchaseItem {
  product_id: [number, string];
  warehouse_id: number;
  product_qty: number;
  order_date: string;
  odoo_id: number;
}

interface TransformedPurchaseMovement {
  product_id: number;
  warehouse_dest_id: number;
  quantity: number;
  date: string;
  movement_type: 'purchase';
  odoo_id: number;
}

interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export class PurchasesSyncHandler extends BaseSyncHandler {
  private static readonly WAREHOUSE_IDS = [1, 2, 3, 4, 5, 8, 9, 10, 12, 18] as const;
  private static readonly BATCH_SIZE = 1000;
  private static readonly REQUEST_DELAY = 500; // ms
  
  // Date range constants - consider making these configurable
  private static readonly DATE_RANGE_START = '2025-07-01 00:00';
  private static readonly DATE_RANGE_END = '2025-07-25 23:59';

  getDataType(): DataType {
    return 'purchases';
  }

  async fetchIncrementalData(lastSync: Date): Promise<RawPurchaseItem[]> {
    this.logSyncProgress('Fetching purchases from Odoo...');

    try {
      const [purchaseOrders, pickingTypeToWarehouse] = await Promise.all([
        this.fetchPurchaseOrders(lastSync),
        this.fetchPickingTypeMapping()
      ]);

      if (purchaseOrders.length === 0) {
        this.logSyncProgress('No purchase orders found');
        return [];
      }

      const orderLineIds = this.extractOrderLineIds(purchaseOrders);
      if (orderLineIds.length === 0) {
        this.logSyncProgress('No purchase order lines found');
        return [];
      }

      const allOrderLines = await this.fetchOrderLinesInBatches(orderLineIds);
      const purchaseItems = this.buildPurchaseItems(
        purchaseOrders, 
        allOrderLines, 
        pickingTypeToWarehouse
      );

      this.logSyncProgress(`Found ${purchaseItems.length} purchase items to sync`);
      return purchaseItems;

    } catch (error: any) {
      this.handleApiError(error, 'fetching purchases');
      throw error;
    }
  }

  private async fetchPurchaseOrders(lastSync: Date): Promise<PurchaseOrder[]> {
    return await this.withRetry(async () => {
      const domain = [
        ['state', '!=', 'cancel'],
        ['write_date', '>=', this.formatDateTimeForOdoo(lastSync)],
        ['date_order', '>=', PurchasesSyncHandler.DATE_RANGE_START],
        ['date_order', '<=', PurchasesSyncHandler.DATE_RANGE_END]
      ];
      
      const fields = ['id', 'order_line', 'date_order', 'state', 'picking_type_id'];
      
      return await odooClient.searchRead('purchase.order', domain, fields);
    });
  }

  private async fetchPickingTypeMapping(): Promise<Map<number, number>> {
    const pickingTypes: PickingType[] = await this.withRetry(async () => {
      const domain = [['warehouse_id', 'in', [...PurchasesSyncHandler.WAREHOUSE_IDS]]];
      const fields = ['id', 'warehouse_id'];
      
      return await odooClient.searchRead('stock.picking.type', domain, fields);
    });

    const pickingTypeToWarehouse = new Map<number, number>();
    pickingTypes.forEach(pt => {
      if (pt.warehouse_id?.[0]) {
        pickingTypeToWarehouse.set(pt.id, pt.warehouse_id[0]);
      }
    });

    return pickingTypeToWarehouse;
  }

  private extractOrderLineIds(purchaseOrders: PurchaseOrder[]): number[] {
    return purchaseOrders.flatMap(po => po.order_line || []);
  }

  private async fetchOrderLinesInBatches(orderLineIds: number[]): Promise<PurchaseOrderLine[]> {
    const batches = this.createBatches(orderLineIds, PurchasesSyncHandler.BATCH_SIZE);
    const allOrderLines: PurchaseOrderLine[] = [];

    for (const [index, batch] of batches.entries()) {
      this.logSyncProgress(`Fetching order lines batch ${index + 1}/${batches.length}`);
      
      const orderLines = await this.withRetry(async () => {
        const domain = [['id', 'in', batch]];
        const fields = ['id', 'order_id', 'product_id', 'product_qty', 'state'];
        
        return await odooClient.searchRead('purchase.order.line', domain, fields);
      });
      
      allOrderLines.push(...orderLines);
      await this.delay(PurchasesSyncHandler.REQUEST_DELAY);
    }

    return allOrderLines;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private buildPurchaseItems(
    purchaseOrders: PurchaseOrder[],
    allOrderLines: PurchaseOrderLine[],
    pickingTypeToWarehouse: Map<number, number>
  ): RawPurchaseItem[] {
    const purchaseItems: RawPurchaseItem[] = [];
    
    // Create order lines lookup for better performance
    const orderLinesLookup = new Map<number, PurchaseOrderLine[]>();
    allOrderLines.forEach(line => {
      const orderId = line.order_id?.[0];
      if (orderId) {
        if (!orderLinesLookup.has(orderId)) {
          orderLinesLookup.set(orderId, []);
        }
        orderLinesLookup.get(orderId)!.push(line);
      }
    });

    purchaseOrders.forEach(order => {
      const warehouseId = this.getWarehouseIdFromOrder(order, pickingTypeToWarehouse);
      if (!warehouseId) {
        this.logSyncProgress(`Skipping order ${order.id}: no valid warehouse mapping`);
        return;
      }

      const orderLines = orderLinesLookup.get(order.id) || [];
      orderLines.forEach(line => {
        if (this.isValidPurchaseLine(line)) {
          purchaseItems.push({
            product_id: line.product_id,
            warehouse_id: warehouseId,
            product_qty: line.product_qty,
            order_date: order.date_order,
            odoo_id: line.id
          });
        }
      });
    });

    return purchaseItems;
  }

  private getWarehouseIdFromOrder(
    order: PurchaseOrder, 
    pickingTypeToWarehouse: Map<number, number>
  ): number | null {
    const pickingTypeId = order.picking_type_id?.[0];
    return pickingTypeId ? pickingTypeToWarehouse.get(pickingTypeId) || null : null;
  }

  private isValidPurchaseLine(line: PurchaseOrderLine): boolean {
    return !!(line.product_id?.[0] && line.product_qty > 0);
  }

  async transformData(rawData: RawPurchaseItem[]): Promise<TransformedPurchaseMovement[]> {
    this.logSyncProgress('Transforming purchases data...');

    return rawData.map(purchase => ({
      product_id: purchase.product_id[0],
      warehouse_dest_id: purchase.warehouse_id,
      quantity: purchase.product_qty,
      date: purchase.order_date,
      movement_type: 'purchase' as const,
      odoo_id: purchase.odoo_id
    }));
  }

  async upsertData(transformedData: TransformedPurchaseMovement[]): Promise<UpsertResult> {
    this.logSyncProgress(`Upserting ${transformedData.length} purchase movements...`);

    if (transformedData.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    // Consider batch upsert for better performance with large datasets
    if (transformedData.length > 100) {
      return await this.batchUpsertData(transformedData);
    }

    return await this.individualUpsertData(transformedData);
  }

  private async individualUpsertData(movements: TransformedPurchaseMovement[]): Promise<UpsertResult> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const movement of movements) {
      try {
        const result = await this.upsertSingleMovement(movement);
        if (result === 'inserted') inserted++;
        else if (result === 'updated') updated++;
        else skipped++;
      } catch (error: any) {
        this.logSyncProgress(`Error upserting purchase movement: ${error.message}`);
        skipped++;
      }
    }

    this.logSyncProgress(
      `Purchases sync result: ${inserted} inserted, ${updated} updated, ${skipped} skipped`
    );
    return { inserted, updated, skipped };
  }

  private async upsertSingleMovement(
    movement: TransformedPurchaseMovement
  ): Promise<'inserted' | 'updated' | 'skipped'> {
    // Check if movement already exists using composite key
    const { data: existing, error: selectError } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('product_id', movement.product_id)
      .eq('warehouse_dest_id', movement.warehouse_dest_id)
      .eq('movement_type', 'purchase')
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
      return 'updated';
    } else {
      // Insert new movement
      const { error: insertError } = await supabase
        .from('stock_movements')
        .insert(movement);

      if (insertError) throw insertError;
      return 'inserted';
    }
  }

  private async batchUpsertData(movements: TransformedPurchaseMovement[]): Promise<UpsertResult> {
    this.logSyncProgress('Using batch upsert for large dataset...');
    
    try {
      const { error } = await supabase
        .from('stock_movements')
        .upsert(movements, {
          onConflict: 'product_id,warehouse_dest_id,movement_type,date',
          ignoreDuplicates: false
        });

      if (error) throw error;

      return {
        inserted: movements.length,
        updated: 0,
        skipped: 0
      };
    } catch (error) {
      // Fallback to individual upserts if batch fails
      this.logSyncProgress('Batch upsert failed, falling back to individual upserts...');
      return await this.individualUpsertData(movements);
    }
  }
}