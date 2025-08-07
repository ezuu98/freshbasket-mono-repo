-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Produce', 'Fresh fruits and vegetables'),
('Bakery', 'Bread, pastries, and baked goods'),
('Dairy & Eggs', 'Milk products and eggs'),
('Meat & Poultry', 'Fresh meat and poultry products'),
('Beverages', 'Drinks and beverages'),
('Pantry', 'Dry goods and pantry items')
ON CONFLICT (name) DO NOTHING;

-- Insert sample warehouses
INSERT INTO warehouses (code, name, location) VALUES
('BDRWH', 'Bedford Main Warehouse', 'Bedford, UK'),
('MHOWH', 'Manchester Branch', 'Manchester, UK'),
('SBZWH', 'Sheffield Branch', 'Sheffield, UK'),
('CLIWH', 'Cleveland Online Store', 'Cleveland, UK'),
('BHDWH', 'Birmingham Branch', 'Birmingham, UK'),
('ECMM', 'East Midlands Distribution', 'Nottingham, UK')
ON CONFLICT (code) DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES
('Fresh Farm Supplies', 'John Smith', 'john@freshfarm.com', '+44 123 456 7890', '123 Farm Road, Bedford'),
('Bakery Wholesale Ltd', 'Sarah Johnson', 'sarah@bakerywholesale.com', '+44 234 567 8901', '456 Baker Street, London'),
('Dairy Direct', 'Mike Wilson', 'mike@dairydirect.com', '+44 345 678 9012', '789 Milk Lane, Manchester'),
('Meat Masters', 'Emma Brown', 'emma@meatmasters.com', '+44 456 789 0123', '321 Butcher Ave, Birmingham');

-- Get category IDs for sample data
DO $$
DECLARE
    produce_id UUID;
    bakery_id UUID;
    dairy_id UUID;
    meat_id UUID;
    warehouse_ids UUID[];
BEGIN
    -- Get category IDs
    SELECT id INTO produce_id FROM categories WHERE name = 'Produce';
    SELECT id INTO bakery_id FROM categories WHERE name = 'Bakery';
    SELECT id INTO dairy_id FROM categories WHERE name = 'Dairy & Eggs';
    SELECT id INTO meat_id FROM categories WHERE name = 'Meat & Poultry';
    
    -- Get warehouse IDs
    SELECT ARRAY(SELECT id FROM warehouses ORDER BY code) INTO warehouse_ids;

    -- Insert sample inventory
    INSERT INTO inventory (barcode, product_name, description, category_id, sub_category, unit_cost, selling_price, reorder_level) VALUES
    ('8765432109876', 'Organic Apples', 'Fresh organic red apples', produce_id, 'Fruits', 1.50, 2.99, 50),
    ('1234567890123', 'Whole Wheat Bread', 'Freshly baked whole wheat bread', bakery_id, 'Breads', 0.80, 1.99, 20),
    ('9876543210987', 'Free-Range Eggs', 'Farm fresh free-range eggs (dozen)', dairy_id, 'Eggs', 2.00, 3.49, 30),
    ('2345678901234', 'Almond Milk', 'Organic unsweetened almond milk', dairy_id, 'Milk Alternatives', 1.20, 2.79, 25),
    ('3456789012345', 'Chicken Breast', 'Fresh boneless chicken breast', meat_id, 'Poultry', 4.50, 7.99, 15),
    ('4567890123456', 'Bananas', 'Fresh yellow bananas', produce_id, 'Fruits', 0.60, 1.29, 40),
    ('5678901234567', 'Greek Yogurt', 'Natural Greek yogurt', dairy_id, 'Yogurt', 1.80, 3.99, 20),
    ('6789012345678', 'Salmon Fillet', 'Fresh Atlantic salmon fillet', meat_id, 'Fish', 8.00, 14.99, 10)
    ON CONFLICT (barcode) DO NOTHING;

    -- Insert warehouse inventory for each product and warehouse
    INSERT INTO warehouse_inventory (inventory_id, warehouse_id, opening_stock, current_stock)
    SELECT 
        i.id,
        w.id,
        CASE 
            WHEN i.barcode = '8765432109876' THEN -- Organic Apples
                CASE w.code
                    WHEN 'BDRWH' THEN 880
                    WHEN 'MHOWH' THEN 440
                    WHEN 'SBZWH' THEN 255
                    WHEN 'CLIWH' THEN 158
                    WHEN 'BHDWH' THEN 200
                    WHEN 'ECMM' THEN 300
                END
            WHEN i.barcode = '1234567890123' THEN -- Whole Wheat Bread
                CASE w.code
                    WHEN 'BDRWH' THEN 150
                    WHEN 'MHOWH' THEN 120
                    WHEN 'SBZWH' THEN 80
                    WHEN 'CLIWH' THEN 60
                    WHEN 'BHDWH' THEN 90
                    WHEN 'ECMM' THEN 110
                END
            WHEN i.barcode = '9876543210987' THEN -- Free-Range Eggs
                CASE w.code
                    WHEN 'BDRWH' THEN 200
                    WHEN 'MHOWH' THEN 250
                    WHEN 'SBZWH' THEN 150
                    WHEN 'CLIWH' THEN 100
                    WHEN 'BHDWH' THEN 125
                    WHEN 'ECMM' THEN 175
                END
            ELSE 100 -- Default stock for other items
        END,
        CASE 
            WHEN i.barcode = '8765432109876' THEN -- Organic Apples
                CASE w.code
                    WHEN 'BDRWH' THEN 880
                    WHEN 'MHOWH' THEN 440
                    WHEN 'SBZWH' THEN 255
                    WHEN 'CLIWH' THEN 158
                    WHEN 'BHDWH' THEN 200
                    WHEN 'ECMM' THEN 300
                END
            WHEN i.barcode = '1234567890123' THEN -- Whole Wheat Bread
                CASE w.code
                    WHEN 'BDRWH' THEN 150
                    WHEN 'MHOWH' THEN 120
                    WHEN 'SBZWH' THEN 80
                    WHEN 'CLIWH' THEN 60
                    WHEN 'BHDWH' THEN 90
                    WHEN 'ECMM' THEN 110
                END
            WHEN i.barcode = '9876543210987' THEN -- Free-Range Eggs
                CASE w.code
                    WHEN 'BDRWH' THEN 200
                    WHEN 'MHOWH' THEN 250
                    WHEN 'SBZWH' THEN 150
                    WHEN 'CLIWH' THEN 100
                    WHEN 'BHDWH' THEN 125
                    WHEN 'ECMM' THEN 175
                END
            ELSE 100 -- Default current stock for other items
        END
    FROM inventory i
    CROSS JOIN warehouses w
    ON CONFLICT (inventory_id, warehouse_id) DO NOTHING;

END $$;
