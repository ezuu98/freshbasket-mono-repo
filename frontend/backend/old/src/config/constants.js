export const MOVEMENT_TYPES = {
  IN: "IN",
  OUT: "OUT",
}

export const MOVEMENT_REASONS = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
  RETURN: "Return",
  DAMAGE: "Damage",
  EXPIRED: "Expired",
  THEFT: "Theft",
  RECOUNT: "Recount",
}

export const USER_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
  VIEWER: "viewer",
}

export const INVENTORY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DISCONTINUED: "discontinued",
}

export const STOCK_LEVELS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK_THRESHOLD: 10,
  NORMAL_STOCK_THRESHOLD: 50,
}

export const API_LIMITS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MAX_SEARCH_LENGTH: 100,
}

export const DATE_FORMATS = {
  ISO: "YYYY-MM-DDTHH:mm:ss.sssZ",
  DISPLAY: "MMM DD, YYYY",
  DISPLAY_WITH_TIME: "MMM DD, YYYY HH:mm",
}

export const CURRENCIES = {
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
}

export const UNITS_OF_MEASURE = {
  PIECES: "pcs",
  KILOGRAMS: "kg",
  GRAMS: "g",
  LITERS: "L",
  MILLILITERS: "ml",
  METERS: "m",
  CENTIMETERS: "cm",
  BOXES: "box",
  PACKS: "pack",
}

export const ERROR_MESSAGES = {
  VALIDATION_FAILED: "Validation failed",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  NOT_FOUND: "Resource not found",
  INTERNAL_ERROR: "Internal server error",
  DATABASE_ERROR: "Database operation failed",
  INVALID_INPUT: "Invalid input provided",
}

export const SUCCESS_MESSAGES = {
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  RETRIEVED: "Resource retrieved successfully",
}
