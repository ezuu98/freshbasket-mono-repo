// index.js
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getPurchases, updatePurchases } from "./1.purchases.js"
import { getPurchasesReturns, updatePurchaseReturns } from "./2.purchase_returns.js";
import { getTransfers, updateTransfers } from "./3.transferInOut.js";
import { getManufacturings, updateManufacturings } from "./4.manufacturings.js";
import { getWastages, getWarehouseLocationMap, updateWastages } from "./5.wastages.js";
import { getSales, getSalesReturns, updateSales, updateSalesReturns } from "./6.sales.js";

dotenv.config();

// Odoo config
const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USER = process.env.ODOO_USER;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

// Supabase config
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  try {

    //const uid = await odooLogin();

    // GET & UPLOAD PURCHASES
    //const purchases = await getPurchases();
    //console.log(purchases)
    //console.log(purchases.length)
    //await updatePurchases(purchases);

    // GET & UPLOAD PURCHASES RETURNS
    //const purchaseReturns = await getPurchasesReturns();
    //console.log(purchaseReturns)
    //console.log(purchaseReturns.length)
    //await updatePurchaseReturns(purchaseReturns)
    
    // GET & UPLOAD TRANSFERS
    //const transfers = await getTransfers()
    //console.log(transfers)
    //console.log(transfers.length)
    //await updateTransfers(transfers)
    
    // GET & UPLOAD WASTAGES
    //const locationToWarehouseMap = await getWarehouseLocationMap();
    //const wastages = await getWastages(locationToWarehouseMap);
    //console.log(wastages)
    //console.log(wastages.length)
    //await updateWastages(wastages);
    

    // GET & UPLOAD MANUFACTURINGS
    //const manufacturings = await getManufacturings()
    //console.log(manufacturings)
    //console.log(manufacturings.length)
    //await updateManufacturings(manufacturings)

    // GET & UPLOAD SALES    
    //const sales = await getSales();
    //console.log(sales);
    //console.log(sales.length);
    //await updateSales(sales);

    // GET & UPLOAD SALES RETURNS
    //const salesReturns = await getSalesReturns();
    //console.log(salesReturns);
    //console.log(salesReturns.length);
    //await updateSalesReturns(salesReturns);

    // GET & UPLOAD PRODUCTS
    //const products = await getOdooProducts();
    //console.log(products.length)
    //await uploadProducts(products);

    // GET & UPLOAD CATEGORIES
    //const categories = await getOdooCategories();
    //await uploadCategories(categories);

    // GET & UPLOAD WAREHOUSES
    //const warehouses = await getOdooWarehouses();
    //console.log(warehouses)
    //qawait uploadWarehouses(warehouses)

    // GET & UPLOAD STOCKS    
    //const stock = await getOdooStock()
    //await uploadStock(stock)

  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Odoo login
async function odooLogin() {
  const { data } = await axios.post(ODOO_URL, {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common",
      method: "login",
      args: [ODOO_DB, ODOO_USER, ODOO_PASSWORD],
    },
    id: 1,
  });

  return data.result;
}



async function getOdooProducts() {
  try {
    const { data } = await axios.post(ODOO_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          ODOO_DB,
          6,
          ODOO_PASSWORD,
          "product.product",
          "search_read",
          [[
            ['type', '=', 'product'],
            ['active', '=', true],
          ]],
          {
            fields: [
              "id",
              "barcode",
              "name",
              "categ_id",
              "qty_available",
              "uom_name",
              "standard_price",
              "purchase_avg_price",
              "sale_avg_price",
              "reordering_min_qty",
              "reordering_max_qty",
              "active",
              "list_price",
              "type"
            ],
          },
        ],
      },
      id: 2,
    });
    if (!data.result) {
      console.error("⚠️ No data returned from Odoo:", data);
      return [];
    }
    return data.result;


  } catch (error) {
    console.error("❌ Error fetching Odoo products:");
    if (error.response) {
      console.error("Data:", error.response.data);
    } else {
      console.error("Error message:", error.message);
    }
    return [];
  }
}

async function getOdooCategories() {
  try {
    const { data } = await axios.post(ODOO_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          ODOO_DB,
          6, // UID
          ODOO_PASSWORD,
          "product.category", // We're now focusing only on categories
          "search_read",
          [[]], // Empty domain = all records
          {
            fields: [
              "id",
              "name",
              "complete_name",
              "parent_id",
              "child_id",
              "product_count",
              "display_name"
            ],
          }
        ]
      },
      id: 2
    });

    if (!data.result) {
      console.error("⚠️ No data returned from Odoo:", data);
      return [];
    }
    return data.result;

  } catch (error) {
    console.error("❌ Error fetching Odoo categories:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
    return [];
  }
}

