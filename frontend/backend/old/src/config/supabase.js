import { createClient } from "@supabase/supabase-js"
import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables:")
  console.error("SUPABASE_URL:", !!supabaseUrl)
  console.error("SUPABASE_ANON_KEY:", !!supabaseAnonKey)
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey)
  throw new Error("Missing required Supabase environment variables")
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export const connectSupabase = async () => {
  async function fetchOdooInventory() {
    const requestData = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          process.env.ODOO_DB,
          6,
          process.env.ODOO_PASSWORD,
          'product.product',
          'search_read',
          [],
          {
            fields: ['barcode', 'qty_available'],
          }          
        ]
      },
      id: 1
    }
    const response = await axios.post(process.env.ODOO_URL, requestData)
    return response.data.result
  }

  // Update quantity in Supabase by barcode
  async function updateSupabaseQuantities(odooItems) {
    for (const item of odooItems) {
      if (!item.barcode) {
        console.warn("Skipping item without barcode:", item)
        continue
      }

      const { data, error } = await supabaseAdmin
        .from('inventory')
        .update({ qty_available: item.qty_available })
        .eq('barcode', (item.barcode))
        .select()


      if (error) {
        console.error(`❌ Failed to update barcode ${item.barcode}:`, error.message)
      } 
      if (!data || data.length === 0) {
        console.warn(`⚠️ No match in Supabase for barcode: ${item.barcode}`)
      }
      
    }
  }

  // Sync function
  async function syncInventory() {
    try {
      const odooData = await fetchOdooInventory()
      if (!Array.isArray(odooData)) {
        console.error("❌ Invalid Odoo data:", odooData)
        throw new Error("Odoo response is not an array")
      }

      await updateSupabaseQuantities(odooData)
      console.log('✅ Inventory sync complete')
    } catch (err) {
      console.error('❌ Error syncing inventory:', err)
    }
  }

  syncInventory()
}





// try {
//   const { count, error } = await supabaseAdmin
//   .from("inventory")
//   .select("count", { count: "exact", head: true })

//   if (error) throw error

//   console.log("✅ Supabase connection successful")
//   return { success: true, message: "Connected to Supabase" }
// } catch (error) {
//   console.error("❌ Supabase connection failed:", error.message)
//   return { success: false, message: error.message }
// }


