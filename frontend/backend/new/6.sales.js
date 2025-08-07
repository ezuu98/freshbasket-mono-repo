import dotenv from "dotenv";
import sql from "mssql";
import { supabase } from './supabase.js';
dotenv.config();
import { config } from './.config';



const branchToWarehouseMap = {
    '001': 9,
    '005': 4,
    '006': 10,
    '008': 12,
    '009': 18,
    '007': 4,
};


export async function getSales() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');

        const salesQuery = `
        SELECT        dbo.INV_PointofSalesDetailTAB.BranchCode, dbo.INV_PointofSalesDetailTAB.BarCode, dbo.INV_PointofSalesDetailTAB.Quantity, 
                    dbo.INV_PointofSalesDetailTAB.BillDate
FROM         dbo.INV_PointofSalesDetailTAB INNER JOIN
                      dbo.INV_ItemTAB ON dbo.INV_PointofSalesDetailTAB.BarCode = dbo.INV_ItemTAB.BarCode INNER JOIN
                      dbo.GEN_BranchTAB ON dbo.INV_PointofSalesDetailTAB.BranchCode = dbo.GEN_BranchTAB.BranchCode INNER JOIN
                      dbo.GEN_LocationTAB ON dbo.INV_ItemTAB.LocationCode = dbo.GEN_LocationTAB.LocationCode INNER JOIN
                      dbo.INV_PointofSalesMasterTAB ON dbo.INV_PointofSalesDetailTAB.BranchCode = dbo.INV_PointofSalesMasterTAB.BranchCode AND 
                      dbo.INV_PointofSalesDetailTAB.BillNo = dbo.INV_PointofSalesMasterTAB.BillNo LEFT OUTER JOIN
                      dbo.GL_ChartOfAccountTAB ON dbo.INV_ItemTAB.SupplierCode = dbo.GL_ChartOfAccountTAB.AccountCode
WHERE     (dbo.INV_PointofSalesDetailTAB.BillDate BETWEEN '2025-07-01' AND '2025-08-01')
`;



        const salesResult = await pool.request().query(salesQuery);
        const records = salesResult.recordset;
        

        const enriched = records.map((record) => ({
            barcode: record.BarCode,
            quantity: record.Quantity,
            date: record.BillDate,
            warehouse_id: branchToWarehouseMap[record.BranchCode] || null,
        }));

        return enriched.filter(e => e.warehouse_id);


    } catch (err) {
        console.error('❌ Error:', err.message);
        return [];
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔒 Connection closed');
        }
    }

}

export async function updateSales(salesData) {
    const uniqueBarcodes = [...new Set(salesData.map(item => item.barcode))].filter(Boolean);

    const { data: products, error } = await supabase
        .from('inventory')
        .select('odoo_id, barcode')
        .in('barcode', uniqueBarcodes);
    
    if (error) {
        console.error('Error fetching products:', error.message);
        return;
    }
    const barcodeMap = new Map(products.map(p => [p.barcode, p.odoo_id]));
    console.log('Barcode Map:', barcodeMap);

    for (const item of salesData) {
        const barcode = item.barcode;
        const warehouse_id = item.warehouse_id;
        const salesQuantity = item.quantity;
        const date = item.date;

        const product_id = barcodeMap.get(barcode);
        if (!product_id) {
            //console.warn(`⚠️ No product found for barcode: ${barcode}`);
            continue;
        }

        const { error } = await supabase.from('stock_movements').insert([
            {
                product_id,
                warehouse_id,
                quantity: salesQuantity,
                movement_type: 'sales',
                date
            }
        ]);

        if (error) {
            console.error(`❌ Error updating product ${product_id}:`, error.message);
        } else {
            console.log(`✅ Updated: product ${product_id} in warehouse ${warehouse_id} to quantity ${salesQuantity}`);
        }
    }
}


