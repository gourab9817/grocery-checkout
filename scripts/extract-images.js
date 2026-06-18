#!/usr/bin/env node
/**
 * Extracts product "_Iconic.jpg" images from the source asset tree
 * (iconic-images-and-descriptions/{Category}/{Type}/{Product}/{Product}_Iconic.jpg)
 * into a flat canonical store: data/image/{slug}.jpg
 *
 * The slug is the product folder name (== catalog item's imageSlug).
 * This canonical store is the source of truth uploaded to S3.
 *
 * Usage:
 *   node scripts/extract-images.js
 *   SRC_DIR=/abs/path/to/iconic-images-and-descriptions node scripts/extract-images.js
 */

import { readdir, mkdir, copyFile, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// Source lives one level above the repo by default: ../iconic-images-and-descriptions
const SRC_DIR = process.env.SRC_DIR
  ?? join(REPO_ROOT, '..', 'iconic-images-and-descriptions');
const OUT_DIR = join(REPO_ROOT, 'data', 'image');

const ICONIC_SUFFIX = '_Iconic.jpg';

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(ICONIC_SUFFIX)) {
      acc.push(full);
    }
  }
  return acc;
}

async function main() {
  try {
    await stat(SRC_DIR);
  } catch {
    console.error(`Source directory not found: ${SRC_DIR}`);
    console.error('Set SRC_DIR to the absolute path of iconic-images-and-descriptions.');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const iconicFiles = await walk(SRC_DIR);
  console.log(`Found ${iconicFiles.length} *_Iconic.jpg images under ${SRC_DIR}`);

  let copied = 0;
  const seen = new Map();
  for (const src of iconicFiles) {
    // slug = product folder name = filename minus _Iconic.jpg
    const slug = basename(src, ICONIC_SUFFIX);
    const dest = join(OUT_DIR, `${slug}.jpg`);

    if (seen.has(slug)) {
      console.warn(`  ! duplicate slug "${slug}" — ${src} overwrites ${seen.get(slug)}`);
    }
    seen.set(slug, src);

    await copyFile(src, dest);
    copied++;
  }

  console.log(`\nDone: ${copied} images written to ${OUT_DIR}`);
  console.log(`Unique slugs: ${seen.size}`);
}

main();
