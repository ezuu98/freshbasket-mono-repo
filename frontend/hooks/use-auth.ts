"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"

interface User {
  id: string
  email: string
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      if (apiClient.isAuthenticated()) {
        const currentUser = await apiClient.getCurrentUser()
        setUser(currentUser)
      } else {
        setUser(null)
      }
    } catch (err: any) {
      console.error("Auth check failed:", err)
      setUser(null)
      // Clear invalid token
      apiClient.clearToken()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const authResponse = await apiClient.login(email, password)
      setUser(authResponse.user)
      return authResponse
    } catch (err: any) {
      setError(err.message || "Login failed")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true)
      setError(null)

      const authResponse = await apiClient.register(email, password, name)
      return authResponse
    } catch (err: any) {
      setError(err.message || "Registration failed")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await apiClient.logout()
      setUser(null)
    } catch (err: any) {
      console.error("Logout error:", err)
      // Clear user even if logout fails
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    isAuthenticated: !!user,
  }
}
