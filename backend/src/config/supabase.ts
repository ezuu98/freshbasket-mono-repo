import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database types (you can generate these from Supabase CLI)
export interface Inventory {
  id: number;
  odoo_id: number;
  name: string;
  barcode?: string;
  uom_name: string;
  standard_price: number;
  reordering_min_qty: number;
  reordering_max_qty: number;
  list_price: number;
  active: boolean;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseInventory {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  movement_type: string;
  quantity: number;
  date: string;
  product_id: number;
  warehouse_id?: number;
  warehouse_dest_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  display_name: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryWithDetails {
  id?: number;
  odoo_id: number;
  name: string;
  barcode?: string;
  uom_name: string;
  standard_price: number;
  reordering_min_qty: number;
  reordering_max_qty: number;
  list_price: number;
  active?: boolean;
  type?: string;
  created_at?: string;
  updated_at?: string;
  category?: Category;
  date?: string;
  warehouse_inventory?: Array<{
    warehouse: Warehouse;
    quantity: number;
    stock_quantity: number;
  }>;
} 