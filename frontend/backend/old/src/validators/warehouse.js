export function validateWarehouse(req, res, next) {
  const { name, code } = req.body
  const errors = []

  if (!name || name.trim().length === 0) {
    errors.push("Warehouse name is required")
  }

  if (!code || code.trim().length === 0) {
    errors.push("Warehouse code is required")
  }

  if (code && code.length > 10) {
    errors.push("Warehouse code must be 10 characters or less")
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
