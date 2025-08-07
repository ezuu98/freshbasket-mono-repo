import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Supabase errors
  if (err.message.includes('Supabase')) {
    error.statusCode = 500;
    error.message = 'Database operation failed';
  }

  // Odoo errors
  if (err.message.includes('Odoo')) {
    error.statusCode = 500;
    error.message = 'External system error';
  }

  // Validation errors
  if (err.message.includes('validation')) {
    error.statusCode = 400;
  }

  // JWT errors
  if (err.message.includes('jwt')) {
    error.statusCode = 401;
    error.message = 'Invalid token';
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}; 