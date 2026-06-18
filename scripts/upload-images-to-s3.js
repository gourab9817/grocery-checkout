#!/usr/bin/env node
/**
 * Uploads the canonical product images from data/image/ to the
 * Floci S3 bucket (or real S3 in prod). Run `extract-images.js` first.
 *
 * Objects land at s3://<bucket>/images/<slug>.jpg, so the public URL is
 *   <IMAGE_BASE_URL>/<slug>.jpg   where IMAGE_BASE_URL = <endpoint>/<bucket>/images
 *
 * Usage:
 *   node scripts/extract-images.js && node scripts/upload-images-to-s3.js
 *
 * Env vars (defaults to Floci dev values):
 *   AWS_ENDPOINT_URL     — e.g. http://localhost:4566
 *   AWS_DEFAULT_REGION   — default: us-east-1
 *   AWS_ACCESS_KEY_ID    — default: test
 *   AWS_SECRET_ACCESS_KEY — default: test
 *   S3_BUCKET            — default: ansrmart-images
 *   IMAGES_DIR           — default: ../data/image
 */

import {
  S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const IMAGES_DIR = process.env.IMAGES_DIR ?? join(__dirname, '../data/image');
const BUCKET = process.env.S3_BUCKET ?? 'ansrmart-images';

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
});

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    console.log(`Bucket ${BUCKET} not found — creating it.`);
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
}

async function upload() {
  let files;
  try {
    files = await readdir(IMAGES_DIR);
  } catch {
    console.error(`Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  await ensureBucket();

  const imageFiles = files.filter((f) => CONTENT_TYPES[extname(f).toLowerCase()]);
  console.log(`Uploading ${imageFiles.length} images to s3://${BUCKET}/images/...`);

  let ok = 0;
  let fail = 0;
  for (const file of imageFiles) {
    try {
      const body = await readFile(join(IMAGES_DIR, file));
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: `images/${file}`,
        Body: body,
        ContentType: CONTENT_TYPES[extname(file).toLowerCase()],
        ACL: 'public-read',
      }));
      console.log(`  ✓ ${file}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} uploaded, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

upload();
