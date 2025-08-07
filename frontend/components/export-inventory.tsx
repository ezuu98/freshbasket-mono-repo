"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useInventory } from "@/hooks/use-inventory"

interface ExportInventoryProps {
  filteredData?: any[]
  searchTerm?: string
  category?: string
  stockStatus?: string
}

export function ExportInventory({ filteredData, searchTerm, category, stockStatus }: ExportInventoryProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { inventory } = useInventory()

  const dataToExport = filteredData || inventory

  const generateCSV = (data: any[]) => {
    const headers = [
      "Barcode",
      "Product Name",
      "Category",
      "Sub Category",
      "Unit of Measure",
      "Unit Cost",
      "Selling Price",
      "Reorder Level",
      "Max Stock Level",
      "BDRWH Stock",
      "MHOWH Stock",
      "SBZWH Stock",
      "CLIWH Stock",
      "BHDWH Stock",
      "ECMM Stock",
      "Total Stock",
      "Available Stock",
      "Reserved Stock",
      "Stock Status",
      "Stock Value",
      "Created Date",
    ]

    const csvContent = [
      headers.join(","),
      ...data.map((item) => {
        const warehouseData =
          item.originalData?.warehouse_inventory?.reduce(
            (acc: any, wh: any) => {
              const code = wh.warehouse?.code?.toLowerCase()
              if (code) {
                acc[code] = {
                  current: wh.current_stock,
                  available: wh.available_stock,
                  reserved: wh.reserved_stock,
                }
              }
              return acc
            },
            {} as Record<string, any>,
          ) || {}

        const totalStock = item.totalStock || 0
        const totalAvailable = Object.values(warehouseData).reduce(
          (sum: number, wh: any) => sum + (wh.available || 0),
          0,
        )
        const totalReserved = Object.values(warehouseData).reduce((sum: number, wh: any) => sum + (wh.reserved || 0), 0)
        const unitCost = item.originalData?.unit_cost || 0
        const stockValue = totalStock * unitCost
        
        // Calculate total stock value across all warehouses
        const totalStockValue = Object.values(warehouseData).reduce(
          (sum: number, wh: any) => sum + ((wh.current || 0) * unitCost),
          0,
        )

        const stockStatus = totalStock === 0 ? "Out of Stock" : item.isLowStock ? "Low Stock" : "In Stock"

        return [
          `"${item.barcode || ""}"`,
          `"${item.product || item.originalData?.product_name || ""}"`,
          `"${item.category || item.originalData?.category?.name || ""}"`,
          `"${item.subCategory || item.originalData?.sub_category || ""}"`,
          `"${item.originalData?.unit_of_measure || ""}"`,
          unitCost.toFixed(2),
          (item.originalData?.selling_price || 0).toFixed(2),
          item.originalData?.reorder_level || 0,
          item.originalData?.max_stock_level || "",
          warehouseData.bdrwh?.current || 0,
          warehouseData.mhowh?.current || 0,
          warehouseData.sbzwh?.current || 0,
          warehouseData.cliwh?.current || 0,
          warehouseData.bhdwh?.current || 0,
          warehouseData.ecmm?.current || 0,
          totalStock,
          totalAvailable,
          totalReserved,
          `"${stockStatus}"`,
          stockValue.toFixed(2),
          `"${new Date(item.originalData?.created_at || "").toLocaleDateString()}"`,
        ].join(",")
      }),
    ].join("\n")

    return csvContent
  }

  const generateDetailedCSV = async (data: any[]) => {
    const headers = [
      "Barcode",
      "Product Name",
      "Category",
      "Sub Category",
      "Warehouse",
      "Warehouse Code",
      "Opening Stock",
      "Purchases",
      "Purchase Returns",
      "Sales",
      "Sales Returns",
      "Wastages",
      "Transfer In",
      "Transfer Out",
      "Manufacturing",
      "Current Stock",
      "Reserved Stock",
      "Available Stock",
      "Unit Cost",
      "Stock Value",
      "Last Updated",
    ]

    const rows: string[] = []

    for (const item of data) {
      const baseInfo = {
        barcode: item.barcode || "",
        product: item.product || item.originalData?.product_name || "",
        category: item.category || item.originalData?.category?.name || "",
        subCategory: item.subCategory || item.originalData?.sub_category || "",
        unitCost: item.originalData?.unit_cost || 0,
      }

      if (item.originalData?.warehouse_inventory?.length) {
        for (const wh of item.originalData.warehouse_inventory) {
          // Get stock movement data for this product and warehouse
          let stockMovements = {
            purchases: 0,
            purchase_returns: 0,
            sales: 0,
            sales_returns: 0,
            wastages: 0,
            transfer_in: 0,
            transfer_out: 0,
            manufacturing: 0
          }

          try {
            // Fetch stock movement data for this product
            const { StockMovementService } = await import("@/lib/api/inventory")
            const currentDate = new Date()
            const currentMonth = currentDate.getMonth() + 1
            const currentYear = currentDate.getFullYear()
            
            const response = await StockMovementService.getStockMovementDetails(
              item.originalData?.odoo_id?.toString() || item.originalData?.id?.toString() || "",
              currentMonth,
              currentYear
            )
            
            // Find movements for this specific warehouse
            const warehouseCode = wh.warehouse?.code
            const warehouseMovement = response.data.find((m: any) => m.warehouse_code === warehouseCode)
            if (warehouseMovement) {
              stockMovements = warehouseMovement
            }
          } catch (error) {
            console.error("Error fetching stock movements for export:", error)
          }

          const stockValue = (wh.current_stock || 0) * baseInfo.unitCost
          rows.push(
            [
              `"${baseInfo.barcode}"`,
              `"${baseInfo.product}"`,
              `"${baseInfo.category}"`,
              `"${baseInfo.subCategory}"`,
              `"${wh.warehouse?.name || ""}"`,
              `"${wh.warehouse?.code || ""}"`,
              wh.opening_stock || 0,
              stockMovements.purchases || 0,
              stockMovements.purchase_returns || 0,
              Math.abs(stockMovements.sales) || 0,
              stockMovements.sales_returns || 0,
              Math.abs(stockMovements.wastages) || 0,
              stockMovements.transfer_in || 0,
              Math.abs(stockMovements.transfer_out) || 0,
              stockMovements.manufacturing || 0,
              wh.current_stock || 0,
              wh.reserved_stock || 0,
              wh.available_stock || 0,
              baseInfo.unitCost.toFixed(2),
              stockValue.toFixed(2),
              `"${new Date(wh.last_updated || "").toLocaleDateString()}"`,
            ].join(","),
          )
        }
      } else {
        // Product with no warehouse data
        rows.push(
          [
            `"${baseInfo.barcode}"`,
            `"${baseInfo.product}"`,
            `"${baseInfo.category}"`,
            `"${baseInfo.subCategory}"`,
            '""',
            '""',
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            baseInfo.unitCost.toFixed(2),
            "0.00",
            '""',
          ].join(","),
        )
      }
    }

    return [headers.join(","), ...rows].join("\n")
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const generateStockMovementReport = async (data: any[]) => {
    const headers = [
      "Product Name",
      "Barcode",
      "Category",
      "Warehouse",
      "Warehouse Code",
      "Month",
      "Year",
      "Opening Stock",
      "Purchases",
      "Purchase Returns",
      "Sales",
      "Sales Returns",
      "Wastages",
      "Transfer In",
      "Transfer Out",
      "Manufacturing",
      "Closing Stock",
      "Unit Cost",
      "Stock Value",
    ]

    const rows: string[] = []
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    for (const item of data) {
      try {
        const { StockMovementService } = await import("@/lib/api/inventory")
        const response = await StockMovementService.getStockMovementDetails(
          item.originalData?.odoo_id?.toString() || item.originalData?.id?.toString() || "",
          currentMonth,
          currentYear
        )

        if (item.originalData?.warehouse_inventory?.length) {
          for (const wh of item.originalData.warehouse_inventory) {
            const warehouseCode = wh.warehouse?.code
            const warehouseMovement = response.data.find((m: any) => m.warehouse_code === warehouseCode) || {
              purchases: 0,
              purchase_returns: 0,
              sales: 0,
              sales_returns: 0,
              wastages: 0,
              transfer_in: 0,
              transfer_out: 0,
              manufacturing: 0
            }

            const openingStock = wh.opening_stock || 0
            const closingStock = wh.current_stock || 0
            const unitCost = item.originalData?.unit_cost || 0
            const stockValue = closingStock * unitCost

            rows.push(
              [
                `"${item.product || item.originalData?.product_name || ""}"`,
                `"${item.barcode || ""}"`,
                `"${item.category || item.originalData?.category?.name || ""}"`,
                `"${wh.warehouse?.name || ""}"`,
                `"${wh.warehouse?.code || ""}"`,
                currentMonth,
                currentYear,
                openingStock,
                warehouseMovement.purchases || 0,
                warehouseMovement.purchase_returns || 0,
                Math.abs(warehouseMovement.sales) || 0,
                warehouseMovement.sales_returns || 0,
                Math.abs(warehouseMovement.wastages) || 0,
                warehouseMovement.transfer_in || 0,
                Math.abs(warehouseMovement.transfer_out) || 0,
                warehouseMovement.manufacturing || 0,
                closingStock,
                unitCost.toFixed(2),
                stockValue.toFixed(2),
              ].join(","),
            )
          }
        }
      } catch (error) {
        console.error("Error generating stock movement report:", error)
      }
    }

    return [headers.join(","), ...rows].join("\n")
  }

  const handleExport = async (format: "csv" | "detailed-csv" | "json" | "stock-movement") => {
    setLoading(true)
    setError(null)

    try {
      const timestamp = new Date().toISOString().split("T")[0]
      const filterSuffix =
        searchTerm || category !== "All Categories" || stockStatus !== "All Status" ? "_filtered" : ""

      switch (format) {
        case "csv":
          const csvContent = generateCSV(dataToExport)
          downloadFile(csvContent, `inventory_summary_${timestamp}${filterSuffix}.csv`, "text/csv")
          break

        case "detailed-csv":
          const detailedCsvContent = await generateDetailedCSV(dataToExport)
          downloadFile(detailedCsvContent, `inventory_detailed_${timestamp}${filterSuffix}.csv`, "text/csv")
          break

        case "json":
          const jsonContent = JSON.stringify(
            dataToExport.map((item) => ({
              barcode: item.barcode,
              product_name: item.product || item.originalData?.product_name,
              category: item.category || item.originalData?.category?.name,
              sub_category: item.subCategory || item.originalData?.sub_category,
              unit_of_measure: item.originalData?.unit_of_measure,
              unit_cost: item.originalData?.unit_cost,
              selling_price: item.originalData?.selling_price,
              reorder_level: item.originalData?.reorder_level,
              max_stock_level: item.originalData?.max_stock_level,
              total_stock: item.totalStock,
              warehouse_inventory: item.originalData?.warehouse_inventory,
              created_at: item.originalData?.created_at,
              updated_at: item.originalData?.updated_at,
            })),
            null,
            2,
          )
          downloadFile(jsonContent, `inventory_${timestamp}${filterSuffix}.json`, "application/json")
          break

        case "stock-movement":
          const stockMovementContent = await generateStockMovementReport(dataToExport)
          downloadFile(stockMovementContent, `stock_movement_report_${timestamp}${filterSuffix}.csv`, "text/csv")
          break
      }
    } catch (err) {
      console.error("Export error:", err)
      setError("Failed to export data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium text-gray-700">
            Export Options ({dataToExport.length} items)
          </div>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => handleExport("csv")} disabled={loading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Summary CSV</div>
              <div className="text-xs text-gray-500">Basic inventory data</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleExport("detailed-csv")} disabled={loading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Detailed CSV</div>
              <div className="text-xs text-gray-500">With warehouse breakdown</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleExport("json")} disabled={loading}>
            <FileText className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">JSON Export</div>
              <div className="text-xs text-gray-500">Complete data structure</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleExport("stock-movement")} disabled={loading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Stock Movement Report</div>
              <div className="text-xs text-gray-500">Monthly movement analysis</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <div className="px-2 py-1.5 text-xs text-gray-500">
            {searchTerm && `Search: "${searchTerm}"`}
            {category !== "All Categories" && ` • Category: ${category}`}
            {stockStatus !== "All Status" && ` • Status: ${stockStatus}`}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
