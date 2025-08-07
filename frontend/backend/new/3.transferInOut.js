import axios from "axios";
import dotenv from "dotenv";
import { supabase } from './supabase.js'; // Adjust the path based on your file structure
dotenv.config();

export async function getTransfers() {
    try {
        // Fetch stock moves (transfers)
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
                    [[
                        ["location_id", "in", [7, 20, 28, 36, 44, 82, 98, 106, 114]],
                        ["location_dest_id", "in", [7, 20, 28, 36, 44, 82, 98, 106, 114]],
                        ["location_dest_id", "!=", "location_id"],

                        ["date", ">=", "2024-07-01 00:00"]
                    ]],
                    {
                        fields: false//["product_id", "product_qty", "location_dest_id", "location_id", "date"]
                    }
                ]
            },
            id: 2
        });

        if (!data.result) {
            console.error("⚠️ No data returned from Odoo:", data);
            return [];
        }
        return(data.result)

        // Fetch warehouse data
        // const { data: whdata } = await axios.post(process.env.ODOO_URL, {
        //     jsonrpc: "2.0",
        //     method: "call",
        //     params: {
        //         service: "object",
        //         method: "execute_kw",
        //         args: [
        //             process.env.ODOO_DB,
        //             6,
        //             process.env.ODOO_PASSWORD,
        //             "stock.warehouse",
        //             "search_read",
        //             [],
        //             {
        //                 fields: ["id", "name", "lot_stock_id"]
        //             }
        //         ]
        //     },
        //     id: 3
        // });

        // const locationToWarehouseMap = {};
        // whdata.result.forEach(warehouse => {
        //     const locationId = warehouse.lot_stock_id?.[0];
        //     if (locationId) {
        //         locationToWarehouseMap[locationId] = warehouse.id;
        //     }
        // });
        // console.log(locationToWarehouseMap)

        // // Clean and map the transfer data
        // const transfers = data.result.map(entry => {
        //     const fromWhId = locationToWarehouseMap[entry.location_id?.[0]];
        //     const toWhId = locationToWarehouseMap[entry.location_dest_id?.[0]];

        //     return {
        //         product_id: entry.product_id,
        //         warehouse_from_id: fromWhId,
        //         warehouse_to_id: toWhId,
        //         product_qty: entry.product_qty,
        //         order_date: entry.date
        //     };
        //}//);

        // Filter out entries with missing warehouse mapping
        // const filteredTransfers = transfers.filter(t => t.warehouse_from_id && t.warehouse_to_id);

        // console.log(`🔢 Total valid transfers fetched: ${filteredTransfers.length}`);
        // return filteredTransfers;

    } catch (error) {
        console.error("❌ Error fetching Odoo products:");
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



export async function updateTransfers(transfers) {
    for (const transfer of transfers) {
        const product_id = transfer.product_id[0];
        const warehouse_dest_id = transfer.location_dest_id[0];
        const warehouse_id = transfer.location_id[0];
        const purchaseQuantity = transfer.product_qty;

        const { data: existingData, error: fetchError } = await supabase
            .from('warehouse_inventory')
            .select('*')
            .eq('product_id', product_id)
            .eq('wh_id', warehouse_id)
            .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existing quantity:', fetchError.message);
            continue;
        }

        // Check if record exists, if not create it with the purchase quantity
        if (!existingData) { console.log(`Product: ${product_id} in Warehouse: ${warehouse_id} was not found`) }

        else {
            // Update existing record
            const newQuantity = existingData.quantity - purchaseQuantity;

            const { error: updateError } = await supabase
                .from('warehouse_inventory')
                .update({ quantity: newQuantity })
                .eq('product_id', product_id)
                .eq('wh_id', warehouse_id);

            if (updateError) {
                console.error(`Error updating quantity for product ${product_id}:`, updateError.message);
            } else {
                console.log(`✅ Updated: product ${product_id} in warehouse ${warehouse_id} to quantity ${newQuantity}`);
            }
        }
    }
}


