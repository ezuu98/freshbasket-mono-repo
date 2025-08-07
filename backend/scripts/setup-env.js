#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 FreshBasket Backend Environment Setup');
console.log('==========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
  console.log('📝 You can edit it manually or run this script to overwrite it\n');
} else {
  console.log('❌ .env file not found');
  console.log('📝 Creating new .env file...\n');
}

// Template for .env file
const envTemplate = `# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
# Replace with your actual Supabase project URL and keys
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_for_authentication
JWT_EXPIRES_IN=24h

# Odoo Configuration
# Replace with your actual Odoo instance details
ODOO_URL=https://ansholdings-staging-01-15-01-25-21768477.dev.odoo.com/jsonrpc
ODOO_DB=ansholdings-staging-01-15-01-25-21768477
ODOO_USER=asewani@freshbasket.com.pk
ODOO_PASSWORD=Powerbi123

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database Configuration (if using external database)
# Based on existing configuration in backend/new/.config
DB_USER=sa
DB_PASSWORD=CisCis_1920fb
DB_SERVER=54.93.208.63
DB_PORT=55355
DB_NAME=test
DB_OPTIONS_ENCRYPT=false
DB_OPTIONS_TRUST_SERVER_CERTIFICATE=true
DB_REQUEST_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=30000
`;

// Write the template to .env file
fs.writeFileSync(envPath, envTemplate);

console.log('✅ Environment file created successfully!');
console.log('\n📋 Next steps:');
console.log('1. Edit the .env file with your actual values');
console.log('2. Make sure to replace placeholder values with your real credentials');
console.log('3. Run "npm run dev" to start the server');
console.log('\n🔐 Important: Never commit your .env file to version control!');
console.log('   It\'s already added to .gitignore for your safety.'); 