import { supabase } from "@/lib/supabase-client"
import type { StockMovement } from "@/lib/supabase"



export class StockMovementAPI {
  static async createStockMovement(movement: Partial<StockMovement>): Promise<StockMovement> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from("stock_movements")
      .insert({
        ...movement,
        created_by: user.user?.id,
      })
      .select(`
        *,
        inventory:inventory(*),
        warehouse:warehouses(*),
        created_by_profile:profiles(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  // Get stock movements for an inventory item
  static async getMovementsByInventory(inventoryId: string): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        inventory:inventory(*),
        warehouse:warehouses(*),
        created_by_profile:profiles(*)
      `)
      .eq("inventory_id", inventoryId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get recent stock movements
  static async getRecentMovements(limit = 50): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        inventory:inventory(*),
        warehouse:warehouses(*),
        created_by_profile:profiles(*)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Get movements by warehouse
  static async getMovementsByWarehouse(warehouseId: string): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        inventory:inventory(*),
        warehouse:warehouses(*),
        created_by_profile:profiles(*)
      `)
      .eq("warehouse_id", warehouseId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  }

  // Bulk stock adjustment
  static async bulkStockAdjustment(
    adjustments: Array<{
      inventory_id: string
      warehouse_id: string
      quantity: number
      notes?: string
    }>,
  ): Promise<StockMovement[]> {
    const { data: user } = await supabase.auth.getUser()

    const movements = adjustments.map((adj) => ({
      ...adj,
      movement_type: "adjustment" as const,
      created_by: user.user?.id,
    }))

    const { data, error } = await supabase
      .from("stock_movements")
      .insert(movements)
      .select(`
        *,
        inventory:inventory(*),
        warehouse:warehouses(*),
        created_by_profile:profiles(*)
      `)

    if (error) throw error
    return data || []
  }
}