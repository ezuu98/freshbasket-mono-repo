import axios from "axios";
import dotenv from "dotenv";
import { supabase } from './supabase.js'; // Adjust the path based on your file structure

import { createClient } from "@supabase/supabase-js";

dotenv.config();

export async function getWarehouseLocationMap() {
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
                    "stock.warehouse",
                    "search_read",
                    [[]],
                    { fields: ["id", "lot_stock_id"]
                    }
                ]
            },
            id: 2
        });
        const map = {};
        for (const warehouse of data.result) {
            const locationId = warehouse.lot_stock_id?.[0];
            if (locationId) {
                map[locationId] = warehouse.id;
            }
        }
        return map;

    } catch (error) {
        console.error("❌ Error fetching warehouses:", error.message);
        return {};
    }
}


export async function getWastages(locationToWarehouseMap) {
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
                            ["location_id", "in", [8,  20, 28, 36, 44, 82, 90, 98, 114, 169]],
                            ["date", ">=", "2025-07-01 00:00"],
                            ["location_dest_id", "=", "Virtual Locations/Scrap"],
                        ]
                    ], {
                        fields: ["product_id", "product_qty", "location_id", "location_dest_id", "date"]
                    },
                ],
            },
            id: 2,
        });
        if (!data.result) {
            console.error("⚠️ No data returned from Odoo:", data);
            return [];
        }

        const enriched = data.result.map(item => {
            const location_id = String(item.location_id?.[0]);  // ensure it's a string
            const warehouse_id = locationToWarehouseMap[location_id] || null;
            return { ...item, warehouse_id };
        });
        return enriched;


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


export async function updateWastages(wastagesData) {
    for (const item of wastagesData) {
        const product_id = item.product_id?.[0];
        const warehouse_id = item.warehouse_id;
        const wastageQuantity = item.product_qty;
        const date = item.date;

        const { error } = await supabase.from('stock_movements').insert([
            {
                product_id,
                warehouse_id,
                quantity: wastageQuantity,
                movement_type: 'wastages',
                date
            }
        ])

        if (error) {
            console.error(`Error updating quantity for product ${product_id}:`, error.message);
        } else {
            console.log(`✅ Updated: product ${product_id} in warehouse ${warehouse_id} to quantity ${wastageQuantity}`);
        }
    }
}
