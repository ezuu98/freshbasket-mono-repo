"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
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
import { InventoryAPI } from "@/lib/api/inventory"
import { supabase } from "@/lib/supabase-client"
import type { Category, Warehouse } from "@/lib/supabase"

interface AddProductModalProps {
  onProductAdded: () => void
}

interface WarehouseStock {
  warehouse_id: string
  warehouse_name: string
  opening_stock: number
  current_stock: number
}

export function AddProductModal({ onProductAdded }: AddProductModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [currentStep, setCurrentStep] = useState(1)

  // Product form data
  const [formData, setFormData] = useState({
    barcode: "",
    product_name: "",
    description: "",
    category_id: "",
    sub_category: "",
    unit_of_measure: "pieces",
    unit_cost: "",
    selling_price: "",
    reorder_level: "10",
    max_stock_level: "",
  })

  // Warehouse stock data
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([])

  // Load categories and warehouses
  useEffect(() => {
    if (open) {
      loadCategories()
      loadWarehouses()
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

      // Initialize warehouse stocks
      const initialStocks: WarehouseStock[] = (data || []).map((warehouse) => ({
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        opening_stock: 0,
        current_stock: 0,
      }))
      setWarehouseStocks(initialStocks)
    } catch (err) {
      console.error("Error loading warehouses:", err)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const handleWarehouseStockChange = (warehouseId: string, field: "opening_stock" | "current_stock", value: string) => {
    const numValue = Number.parseInt(value) || 0
    setWarehouseStocks((prev) =>
      prev.map((stock) =>
        stock.warehouse_id === warehouseId
          ? {
              ...stock,
              [field]: numValue,
              // Auto-set current_stock to opening_stock if current_stock is being changed
              ...(field === "opening_stock" ? { current_stock: numValue } : {}),
            }
          : stock,
      ),
    )
  }

  const validateStep1 = () => {
    if (!formData.barcode.trim()) {
      setError("Barcode is required")
      return false
    }
    if (!formData.product_name.trim()) {
      setError("Product name is required")
      return false
    }
    if (!formData.category_id) {
      setError("Category is required")
      return false
    }
    return true
  }

  const validateStep2 = () => {
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

  const handleNext = () => {
    setError(null)
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create the inventory item
      const inventoryData = {
        ...formData,
        unit_cost: formData.unit_cost ? Number.parseFloat(formData.unit_cost) : undefined,
        selling_price: formData.selling_price ? Number.parseFloat(formData.selling_price) : undefined,
        reorder_level: Number.parseInt(formData.reorder_level) || 10,
        max_stock_level: formData.max_stock_level ? Number.parseInt(formData.max_stock_level) : undefined,
      }

      const newProduct = await InventoryAPI.createInventoryItem(inventoryData)

      // Create warehouse inventory records
      const warehouseInventoryPromises = warehouseStocks
        .filter((stock) => stock.opening_stock > 0 || stock.current_stock > 0)
        .map((stock) =>
          supabase.from("warehouse_inventory").insert({
            inventory_id: newProduct.id,
            warehouse_id: stock.warehouse_id,
            opening_stock: stock.opening_stock,
            current_stock: stock.current_stock,
            reserved_stock: 0,
          }),
        )

      if (warehouseInventoryPromises.length > 0) {
        const results = await Promise.all(warehouseInventoryPromises)
        const errors = results.filter((result) => result.error)
        if (errors.length > 0) {
          console.error("Some warehouse inventory records failed:", errors)
        }
      }

      setSuccess("Product added successfully!")
      onProductAdded()

      // Reset form after short delay
      setTimeout(() => {
        resetForm()
        setOpen(false)
      }, 1500)
    } catch (err) {
      console.error("Error adding product:", err)
      setError(err instanceof Error ? err.message : "Failed to add product")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      barcode: "",
      product_name: "",
      description: "",
      category_id: "",
      sub_category: "",
      unit_of_measure: "pieces",
      unit_cost: "",
      selling_price: "",
      reorder_level: "10",
      max_stock_level: "",
    })
    setWarehouseStocks([])
    setCurrentStep(1)
    setError(null)
    setSuccess(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory. Complete all steps to create the product with initial stock levels.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep
                    ? "bg-blue-600 text-white"
                    : step < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {step}
              </div>
              {step < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>

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

        {/* Step 1: Basic Product Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode *</Label>
                  <Input
                    id="barcode"
                    placeholder="Enter product barcode"
                    value={formData.barcode}
                    onChange={(e) => handleInputChange("barcode", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    placeholder="Enter product name"
                    value={formData.product_name}
                    onChange={(e) => handleInputChange("product_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter product description (optional)"
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
                <div className="space-y-2">
                  <Label htmlFor="sub_category">Sub Category</Label>
                  <Input
                    id="sub_category"
                    placeholder="Enter sub category"
                    value={formData.sub_category}
                    onChange={(e) => handleInputChange("sub_category", e.target.value)}
                  />
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
        )}

        {/* Step 2: Pricing and Stock Levels */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing and Stock Levels</CardTitle>
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
                    placeholder="0.00"
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
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={(e) => handleInputChange("selling_price", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level *</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    placeholder="10"
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
                    placeholder="Optional"
                    value={formData.max_stock_level}
                    onChange={(e) => handleInputChange("max_stock_level", e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Maximum stock level for this product</p>
                </div>
              </div>

              {/* Profit Margin Display */}
              {formData.unit_cost && formData.selling_price && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Profit Margin:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      £{(Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.unit_cost)).toFixed(2)}{" "}
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
        )}

        {/* Step 3: Initial Warehouse Stock */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Initial Warehouse Stock</CardTitle>
              <p className="text-sm text-gray-600">Set the initial stock levels for each warehouse (optional)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {warehouseStocks.map((stock) => (
                <div key={stock.warehouse_id} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">{stock.warehouse_name}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Opening Stock</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={stock.opening_stock || ""}
                        onChange={(e) =>
                          handleWarehouseStockChange(stock.warehouse_id, "opening_stock", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Stock</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={stock.current_stock || ""}
                        onChange={(e) =>
                          handleWarehouseStockChange(stock.warehouse_id, "current_stock", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800">Total Initial Stock:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {warehouseStocks.reduce((sum, stock) => sum + stock.current_stock, 0)} {formData.unit_of_measure}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            )}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Product...
                  </>
                ) : (
                  "Add Product"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
