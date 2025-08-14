"use client"

import { useState, useRef } from "react"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiClient } from "@/lib/api-client"

interface UploadResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    barcode: string;
    warehouse_code: string;
    error: string;
  }>;
}

interface StockCorrection {
  date: string;
  stock_quantity: number;
  barcode: string;
  warehouse_code: string;
}

export function StockCorrectionsUpload() {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [previewData, setPreviewData] = useState<StockCorrection[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadResult(null)
      parseFile(selectedFile)
    }
  }

  const parseFile = async (file: File) => {
    try {
      const text = await file.text()
      let data: StockCorrection[] = []

      if (file.name.endsWith('.csv')) {
        data = parseCSV(text)
      } else {
        // For Excel files, we'd need a library like xlsx
        // For now, show error message
        throw new Error('Excel files not yet supported. Please use CSV format.')
      }

      setPreviewData(data.slice(0, 5)) // Show first 5 rows as preview
    } catch (error) {
      console.error('Error parsing file:', error)
      setPreviewData([])
    }
  }

  const parseCSV = (csvText: string): StockCorrection[] => {
    const lines = csvText.trim().split('\n')
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    
    // Find column indices
    const dateIndex = headers.findIndex(h => h.includes('date'))
    const stockIndex = headers.findIndex(h => h.includes('stock') || h.includes('quantity'))
    const barcodeIndex = headers.findIndex(h => h.includes('barcode'))
    const warehouseIndex = headers.findIndex(h => h.includes('warehouse'))

    if (dateIndex === -1 || stockIndex === -1 || barcodeIndex === -1 || warehouseIndex === -1) {
      throw new Error('Required columns not found. Please ensure your CSV has: date, stock_quantity, barcode, warehouse_code')
    }

    const data: StockCorrection[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim())
      if (row.length >= 4) {
        data.push({
          date: row[dateIndex].replace(/"/g, ''),
          stock_quantity: parseInt(row[stockIndex].replace(/"/g, '')),
          barcode: row[barcodeIndex].replace(/"/g, ''),
          warehouse_code: row[warehouseIndex].replace(/"/g, '')
        })
      }
    }

    return data
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const text = await file.text()
      const corrections = parseCSV(text)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const result = await apiClient.uploadStockCorrections(corrections)

      clearInterval(progressInterval)
      setUploadProgress(100)

      setUploadResult(result)
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadResult({
        success_count: 0,
        error_count: previewData.length,
        errors: [{ barcode: 'general', warehouse_code: 'general', error: error.message || 'Upload failed' }]
      })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setPreviewData([])
    setUploadResult(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const csvContent = `date,stock_quantity,barcode,warehouse_code
2024-01-31,100,1234567890123,BDRWH
2024-01-31,250,1234567890123,MHOWH
2024-01-31,75,9876543210987,BDRWH`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock-corrections-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Stock Corrections
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Stock Corrections
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file with actual stock counts per warehouse to calculate inventory variance. 
              Required columns: <strong>date</strong>, <strong>stock_quantity</strong>, <strong>barcode</strong>, <strong>warehouse_code</strong>
            </AlertDescription>
          </Alert>

          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Need a template?</h4>
              <p className="text-sm text-gray-600">Download a sample CSV file with the correct format including warehouse codes</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </Button>
              {file && (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetUpload}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </div>

          {/* Preview Data */}
          {previewData.length > 0 && !uploadResult && (
            <div className="space-y-3">
              <h4 className="font-medium">Preview (first 5 rows)</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 grid grid-cols-4 gap-4 text-sm font-medium">
                  <span>Date</span>
                  <span>Stock Quantity</span>
                  <span>Barcode</span>
                  <span>Warehouse Code</span>
                </div>
                <ScrollArea className="max-h-40">
                  {previewData.map((row, index) => (
                    <div key={index} className="px-4 py-2 grid grid-cols-4 gap-4 text-sm border-t">
                      <span>{row.date}</span>
                      <span>{row.stock_quantity}</span>
                      <span className="font-mono">{row.barcode}</span>
                      <span className="font-mono">{row.warehouse_code}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleUpload} disabled={uploading}>
                  Upload {previewData.length}+ Corrections
                </Button>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h4 className="font-medium">Upload Complete</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {uploadResult.success_count}
                  </div>
                  <div className="text-sm text-green-600">Successful uploads</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">
                    {uploadResult.error_count}
                  </div>
                  <div className="text-sm text-red-600">Failed uploads</div>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-red-700">Errors:</h5>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                      {uploadResult.errors.map((error, index) => (
                        <div key={index} className="p-2 bg-red-50 rounded text-sm">
                          <span className="font-mono">{error.barcode}</span> / <span className="font-mono">{error.warehouse_code}</span>: {error.error}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetUpload}>
                  Upload Another File
                </Button>
                <Button onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
