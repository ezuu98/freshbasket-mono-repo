#!/bin/bash

# Development Environment Setup Script for FreshBasket Dashboard
# This script creates the .env.development.local file for local development

echo "🔧 Setting up development environment variables for FreshBasket Dashboard..."

# Create .env.development.local file
cat > .env.development.local << EOF
# API Configuration for Local Development
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Supabase Configuration (if needed)
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Environment
NODE_ENV=development
EOF

echo "✅ Development environment file created: .env.development.local"
echo "📋 Configuration:"
echo "   - API URL: http://localhost:3001"
echo "   - Environment: development"
echo ""
echo "🚀 Run 'npm run dev' to start local development" 