export async function getSalesReturns() {
    let pool;
    try {
        pool = await sql.connect(config);

        const salesReturnQuery = `
        SELECT     dbo.INV_SalesReturnDetailTAB.BranchCode, dbo.GEN_BranchTAB.Branch, dbo.GEN_BranchTAB.Address1 AS OdooBranchName, dbo.INV_SalesReturnDetailTAB.SerialNo, 
                      dbo.GEN_LocationTAB.Location, dbo.INV_SalesReturnDetailTAB.BarCode, dbo.INV_SalesReturnDetailTAB.BillNo, dbo.INV_ItemTAB.Item, - dbo.INV_SalesReturnDetailTAB.Quantity AS Quantity, 
                      - dbo.INV_SalesReturnDetailTAB.Rate AS Rate, - dbo.INV_SalesReturnDetailTAB.NetAmount AS NetAmount, dbo.INV_SalesReturnDetailTAB.BillDate, 
                      - dbo.INV_SalesReturnDetailTAB.ItemGSTAmount AS ItemGSTAmount, dbo.GL_ChartOfAccountTAB.Account, dbo.INV_SalesReturnMasterTAB.BillDiscount AS TotalBillDiscount
        FROM         dbo.INV_SalesReturnDetailTAB INNER JOIN
                      dbo.INV_ItemTAB ON dbo.INV_SalesReturnDetailTAB.BarCode = dbo.INV_ItemTAB.BarCode INNER JOIN
                      dbo.GEN_BranchTAB ON dbo.INV_SalesReturnDetailTAB.BranchCode = dbo.GEN_BranchTAB.BranchCode INNER JOIN
                      dbo.GEN_LocationTAB ON dbo.INV_ItemTAB.LocationCode = dbo.GEN_LocationTAB.LocationCode INNER JOIN
                      dbo.INV_SalesReturnMasterTAB ON dbo.INV_SalesReturnDetailTAB.BranchCode = dbo.INV_SalesReturnMasterTAB.BranchCode AND 
                      dbo.INV_SalesReturnDetailTAB.BillNo = dbo.INV_SalesReturnMasterTAB.BillNo LEFT OUTER JOIN
                      dbo.GL_ChartOfAccountTAB ON dbo.INV_ItemTAB.SupplierCode = dbo.GL_ChartOfAccountTAB.AccountCode
        WHERE     (dbo.INV_SalesReturnDetailTAB.BillDate BETWEEN '2025-07-01' AND '2025-08-01')
`;

        const salesReturnResult = await pool.request().query(salesReturnQuery);
        const records = salesReturnResult.recordset;
       
        const enriched = records.map((record) => ({
            barcode: record.BarCode,
            quantity: record.Quantity,
            date: record.BillDate,
            warehouse_dest_id: branchToWarehouseMap[record.BranchCode] || null,
        }));
        return enriched.filter(e => e.warehouse_dest_id);


    } catch (err) {
        console.error('❌ Error:', err.message);
        return [];
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔒 Connection closed');
        }
    }

}

export async function updateSalesReturns(salesReturnsData) {
    const uniqueBarcodes = [...new Set(salesReturnsData.map(item => item.barcode))].filter(Boolean);

    const { data: products, error } = await supabase
        .from('inventory')
        .select('odoo_id, barcode')
        .in('barcode', uniqueBarcodes);
    
    if (error) {
        console.error('Error fetching products:', error.message);
        return;
    }

    const barcodeMap = new Map(products.map(p => [p.barcode, p.odoo_id]));
    
    for (const item of salesReturnsData) {
        const barcode = item.barcode;
        const warehouse_id = item.warehouse_dest_id;
        const salesReturnsQuantity = item.quantity;
        const date = item.date;
        const product_id = barcodeMap.get(barcode);
        
        if (!product_id) {
            console.warn(`⚠️ No product found for barcode: ${barcode}`);
            continue;
        }

        const { error } = await supabase.from('stock_movements').insert([
            {
                product_id,
                warehouse_id,
                quantity: salesReturnsQuantity,
                movement_type: 'sales_returns',
                date
            }
        ]);

        if (error) {
            console.error(`❌ Error updating product ${product_id}:`, error.message);
        } else {
            console.log(`✅ Updated: product ${product_id} in warehouse ${warehouse_id} to quantity ${salesReturnsQuantity}`);
        }
    }
}
