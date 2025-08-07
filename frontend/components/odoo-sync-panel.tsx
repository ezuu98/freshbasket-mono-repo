"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, PlugZap } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export function OdooSyncPanel() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState("")

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      // For now, we'll test by trying to sync products
      await apiClient.syncProducts()
      setMessage("✅ Connection successful")
    } catch (err: any) {
      console.error("Connection test failed:", err)
      setMessage("❌ Connection failed: " + err.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await apiClient.syncAll()
      setMessage(`✅ Sync completed! ${result.count} records processed`)
    } catch (err: any) {
      console.error("Sync failed:", err)
      setMessage("❌ Sync failed: " + err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <Button onClick={handleTestConnection} disabled={isTesting}>
          {isTesting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <PlugZap className="mr-2 h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>

        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Sync Inventory
            </>
          )}
        </Button>
      </div>

      {/* ✅ Feedback message */}
      {message && (
        <p
          className={`text-sm ${message.includes("✅") ? "text-green-600" : "text-red-600"
            }`}
        >
          {message}
        </p>
      )}
    </div>
  )

}