/**
 * Import catalog items from iconic-images-and-descriptions.
 * - Copies *_Iconic.jpg → apps/web/public/images/<slug>.jpg
 * - Reads *_Description.txt + *_Information.txt
 * - Writes data/catalog-data.json  (used by db/seed.js)
 *
 * Usage: node scripts/import-catalog.js
 */

import { readdir, readFile, copyFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = '/home/gourab/Gourab/assignments/ansrmart/iconic-images-and-descriptions';
const DEST_IMAGES = join(ROOT, 'apps/web/public/images');
const DEST_DATA   = join(ROOT, 'data');

await mkdir(DEST_IMAGES, { recursive: true });
await mkdir(DEST_DATA,   { recursive: true });

// ── Mapping from top-level folder → ansrmart category ─────────────────────────
// Fruit / Vegetables → unit_type=weight; Packages → unit_type=unit
const TOP_CATEGORY_MAP = {
  Fruit:       'fruits',
  Vegetables:  'vegetables',
  // Packages sub-categories
  Juice:       'beverages',
  Milk:        'dairy',
  'Oat-Milk':  'dairy',
  Oatghurt:    'dairy',
  'Sour-Cream':'dairy',
  'Sour-Milk': 'dairy',
  Soyghurt:    'dairy',
  'Soy-Milk':  'dairy',
  Yoghurt:     'dairy',
};

// GST rates by category (bps = basis points, 100 bps = 1%)
const GST_MAP = {
  fruits:     0,
  vegetables: 0,
  dairy:      1200,
  beverages:  1800,
};

// Default unit prices (paise) — rough estimates, all overridable
const DEFAULT_PRICES = {
  fruits:     8000,   // ₹80/kg
  vegetables: 5000,   // ₹50/kg
  dairy:      8000,   // ₹80/unit
  beverages:  9000,   // ₹90/unit
};

const UNIT_TYPE_MAP = {
  fruits:     'weight',
  vegetables: 'weight',
  dairy:      'unit',
  beverages:  'unit',
};

// ── Recursive walk to find all leaf dirs with an _Iconic.jpg ──────────────────
async function findItems(dir, topCategory) {
  const entries = await readdir(dir, { withFileTypes: true });
  const hasImage = entries.some(e => e.name.endsWith('_Iconic.jpg'));
  if (hasImage) return [{ dir, topCategory }];

  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subTop = topCategory || entry.name; // first level = top category
      results.push(...await findItems(join(dir, entry.name), subTop));
    }
  }
  return results;
}

function parseTitle(infoText) {
  const m = infoText.match(/^Title:\s*(.+)/m);
  return m ? m[1].trim() : null;
}

function parseManufacturer(infoText) {
  const m = infoText.match(/^Manufacturer[^:]*:\s*(.+)/m);
  return m ? m[1].trim() : null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const topDirs = await readdir(SRC, { withFileTypes: true });
const allItems = [];

for (const top of topDirs) {
  if (!top.isDirectory()) continue;
  const topPath = join(SRC, top.name);

  // Packages: walk one level deeper so each sub-folder is the category
  if (top.name === 'Packages') {
    const pkgDirs = await readdir(topPath, { withFileTypes: true });
    for (const pkg of pkgDirs) {
      if (!pkg.isDirectory()) continue;
      const items = await findItems(join(topPath, pkg.name), pkg.name);
      allItems.push(...items);
    }
  } else {
    const items = await findItems(topPath, top.name);
    allItems.push(...items);
  }
}

const catalog = [];

for (const { dir, topCategory } of allItems) {
  const entries = await readdir(dir);
  const imgFile  = entries.find(e => e.endsWith('_Iconic.jpg'));
  const descFile = entries.find(e => e.endsWith('_Description.txt') && !e.includes('_Swedish'));
  const infoFile = entries.find(e => e.endsWith('_Information.txt'));

  if (!imgFile) continue;

  const slug = imgFile.replace('_Iconic.jpg', '');

  // Read text files
  const desc = descFile
    ? (await readFile(join(dir, descFile), 'utf8')).trim()
    : '';
  const info = infoFile
    ? (await readFile(join(dir, infoFile), 'utf8')).trim()
    : '';

  // Determine display name
  let name = parseTitle(info) || parseManufacturer(info) || slug.replace(/-/g, ' ');

  // Determine category
  const category = TOP_CATEGORY_MAP[topCategory] || 'vegetables';
  const gstRateBps = GST_MAP[category] ?? 0;
  const unitType   = UNIT_TYPE_MAP[category] || 'unit';
  const unitPrice  = DEFAULT_PRICES[category] || 5000;

  // Copy image
  const destImg = join(DEST_IMAGES, `${slug}.jpg`);
  await copyFile(join(dir, imgFile), destImg);

  catalog.push({
    slug,
    name,
    category,
    unitType,
    unitPrice,
    gstRateBps,
    active: true,
    imageSlug: slug,
    description: desc,
    info,
  });
}

catalog.sort((a, b) => a.slug.localeCompare(b.slug));

await writeFile(
  join(DEST_DATA, 'catalog-data.json'),
  JSON.stringify(catalog, null, 2),
  'utf8'
);

process.stdout.write(`Done. ${catalog.length} items → data/catalog-data.json, ${catalog.length} images → apps/web/public/images/\n`);
