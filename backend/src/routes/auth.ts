import { Router } from 'express';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';

const router = Router();

// POST /api/auth/login - Login with Supabase auth
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const payload = {
      id: data.user.id,
      email: data.user.email,
      role: 'user', // You can customize this based on your user roles
    };
    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

// POST /api/auth/register - Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Register with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
      },
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me - Get current user info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: 'user',
        },
      },
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

export { router as authRoutes }; 