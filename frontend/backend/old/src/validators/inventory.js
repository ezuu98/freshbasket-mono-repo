export function validateInventoryItem(req, res, next) {
  const { product_name, sku, category_id } = req.body
  const errors = []

  if (!product_name || product_name.trim().length === 0) {
    errors.push("Product name is required")
  }

  if (!sku || sku.trim().length === 0) {
    errors.push("SKU is required")
  }

  if (!category_id) {
    errors.push("Category is required")
  }

  if (req.body.unit_cost && (isNaN(req.body.unit_cost) || req.body.unit_cost < 0)) {
    errors.push("Unit cost must be a valid positive number")
  }

  if (req.body.unit_price && (isNaN(req.body.unit_price) || req.body.unit_price < 0)) {
    errors.push("Unit price must be a valid positive number")
  }

  if (req.body.reorder_level && (isNaN(req.body.reorder_level) || req.body.reorder_level < 0)) {
    errors.push("Reorder level must be a valid positive number")
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
