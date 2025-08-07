import axios from "axios";
import dotenv from "dotenv";
import { supabase } from './supabase.js'; // Adjust the path based on your file structure

import { createClient } from "@supabase/supabase-js";

dotenv.config();

export async function getPurchasesReturns() {
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
                    "stock.move",
                    "search_read",
                    [
                        [
                            ["picking_type_id.code", "=", "outgoing"],
                            ["warehouse_id", "in", [1, 2, 3, 4, 5, 8, 9, 10, 12, 18]],
                            ["date", ">=", "2025-07-01 00:00"],
                            ["location_dest_id", "=", "Partner Locations/Vendors"]
                        ]
                    ], {
                        fields: ["product_id", "product_qty", "warehouse_id", "location_dest_id", "date"]
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


export async function updatePurchaseReturns(purchaseReturnsData) {
    for (const item of purchaseReturnsData) {
        const product_id = item.product_id[0];
        const warehouse_id = item.warehouse_id[0]; 
        const purchaseQuantity = item.product_qty;
        const date = item.date;

        const { error } = await supabase.from('stock_movements').insert([
            { 
                product_id,
                warehouse_id,
                quantity: purchaseQuantity,
                movement_type: 'purchase_return',
                date
            }
        ])

        if (error) {
            console.error(`Error updating quantity for product ${product_id}:`, error.message);
        } else {
            console.log(`✅ Updated: product ${product_id} in warehouse ${warehouse_id} to quantity ${purchaseQuantity}`);
        }
    }
}