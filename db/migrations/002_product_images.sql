-- Migration 002: Add image_slug and description to catalog_items
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS image_slug  TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;
