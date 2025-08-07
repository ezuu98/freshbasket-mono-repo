"use client"

import { useState, useEffect } from "react"
import { apiClient, InventoryItem } from "@/lib/api-client"

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

      if (searchQuery) {
        // Search inventory using API
        const { data, total } = await apiClient.searchInventory(searchQuery, page, itemsPerPage)
        setInventory(data || [])
        setTotalItems(total || 0)
      } else {
        // Get all inventory using API
        const { data, total } = await apiClient.getInventory()
        setInventory(data || [])
        setTotalItems(total || 0)
      }
      
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
      const stockCounts = await apiClient.getStockCounts()
      if (stockCounts) {
        setLowStockCount(stockCounts.lowStockCount || 0)
        setOutOfStockCount(stockCounts.outOfStockCount || 0)
      }
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
