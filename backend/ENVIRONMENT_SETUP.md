# Environment Variables Setup Guide

## Required Environment Variables

Copy the following into your `.env` file in the `freshbasket-backend` directory:

```env
# Server Configuration
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
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=your_odoo_database_name
ODOO_USER=your_odoo_username
ODOO_PASSWORD=your_odoo_password

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
```

## How to Get These Values

### 1. Supabase Configuration
- **SUPABASE_URL**: Your Supabase project URL (found in your Supabase dashboard)
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key from Supabase dashboard (Settings > API)
- **SUPABASE_ANON_KEY**: Anon key from Supabase dashboard (Settings > API)

### 2. JWT Configuration
- **JWT_SECRET**: Generate a strong secret key (you can use a random string)
- **JWT_EXPIRES_IN**: Token expiration time (e.g., "24h", "7d")

### 3. Odoo Configuration
- **ODOO_URL**: Your Odoo instance URL
- **ODOO_DB**: Your Odoo database name
- **ODOO_USER**: Your Odoo username
- **ODOO_PASSWORD**: Your Odoo password

### 4. Database Configuration (Optional)
These are from your existing backend configuration. If you're using the same database setup, use these values.

## Testing the Setup

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Test the health endpoint**:
   ```bash
   curl http://localhost:3001/health
   ```

3. **Test authentication** (replace with your actual Supabase credentials):
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@example.com","password":"your-password"}'
   ```

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique secrets for JWT_SECRET
- Keep your Supabase service role key secure
- Use environment-specific configurations for production

## Environment Variables Reference

| Variable | Purpose | Required |
|----------|---------|----------|
| PORT | Server port | Yes |
| NODE_ENV | Environment (development/production) | Yes |
| SUPABASE_URL | Supabase project URL | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | Yes |
| SUPABASE_ANON_KEY | Supabase anon key | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| JWT_EXPIRES_IN | JWT token expiration | Yes |
| ODOO_URL | Odoo instance URL | Yes |
| ODOO_DB | Odoo database name | Yes |
| ODOO_USER | Odoo username | Yes |
| ODOO_PASSWORD | Odoo password | Yes |
| CORS_ORIGIN | Allowed CORS origin | Yes |
| RATE_LIMIT_WINDOW_MS | Rate limiting window | Yes |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | Yes |
| DB_* | Database configuration | Optional | 