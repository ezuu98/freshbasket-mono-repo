-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Warehouses policies
CREATE POLICY "Authenticated users can view warehouses" ON warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage warehouses" ON warehouses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Categories policies
CREATE POLICY "Authenticated users can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Inventory policies
CREATE POLICY "Authenticated users can view inventory" ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create inventory" ON inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Managers can manage inventory" ON inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Warehouse inventory policies
CREATE POLICY "Authenticated users can view warehouse inventory" ON warehouse_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can update warehouse inventory" ON warehouse_inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Managers can manage warehouse inventory" ON warehouse_inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Stock movements policies
CREATE POLICY "Authenticated users can view stock movements" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create stock movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Managers can manage stock movements" ON stock_movements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Suppliers policies
CREATE POLICY "Authenticated users can view suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage suppliers" ON suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Purchase orders policies
CREATE POLICY "Authenticated users can view purchase orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create purchase orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Managers can manage purchase orders" ON purchase_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Purchase order items policies
CREATE POLICY "Authenticated users can view purchase order items" ON purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage purchase order items" ON purchase_order_items FOR ALL TO authenticated USING (true);