async function uploadCategories(categories) {
  const uniqueCategories = categories.filter((category, index, self) =>
    index === self.findIndex(c => c.id === category.id)
  )
  const formattedProducts = uniqueCategories.map(category => ({
    categ_id: category.id,
    name: category.name,
    complete_name: category.complete_name,
    product_count: category.product_count,
    display_name: category.display_name,
  }));

  const { data, error } = await supabase.from('categories').insert(formattedProducts);


  if (error) {
    console.error("❌ Failed to insert/update products:", error.message);
  } else {
    console.log(`✅ Successfully inserted/updated ${formattedProducts.length} products.`);
  }
}

async function getOdooWarehouses() {
  try {
    const { data } = await axios.post(ODOO_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          ODOO_DB,
          6, // UID
          ODOO_PASSWORD,
          "stock.warehouse", // We're now focusing only on categories
          "search_read",
          [[
            ["id", "in", [1, 2, 3, 4, 5, 8, 9, 10, 12, 18]]
          ]],
          {
            fields: [
              "id",
              "code"
              // "name",
              // "view_location_id",
              // "display_name",
              // "active",
              // "display_name",
              , "lot_stock_id"
            ]
          }
        ]
      },
      id: 2
    });

    if (!data.result) {
      console.error("⚠️ No data returned from Odoo:", data);
      return [];
    }
    console.log(data.result)
    return data.result;

  } catch (error) {
    console.error("❌ Error fetching Odoo categories:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
    return [];
  }
}

async function uploadWarehouses(warehouses) {
  const formattedProducts = warehouses.map(w => ({
    id: w.id,
    code: w.code,
    name: w.name,
    view_location_id: w.view_location_id,
    display_name: w.display_name,
    lot_stock_id: w.lot_stock_id
  }));

  const { data, error } = await supabase
    .from('warehouses').insert(formattedProducts);
  if (error) {
    console.error("❌ Failed to insert/update products:", error.message);
  } else {
    console.log(`✅ Successfully inserted/updated ${formattedProducts.length} products.`);
  }
}

main();


// async function getOdooStock() {
//   try {
//     const { data } = await axios.post(ODOO_URL, {
//       jsonrpc: "2.0",
//       method: "call",
//       params: {
//         service: "object",
//         method: "execute_kw",
//         args: [
//           ODOO_DB,
//           6,
//           ODOO_PASSWORD,
//           "stock.quant",
//           "search_read",
//           [[
//             ["warehouse_id", "in", [1, 2, 3, 4, 5, 8, 9, 10, 12, 18]]
//           ]],
//           {
//             "fields": ["product_id", "warehouse_id", "quantity"],
//           }
//         ]
//       },
//       id: 2
//     });

//     if (!data.result) {
//       console.error("⚠️ No data returned from Odoo:", data);
//       return [];
//     }
//     console.log(data.result)
//     return data.result;

//   } catch (error) {
//     console.error("❌ Error fetching Odoo categories:");
//     if (error.response) {
//       console.error("Status:", error.response.status);
//       console.error("Headers:", error.response.headers);
//       console.error("Data:", error.response.data);
//     } else if (error.request) {
//       console.error("No response received:", error.request);
//     } else {
//       console.error("Error message:", error.message);
//     }
//     return [];
//   }
// }


// async function uploadStock(stock) {
//   const formattedProducts = stock
//     .filter(s => s.product_id && Array.isArray(s.product_id) && s.product_id[0] && s.warehouse_id !== false)
//     .map(s => ({
//       product_id: s.product_id[0],
//       wh_id: s.warehouse_id[0],
//       quantity: s.quantity,
//     }));

//   const { data: validInventory, error: inventoryError } = await supabase
//     .from('inventory')
//     .select('odoo_id');

//   if (inventoryError) {
//     console.error("❌ Failed to fetch inventory:", inventoryError.message);
//     return;
//   }

//   const validProductIds = new Set(validInventory.map(p => p.odoo_id));

//   const validProducts = formattedProducts.filter(p => validProductIds.has(p.product_id));

//   if (validProducts.length === 0) {
//     console.log("⚠️ No valid products to insert.");
//     return;
//   }

//   const { data, error } = await supabase
//     .from('warehouse_inventory')
//     .insert(validProducts);

//   if (error) {
//     console.error("❌ Failed to insert/update products:", error.message);
//   } else {
//     console.log(`✅ Successfully inserted/updated ${formattedProducts.length} products.`);
//   }
//}

