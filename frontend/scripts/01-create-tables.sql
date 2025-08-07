-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'transfer_in', 'transfer_out', 'adjustment', 'wastage', 'return');

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'staff',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  manager_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  sub_category VARCHAR(100),
  unit_of_measure VARCHAR(20) DEFAULT 'pieces',
  unit_cost DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  reorder_level INTEGER DEFAULT 10,
  max_stock_level INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warehouse_inventory table for stock tracking
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  opening_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0,
  available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(inventory_id, warehouse_id)
);

-- Create stock_movements table for tracking all inventory changes
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  po_number VARCHAR(100) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  status VARCHAR(50) DEFAULT 'pending',
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  total_amount DECIMAL(12,2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  received_quantity INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
