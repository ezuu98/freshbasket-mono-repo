import { supabase, InventoryWithDetails } from '../config/supabase';

export class InventoryService {
  static async getInventoryWithWarehouses(): Promise<{
    data: InventoryWithDetails[];
    total: number;
  }> {
    try {
      const batchSize = 1000;
      let allMergedData: InventoryWithDetails[] = [];

      const { count, error: countError } = await supabase
        .from('inventory')
        .select('odoo_id', { count: 'exact', head: true })
        .eq('active', true)
        .eq('type', 'product');

      if (countError) throw countError;
      const total = typeof count === 'number' ? count : 0;

      for (let from = 0; from < total; from += batchSize) {
        const to = from + batchSize - 1;

        const { data: inventoryBatch, error: inventoryError } = await supabase
          .from('inventory')
          .select(`
            odoo_id, name, barcode, uom_name, standard_price, reordering_min_qty, reordering_max_qty, list_price,
            category:categories(display_name, active, name)
          `)
          .eq('active', true)
          .eq('type', 'product')
          .order('name', { ascending: true })
          .range(from, to);

        if (inventoryError) throw inventoryError;

        const odooIds = (inventoryBatch || []).map(item => item.odoo_id);

        const { data: warehouseInventory, error: whError } = await supabase
          .from('warehouse_inventory')
          .select(`
            product_id,
            quantity,
            barcode,
            warehouse:warehouses(id, name, code)
          `)
          .in('product_id', odooIds);

        if (whError) throw whError;

        const { data: stockMovements, error: stockError } = await supabase
          .from('stock_movements')
          .select(`product_id, movement_type, quantity, warehouse_id, warehouse_dest_id`)
          .in('product_id', odooIds);

        if (stockError) throw stockError;

        const stockMap = new Map<number, Map<number, number>>();

        for (const move of stockMovements || []) {
          const { product_id, movement_type, quantity, warehouse_id, warehouse_dest_id } = move;
          if (!product_id || !quantity) continue;

          const updateWarehouseStock = (productId: number, warehouseId: number, qtyDelta: number) => {
            if (!stockMap.has(productId)) stockMap.set(productId, new Map());
            const warehouseMap = stockMap.get(productId)!;
            warehouseMap.set(warehouseId, (warehouseMap.get(warehouseId) || 0) + qtyDelta);
          };

          if (movement_type === 'purchase') {
            if (warehouse_dest_id) updateWarehouseStock(product_id, warehouse_dest_id, quantity);
          } else if (movement_type === 'purchase_return') {
            if (warehouse_id) updateWarehouseStock(product_id, warehouse_id, quantity);
          } else if (movement_type === 'sales') {
            if (warehouse_id) updateWarehouseStock(product_id, warehouse_id, -quantity);
          } else if (movement_type === 'sales_returns') {
            if (warehouse_id) updateWarehouseStock(product_id, warehouse_id, Math.abs(quantity));
          } else if (movement_type === 'transfer_in') {
            if (warehouse_dest_id) updateWarehouseStock(product_id, warehouse_dest_id, quantity);
            if (warehouse_id) updateWarehouseStock(product_id, warehouse_id, -quantity);
          } else if (movement_type === 'manufacturing') {
            if (warehouse_id) updateWarehouseStock(product_id, warehouse_id, quantity);
          } else if (movement_type === 'consumption') {
            if (warehouse_id) updateWarehouseStock(product_id, warehouse_id, quantity);
          }else if (movement_type === 'wastages') {
            if (warehouse_id) updateWarehouseStock(product_id, warehouse_id, -quantity);
          }
        }

        const mergedBatch: InventoryWithDetails[] = (inventoryBatch || []).map(item => {
          const matchingWarehouses = warehouseInventory?.filter(wi => wi.product_id === item.odoo_id || (wi.barcode && wi.barcode === item.barcode)
         ) || [];

         console.log(`Product ${item.odoo_id} (barcode=${item.barcode}): ${matchingWarehouses.length} warehouse entries`);
          
          const mergedInventory = matchingWarehouses.map(wi => {
            const warehouseObj = Array.isArray(wi.warehouse) ? wi.warehouse[0] : wi.warehouse;
            const openingStock = wi.quantity || 0;
            const movementStock = stockMap.get(item.odoo_id)?.get(warehouseObj.id) || 0;
            const calculatedStock = openingStock + movementStock;

            return {
              ...wi,
              warehouse: warehouseObj,
              stock_quantity: calculatedStock,
            };
          });

          return {
            ...item,
            warehouse_inventory: mergedInventory,
          } as unknown as InventoryWithDetails;
        });

        allMergedData = [...allMergedData, ...mergedBatch];
      }

      return {
        data: allMergedData,
        total,
      };
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw new Error('Failed to fetch inventory data');
    }
  }

