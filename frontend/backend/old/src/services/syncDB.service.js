import axios from "axios";
const { ODOO_DB, ODOO_PASSWORD, ODOO_URL, ODOO_USERNAME } = process.env;



export async function fetchProductsFromOdoo() {
  const uid = await axios.post(ODOO_URL, {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common",
      method: "login",
      args: [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD],
    },
  });

  const ODOO_UID = uid.data.result;



  if (!ODOO_UID) throw new Error("Odoo UID not initiated");

  const response = await axios.post(ODOO_URL, {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [
        ODOO_DB,
        ODOO_UID,
        ODOO_PASSWORD,
        "product.product",
        "search_read",
        [[], ["id", "barcode", "name", "categ_id", "uom_id", "standard_price", "qty_available", "purchase_average_price",
                "sale_average_price", 
                "reorder_level", "active"]],
      ],
    },
    id: 1,
  });

  return response.data.result;
}

export function transformProducts(products) {
  return products.map((p) => ({
    id: p.odoo_id,
    barcode: p.barcode,
    product_name: p.name,
    categ_id: p.categ_id, 
    qty_available: qty_available,
    category_id: category_id,
    sub_category: "Smartphones",
    unit_of_measure: p.uom_id,
    standard_price: p.standard_price,
    purchase_avg_price: p.purchase_average_price,
    sale_avg_price: p.sale_average_price,
    reordering_min_qty: p.reorder_level,
    max_stock_level: 2000,
    description: p.description_sale || "",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}