// Database helper object
export const db = {
  supabaseAdmin,
  supabaseClient,

  // Categories
  async findCategory(name) {
    try {
      const { data, error } = await supabaseAdmin.from("categories").select("*").eq("name", name).single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error
      }

      return data
    } catch (error) {
      console.error("Error finding category:", error)
      return null
    }
  },

  async createCategory(categoryData) {
    try {
      const { data, error } = await supabaseAdmin.from("categories").insert(categoryData).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  },

  async upsertCategory(categoryData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("categories")
        .upsert(categoryData, {
          onConflict: "name",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error upserting category:", error)
      throw error
    }
  },

  // Warehouses
  async findWarehouse(name) {
    try {
      const { data, error } = await supabaseAdmin.from("warehouses").select("*").eq("name", name).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      return data
    } catch (error) {
      console.error("Error finding warehouse:", error)
      return null
    }
  },

  async createWarehouse(warehouseData) {
    try {
      const { data, error } = await supabaseAdmin.from("warehouses").insert(warehouseData).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating warehouse:", error)
      throw error
    }
  },

  async upsertWarehouse(warehouseData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("warehouses")
        .upsert(warehouseData, {
          onConflict: "name",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error upserting warehouse:", error)
      throw error
    }
  },

  // Inventory
  async findInventoryByOdooId(odooId) {
    try {
      const { data, error } = await supabaseAdmin.from("inventory").select("*").eq("odoo_id", odooId).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      return data
    } catch (error) {
      console.error("Error finding inventory by Odoo ID:", error)
      return null
    }
  },

  async createInventoryItem(inventoryData) {
    try {
      const { data, error } = await supabaseAdmin.from("inventory").insert(inventoryData).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating inventory item:", error)
      throw error
    }
  },

  async updateInventoryItem(id, updates) {
    try {
      const { data, error } = await supabaseAdmin.from("inventory").update(updates).eq("id", id).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating inventory item:", error)
      throw error
    }
  },

  async upsertInventoryItem(inventoryData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("inventory")
        .upsert(inventoryData, {
          onConflict: "odoo_id",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error upserting inventory item:", error)
      throw error
    }
  },

  // Warehouse Inventory
  async findWarehouseInventory(inventoryId, warehouseId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("warehouse_inventory")
        .select("*")
        .eq("inventory_id", inventoryId)
        .eq("warehouse_id", warehouseId)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      return data
    } catch (error) {
      console.error("Error finding warehouse inventory:", error)
      return null
    }
  },

  async createWarehouseInventory(warehouseInventoryData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("warehouse_inventory")
        .insert(warehouseInventoryData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating warehouse inventory:", error)
      throw error
    }
  },

  async updateWarehouseInventory(id, updates) {
    try {
      const { data, error } = await supabaseAdmin
        .from("warehouse_inventory")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating warehouse inventory:", error)
      throw error
    }
  },

  async upsertWarehouseInventory(warehouseInventoryData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("warehouse_inventory")
        .upsert(warehouseInventoryData, {
          onConflict: "inventory_id,warehouse_id",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error upserting warehouse inventory:", error)
      throw error
    }
  },

  // Generic query methods
  async query(table, options = {}) {
    try {
      let query = supabaseAdmin.from(table).select(options.select || "*")

      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending !== false })
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      console.error(`Error querying ${table}:`, error)
      throw error
    }
  },

  async count(table, where = {}) {
    try {
      let query = supabaseAdmin.from(table).select("*", { count: "exact", head: true })

      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const { count, error } = await query

      if (error) throw error
      return count
    } catch (error) {
      console.error(`Error counting ${table}:`, error)
      throw error
    }
  },

  // Dashboard stats
  async getDashboardStats() {
    try {
      const { data: inventory, error: invError } = await supabaseAdmin
        .from("inventory")
        .select(`
          id,
          reorder_level,
          unit_cost,
          warehouse_inventory(current_stock)
        `)
        .eq("is_active", true)

      if (invError) throw invError

      const stats = inventory.reduce(
        (acc, item) => {
          const totalStock = item.warehouse_inventory.reduce((sum, wh) => sum + wh.current_stock, 0)
          const stockValue = totalStock * (item.unit_cost || 0)

          acc.totalProducts++
          acc.totalValue += stockValue

          if (totalStock === 0) {
            acc.outOfStock++
          } else if (totalStock <= item.reorder_level) {
            acc.lowStock++
          }

          return acc
        },
        {
          totalProducts: 0,
          lowStock: 0,
          outOfStock: 0,
          totalValue: 0,
        },
      )

      return stats
    } catch (error) {
      console.error("Error getting dashboard stats:", error)
      throw error
    }
  },

  // Inventory operations
  async getInventory(filters = {}, page = 1, perPage = 100) {
    try {
      const start = (page - 1) * perPage
      const end = start + perPage - 1
      let query = supabaseAdmin
        .from("inventory")
        .select(`
          *,
          category:categories(*),
          warehouse_inventory(
            *,
            warehouse:warehouses(*)
          )
        `)
        .eq("is_active", true)

      if (filters.search) {
        query = query.or(`product_name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)
      }

      if (filters.category_id) {
        query = query.eq("category_id", filters.category_id)
      }

      const { data, error } = await query.order("product_name")
      if (error) throw error
      return data
    } catch (error) {
      console.error("Error getting inventory:", error)
      throw error
    }
  },

  // Stock movement operations
  async createStockMovement(movement) {
    try {
      const { data, error } = await supabaseAdmin.from("stock_movements").insert(movement).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating stock movement:", error)
      throw error
    }
  },

  async getStockMovements(inventoryId, limit = 30) {
    try {
      const { data, error } = await supabaseAdmin
        .from("stock_movements")
        .select(`
          *,
          inventory:inventory(*),
          warehouse:warehouses(*),
          created_by_profile:profiles(*)
        `)
        .eq("inventory_id", inventoryId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error getting stock movements:", error)
      throw error
    }
  },
}

// Export individual clients as well
export { supabaseClient, supabaseAdmin }
export default supabaseAdmin
