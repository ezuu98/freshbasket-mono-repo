"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Edit, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InventoryAPI } from "@/lib/api/inventory"
import { StockMovementAPI } from "@/lib/api/stock-movements"
import { supabase } from "@/lib/supabase-client"
import type { Category, Warehouse, InventoryWithDetails, StockMovement } from "@/lib/supabase"

interface EditProductModalProps {
  product: InventoryWithDetails
  onProductUpdated: () => void
  trigger?: React.ReactNode
}

interface WarehouseStock {
  warehouse_id: string
  warehouse_name: string
  warehouse_code: string
  current_stock: number
  reserved_stock: number
  available_stock: number
  // Stock movement breakdown
  opening_stock: number
  purchases: number
  purchase_returns: number
  sales: number
  wastages: number
  transfer_in: number
  transfer_out: number
  manufacturing_in: number
  manufacturing_out: number
}

export function EditProductModal({ product, onProductUpdated, trigger }: EditProductModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([])

  // Product form data
  const [formData, setFormData] = useState({
    product_name: product.name,
    description: product.description || "",
    category_id: product.categ_id || "",
    unit_of_measure: product.uom_name,
    unit_cost: product.standard_price?.toString() || "",
    selling_price: product.sale_avg_price?.toString() || "",
    reorder_level: product.reordering_min_qty.toString(),
    max_stock_level: product.reordering_max_qty?.toString() || "",
  })

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadCategories()
      loadWarehouses()
      loadStockMovements()
      calculateWarehouseStocks()
    }
  }, [open])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name")
      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error("Error loading categories:", err)
    }
  }

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase.from("warehouses").select("*").eq("is_active", true).order("name")
      if (error) throw error
      setWarehouses(data || [])
    } catch (err) {
      console.error("Error loading warehouses:", err)
    }
  }

  const loadStockMovements = async () => {
    try {
      const movements = await StockMovementAPI.getMovementsByInventory(product.id)
      setStockMovements(movements)
    } catch (err) {
      console.error("Error loading stock movements:", err)
    }
  }

  const calculateWarehouseStocks = () => {
    const warehouseStockMap = new Map<string, WarehouseStock>()

    // Initialize with warehouse inventory data
    product.warehouse_inventory?.forEach((wh) => {
      if (wh.warehouse) {
        warehouseStockMap.set(wh.warehouse_id, {
          warehouse_id: wh.warehouse_id,
          warehouse_name: wh.warehouse.name,
          warehouse_code: wh.warehouse.code,
          current_stock: wh.current_stock,
          reserved_stock: wh.reserved_stock,
          available_stock: wh.available_stock,
          opening_stock: wh.opening_stock,
          purchases: 0,
          purchase_returns: 0,
          sales: 0,
          wastages: 0,
          transfer_in: 0,
          transfer_out: 0,
          manufacturing_in: 0,
          manufacturing_out: 0,
        })
      }
    })

    // Calculate stock movements by type and warehouse
    stockMovements.forEach((movement) => {
      const warehouseStock = warehouseStockMap.get(movement.warehouse_id)
      if (warehouseStock) {
        switch (movement.movement_type) {
          case "purchase":
            warehouseStock.purchases += movement.quantity
            break
          case "return":
            warehouseStock.purchase_returns += movement.quantity
            break
          case "sale":
            warehouseStock.sales += movement.quantity
            break
          case "wastage":
            warehouseStock.wastages += movement.quantity
            break
          case "transfer_in":
            warehouseStock.transfer_in += movement.quantity
            break
          case "transfer_out":
            warehouseStock.transfer_out += movement.quantity
            break
          case "adjustment":
            // Manufacturing adjustments - positive for manufacturing in, negative for out
            if (movement.quantity > 0) {
              warehouseStock.manufacturing_in += movement.quantity
            } else {
              warehouseStock.manufacturing_out += Math.abs(movement.quantity)
            }
            break
        }
      }
    })

    setWarehouseStocks(Array.from(warehouseStockMap.values()))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const validateForm = () => {
    if (!formData.product_name.trim()) {
      setError("Product name is required")
      return false
    }
    if (!formData.category_id) {
      setError("Category is required")
      return false
    }

    const unitCost = Number.parseFloat(formData.unit_cost)
    const sellingPrice = Number.parseFloat(formData.selling_price)

    if (formData.unit_cost && (isNaN(unitCost) || unitCost < 0)) {
      setError("Unit cost must be a valid positive number")
      return false
    }
    if (formData.selling_price && (isNaN(sellingPrice) || sellingPrice < 0)) {
      setError("Selling price must be a valid positive number")
      return false
    }
    if (unitCost && sellingPrice && sellingPrice < unitCost) {
      setError("Selling price should be higher than unit cost")
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const updateData = {
        ...formData,
        unit_cost: formData.unit_cost ? Number.parseFloat(formData.unit_cost) : undefined,
        selling_price: formData.selling_price ? Number.parseFloat(formData.selling_price) : undefined,
        reorder_level: Number.parseInt(formData.reorder_level) || 10,
        max_stock_level: formData.max_stock_level ? Number.parseInt(formData.max_stock_level) : undefined,
      }

      await InventoryAPI.updateInventoryItem(product.id, updateData)

      setSuccess("Product updated successfully!")
      onProductUpdated()

      // Close modal after short delay
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
      }, 1500)
    } catch (err) {
      console.error("Error updating product:", err)
      setError(err instanceof Error ? err.message : "Failed to update product")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setError(null)
      setSuccess(null)
    }
  }

  // Calculate stock formula explanation
  const getStockFormula = (stock: WarehouseStock) => {
    return `${stock.opening_stock} + ${stock.purchases} - ${stock.purchase_returns} - ${stock.sales} - ${stock.wastages} + ${stock.transfer_in} - ${stock.transfer_out} + ${stock.manufacturing_in} - ${stock.manufacturing_out} = ${stock.current_stock}`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product: {product.name}</DialogTitle>
          <DialogDescription>
            Update product information, pricing, and view detailed stock calculations.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Product Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Levels</TabsTrigger>
            <TabsTrigger value="stock">Stock Analysis</TabsTrigger>
          </TabsList>

          {/* Product Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input id="barcode" value={product.barcode} disabled className="bg-gray-100" />
                    <p className="text-xs text-gray-500">Barcode cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_name">Product Name *</Label>
                    <Input
                      id="product_name"
                      value={formData.product_name}
                      onChange={(e) => handleInputChange("product_name", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleInputChange("category_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(value) => handleInputChange("unit_of_measure", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="g">Grams</SelectItem>
                      <SelectItem value="l">Liters</SelectItem>
                      <SelectItem value="ml">Milliliters</SelectItem>
                      <SelectItem value="boxes">Boxes</SelectItem>
                      <SelectItem value="packs">Packs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing & Levels Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_cost">Unit Cost (£)</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_cost}
                      onChange={(e) => handleInputChange("unit_cost", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling_price">Selling Price (£)</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.selling_price}
                      onChange={(e) => handleInputChange("selling_price", e.target.value)}
                    />
                  </div>
                </div>

                {/* Profit Margin Display */}
                {formData.unit_cost && formData.selling_price && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Profit Margin:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        £
                        {(Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.unit_cost)).toFixed(2)}{" "}
                        (
                        {(
                          ((Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.unit_cost)) /
                            Number.parseFloat(formData.unit_cost)) *
                          100
                        ).toFixed(1)}
                        %)
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock Levels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reorder_level">Reorder Level *</Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      min="0"
                      value={formData.reorder_level}
                      onChange={(e) => handleInputChange("reorder_level", e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Alert when stock falls below this level</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_stock_level">Max Stock Level</Label>
                    <Input
                      id="max_stock_level"
                      type="number"
                      min="0"
                      value={formData.max_stock_level}
                      onChange={(e) => handleInputChange("max_stock_level", e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Maximum stock level for this product</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Analysis Tab */}
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Movement Analysis</CardTitle>
                <p className="text-sm text-gray-600">
                  Detailed breakdown of how current stock is calculated from all movements
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {warehouseStocks.map((stock) => (
                    <div key={stock.warehouse_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-lg">
                          {stock.warehouse_name} ({stock.warehouse_code})
                        </h4>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          Current: {stock.current_stock}
                        </Badge>
                      </div>

                      {/* Stock Calculation Formula */}
                      <div className="bg-blue-50 p-3 rounded-lg mb-4">
                        <p className="text-sm font-medium text-blue-800 mb-2">Stock Calculation Formula:</p>
                        <p className="text-sm font-mono text-blue-700">{getStockFormula(stock)}</p>
                      </div>

                      {/* Detailed Breakdown */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <h5 className="font-medium text-green-700">Additions (+)</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Opening Stock:</span>
                              <span className="font-medium">{stock.opening_stock}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Purchases:</span>
                              <span className="font-medium">{stock.purchases}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Transfer In:</span>
                              <span className="font-medium">{stock.transfer_in}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Manufacturing In:</span>
                              <span className="font-medium">{stock.manufacturing_in}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-red-700">Deductions (-)</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Purchase Returns:</span>
                              <span className="font-medium">{stock.purchase_returns}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sales:</span>
                              <span className="font-medium">{stock.sales}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Wastages:</span>
                              <span className="font-medium">{stock.wastages}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Transfer Out:</span>
                              <span className="font-medium">{stock.transfer_out}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Manufacturing Out:</span>
                              <span className="font-medium">{stock.manufacturing_out}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-blue-700">Current Status</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Current Stock:</span>
                              <span className="font-bold text-blue-600">{stock.current_stock}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Reserved:</span>
                              <span className="font-medium text-orange-600">{stock.reserved_stock}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Available:</span>
                              <span className="font-bold text-green-600">{stock.available_stock}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stock Movement Definitions */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-3">Stock Movement Definitions:</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div>
                        <strong>Purchases:</strong> Stock received from suppliers
                      </div>
                      <div>
                        <strong>Purchase Returns:</strong> Stock returned to suppliers
                      </div>
                      <div>
                        <strong>Sales:</strong> Stock sold to customers
                      </div>
                      <div>
                        <strong>Wastages:</strong> Stock lost due to damage, expiry, etc.
                      </div>
                      <div>
                        <strong>Transfer In:</strong> Stock received from other warehouses
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <strong>Transfer Out:</strong> Stock sent to other warehouses
                      </div>
                      <div>
                        <strong>Manufacturing In:</strong> Stock produced/assembled
                      </div>
                      <div>
                        <strong>Manufacturing Out:</strong> Stock used in production
                      </div>
                      <div>
                        <strong>Reserved:</strong> Stock allocated but not yet shipped
                      </div>
                      <div>
                        <strong>Available:</strong> Stock ready for sale/use
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
