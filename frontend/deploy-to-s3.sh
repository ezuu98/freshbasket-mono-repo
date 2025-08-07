#!/bin/bash

# S3 Deployment Script for FreshBasket Dashboard
# Usage: ./deploy-to-s3.sh [bucket-name] [region]

set -e

# Configuration
BUCKET_NAME=${1:-"freshbasket-dashboard"}
REGION=${2:-"us-east-1"}
PROFILE=${3:-"fresbasket"}

echo "🚀 Starting S3 deployment for FreshBasket Dashboard"
echo "📦 Bucket: $BUCKET_NAME"
echo "🌍 Region: $REGION"
echo "👤 Profile: $PROFILE"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if bucket exists, create if not
if ! aws s3 ls "s3://$BUCKET_NAME" --profile "$PROFILE" &> /dev/null; then
    echo "📦 Creating S3 bucket: $BUCKET_NAME"
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION" --profile "$PROFILE"
    
    # Disable block public access settings
    echo "🔓 Disabling block public access settings..."
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
        --profile "$PROFILE"
    
    # Configure bucket for static website hosting
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document 404.html \
        --profile "$PROFILE"
    
    # Set bucket policy for public read access
    cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
    
    aws s3api put-bucket-policy \
        --bucket "$BUCKET_NAME" \
        --policy file://bucket-policy.json \
        --profile "$PROFILE"
    
    rm bucket-policy.json
else
    echo "📦 Bucket $BUCKET_NAME already exists"
    
    # Ensure block public access is disabled
    echo "🔓 Checking block public access settings..."
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
        --profile "$PROFILE" 2>/dev/null || true
fi

# Setup environment variables
echo "🔧 Setting up environment variables..."
./setup-env.sh

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building the application..."
npm run build

# Sync files to S3
echo "🚀 Uploading files to S3..."
aws s3 sync out/ "s3://$BUCKET_NAME" \
    --delete \
    --cache-control "max-age=31536000,public" \
    --profile "$PROFILE"

# Set cache headers for HTML files
echo "⚙️ Setting cache headers..."
aws s3 cp "s3://$BUCKET_NAME" "s3://$BUCKET_NAME" \
    --recursive \
    --exclude "*" \
    --include "*.html" \
    --cache-control "max-age=0,no-cache,no-store,must-revalidate" \
    --content-type "text/html" \
    --metadata-directive REPLACE \
    --profile "$PROFILE"

# Get the website URL
WEBSITE_URL=$(aws s3api get-bucket-website --bucket "$BUCKET_NAME" --profile "$PROFILE" --query 'WebsiteEndpoint' --output text)

echo "✅ Deployment completed successfully!"
echo "🌐 Website URL: http://$WEBSITE_URL"
echo "📦 S3 Bucket: s3://$BUCKET_NAME"

# Optional: Create CloudFront distribution for HTTPS
echo ""
echo "💡 Optional: To enable HTTPS, create a CloudFront distribution pointing to:"
echo "   Origin: $WEBSITE_URL"
echo "   Or use the S3 bucket directly: s3://$BUCKET_NAME" 