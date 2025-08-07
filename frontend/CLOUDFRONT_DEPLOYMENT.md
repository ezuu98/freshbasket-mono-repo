# CloudFront Deployment Guide for FreshBasket Dashboard

## Overview

This guide covers deploying the FreshBasket Dashboard to AWS S3 with CloudFront distribution and custom domain `freshbasket.site`.

## Prerequisites

1. **AWS CLI installed and configured**
2. **Domain ownership** of `freshbasket.site`
3. **AWS permissions** for:
   - S3 (bucket creation, policy management)
   - CloudFront (distribution creation)
   - ACM (SSL certificate management)
   - Route 53 (DNS management)

## Quick Deployment

### Option 1: Using npm script
```bash
# Deploy with default settings (freshbasket.site)
npm run deploy:cloudfront

# Deploy with custom domain
./deploy-with-cloudfront.sh freshbasket-dashboard us-east-1 fresbasket your-domain.com
```

### Option 2: Manual deployment
```bash
# Run the comprehensive deployment script
./deploy-with-cloudfront.sh [bucket-name] [region] [profile] [domain] [certificate-arn]
```

## What the Script Does

### 1. **S3 Setup**
- ✅ Creates S3 bucket (if doesn't exist)
- ✅ Configures static website hosting
- ✅ Sets public read permissions
- ✅ Disables block public access

### 2. **Application Build**
- ✅ Sets up environment variables
- ✅ Installs dependencies
- ✅ Builds Next.js application
- ✅ Uploads files to S3

### 3. **SSL Certificate**
- ✅ Creates ACM certificate for domain
- ✅ Includes www subdomain
- ✅ Uses DNS validation method

### 4. **CloudFront Distribution**
- ✅ Creates CloudFront distribution
- ✅ Configures S3 as origin
- ✅ Sets up HTTPS redirect
- ✅ Configures caching rules
- ✅ Sets up custom error pages

### 5. **DNS Configuration**
- ✅ Creates Route 53 hosted zone
- ✅ Creates A records for domain and www
- ✅ Points to CloudFront distribution

## Domain Setup

### If you own freshbasket.site:

1. **Register the domain** (if not already done)
2. **Update nameservers** to AWS Route 53 nameservers
3. **Run the deployment script**

### If using a different domain:

1. **Update the script parameters**
2. **Ensure domain is registered**
3. **Update nameservers to AWS**

## Deployment Steps

### Step 1: Prepare Domain
```bash
# Check if domain is registered
whois freshbasket.site

# If not registered, register it first
```

### Step 2: Run Deployment
```bash
# Navigate to frontend directory
cd freshbasket-dashboard

# Deploy with CloudFront
npm run deploy:cloudfront
```

### Step 3: Configure Nameservers
After deployment, update your domain's nameservers to the AWS nameservers shown in the output.

### Step 4: Wait for Propagation
- **SSL Certificate**: 5-30 minutes
- **CloudFront Distribution**: 10-15 minutes
- **DNS Propagation**: Up to 48 hours

## Post-Deployment

### Check Deployment Status
```bash
# Check CloudFront distribution
aws cloudfront get-distribution --id [DISTRIBUTION_ID] --profile fresbasket

# Check SSL certificate
aws acm describe-certificate --certificate-arn [CERT_ARN] --profile fresbasket

# Check DNS records
aws route53 list-resource-record-sets --hosted-zone-id [ZONE_ID] --profile fresbasket
```

### Test the Website
```bash
# Test HTTPS
curl -I https://freshbasket.site

# Test www subdomain
curl -I https://www.freshbasket.site
```

## Environment Configuration

### Production Environment
The deployment automatically sets:
- `NEXT_PUBLIC_API_URL=http://47.128.153.244:3001/api`
- `NODE_ENV=production`

### Local Development
```bash
# Setup local environment
npm run setup:dev

# Start development server
npm run dev
```

## Troubleshooting

### Common Issues

1. **Certificate Validation Failed**
   ```bash
   # Check certificate status
   aws acm describe-certificate --certificate-arn [CERT_ARN] --profile fresbasket
   
   # Add DNS validation records manually if needed
   ```

2. **CloudFront Distribution Not Deployed**
   ```bash
   # Check distribution status
   aws cloudfront get-distribution --id [DISTRIBUTION_ID] --profile fresbasket
   
   # Wait for deployment (can take 15+ minutes)
   ```

3. **DNS Not Resolving**
   ```bash
   # Check nameservers
   nslookup freshbasket.site
   
   # Verify Route 53 records
   aws route53 list-resource-record-sets --hosted-zone-id [ZONE_ID] --profile fresbasket
   ```

4. **CORS Issues**
   - Ensure backend CORS is configured for the new domain
   - Update backend CORS settings if needed

### Debug Commands
```bash
# Check S3 bucket contents
aws s3 ls s3://freshbasket-dashboard --recursive --profile fresbasket

# Test CloudFront distribution
curl -I https://[DISTRIBUTION_DOMAIN]

# Check SSL certificate
openssl s_client -connect freshbasket.site:443 -servername freshbasket.site
```

## Security Considerations

1. **HTTPS Only**: CloudFront redirects HTTP to HTTPS
2. **Security Headers**: Configured via CloudFront
3. **Access Control**: S3 bucket policy restricts access
4. **SSL Certificate**: Automatically managed by AWS

## Cost Optimization

1. **CloudFront Caching**: Reduces S3 requests
2. **Price Class**: Uses PriceClass_100 (US, Canada, Europe)
3. **S3 Lifecycle**: Consider setting up lifecycle policies
4. **Monitoring**: Set up CloudWatch alarms

## Maintenance

### Updates
```bash
# Redeploy with updates
npm run deploy:cloudfront
```

### Monitoring
```bash
# Check CloudFront metrics
aws cloudfront get-distribution --id [DISTRIBUTION_ID] --profile fresbasket

# Monitor costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE --profile fresbasket
```

## Support

For deployment issues:
1. Check AWS CloudTrail logs
2. Verify IAM permissions
3. Check CloudWatch logs
4. Review Route 53 health checks

## Next Steps

1. **Set up monitoring** with CloudWatch
2. **Configure backups** for S3 bucket
3. **Set up CI/CD** pipeline
4. **Implement CDN invalidation** for updates
5. **Add custom error pages**
6. **Configure analytics** (Google Analytics, etc.) 