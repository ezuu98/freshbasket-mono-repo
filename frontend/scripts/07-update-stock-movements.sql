-- Update stock movement types to include all 9 variables
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'manufacturing_in';
ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'manufacturing_out';

-- Update stock movements table to better track manufacturing
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS movement_category VARCHAR(50) DEFAULT 'operational';

-- Add comments to clarify movement types
COMMENT ON TYPE stock_movement_type IS 'Stock movement types: purchase, sale, transfer_in, transfer_out, adjustment, wastage, return, manufacturing_in, manufacturing_out';

-- Create view for stock calculation breakdown
CREATE OR REPLACE VIEW stock_calculation_view AS
SELECT 
  wi.inventory_id,
  wi.warehouse_id,
  i.product_name,
  w.name as warehouse_name,
  w.code as warehouse_code,
  wi.opening_stock,
  wi.current_stock,
  wi.reserved_stock,
  wi.available_stock,
  -- Calculate movements by type
  COALESCE(movements.purchases, 0) as purchases,
  COALESCE(movements.purchase_returns, 0) as purchase_returns,
  COALESCE(movements.sales, 0) as sales,
  COALESCE(movements.wastages, 0) as wastages,
  COALESCE(movements.transfer_in, 0) as transfer_in,
  COALESCE(movements.transfer_out, 0) as transfer_out,
  COALESCE(movements.manufacturing_in, 0) as manufacturing_in,
  COALESCE(movements.manufacturing_out, 0) as manufacturing_out,
  -- Calculated stock should match current stock
  (wi.opening_stock + 
   COALESCE(movements.purchases, 0) - 
   COALESCE(movements.purchase_returns, 0) - 
   COALESCE(movements.sales, 0) - 
   COALESCE(movements.wastages, 0) + 
   COALESCE(movements.transfer_in, 0) - 
   COALESCE(movements.transfer_out, 0) + 
   COALESCE(movements.manufacturing_in, 0) - 
   COALESCE(movements.manufacturing_out, 0)) as calculated_stock,
  wi.last_updated
FROM warehouse_inventory wi
JOIN inventory i ON wi.inventory_id = i.id
JOIN warehouses w ON wi.warehouse_id = w.id
LEFT JOIN (
  SELECT 
    inventory_id,
    warehouse_id,
    SUM(CASE WHEN movement_type = 'purchase' THEN quantity ELSE 0 END) as purchases,
    SUM(CASE WHEN movement_type = 'return' THEN quantity ELSE 0 END) as purchase_returns,
    SUM(CASE WHEN movement_type = 'sale' THEN quantity ELSE 0 END) as sales,
    SUM(CASE WHEN movement_type = 'wastage' THEN quantity ELSE 0 END) as wastages,
    SUM(CASE WHEN movement_type = 'transfer_in' THEN quantity ELSE 0 END) as transfer_in,
    SUM(CASE WHEN movement_type = 'transfer_out' THEN quantity ELSE 0 END) as transfer_out,
    SUM(CASE WHEN movement_type = 'adjustment' AND quantity > 0 THEN quantity ELSE 0 END) as manufacturing_in,
    SUM(CASE WHEN movement_type = 'adjustment' AND quantity < 0 THEN ABS(quantity) ELSE 0 END) as manufacturing_out
  FROM stock_movements
  GROUP BY inventory_id, warehouse_id
) movements ON wi.inventory_id = movements.inventory_id AND wi.warehouse_id = movements.warehouse_id;

-- Grant permissions on the view
GRANT SELECT ON stock_calculation_view TO authenticated;

