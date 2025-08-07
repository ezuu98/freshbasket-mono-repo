#!/bin/bash

# Comprehensive S3 + CloudFront Deployment Script for FreshBasket Dashboard
# Usage: ./deploy-with-cloudfront.sh [bucket-name] [region] [domain]

set -e

# Configuration
BUCKET_NAME=${1:-"freshbasket-dashboard"}
REGION=${2:-"us-east-1"}
PROFILE=${3:-"fresbasket"}
DOMAIN_NAME=${4:-"freshbasket.site"}
CERTIFICATE_ARN=${5:-""}

echo "🚀 Starting comprehensive deployment for FreshBasket Dashboard"
echo "📦 Bucket: $BUCKET_NAME"
echo "🌍 Region: $REGION"
echo "👤 Profile: $PROFILE"
echo "🌐 Domain: $DOMAIN_NAME"

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

# Skip SSL certificate for now
echo "⏭️  Skipping SSL certificate creation for now..."
CERT_ARN=""

# Create CloudFront distribution
echo "☁️ Creating CloudFront distribution..."

# Create CloudFront configuration
if [ -n "$CERT_ARN" ]; then
    # With SSL certificate
    cat > cloudfront-config.json << EOF
{
    "CallerReference": "$(date +%s)",
    "Comment": "FreshBasket Dashboard Distribution",
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3.$REGION.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "Compress": true
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/404.html",
                "ResponseCode": "404"
            }
        ]
    },
    "Aliases": {
        "Quantity": 2,
        "Items": [
            "$DOMAIN_NAME",
            "www.$DOMAIN_NAME"
        ]
    },
    "ViewerCertificate": {
        "ACMCertificateArn": "$CERT_ARN",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "PriceClass": "PriceClass_100"
}
EOF
else
    # Without SSL certificate (HTTP only)
    cat > cloudfront-config.json << EOF
{
    "CallerReference": "$(date +%s)",
    "Comment": "FreshBasket Dashboard Distribution",
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3.$REGION.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "allow-all",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "Compress": true
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/404.html",
                "ResponseCode": "404"
            }
        ]
    },
    "PriceClass": "PriceClass_100"
}
EOF
fi

# Create CloudFront distribution
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config file://cloudfront-config.json \
    --profile "$PROFILE" \
    --query 'Distribution.Id' \
    --output text)

echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"

# Get distribution domain name
DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
    --id "$DISTRIBUTION_ID" \
    --profile "$PROFILE" \
    --query 'Distribution.DomainName' \
    --output text)

echo "🌐 CloudFront domain: $DISTRIBUTION_DOMAIN"

# Skip DNS configuration for now (no custom domain)
echo "⏭️  Skipping DNS configuration for now (no custom domain)"

# Cleanup temporary files
rm -f cloudfront-config.json dns-changes.json

echo ""
echo "🎉 Deployment completed successfully!"
echo "📦 S3 Bucket: s3://$BUCKET_NAME"
echo "☁️ CloudFront Distribution: $DISTRIBUTION_ID"
echo "🌐 CloudFront URL: http://$DISTRIBUTION_DOMAIN"
echo ""
echo "⏳ CloudFront distribution may take 10-15 minutes to fully deploy."
echo "🔍 Check status with: aws cloudfront get-distribution --id $DISTRIBUTION_ID --profile $PROFILE"
echo ""
echo "📋 Next steps:"
echo "   1. Wait for CloudFront distribution to deploy"
echo "   2. Test the website at http://$DISTRIBUTION_DOMAIN"
echo "   3. Later: Add SSL certificate and custom domain" 