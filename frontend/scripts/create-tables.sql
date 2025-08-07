-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warehouse_inventory table for stock tracking
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  warehouse_code VARCHAR(20) NOT NULL,
  opening_stock INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  purchase_returns INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  wastages INTEGER DEFAULT 0,
  transfer_in INTEGER DEFAULT 0,
  transfer_out INTEGER DEFAULT 0,
  manufacturing_impact INTEGER DEFAULT 0,
  closing_stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(inventory_id, warehouse_code)
);

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample warehouses
INSERT INTO warehouses (code, name, location) VALUES
('BDRWH', 'Main Warehouse', 'Bedford'),
('MHOWH', 'Branch A', 'Manchester'),
('SBZWH', 'Branch B', 'Sheffield'),
('CLIWH', 'Online Store', 'Cleveland'),
('BHDWH', 'Branch C', 'Birmingham'),
('ECMM', 'Distribution Center', 'East Midlands')
ON CONFLICT (code) DO NOTHING;

-- Insert sample inventory data
INSERT INTO inventory (barcode, product_name, category, sub_category) VALUES
('8765432109876', 'Organic Apples', 'Produce', 'Fruits'),
('1234567890123', 'Whole Wheat Bread', 'Bakery', 'Breads'),
('9876543210987', 'Free-Range Eggs', 'Dairy & Eggs', 'Eggs'),
('2345678901234', 'Almond Milk', 'Dairy & Eggs', 'Milk Alternatives'),
('3456789012345', 'Chicken Breast', 'Meat & Poultry', 'Poultry')
ON CONFLICT (barcode) DO NOTHING;

-- Insert sample warehouse inventory data
WITH inventory_data AS (
  SELECT id, barcode FROM inventory
),
warehouse_data AS (
  SELECT code FROM warehouses
)
INSERT INTO warehouse_inventory (
  inventory_id, warehouse_code, opening_stock, purchases, purchase_returns, 
  sales, wastages, transfer_in, transfer_out, manufacturing_impact, closing_stock
)
SELECT 
  i.id,
  w.code,
  CASE 
    WHEN i.barcode = '8765432109876' AND w.code = 'BDRWH' THEN 1000
    WHEN i.barcode = '8765432109876' AND w.code = 'MHOWH' THEN 500
    WHEN i.barcode = '8765432109876' AND w.code = 'SBZWH' THEN 300
    WHEN i.barcode = '8765432109876' AND w.code = 'CLIWH' THEN 200
    WHEN i.barcode = '1234567890123' AND w.code = 'BDRWH' THEN 800
    WHEN i.barcode = '1234567890123' AND w.code = 'MHOWH' THEN 400
    ELSE 100
  END as opening_stock,
  CASE 
    WHEN i.barcode = '8765432109876' AND w.code = 'BDRWH' THEN 500
    WHEN i.barcode = '8765432109876' AND w.code = 'MHOWH' THEN 200
    ELSE 50
  END as purchases,
  CASE 
    WHEN w.code = 'BDRWH' THEN 50
    WHEN w.code = 'MHOWH' THEN 20
    ELSE 10
  END as purchase_returns,
  CASE 
    WHEN i.barcode = '8765432109876' AND w.code = 'BDRWH' THEN 600
    WHEN i.barcode = '8765432109876' AND w.code = 'MHOWH' THEN 300
    ELSE 100
  END as sales,
  CASE 
    WHEN w.code = 'BDRWH' THEN 20
    WHEN w.code = 'MHOWH' THEN 10
    ELSE 5
  END as wastages,
  CASE 
    WHEN w.code = 'BDRWH' THEN 100
    WHEN w.code = 'MHOWH' THEN 50
    ELSE 20
  END as transfer_in,
  CASE 
    WHEN w.code = 'BDRWH' THEN 50
    WHEN w.code = 'MHOWH' THEN 20
    ELSE 10
  END as transfer_out,
  0 as manufacturing_impact,
  CASE 
    WHEN i.barcode = '8765432109876' AND w.code = 'BDRWH' THEN 880
    WHEN i.barcode = '8765432109876' AND w.code = 'MHOWH' THEN 440
    WHEN i.barcode = '8765432109876' AND w.code = 'SBZWH' THEN 255
    WHEN i.barcode = '8765432109876' AND w.code = 'CLIWH' THEN 158
    ELSE 150
  END as closing_stock
FROM inventory_data i
CROSS JOIN warehouse_data w
ON CONFLICT (inventory_id, warehouse_code) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view inventory" ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view warehouse inventory" ON warehouse_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view warehouses" ON warehouses FOR SELECT TO authenticated USING (true);

-- Create policies for admins (you can customize based on user roles)
CREATE POLICY "Admins can manage inventory" ON inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can manage warehouse inventory" ON warehouse_inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can manage warehouses" ON warehouses FOR ALL TO authenticated USING (true);

-- Create function to update closing stock automatically
CREATE OR REPLACE FUNCTION calculate_closing_stock()
RETURNS TRIGGER AS $$
BEGIN
  NEW.closing_stock = NEW.opening_stock + NEW.purchases - NEW.purchase_returns - NEW.sales - NEW.wastages + NEW.transfer_in - NEW.transfer_out + NEW.manufacturing_impact;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate closing stock
CREATE TRIGGER update_closing_stock
  BEFORE INSERT OR UPDATE ON warehouse_inventory
  FOR EACH ROW
  EXECUTE FUNCTION calculate_closing_stock();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
