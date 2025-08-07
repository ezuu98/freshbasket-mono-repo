export function generateSKU(productName, categoryName) {
  const productPrefix = productName.substring(0, 3).toUpperCase()
  const categoryPrefix = categoryName.substring(0, 2).toUpperCase()
  const timestamp = Date.now().toString().slice(-6)

  return `${productPrefix}${categoryPrefix}${timestamp}`
}

export function generateBarcode() {
  // Generate a simple 13-digit barcode (EAN-13 format)
  const prefix = "123" // Company prefix
  const productCode = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, "0")
  const barcode = prefix + productCode

  // Calculate check digit (simplified)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10

  return barcode + checkDigit
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function formatDate(date, format = "short") {
  const options = {
    short: { year: "numeric", month: "short", day: "numeric" },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  }

  return new Intl.DateTimeFormat("en-US", options[format]).format(new Date(date))
}

export function calculateStockValue(items) {
  return items.reduce((total, item) => {
    const stock = item.warehouse_inventory?.reduce((sum, wh) => sum + (wh.current_stock || 0), 0) || 0
    const cost = item.unit_cost || 0
    return total + stock * cost
  }, 0)
}

export function isLowStock(currentStock, reorderLevel) {
  return currentStock <= reorderLevel && currentStock > 0
}

export function isOutOfStock(currentStock) {
  return currentStock === 0
}

export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== "string") return ""

  // Remove special characters that could cause issues with database queries
  return query.replace(/[^\w\s-]/gi, "").trim()
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function generateRandomId(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
