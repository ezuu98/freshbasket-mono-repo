-- Check inventory table structure and data
SELECT 
  'Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inventory' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current inventory count
SELECT 
  'Record Count' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records
FROM inventory;

-- Check categories
SELECT 
  'Categories' as check_type,
  COUNT(*) as total_categories,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_categories
FROM categories;

-- Check warehouses
SELECT 
  'Warehouses' as check_type,
  COUNT(*) as total_warehouses,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_warehouses
FROM warehouses;

-- Check warehouse inventory
SELECT 
  'Warehouse Inventory' as check_type,
  COUNT(*) as total_records,
  SUM(current_stock) as total_stock,
  AVG(current_stock) as avg_stock_per_item
FROM warehouse_inventory;

-- Sample inventory data
SELECT 
  'Sample Data' as check_type,
  i.id,
  i.product_name,
  i.sku,
  i.barcode,
  c.name as category,
  i.unit_cost,
  i.selling_price,
  i.is_active,
  i.created_at
FROM inventory i
LEFT JOIN categories c ON i.category_id = c.id
ORDER BY i.created_at DESC
LIMIT 10;

-- Check for any missing relationships
SELECT 
  'Missing Relationships' as check_type,
  COUNT(CASE WHEN i.category_id IS NULL THEN 1 END) as products_without_category,
  COUNT(CASE WHEN wi.inventory_id IS NULL THEN 1 END) as warehouse_records_without_product
FROM inventory i
FULL OUTER JOIN warehouse_inventory wi ON i.id = wi.inventory_id;
