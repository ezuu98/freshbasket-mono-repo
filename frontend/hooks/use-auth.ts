"use client"

import { useState, useEffect } from "react"

interface User {
  id: string
  email: string
  role: string
}

const DEMO_USER: User = {
  id: "demo-user-1",
  email: "demo@freshbasket.com",
  role: "Admin"
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

      // Check if user is "logged in" via localStorage
      const savedUser = localStorage.getItem('demo_user')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      } else {
        // Auto-login demo user for this demo
        setUser(DEMO_USER)
        localStorage.setItem('demo_user', JSON.stringify(DEMO_USER))
      }
    } catch (err: any) {
      console.error("Auth check failed:", err)
      setUser(null)
      localStorage.removeItem('demo_user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      // Simulate login validation
      if (email && password) {
        const user = {
          id: "demo-user-1",
          email: email,
          role: "Admin"
        }
        setUser(user)
        localStorage.setItem('demo_user', JSON.stringify(user))
        return { token: "demo-token", user }
      } else {
        throw new Error("Please enter valid credentials")
      }
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

      // Simulate registration
      const user = {
        id: "demo-user-1",
        email: email,
        role: "Admin"
      }
      return { token: "demo-token", user }
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
      localStorage.removeItem('demo_user')
      setUser(null)
    } catch (err: any) {
      console.error("Logout error:", err)
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
