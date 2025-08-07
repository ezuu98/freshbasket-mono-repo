"use client"

import { ArrowLeft, User } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { InventoryItem } from "@/lib/api-client"
import { useEffect, useState, useMemo } from "react"
import { apiClient, type StockMovement } from "@/lib/api-client"

interface SkuDetailViewProps {
  sku: InventoryItem
  onBack: () => void
}

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");

const months = [
  { value: "01", name: "January" },
  { value: "02", name: "February" },
  { value: "03", name: "March" },
  { value: "04", name: "April" },
  { value: "05", name: "May" },
  { value: "06", name: "June" },
  { value: "07", name: "July" },
  { value: "08", name: "August" },
  { value: "09", name: "September" },
  { value: "10", name: "October" },
  { value: "11", name: "November" },
  { value: "12", name: "December" },
];

const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export function SkuDetailView({ sku, onBack }: SkuDetailViewProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [stockMovementData, setStockMovementData] = useState<StockMovement[]>([]);
  const [stockMovementLoading, setStockMovementLoading] = useState(false);
  const [stockMovementError, setStockMovementError] = useState<string | null>(null);



  const warehouseData = useMemo(() => {
    const warehouses = new Map();
    
    // Add warehouses from inventory data
    sku.warehouse_inventory?.forEach((wh) => {
      const code = wh.warehouse?.code || "";
      const name = wh.warehouse?.name || wh.warehouse?.code || "Unknown";
      warehouses.set(code, {
        warehouse: name,
        warehouseCode: code,
        openingStock: wh.quantity || 0,
        lastUpdated: "N/A",
      });
    });
    
    // Add warehouses from stock movements
    stockMovementData?.forEach((movement) => {
      const sourceWarehouse = movement.warehouse?.code;
      const destWarehouse = movement.warehouse_dest?.code;
      
      if (sourceWarehouse && !warehouses.has(sourceWarehouse)) {
        warehouses.set(sourceWarehouse, {
          warehouse: movement.warehouse?.name || sourceWarehouse,
          warehouseCode: sourceWarehouse,
          openingStock: 0,
          calculatedStock: 0,
          lastUpdated: "N/A",
        });
      }
      
      if (destWarehouse && !warehouses.has(destWarehouse)) {
        warehouses.set(destWarehouse, {
          warehouse: movement.warehouse_dest?.name || destWarehouse,
          warehouseCode: destWarehouse,
          openingStock: 0,
          calculatedStock: 0,
          lastUpdated: "N/A",
        });
      }
    });
    
    return Array.from(warehouses.values());
  }, [sku.warehouse_inventory, stockMovementData]);

  // Enhanced function to get stock movement data for a warehouse
  const getWarehouseMovements = (warehouseCode: string) => {
    // Process stock movement data to aggregate by warehouse
    const warehouseMovements = stockMovementData.reduce((acc, movement) => {
      const sourceWarehouse = movement.warehouse?.code;
      const destWarehouse = movement.warehouse_dest?.code;
      
      if (sourceWarehouse === warehouseCode) {
        switch (movement.movement_type) {
          case 'purchase':
            acc.sales += Math.abs(movement.quantity);
            break;
          case 'sales':
            acc.sales += Math.abs(movement.quantity);
            break;
          case 'sales_returns':
            acc.sales_returns += Math.abs(movement.quantity);
            break;
          case 'purchase_return':
            acc.purchase_returns += Math.abs(movement.quantity);
            break;
          case 'transfer_in':
            acc.transfer_in += Math.abs(movement.quantity);
            break;
          case 'wastages':
            acc.wastages += Math.abs(movement.quantity);
            break;
          case 'consumption':
            acc.consumption += Math.abs(movement.quantity);
            break;
        }
      }
      
      if (destWarehouse === warehouseCode) {
        // This warehouse is the destination
        switch (movement.movement_type) {
          case 'purchase':
            acc.purchases += movement.quantity;
            break;
          case 'transfer_in':
            acc.transfer_out += movement.quantity;
            break;
          case 'manufacturing':
            acc.manufacturing += movement.quantity;
            break;
        }
      }
      
      return acc;
    }, {
      warehouse_code: warehouseCode,
      purchases: 0,
      purchase_returns: 0,
      sales: 0,
      sales_returns: 0,
      wastages: 0,
      transfer_in: 0,
      transfer_out: 0,
      manufacturing: 0,
      consumption: 0
    });
    
    return warehouseMovements;
  };

  // Calculate totals including all movement types
  const calculateTotals = () => {
    let totalOpeningStock = 0;
    let totalPurchases = 0;
    let totalSales = 0;
    let totalPurchaseReturns = 0;
    let totalSalesReturns = 0;
    let totalWastages = 0;
    let totalTransferIN = 0;
    let totalTransferOUT = 0;
    let totalManufacturing = 0;
    let totalConsumption = 0;
    let totalClosingStock = 0;


    warehouseData.forEach((row) => {
      const movements = getWarehouseMovements(row.warehouseCode);

      totalOpeningStock += row.openingStock;
      totalPurchases += movements.purchases;
      totalPurchaseReturns += Math.abs(movements.purchase_returns);
      totalSales += Math.abs(movements.sales);
      totalSalesReturns += movements.sales_returns;
      totalWastages += Math.abs(movements.wastages);
      totalTransferIN += movements.transfer_in;
      totalTransferOUT += Math.abs(movements.transfer_out);
      totalManufacturing += movements.manufacturing;
      totalConsumption += movements.consumption;

      // Calculate closing stock: 
      // opening + purchases + transfer_in + manufacturing - sales - purchase_returns - transfer_out - wastages
      const closingStock = row.openingStock
        + movements.purchases
        + movements.transfer_in
        + movements.manufacturing
        + movements.sales_returns
        - Math.abs(movements.sales)
        - Math.abs(movements.purchase_returns)
        - Math.abs(movements.transfer_out)
        - Math.abs(movements.wastages)
        - Math.abs(movements.consumption);

      totalClosingStock += Math.max(0, closingStock); // Ensure no negative stock
    });

    return {
      totalOpeningStock,
      totalPurchases,
      totalPurchaseReturns,
      totalSales,
      totalSalesReturns,
      totalWastages,
      totalTransferIN,
      totalTransferOUT,
      totalManufacturing,
      totalConsumption,
      totalClosingStock,
    };
  };

  const totals = calculateTotals();

  useEffect(() => {
    const fetchStockMovementData = async () => {
      setStockMovementLoading(true);
      setStockMovementError(null);
      try {
        const response = await apiClient.getStockMovementDetails(
          sku.odoo_id?.toString() || sku.id?.toString() || "",
          parseInt(selectedMonth),
          selectedYear
        );
        setStockMovementData(response.data);
      } catch (err: any) {
        setStockMovementError(err.message || "Failed to fetch stock movement data");
        console.error("Stock movement data error:", err);
      } finally {
        setStockMovementLoading(false);
      }
    };

    fetchStockMovementData();
  }, [sku.odoo_id, sku.id, selectedMonth, selectedYear]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-800 rounded"></div>
              <span className="text-xl font-semibold text-gray-900">FreshBasket</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
            <button onClick={onBack} className="flex items-center hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Inventory
            </button>
            <span>/</span>
            <span className="text-gray-900">SKU Details</span>
          </div>

          {/* SKU Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SKU: {sku.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Barcode: {sku.barcode}</span>
              <span>•</span>
              <span>Category: {Array.isArray(sku.category) ? (sku.category[0] as any)?.display_name : (sku.category as any)?.display_name || "Uncategorized"}</span>
              <span>•</span>
              <span>Reorder Level: {sku.reordering_min_qty}</span>
            </div>
            <p className="text-gray-600 mt-2">Real-time inventory levels across all warehouse locations</p>
          </div>

          {/* Product Details */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product Name:</span>
                  <span className="font-medium">{sku.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Barcode:</span>
                  <span className="font-mono text-sm">{sku.barcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span>{Array.isArray(sku.category) ? (sku.category[0] as any)?.display_name : (sku.category as any)?.display_name || "Uncategorized"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit of Measure:</span>
                  <span>{sku.uom_name}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Stock Levels</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Cost:</span>
                  <span className="font-medium">PKR {sku.standard_price?.toFixed(2) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selling Price:</span>
                  <span className="font-medium">PKR {sku.list_price?.toFixed(2) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reorder Level:</span>
                  <span className="font-medium">{sku.reordering_min_qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Stock Level:</span>
                  <span className="font-medium">{sku.reordering_max_qty || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Stock Value:</span>
                  <span className="font-medium text-green-600">
                    PKR {((sku.standard_price || 0) * totals.totalClosingStock).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Loading/Error States */}
          {stockMovementLoading && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">Loading stock movement data...</p>
            </div>
          )}

          {stockMovementError && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading stock movement data: {stockMovementError}</p>
            </div>
          )}

          {/* Warehouse Inventory Table */}
          <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Warehouse Inventory</h2>

              {/* Month & Year Dropdowns */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Select Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.name}
                    </option>
                  ))}
                </select>

                <label className="text-sm font-medium text-gray-700">Select Year:</label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium text-gray-700 min-w-[150px]">Warehouse</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Opening Stock</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Purchases</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Purchase Returns</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Sales</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[100px]">Sales Returns</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Wastages</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Transfer IN</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Transfer OUT</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Manufacturing</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Consumption</TableHead>
                    <TableHead className="font-medium text-gray-700 text-center min-w-[120px]">Closing Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseData.length > 0 ? (
                    <>
                      {warehouseData.map((row, index) => {
                        const movements = getWarehouseMovements(row.warehouseCode);

                        const closingStock = Math.max(0,
                          row.openingStock
                          + movements.purchases
                          + movements.transfer_in
                          + movements.manufacturing
                          + movements.sales_returns
                          - Math.abs(movements.sales)
                          - Math.abs(movements.purchase_returns)
                          - Math.abs(movements.transfer_out)
                          - Math.abs(movements.wastages)
                          - Math.abs(movements.consumption)
                        );

                        return (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{row.warehouse}</div>
                                {row.warehouseCode && (
                                  <div className="text-sm text-gray-500">{row.warehouseCode}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-blue-600">{row.openingStock}</TableCell>
                            <TableCell className="text-center text-green-600">{movements.purchases}</TableCell>
                            <TableCell className="text-center text-orange-600">{movements.purchase_returns}</TableCell>
                            <TableCell className="text-center text-red-600 font-medium">{movements.sales}</TableCell>
                            <TableCell className="text-center text-red-600 font-medium">{movements.sales_returns}</TableCell>
                            <TableCell className="text-center text-red-500">{movements.wastages}</TableCell>
                            <TableCell className="text-center text-green-500">{movements.transfer_in}</TableCell>
                            <TableCell className="text-center text-red-500">{movements.transfer_out}</TableCell>
                            <TableCell className="text-center text-blue-500">{movements.manufacturing}</TableCell>
                            <TableCell className="text-center text-blue-500">{movements.consumption}</TableCell>
                            <TableCell className="text-center font-medium text-blue-600">{closingStock}</TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total Row */}
                      <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="text-center font-bold text-blue-600">{totals.totalOpeningStock}</TableCell>
                        <TableCell className="text-center font-bold text-green-600">{totals.totalPurchases}</TableCell>
                        <TableCell className="text-center font-bold text-orange-600">{totals.totalPurchaseReturns}</TableCell>
                        <TableCell className="text-center font-bold text-red-600">{totals.totalSales}</TableCell>
                        <TableCell className="text-center font-bold text-red-600">{totals.totalSalesReturns}</TableCell>
                        <TableCell className="text-center font-bold text-red-500">{totals.totalWastages}</TableCell>
                        <TableCell className="text-center font-bold text-green-500">{totals.totalTransferIN}</TableCell>
                        <TableCell className="text-center font-bold text-red-500">{totals.totalTransferOUT}</TableCell>
                        <TableCell className="text-center font-bold text-blue-500">{totals.totalManufacturing}</TableCell>
                        <TableCell className="text-center font-bold text-blue-500">{totals.totalConsumption}</TableCell>
                        <TableCell className="text-center font-bold text-blue-600">{totals.totalClosingStock}</TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        No warehouse data available for this SKU
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center space-x-8 mb-4">
            <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
              Terms of Service
            </a>
            <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
              Contact Us
            </a>
          </div>
          <div className="text-center text-gray-500 text-sm">©2024 FreshBasket. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}