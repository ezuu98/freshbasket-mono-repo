#!/bin/bash

# Environment Setup Script for FreshBasket Dashboard
# This script creates the .env.local file with production settings

echo "🔧 Setting up environment variables for FreshBasket Dashboard..."

# Create .env.local file
cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://47.128.153.244:3001/api

# Supabase Configuration (if needed)
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Environment
NODE_ENV=production
EOF

echo "✅ Environment file created: .env.local"
echo "📋 Configuration:"
echo "   - API URL: http://47.128.153.244:3001"
echo "   - Environment: production"
echo ""
echo "💡 To use local development, create .env.development.local with:"
echo "   NEXT_PUBLIC_API_URL=http://localhost:3001" 