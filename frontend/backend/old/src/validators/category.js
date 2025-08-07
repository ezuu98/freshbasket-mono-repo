export function validateCategory(req, res, next) {
  const { name } = req.body
  const errors = []

  if (!name || name.trim().length === 0) {
    errors.push("Category name is required")
  }

  if (name && name.length > 100) {
    errors.push("Category name must be 100 characters or less")
  }

  if (req.body.description && req.body.description.length > 500) {
    errors.push("Description must be 500 characters or less")
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