-- Create function to get stock breakdown for a product
CREATE OR REPLACE FUNCTION get_product_stock_breakdown(product_id UUID)
RETURNS TABLE (
  warehouse_id UUID,
  warehouse_name VARCHAR,
  warehouse_code VARCHAR,
  opening_stock INTEGER,
  purchases INTEGER,
  purchase_returns INTEGER,
  sales INTEGER,
  wastages INTEGER,
  transfer_in INTEGER,
  transfer_out INTEGER,
  manufacturing_in INTEGER,
  manufacturing_out INTEGER,
  current_stock INTEGER,
  reserved_stock INTEGER,
  available_stock INTEGER,
  calculated_stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    scv.warehouse_id,
    scv.warehouse_name,
    scv.warehouse_code,
    scv.opening_stock,
    scv.purchases::INTEGER,
    scv.purchase_returns::INTEGER,
    scv.sales::INTEGER,
    scv.wastages::INTEGER,
    scv.transfer_in::INTEGER,
    scv.transfer_out::INTEGER,
    scv.manufacturing_in::INTEGER,
    scv.manufacturing_out::INTEGER,
    scv.current_stock,
    scv.reserved_stock,
    scv.available_stock,
    scv.calculated_stock::INTEGER
  FROM stock_calculation_view scv
  WHERE scv.inventory_id = product_id
  ORDER BY scv.warehouse_name;
END;
$$ LANGUAGE plpgsql;

-- Insert sample stock movements to demonstrate the 9 variables
INSERT INTO stock_movements (inventory_id, warehouse_id, movement_type, quantity, reference_number, notes, created_by) 
SELECT 
  i.id,
  w.id,
  'purchase',
  CASE 
    WHEN i.barcode = '8765432109876' THEN 500
    WHEN i.barcode = '1234567890123' THEN 200
    ELSE 100
  END,
  'PO-2024-001',
  'Initial purchase order',
  (SELECT id FROM profiles LIMIT 1)
FROM inventory i
CROSS JOIN warehouses w
WHERE i.barcode IN ('8765432109876', '1234567890123', '9876543210987')
AND w.code IN ('BDRWH', 'MHOWH')
ON CONFLICT DO NOTHING;

-- Insert sample sales movements
INSERT INTO stock_movements (inventory_id, warehouse_id, movement_type, quantity, reference_number, notes, created_by)
SELECT 
  i.id,
  w.id,
  'sale',
  CASE 
    WHEN i.barcode = '8765432109876' THEN 150
    WHEN i.barcode = '1234567890123' THEN 50
    ELSE 25
  END,
  'SALE-2024-001',
  'Customer sales',
  (SELECT id FROM profiles LIMIT 1)
FROM inventory i
CROSS JOIN warehouses w
WHERE i.barcode IN ('8765432109876', '1234567890123', '9876543210987')
AND w.code IN ('BDRWH', 'MHOWH')
ON CONFLICT DO NOTHING;

-- Insert sample wastage movements
INSERT INTO stock_movements (inventory_id, warehouse_id, movement_type, quantity, reference_number, notes, created_by)
SELECT 
  i.id,
  w.id,
  'wastage',
  CASE 
    WHEN i.barcode = '8765432109876' THEN 20
    WHEN i.barcode = '1234567890123' THEN 5
    ELSE 2
  END,
  'WASTE-2024-001',
  'Expired/damaged goods',
  (SELECT id FROM profiles LIMIT 1)
FROM inventory i
CROSS JOIN warehouses w
WHERE i.barcode IN ('8765432109876', '1234567890123', '9876543210987')
AND w.code IN ('BDRWH')
ON CONFLICT DO NOTHING;

-- Insert sample transfer movements
INSERT INTO stock_movements (inventory_id, warehouse_id, movement_type, quantity, reference_number, notes, created_by)
SELECT 
  i.id,
  (SELECT id FROM warehouses WHERE code = 'MHOWH'),
  'transfer_in',
  50,
  'TRANS-2024-001',
  'Transfer from BDRWH to MHOWH',
  (SELECT id FROM profiles LIMIT 1)
FROM inventory i
WHERE i.barcode = '8765432109876'
ON CONFLICT DO NOTHING;

INSERT INTO stock_movements (inventory_id, warehouse_id, movement_type, quantity, reference_number, notes, created_by)
SELECT 
  i.id,
  (SELECT id FROM warehouses WHERE code = 'BDRWH'),
  'transfer_out',
  50,
  'TRANS-2024-001',
  'Transfer from BDRWH to MHOWH',
  (SELECT id FROM profiles LIMIT 1)
FROM inventory i
WHERE i.barcode = '8765432109876'
ON CONFLICT DO NOTHING;
