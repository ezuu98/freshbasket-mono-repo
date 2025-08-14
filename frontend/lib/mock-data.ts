export interface InventoryItem {
  id: number;
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
  category?: {
    id: number;
    display_name: string;
    name: string;
    active: boolean;
  };
  warehouse_inventory?: Array<{
    warehouse: {
      id: number;
      name: string;
      code: string;
      active: boolean;
    };
    quantity: number;
    stock_quantity: number;
  }>;
}

export interface StockMovement {
  id: number;
  movement_type: string;
  quantity: number;
  created_at: string;
  warehouse?: {
    id?: number;
    name: string;
    code: string;
  };
  warehouse_dest?: {
    id?: number;
    name: string;
    code: string;
  };
}

export const MOCK_INVENTORY_DATA: InventoryItem[] = [
  {
    id: 1,
    odoo_id: 1001,
    name: "Organic Bananas 1kg",
    barcode: "8901030823456",
    uom_name: "kg",
    standard_price: 45.0,
    reordering_min_qty: 20,
    reordering_max_qty: 100,
    list_price: 55.0,
    active: true,
    type: "product",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-20T14:15:00Z",
    category: {
      id: 1,
      display_name: "Fresh Fruits",
      name: "fresh_fruits",
      active: true
    },
    warehouse_inventory: [
      { warehouse: { id: 1, name: "BDRWH", code: "BDRWH", active: true }, quantity: 45, stock_quantity: 45 },
      { warehouse: { id: 2, name: "MHOWH", code: "MHOWH", active: true }, quantity: 32, stock_quantity: 32 },
      { warehouse: { id: 3, name: "SBZWH", code: "SBZWH", active: true }, quantity: 28, stock_quantity: 28 },
      { warehouse: { id: 4, name: "CLIWH", code: "CLIWH", active: true }, quantity: 15, stock_quantity: 15 },
      { warehouse: { id: 5, name: "BHDWH", code: "BHDWH", active: true }, quantity: 38, stock_quantity: 38 },
      { warehouse: { id: 6, name: "ECMWH", code: "ECMWH", active: true }, quantity: 22, stock_quantity: 22 }
    ]
  },
  {
    id: 2,
    odoo_id: 1002,
    name: "Fresh Tomatoes 500g",
    barcode: "8901030823457",
    uom_name: "pack",
    standard_price: 32.0,
    reordering_min_qty: 15,
    reordering_max_qty: 80,
    list_price: 40.0,
    active: true,
    type: "product",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-20T14:15:00Z",
    category: {
      id: 2,
      display_name: "Fresh Vegetables",
      name: "fresh_vegetables",
      active: true
    },
    warehouse_inventory: [
      { warehouse: { id: 1, name: "BDRWH", code: "BDRWH", active: true }, quantity: 25, stock_quantity: 25 },
      { warehouse: { id: 2, name: "MHOWH", code: "MHOWH", active: true }, quantity: 18, stock_quantity: 18 },
      { warehouse: { id: 3, name: "SBZWH", code: "SBZWH", active: true }, quantity: 12, stock_quantity: 12 },
      { warehouse: { id: 4, name: "CLIWH", code: "CLIWH", active: true }, quantity: 8, stock_quantity: 8 },
      { warehouse: { id: 5, name: "BHDWH", code: "BHDWH", active: true }, quantity: 22, stock_quantity: 22 },
      { warehouse: { id: 6, name: "ECMWH", code: "ECMWH", active: true }, quantity: 14, stock_quantity: 14 }
    ]
  },
  {
    id: 3,
    odoo_id: 1003,
    name: "Basmati Rice 5kg",
    barcode: "8901030823458",
    uom_name: "bag",
    standard_price: 285.0,
    reordering_min_qty: 10,
    reordering_max_qty: 50,
    list_price: 320.0,
    active: true,
    type: "product",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-20T14:15:00Z",
    category: {
      id: 3,
      display_name: "Grains & Cereals",
      name: "grains_cereals",
      active: true
    },
    warehouse_inventory: [
      { warehouse: { id: 1, name: "BDRWH", code: "BDRWH", active: true }, quantity: 15, stock_quantity: 15 },
      { warehouse: { id: 2, name: "MHOWH", code: "MHOWH", active: true }, quantity: 12, stock_quantity: 12 },
      { warehouse: { id: 3, name: "SBZWH", code: "SBZWH", active: true }, quantity: 8, stock_quantity: 8 },
      { warehouse: { id: 4, name: "CLIWH", code: "CLIWH", active: true }, quantity: 5, stock_quantity: 5 },
      { warehouse: { id: 5, name: "BHDWH", code: "BHDWH", active: true }, quantity: 18, stock_quantity: 18 },
      { warehouse: { id: 6, name: "ECMWH", code: "ECMWH", active: true }, quantity: 11, stock_quantity: 11 }
    ]
  },
  {
    id: 4,
    odoo_id: 1004,
    name: "Whole Milk 1L",
    barcode: "8901030823459",
    uom_name: "bottle",
    standard_price: 52.0,
    reordering_min_qty: 25,
    reordering_max_qty: 120,
    list_price: 62.0,
    active: true,
    type: "product",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-20T14:15:00Z",
    category: {
      id: 4,
      display_name: "Dairy Products",
      name: "dairy_products",
      active: true
    },
    warehouse_inventory: [
      { warehouse: { id: 1, name: "BDRWH", code: "BDRWH", active: true }, quantity: 0, stock_quantity: 0 },
      { warehouse: { id: 2, name: "MHOWH", code: "MHOWH", active: true }, quantity: 0, stock_quantity: 0 },
      { warehouse: { id: 3, name: "SBZWH", code: "SBZWH", active: true }, quantity: 0, stock_quantity: 0 },
      { warehouse: { id: 4, name: "CLIWH", code: "CLIWH", active: true }, quantity: 0, stock_quantity: 0 },
      { warehouse: { id: 5, name: "BHDWH", code: "BHDWH", active: true }, quantity: 0, stock_quantity: 0 },
      { warehouse: { id: 6, name: "ECMWH", code: "ECMWH", active: true }, quantity: 0, stock_quantity: 0 }
    ]
  },
  {
    id: 5,
    odoo_id: 1005,
    name: "Green Tea Bags 100ct",
    barcode: "8901030823460",
    uom_name: "box",
    standard_price: 125.0,
    reordering_min_qty: 8,
    reordering_max_qty: 40,
    list_price: 150.0,
    active: true,
    type: "product",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-20T14:15:00Z",
    category: {
      id: 5,
      display_name: "Beverages",
      name: "beverages",
      active: true
    },
    warehouse_inventory: [
      { warehouse: { id: 1, name: "BDRWH", code: "BDRWH", active: true }, quantity: 6, stock_quantity: 6 },
      { warehouse: { id: 2, name: "MHOWH", code: "MHOWH", active: true }, quantity: 4, stock_quantity: 4 },
      { warehouse: { id: 3, name: "SBZWH", code: "SBZWH", active: true }, quantity: 3, stock_quantity: 3 },
      { warehouse: { id: 4, name: "CLIWH", code: "CLIWH", active: true }, quantity: 2, stock_quantity: 2 },
      { warehouse: { id: 5, name: "BHDWH", code: "BHDWH", active: true }, quantity: 5, stock_quantity: 5 },
      { warehouse: { id: 6, name: "ECMWH", code: "ECMWH", active: true }, quantity: 3, stock_quantity: 3 }
    ]
  }
];

export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 1,
    movement_type: "in",
    quantity: 50,
    created_at: "2024-01-20T08:30:00Z",
    warehouse: { id: 1, name: "BDRWH", code: "BDRWH" }
  },
  {
    id: 2,
    movement_type: "out",
    quantity: -5,
    created_at: "2024-01-20T14:15:00Z",
    warehouse: { id: 1, name: "BDRWH", code: "BDRWH" }
  },
  {
    id: 3,
    movement_type: "transfer",
    quantity: -10,
    created_at: "2024-01-21T10:00:00Z",
    warehouse: { id: 1, name: "BDRWH", code: "BDRWH" },
    warehouse_dest: { id: 2, name: "MHOWH", code: "MHOWH" }
  }
];
