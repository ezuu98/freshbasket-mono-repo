export function validateStockMovement(req, res, next) {
  const { inventory_id, warehouse_id, movement_type, quantity } = req.body
  const errors = []

  if (!inventory_id) {
    errors.push("Inventory ID is required")
  }

  if (!warehouse_id) {
    errors.push("Warehouse ID is required")
  }

  if (!movement_type || !["IN", "OUT"].includes(movement_type)) {
    errors.push("Movement type must be either 'IN' or 'OUT'")
  }

  if (!quantity || isNaN(quantity) || quantity <= 0) {
    errors.push("Quantity must be a positive number")
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    })
  }

  next()
}
