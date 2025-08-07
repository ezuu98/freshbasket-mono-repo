# S3 Deployment Guide for FreshBasket Dashboard

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
   sudo installer -pkg AWSCLIV2.pkg -target /
   
   # Configure AWS CLI
   aws configure
   ```

2. **Node.js and npm installed**

## Quick Deployment

### Option 1: Using the deployment script
```bash
# Navigate to the frontend directory
cd freshbasket-dashboard

# Deploy with default settings
npm run deploy:s3

# Or run the script directly with custom settings
./deploy-to-s3.sh [bucket-name] [region] [profile]
```

### Option 2: Manual deployment
```bash
# Install dependencies
npm install

# Build and export
npm run export

# Create S3 bucket (if not exists)
aws s3 mb s3://your-bucket-name --region us-east-1

# Configure static website hosting
aws s3 website s3://your-bucket-name \
  --index-document index.html \
  --error-document 404.html

# Upload files
aws s3 sync out/ s3://your-bucket-name --delete

# Set public read permissions
aws s3api put-bucket-policy --bucket your-bucket-name --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}'
```

## Configuration

### Environment Variables
Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Custom Domain (Optional)
1. **Register a domain** in Route 53 or your preferred registrar
2. **Create a CloudFront distribution** pointing to your S3 bucket
3. **Configure SSL certificate** in AWS Certificate Manager
4. **Update DNS records** to point to CloudFront

## Deployment Script Options

```bash
# Basic deployment
./deploy-to-s3.sh

# Custom bucket and region
./deploy-to-s3.sh my-dashboard-bucket us-west-2

# With custom AWS profile
./deploy-to-s3.sh my-dashboard-bucket us-east-1 production
```

## Post-Deployment

### Enable HTTPS with CloudFront
```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name your-bucket-name.s3.amazonaws.com \
  --default-root-object index.html
```

### Set up CI/CD (GitHub Actions)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to S3
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run export
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: aws s3 sync out/ s3://your-bucket-name --delete
```

## Troubleshooting

### Common Issues

1. **Build fails**: Check for TypeScript errors
2. **S3 access denied**: Verify bucket policy and IAM permissions
3. **Static export issues**: Ensure all pages are static-compatible
4. **API calls fail**: Update environment variables for production

### Debug Commands
```bash
# Check S3 bucket contents
aws s3 ls s3://your-bucket-name --recursive

# Test website endpoint
curl http://your-bucket-name.s3-website-region.amazonaws.com

# Check CloudFront distribution
aws cloudfront get-distribution --id your-distribution-id
```

## Security Considerations

1. **Enable CloudFront** for HTTPS and better performance
2. **Set up proper CORS** if making API calls
3. **Use environment variables** for sensitive data
4. **Regular security updates** for dependencies

## Cost Optimization

1. **Enable S3 Intelligent Tiering** for cost savings
2. **Use CloudFront** for caching and reduced data transfer
3. **Monitor usage** with AWS Cost Explorer
4. **Set up billing alerts**

## Support

For deployment issues:
1. Check AWS CLI configuration
2. Verify S3 bucket permissions
3. Review CloudWatch logs
4. Test locally with `npm run dev` 