  static async searchInventory(
    query: string,
    page = 1,
    limit = 30
  ): Promise<{
    data: InventoryWithDetails[];
    total: number;
  }> {
    try {
      const { data: allInventory } = await this.getInventoryWithWarehouses();

      const searchTerm = query.toLowerCase();
      const filteredData = allInventory.filter(item => {
        const searchableFields = [
          item.name,
          item.barcode,
          item.category?.name,
          item.category?.display_name,
        ].filter(Boolean);

        return searchableFields.some(field =>
          field?.toLowerCase().includes(searchTerm)
        );
      });

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: filteredData.length,
      };
    } catch (error) {
      console.error('Error searching inventory:', error);
      throw new Error('Failed to search inventory');
    }
  }

  static async getInventoryWithFilters(
    query?: string,
    category?: string,
    status?: string,
    page = 1,
    limit = 30
  ): Promise<{
    data: InventoryWithDetails[];
    total: number;
  }> {
    try {
      const { data: allInventory } = await this.getInventoryWithWarehouses();

      let filteredData = allInventory;

      // Apply search filter
      if (query) {
        const searchTerm = query.toLowerCase();
        filteredData = filteredData.filter(item => {
          const searchableFields = [
            item.name,
            item.barcode,
            item.category?.name,
            item.category?.display_name,
          ].filter(Boolean);

          return searchableFields.some(field =>
            field?.toLowerCase().includes(searchTerm)
          );
        });
      }

      // Apply category filter
      if (category && category !== "All Categories") {
        filteredData = filteredData.filter(item => 
          item.category?.display_name === category
        );
      }

      // Apply stock status filter
      if (status && status !== "All Status") {
        filteredData = filteredData.filter(item => {
          const totalStock = item.warehouse_inventory?.reduce((sum, wh) => sum + (wh.stock_quantity || 0), 0) || 0;
          
          switch (status) {
            case "in-stock":
              return totalStock > (item.reordering_min_qty || 0);
            case "low-stock":
              return totalStock <= (item.reordering_min_qty || 0) && totalStock > 0;
            case "out-of-stock":
              return totalStock === 0;
            default:
              return true;
          }
        });
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: filteredData.length,
      };
    } catch (error) {
      console.error('Error filtering inventory:', error);
      throw new Error('Failed to filter inventory');
    }
  }

  static async getLowStockCount(): Promise<{
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    try {
      const { data: inventory } = await this.getInventoryWithWarehouses();

      let lowStockCount = 0;
      let outOfStockCount = 0;

      inventory.forEach(item => {
        const totalStock = item.warehouse_inventory?.reduce((sum, wh) => sum + wh.stock_quantity, 0) || 0;
        const minQty = item.reordering_min_qty || 0;

        if (totalStock <= 0) {
          outOfStockCount++;
        } else if (totalStock <= minQty) {
          lowStockCount++;
        }
      });

      return {
        lowStockCount,
        outOfStockCount,
      };
    } catch (error) {
      console.error('Error getting stock counts:', error);
      throw new Error('Failed to get stock counts');
    }
  }

  static async getStockMovementDetails(
    productId: string,
    month: number,
    year: number
  ): Promise<{
    data: any[];
  }> {
    try {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data: movements, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          movement_type,
          quantity,
          created_at,
          warehouse:warehouses!stock_movements_warehouse_id_fkey(name, code),
          warehouse_dest:warehouses!fk_warehouse_dest(name, code)
        `)
        .eq('product_id', productId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const warehouseMap = new Map<string, { name: string; code: string }>();

      const processedMovements = movements?.map(movement => {
        const warehouse = Array.isArray(movement.warehouse) ? movement.warehouse[0] : movement.warehouse;
        const warehouseDest = Array.isArray(movement.warehouse_dest) ? movement.warehouse_dest[0] : movement.warehouse_dest;

        if (warehouse) {
          warehouseMap.set(warehouse.code, warehouse);
        }
        if (warehouseDest) {
          warehouseMap.set(warehouseDest.code, warehouseDest);
        }

        return {
          id: movement.id,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          created_at: movement.created_at,
          date: movement.created_at,
          warehouse: warehouse,
          warehouse_dest: warehouseDest,
        };
      }) || [];

      return {
        data: processedMovements,
      };
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      throw new Error('Failed to fetch stock movement details');
    }
  }

  static async getStockMovementDetailsByDateRange(
    productId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    data: any[];
    opening_stocks: Record<string, number>;
  }> {
    try {
      const start = new Date(startDate + 'T00:00:00.000Z').toISOString();
      const end = new Date(endDate + 'T23:59:59.999Z').toISOString();
      
      const { data: movements, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          movement_type,
          quantity,
          created_at,
          warehouse:warehouses!stock_movements_warehouse_id_fkey(id, name, code),
          warehouse_dest:warehouses!fk_warehouse_dest(id, name, code)
        `)
        .eq('product_id', productId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let openingStockData = null;
      let openingError = null;
      
      try {
        const result = await supabase
          .rpc('get_opening_stock_by_warehouse', {
            p_product_id: parseInt(productId),
            p_date: startDate
          });
        openingStockData = result.data;
        openingError = result.error;
      } catch (err) {
        console.error('Function call failed:', err);
        openingError = err;
      }

      if (openingError) {
        console.error('Opening stock error:', openingError);
        console.log('Continuing without opening stock data');
      }
      
      const openingStocks: Record<string, number> = {};
      openingStockData?.forEach((item: { warehouse_id: string; opening_stock: number }) => {
        openingStocks[item.warehouse_id] = item.opening_stock;
      });
      
      // If no opening stock data, provide some default values for testing
      if (Object.keys(openingStocks).length === 0) {
        console.log('No opening stock data available, using defaults for testing');
        // Add default opening stocks for warehouses that appear in movements
        const warehouseIds = new Set<string>();
        movements?.forEach(movement => {
          const warehouse = Array.isArray(movement.warehouse) ? movement.warehouse[0] : movement.warehouse;
          const warehouseDest = Array.isArray(movement.warehouse_dest) ? movement.warehouse_dest[0] : movement.warehouse_dest;
          
          if (warehouse?.id) warehouseIds.add(warehouse.id.toString());
          if (warehouseDest?.id) warehouseIds.add(warehouseDest.id.toString());
        });
        
        warehouseIds.forEach(warehouseId => {
          openingStocks[warehouseId] = 0; // Default to 0 opening stock
        });
      }

      const warehouseMap = new Map<string, { name: string; code: string }>();

      const processedMovements = movements?.map(movement => {
        const warehouse = Array.isArray(movement.warehouse) ? movement.warehouse[0] : movement.warehouse;
        const warehouseDest = Array.isArray(movement.warehouse_dest) ? movement.warehouse_dest[0] : movement.warehouse_dest;

        if (warehouse) {
          warehouseMap.set(warehouse.code, warehouse);
        }
        if (warehouseDest) {
          warehouseMap.set(warehouseDest.code, warehouseDest);
        }

        return {
          id: movement.id,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          created_at: movement.created_at,
          warehouse: warehouse,
          warehouse_dest: warehouseDest,
        };
      }) || [];
      return {
        data: processedMovements,
        opening_stocks: openingStocks,
      };
    } catch (error) {
      console.error('Error fetching stock movements by date range:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error('Failed to fetch stock movement details for date range');
    }
  }
} 
