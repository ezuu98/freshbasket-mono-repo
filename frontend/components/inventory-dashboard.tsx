"use client"

import { useState, useMemo } from "react"
import { Search, User, LogOut, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useCallback } from "react"
import debounce from "lodash/debounce"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SkuDetailView } from "./sku-detail-view"
import { useInventory } from "@/hooks/use-inventory"
import { useAuth } from "@/hooks/use-auth"
import type { InventoryItem } from "@/lib/mock-data"
import { useEffect } from "react"

export function InventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [stockStatus, setStockStatus] = useState("All Status")
  const [currentView, setCurrentView] = useState<"dashboard" | "sku-detail">("dashboard")
  const [selectedSku, setSelectedSku] = useState<InventoryItem | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  const itemsPerPage = 30

  const {
    inventory,
    totalItems,
    loading,
    dataLoaded,
    error,
    lowStockCount,
    outOfStockCount,
    refetch,
    searchInventory,
    setPage,
    page
  } = useInventory(1, itemsPerPage)

  const { user, logout } = useAuth()

  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setSearchTerm(query);
      setPage(1);
      searchInventory(query);
    }, 200),
    [searchInventory, setPage]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSkuClick = (item: InventoryItem) => {
    setSelectedSku(item)
    setCurrentView("sku-detail")
  }

  const handleBackToDashboard = () => {
    setCurrentView("dashboard")
    setSelectedSku(null)
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleNextPage = () => {
    setPage(page + 1)
  }

  const handlePreviousPage = () => {
    setPage(page - 1)
  }

  // Transform inventory data for display
  const transformedInventory = useMemo(() => {  
    if (!inventory || !Array.isArray(inventory)) {
      return [];
    }
    
    return inventory.map((item) => {
      const warehouseMap: Record<string, number> = {
        bdrwh: 0,
        mhowh: 0,
        sbzwh: 0,
        cliwh: 0,
        bhdwh: 0,
        ecmwh: 0,
      };

      const validWarehouseCodes = Object.keys(warehouseMap);

      item.warehouse_inventory?.forEach((wh) => {
        const whCode = wh.warehouse?.code?.toLowerCase();
        if (whCode && validWarehouseCodes.includes(whCode)) {
          const stockQuantity = wh.stock_quantity !== undefined ? wh.stock_quantity : wh.quantity || 0;
          warehouseMap[whCode] = stockQuantity;
        }
      });

      const totalStock = Object.values(warehouseMap).reduce((sum, qty) => sum + qty, 0);
      const isLowStock = totalStock <= item.reordering_min_qty;

      return {
        id: item.id,
        barcode: item.barcode,
        product: item.name,
        category: item.category?.display_name || "Uncategorized",
        bdrwh: warehouseMap.bdrwh,
        mhowh: warehouseMap.mhowh,
        sbzwh: warehouseMap.sbzwh,
        cliwh: warehouseMap.cliwh,
        bhdwh: warehouseMap.bhdwh,
        ecmwh: warehouseMap.ecmwh,
        totalStock,
        isLowStock,
        reorderLevel: item.reordering_min_qty,
        originalData: item,
      };
    });
  }, [inventory]);

  // Get unique categories from the data
  const availableCategories = useMemo(() => {
    const categories = new Set(transformedInventory.map(item => item.category))
    return Array.from(categories).sort()
  }, [transformedInventory])

  // Client-side filtering
  const filteredData = useMemo(() => {
    const filtered = transformedInventory.filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.includes(searchTerm))

      const matchesCategory = category === "All Categories" || item.category === category

      const matchesStockStatus =
        stockStatus === "All Status" ||
        (stockStatus === "in-stock" && item.totalStock > item.reorderLevel) ||
        (stockStatus === "low-stock" && item.isLowStock && item.totalStock > 0) ||
        (stockStatus === "out-of-stock" && item.totalStock === 0)

      return matchesSearch && matchesCategory && matchesStockStatus
    })
    
    return filtered;
  }, [transformedInventory, searchTerm, category, stockStatus])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, category, stockStatus, setPage])

  // Set paginatedData: always slice filteredData for pagination
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  // Calculate actual total items for pagination (use filtered count when filters are active)
  const actualTotalItems = filteredData.length

  // Calculate dashboard stats from filtered data
  const dashboardStats = useMemo(() => {
    let lowStockCount = 0
    let outOfStockCount = 0

    filteredData.forEach(item => {
      if (item.totalStock === 0) {
        outOfStockCount++
      } else if (item.isLowStock) {
        lowStockCount++
      }
    })

    return {
      totalProducts: actualTotalItems,
      lowStockCount,
      outOfStockCount
    }
  }, [filteredData, actualTotalItems])

  if (loading || !dataLoaded) {
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src="/placeholder.svg"
                        alt={user?.email || "User"}
                      />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.email}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.role || "User"}</p>
                      <Badge variant="secondary" className="w-fit text-xs">
                        {user?.role || "User"}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Live Inventory Tracking</h1>
            </div>

            {/* Loading State */}
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg mb-2">Loading inventory data...</p>
                <p className="text-gray-500 text-sm">This may take a few moments for large datasets</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading inventory: {error}</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (currentView === "sku-detail" && selectedSku) {
    return <SkuDetailView sku={selectedSku} onBack={handleBackToDashboard} />
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="/placeholder.svg"
                    alt={user?.email || "User"}
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.email}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.role || "User"}</p>
                  <Badge variant="secondary" className="w-fit text-xs">
                    {user?.role || "User"}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <main className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Inventory Tracking</h1>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  totalItems
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  lowStockCount
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  outOfStockCount
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="by SKU Product Name or Barcode"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    if (value.trim()) {
                      debouncedSearch(value);
                    } else {
                      setPage(1);
                      searchInventory("");
                    }
                  }}
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div className="flex justify-between items-center flex-wrap gap-4">
              {/* Left Filters */}
              <div className="flex space-x-4">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Categories">All Categories</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Status">All Status</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-medium text-gray-700">Barcode</TableHead>
                <TableHead className="font-medium text-gray-700">Product</TableHead>
                <TableHead className="font-medium text-gray-700">Category</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">BDRWH</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">MHOWH</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">SBZWH</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">CLIWH</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">BHDWH</TableHead>
                <TableHead className="font-medium text-gray-700 text-center">ECMWH</TableHead>
                <TableHead className="font-medium text-gray-700 text-center"><b>TOTAL</b></TableHead>
                <TableHead className="font-medium text-gray-700 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm text-blue-600">{item.barcode}</TableCell>
                  <TableCell className="font-medium">
                    <button
                      onClick={() => handleSkuClick(item.originalData)}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      {item.product}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{item.bdrwh}</TableCell>
                  <TableCell className="text-center">{item.mhowh}</TableCell>
                  <TableCell className="text-center">{item.sbzwh}</TableCell>
                  <TableCell className="text-center">{item.cliwh}</TableCell>
                  <TableCell className="text-center">{item.bhdwh}</TableCell>
                  <TableCell className="text-center">{item.ecmwh}</TableCell>
                  <TableCell className="text-center font-semibold text-gray-900">{item.totalStock}</TableCell>
                  <TableCell className="text-center">
                    {item.totalStock === 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : item.isLowStock ? (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center py-4 px-6">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, actualTotalItems)} of {actualTotalItems} entries
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={handlePreviousPage}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 py-1 text-sm text-gray-600">
                Page {page} of {Math.ceil(actualTotalItems / itemsPerPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(actualTotalItems / itemsPerPage)}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
)
}
