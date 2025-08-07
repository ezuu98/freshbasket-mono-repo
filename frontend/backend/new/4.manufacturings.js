import axios from "axios";
import dotenv from "dotenv";
import { supabase } from './supabase.js'; // Adjust the path based on your file structure

import { createClient } from "@supabase/supabase-js";
import { watch } from "fs";

dotenv.config();

export async function getManufacturings() {

  try {
    const { data } = await axios.post(process.env.ODOO_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          process.env.ODOO_DB,
          6,
          process.env.ODOO_PASSWORD,
          "mrp.production",
          "search_read",
          [
            [
              ["warehouse_id", "in", [1, 2, 3, 4, 5, 8, 9, 10, 12, 18]],
              ["date_finished", ">=", "2025-07-1 00:00"],
              ["state", "!=", "cancel"],
            ]
          ], {
            fields: ["product_id", "product_qty", "date_finished", "warehouse_id", "state"]
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
      // The server responded with a status code
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something else happened in setting up the request
      console.error("Error message:", error.message);
    }

    return [];
  }
}


export async function updateManufacturings(manufacturings) {
  for (const manufacturing of manufacturings) {
    // Validate product_id and warehouse_id
    if (
      !Array.isArray(manufacturing.product_id) ||
      !Array.isArray(manufacturing.warehouse_id)
    ) {
      console.error('Invalid product_id or warehouse_id structure:', manufacturing);
      continue;
    }

    const product_id = manufacturing.product_id[0];
    const warehouse_id = manufacturing.warehouse_id[0];
    const purchaseQuantity = manufacturing.product_qty;
    const date = manufacturing.date_finished;

    const { error: insertError } = await supabase
      .from('stock_movements')
      .insert({
        product_id,
        warehouse_id,
        date,
        movement_type: 'manufacturing',
        quantity: purchaseQuantity,
      });

    if (insertError) {
      console.error(`❌ Error inserting record for product ${product_id}:`, insertError.message);
    } else {
      console.log(`✅ Created: product ${product_id} in warehouse ${warehouse_id} with quantity ${purchaseQuantity}`);
    }
  }
}


