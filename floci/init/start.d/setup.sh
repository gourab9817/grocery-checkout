#!/bin/bash
# Creates Secrets Manager secrets in Floci on first boot.
# These mirror what AWS Secrets Manager holds in production.
set -e

export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

echo "[floci-init] Creating ansrmart secrets..."

aws secretsmanager create-secret \
  --name ansrmart/db \
  --secret-string '{"password":"localdevpassword"}' \
  2>/dev/null || echo "[floci-init] ansrmart/db already exists, skipping."

aws secretsmanager create-secret \
  --name ansrmart/jwt \
  --secret-string '{"secret":"local-jwt-secret-dev-only-change-in-prod"}' \
  2>/dev/null || echo "[floci-init] ansrmart/jwt already exists, skipping."

echo "[floci-init] Creating S3 bucket for product images..."

aws s3 mb s3://ansrmart-images \
  2>/dev/null || echo "[floci-init] ansrmart-images bucket already exists, skipping."

aws s3api put-bucket-acl \
  --bucket ansrmart-images \
  --acl public-read \
  2>/dev/null || true

aws s3api put-bucket-cors \
  --bucket ansrmart-images \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET"],"AllowedHeaders":["*"]}]}' \
  2>/dev/null || true

echo "[floci-init] Creating SNS topic for order events..."

SNS_ARN=$(aws sns create-topic --name ansrmart-order-events --query 'TopicArn' --output text \
  2>/dev/null) || echo "[floci-init] SNS topic already exists."

if [ -n "$SNS_ARN" ]; then
  echo "[floci-init] SNS topic ARN: $SNS_ARN"
fi

echo "[floci-init] Done."
