# Quick Environment Setup

## 🚀 Get Started in 3 Steps

### 1. Update Your .env File
Edit the `.env` file in the `freshbasket-backend` directory and replace these values:

```env
# Replace these with your actual values:

# Supabase (from your existing frontend)
SUPABASE_URL=https://your-actual-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
SUPABASE_ANON_KEY=your-actual-anon-key

# JWT (generate a strong secret)
JWT_SECRET=your-strong-jwt-secret-key

# Odoo (from your existing backend)
ODOO_URL=https://your-actual-odoo-url.com
ODOO_DB=your-actual-database-name
ODOO_USER=your-actual-username
ODOO_PASSWORD=your-actual-password
```

### 2. Start the Server
```bash
npm run dev
```

### 3. Test the Setup
```bash
curl http://localhost:3001/health
```

## 🔍 Where to Find These Values

### Supabase Values
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy the values from there

### Odoo Values
1. Check your existing backend files in `freshbasket-dashboard/backend/new/`
2. Look for the `.config` file or any existing environment setup
3. Use the same values you're currently using

### JWT Secret
Generate a strong secret key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ✅ Success Indicators

- Server starts without errors
- Health endpoint returns: `{"status":"OK","timestamp":"...","environment":"development"}`
- No missing environment variable errors in console

## 🆘 Troubleshooting

**Error: "Missing Supabase configuration"**
- Check that SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly

**Error: "Missing Odoo configuration"**
- Check that all ODOO_* variables are set correctly

**Error: "JWT_SECRET is required"**
- Make sure JWT_SECRET is set to a strong secret key

**Server won't start on port 3001**
- Check if port 3001 is already in use
- Change PORT in .env file if needed 