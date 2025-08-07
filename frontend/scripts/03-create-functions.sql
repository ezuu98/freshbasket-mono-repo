-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update warehouse inventory after stock movement
CREATE OR REPLACE FUNCTION update_warehouse_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current stock based on movement type
  IF NEW.movement_type IN ('purchase', 'transfer_in', 'adjustment') THEN
    UPDATE warehouse_inventory 
    SET current_stock = current_stock + NEW.quantity,
        last_updated = NOW()
    WHERE inventory_id = NEW.inventory_id AND warehouse_id = NEW.warehouse_id;
  ELSIF NEW.movement_type IN ('sale', 'transfer_out', 'wastage') THEN
    UPDATE warehouse_inventory 
    SET current_stock = current_stock - NEW.quantity,
        last_updated = NOW()
    WHERE inventory_id = NEW.inventory_id AND warehouse_id = NEW.warehouse_id;
  ELSIF NEW.movement_type = 'return' THEN
    UPDATE warehouse_inventory 
    SET current_stock = current_stock + NEW.quantity,
        last_updated = NOW()
    WHERE inventory_id = NEW.inventory_id AND warehouse_id = NEW.warehouse_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock movements
CREATE TRIGGER update_inventory_on_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_inventory();

-- Function to get inventory summary
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
  inventory_id UUID,
  barcode VARCHAR,
  product_name VARCHAR,
  category_name VARCHAR,
  total_stock BIGINT,
  total_value DECIMAL,
  low_stock_items BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.barcode,
    i.product_name,
    c.name as category_name,
    COALESCE(SUM(wi.current_stock), 0) as total_stock,
    COALESCE(SUM(wi.current_stock * i.unit_cost), 0) as total_value,
    COUNT(CASE WHEN wi.current_stock <= i.reorder_level THEN 1 END) as low_stock_items
  FROM inventory i
  LEFT JOIN categories c ON i.category_id = c.id
  LEFT JOIN warehouse_inventory wi ON i.id = wi.inventory_id
  WHERE i.is_active = true
  GROUP BY i.id, i.barcode, i.product_name, c.name;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
