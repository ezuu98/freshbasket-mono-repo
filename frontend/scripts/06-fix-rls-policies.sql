-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authentication users only" ON profiles;

-- Drop all other problematic policies
DROP POLICY IF EXISTS "Authenticated users can view warehouses" ON warehouses;
DROP POLICY IF EXISTS "Managers can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON categories;
DROP POLICY IF EXISTS "Managers can manage categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON inventory;
DROP POLICY IF EXISTS "Staff can create inventory" ON inventory;
DROP POLICY IF EXISTS "Managers can manage inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can view warehouse inventory" ON warehouse_inventory;
DROP POLICY IF EXISTS "Staff can update warehouse inventory" ON warehouse_inventory;
DROP POLICY IF EXISTS "Managers can manage warehouse inventory" ON warehouse_inventory;
DROP POLICY IF EXISTS "Authenticated users can view stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Staff can create stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Managers can manage stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Managers can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can view purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Staff can create purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Managers can manage purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can view purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Staff can manage purchase order items" ON purchase_order_items;

-- Create simple, non-recursive policies for profiles
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Simple policies for other tables - just check if user is authenticated
CREATE POLICY "warehouses_select" ON warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "warehouses_insert" ON warehouses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "warehouses_update" ON warehouses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "warehouses_delete" ON warehouses
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "categories_select" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categories_insert" ON categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "categories_update" ON categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "categories_delete" ON categories
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "inventory_select" ON inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "inventory_insert" ON inventory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "inventory_update" ON inventory
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "inventory_delete" ON inventory
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "warehouse_inventory_select" ON warehouse_inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "warehouse_inventory_insert" ON warehouse_inventory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "warehouse_inventory_update" ON warehouse_inventory
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "warehouse_inventory_delete" ON warehouse_inventory
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "stock_movements_select" ON stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_movements_insert" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "stock_movements_update" ON stock_movements
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "stock_movements_delete" ON stock_movements
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "suppliers_insert" ON suppliers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "suppliers_delete" ON suppliers
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "purchase_orders_select" ON purchase_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "purchase_orders_insert" ON purchase_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "purchase_orders_update" ON purchase_orders
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "purchase_orders_delete" ON purchase_orders
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "purchase_order_items_select" ON purchase_order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "purchase_order_items_insert" ON purchase_order_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "purchase_order_items_update" ON purchase_order_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "purchase_order_items_delete" ON purchase_order_items
  FOR DELETE TO authenticated USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure the auth schema permissions are correct
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
