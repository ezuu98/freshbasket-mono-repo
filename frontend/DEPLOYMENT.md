# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Supabase Project**: Ensure your Supabase project is set up

## Environment Variables

You need to set these environment variables in your Vercel project:

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables (if using Odoo integration)
```
ODOO_URL=your_odoo_url
ODOO_USERNAME=your_odoo_username
ODOO_PASSWORD=your_odoo_password
ODOO_DATABASE=your_odoo_database
```

## Deployment Steps

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**:
   ```bash
   cd /path/to/freshbasket-dashboard
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Set environment variables
   - Deploy

### Method 2: GitHub Integration

1. **Push your code to GitHub**
2. **Connect your GitHub repo to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

### Method 3: Vercel Dashboard

1. **Go to Vercel Dashboard**
2. **Create New Project**
3. **Import your GitHub repository**
4. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add the required variables listed above
5. **Deploy**

## Environment Variables Setup

### In Vercel Dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable:
   - **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
   - **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anon key

### Finding Your Supabase Credentials:

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "Project URL" and "anon public" key

## Build Configuration

The project is configured with:
- **Framework**: Next.js 15
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node Version**: 18.x (auto-detected)

## Post-Deployment

### 1. Verify Environment Variables
Check that your environment variables are set correctly in Vercel dashboard.

### 2. Test the Application
- Visit your deployed URL
- Test authentication
- Test inventory loading
- Test search functionality

### 3. Set up Custom Domain (Optional)
- Go to Project Settings → Domains
- Add your custom domain
- Configure DNS settings

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check environment variables are set
   - Ensure all dependencies are in package.json
   - Check for TypeScript errors

2. **Runtime Errors**:
   - Verify Supabase credentials
   - Check browser console for errors
   - Ensure Supabase RLS policies are configured

3. **Authentication Issues**:
   - Verify Supabase auth is enabled
   - Check redirect URLs in Supabase settings
   - Ensure environment variables are correct

### Debug Commands:

```bash
# Local build test
npm run build

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL

# Vercel logs
vercel logs
```

## Performance Optimization

The deployment includes:
- ✅ 24-hour localStorage caching
- ✅ Optimized Next.js configuration
- ✅ Security headers
- ✅ CDN distribution
- ✅ Automatic HTTPS

## Monitoring

After deployment:
1. Monitor Vercel analytics
2. Check function execution times
3. Monitor Supabase usage
4. Set up error tracking (optional)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally with same environment variables
4. Check Supabase project status 