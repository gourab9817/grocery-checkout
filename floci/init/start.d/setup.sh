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

echo "[floci-init] Done."
