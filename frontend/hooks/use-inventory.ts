"use client"

import { useState, useEffect } from "react"
import { MOCK_INVENTORY_DATA, type InventoryItem } from "@/lib/mock-data"

export function useInventory(initialPage = 1, itemsPerPage = 30) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [stockStatus, setStockStatus] = useState("All Status")
  const [isSearching, setIsSearching] = useState(false)
  const [page, setPage] = useState(initialPage)

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      setDataLoaded(false)

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      let filteredData = [...MOCK_INVENTORY_DATA]

      if (searchQuery) {
        filteredData = filteredData.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.barcode && item.barcode.includes(searchQuery))
        )
      }

      setInventory(filteredData)
      setTotalItems(filteredData.length)
      
      // Mark data as loaded after successful fetch
      setDataLoaded(true)
    } catch (err: any) {
      setError(err.message || "Failed to fetch inventory")
      console.error("Error fetching inventory:", err)
      // Set default values on error
      setInventory([])
      setTotalItems(0)
      setDataLoaded(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchStockCounts = async () => {
    try {
      // Calculate stock counts from mock data
      let lowStock = 0
      let outOfStock = 0

      MOCK_INVENTORY_DATA.forEach(item => {
        const totalStock = item.warehouse_inventory?.reduce((sum, wh) => sum + (wh.stock_quantity || 0), 0) || 0
        
        if (totalStock === 0) {
          outOfStock++
        } else if (totalStock <= item.reordering_min_qty) {
          lowStock++
        }
      })

      setLowStockCount(lowStock)
      setOutOfStockCount(outOfStock)
    } catch (err) {
      console.error("Error fetching stock counts:", err)
      // Set default values on error
      setLowStockCount(0)
      setOutOfStockCount(0)
    }
  }

  useEffect(() => {
    fetchInventory()
    fetchStockCounts()
  }, [page, searchQuery])

  const searchInventory = (query: string) => {
    setIsSearching(true)
    setSearchQuery(query)
    setPage(1) // Reset to first page when searching
  }

  const clearSearch = () => {
    setSearchQuery("")
    setIsSearching(false)
    setPage(1)
  }

  const setCategoryFilter = (newCategory: string) => {
    setCategory(newCategory)
    setPage(1) // Reset to first page when filtering
    setLoading(true) // Show loading state during filter change
  }

  const setStockStatusFilter = (newStatus: string) => {
    setStockStatus(newStatus)
    setPage(1) // Reset to first page when filtering
    setLoading(true) // Show loading state during filter change
  }

  return {
    inventory,
    totalItems,
    loading,
    dataLoaded,
    error,
    refetch: fetchInventory,
    lowStockCount,
    outOfStockCount,
    page,
    setPage,
    searchInventory,
    clearSearch,
    searchQuery,
    category,
    stockStatus,
    setCategoryFilter,
    setStockStatusFilter,
    isSearching,
  }
}
