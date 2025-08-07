import axios from "axios";
import dotenv from "dotenv";
import { supabase } from './supabase.js';
dotenv.config();

export async function getPurchases() {
  try {
    const [purchaseOrderResponse, pickingTypeResponse] = await Promise.all([
      axios.post(process.env.ODOO_URL, {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            process.env.ODOO_DB,
            6,
            process.env.ODOO_PASSWORD,
            "purchase.order",
            "search_read",
            [[
              ["state", "!=", "cancel"],
              ["date_order", ">=", "2025-07-01 00:00"],
              ["date_order", "<=", "2025-07-25 23:59"],
            ]],
            {
              fields: ["id", "order_line", "date_order", "state", "picking_type_id", "date_order"]
            }
          ],
        },
        id: 1,
      }),
      

      axios.post(process.env.ODOO_URL, {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            process.env.ODOO_DB,
            6,
            process.env.ODOO_PASSWORD,
            "stock.picking.type",
            "search_read",
            [[
              ["warehouse_id", "in", [1, 2, 3, 4, 5, 8, 9, 10, 12, 18]]
            ]],
            {
              fields: ["id", "warehouse_id"]
            }
          ]
        },
        id: 3
      })
    ]);
    const purchaseOrders = purchaseOrderResponse.data.result;
    const pickingTypes = pickingTypeResponse.data.result;
    const pickingTypeToWarehouse = {};
    pickingTypes.forEach(pt => {
      pickingTypeToWarehouse[pt.id] = pt.warehouse_id?.[0];
    });

    const orderLineIds = purchaseOrders.flatMap(po => po.order_line);

    const batchSize = 1000;
    const orderLineBatches = [];

    for (let i = 0; i < orderLineIds.length; i += batchSize) {
      const batch = orderLineIds.slice(i, i + batchSize);
      orderLineBatches.push(batch);
    }

    const orderLinePromises = orderLineBatches.map(batch =>
      axios.post(process.env.ODOO_URL, {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            process.env.ODOO_DB,
            6,
            process.env.ODOO_PASSWORD,
            "purchase.order.line",
            "search_read",
            [[["id", "in", batch]]],
            {
              fields: ["id", "order_id", "product_id", "product_qty", "state"]
            }
          ]
        },
        id: 2
      })
    );

    async function throttleRequests(promises, delayMs = 300) {
      const results = [];
      for (const promise of promises) {
        try {
          const result = await promise;
          results.push(result);
          await new Promise(resolve => setTimeout(resolve, delayMs)); // wait between requests
        } catch (err) {
          console.error("Error in throttled request:", err.message);
        }
      }

      return results;
    }



    const orderLineResponses = await throttleRequests(orderLinePromises, 500); // wait 500ms between each batch

    const purchases = orderLineResponses.flatMap(response => response.data.result);

    const purchaseItems = [];

    purchaseOrders.forEach(order => {
      const pickingTypeId = order.picking_type_id?.[0];
      const warehouseId = pickingTypeToWarehouse[pickingTypeId];
      const orderDate = order.date_order;

      if (!warehouseId) return;
      const orderLines = purchases.filter(line => line.order_id?.[0] === order.id);

      orderLines.forEach(line => {
        if (line.product_id?.[0] && line.product_qty > 0) { // Only include valid products with quantity
          purchaseItems.push({
            product_id: line.product_id,
            warehouse_id: warehouseId,
            product_qty: line.product_qty,
            order_date: orderDate,
          });
        }
      });
    });

    return purchaseItems;

  } catch (error) {
    console.error("❌ Error syncing Odoo purchase orders:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error message:", error.message);
    }
    return [];
  }
}




export async function updatePurchases(purchases) {
  for (const purchase of purchases) {
    const product_id = purchase.product_id[0];
    const warehouse_dest_id = purchase.warehouse_id;
    const purchaseQuantity = purchase.product_qty;
    const date = purchase.order_date;

    const { error: insertError } = await supabase
      .from('stock_movements')
      .insert({
        product_id,
        warehouse_dest_id,
        quantity: purchaseQuantity,
        date,
        movement_type: 'purchase',
      });

  }

  if (insertError) {
    console.error(`Error inserting new record for product ${product_id}:`, insertError.message, insertError);
  } else {
    console.log(`✅ Created: product ${product_id} in warehouse ${warehouse_id} with quantity ${purchaseQuantity}`);
  }
}


