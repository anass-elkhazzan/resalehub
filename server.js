const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    cb(null, ok);
  }
});

const INVENTORY_FILE = path.join(__dirname, 'data', 'inventory.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

function readInventory() {
  if (!fs.existsSync(INVENTORY_FILE)) return { products: [] };
  return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
}
function writeInventory(data) {
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2));
}
function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}
function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

// ── Products ──────────────────────────────────────────────────────────────────

app.get('/api/products', (req, res) => {
  res.json(readInventory().products);
});

app.get('/api/products/:id', (req, res) => {
  const p = readInventory().products.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/products', (req, res) => {
  const inv = readInventory();
  const product = {
    id: uuidv4(),
    title: req.body.title || 'Untitled',
    description: req.body.description || '',
    price: parseFloat(req.body.price) || 0,
    originalPrice: parseFloat(req.body.originalPrice) || 0,
    category: req.body.category || 'furniture',
    condition: req.body.condition || 'good',
    color: req.body.color || '',
    dimensions: req.body.dimensions || '',
    location: req.body.location || '',
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    photos: [],
    listings: {
      ebay:       { status: 'not_listed', id: null, url: null },
      etsy:       { status: 'not_listed', id: null, url: null },
      facebook:   { status: 'not_listed', url: null },
      craigslist: { status: 'not_listed', url: null },
      offerup:    { status: 'not_listed', url: null }
    },
    sold: false,
    soldPrice: null,
    soldDate: null,
    soldPlatform: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  inv.products.unshift(product);
  writeInventory(inv);
  res.json(product);
});

app.put('/api/products/:id', (req, res) => {
  const inv = readInventory();
  const idx = inv.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  inv.products[idx] = { ...inv.products[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  writeInventory(inv);
  res.json(inv.products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  const inv = readInventory();
  const product = inv.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  (product.photos || []).forEach(photo => {
    const fp = path.join(__dirname, 'public', 'uploads', photo);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  });
  inv.products = inv.products.filter(p => p.id !== req.params.id);
  writeInventory(inv);
  res.json({ success: true });
});

// ── Photos ────────────────────────────────────────────────────────────────────

app.post('/api/products/:id/photos', upload.array('photos', 20), (req, res) => {
  const inv = readInventory();
  const idx = inv.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const newPhotos = req.files.map(f => f.filename);
  inv.products[idx].photos.push(...newPhotos);
  inv.products[idx].updatedAt = new Date().toISOString();
  writeInventory(inv);
  res.json({ photos: inv.products[idx].photos });
});

app.delete('/api/products/:id/photos/:filename', (req, res) => {
  const inv = readInventory();
  const idx = inv.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const fp = path.join(__dirname, 'public', 'uploads', req.params.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  inv.products[idx].photos = inv.products[idx].photos.filter(p => p !== req.params.filename);
  writeInventory(inv);
  res.json({ success: true });
});

// ── Listings ──────────────────────────────────────────────────────────────────

app.get('/api/products/:id/listing/:platform', (req, res) => {
  const p = readInventory().products.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const formatter = require('./platforms/formatter');
  res.json(formatter.generate(p, req.params.platform));
});

app.post('/api/products/:id/listings/:platform', (req, res) => {
  const inv = readInventory();
  const idx = inv.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  inv.products[idx].listings[req.params.platform] = {
    status: 'listed',
    id: req.body.id || null,
    url: req.body.url || null,
    listedAt: new Date().toISOString()
  };
  inv.products[idx].updatedAt = new Date().toISOString();
  writeInventory(inv);
  res.json(inv.products[idx]);
});

app.delete('/api/products/:id/listings/:platform', (req, res) => {
  const inv = readInventory();
  const idx = inv.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  inv.products[idx].listings[req.params.platform] = { status: 'not_listed', id: null, url: null };
  writeInventory(inv);
  res.json(inv.products[idx]);
});

app.post('/api/products/:id/sold', (req, res) => {
  const inv = readInventory();
  const idx = inv.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  inv.products[idx].sold = true;
  inv.products[idx].soldPrice = parseFloat(req.body.soldPrice) || inv.products[idx].price;
  inv.products[idx].soldDate = new Date().toISOString();
  inv.products[idx].soldPlatform = req.body.platform || 'other';
  writeInventory(inv);
  res.json(inv.products[idx]);
});

// ── Stats ─────────────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  const products = readInventory().products;
  const sold = products.filter(p => p.sold);
  const active = products.filter(p => !p.sold);
  const listed = active.filter(p => Object.values(p.listings || {}).some(l => l.status === 'listed'));
  res.json({
    total: products.length,
    active: active.length,
    listed: listed.length,
    sold: sold.length,
    revenue: sold.reduce((s, p) => s + (p.soldPrice || 0), 0),
    inventoryValue: active.reduce((s, p) => s + p.price, 0)
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => res.json(readSettings()));
app.post('/api/settings', (req, res) => { writeSettings(req.body); res.json({ success: true }); });

// ── Website Generator ─────────────────────────────────────────────────────────

app.post('/api/generate-website', (req, res) => {
  const inv = readInventory();
  const settings = readSettings();
  const websiteGen = require('./platforms/website');
  websiteGen.generate(inv.products, settings);
  res.json({ success: true });
});

app.get('/api/website-preview', (req, res) => {
  const file = path.join(__dirname, 'website', 'index.html');
  if (fs.existsSync(file)) res.sendFile(file);
  else res.status(404).send('Website not generated yet');
});

// ── eBay Direct Post ──────────────────────────────────────────────────────────

app.post('/api/products/:id/post/ebay', async (req, res) => {
  const settings = readSettings();
  if (!settings.ebayUserToken) return res.status(400).json({ error: 'eBay credentials not configured in Settings' });
  const product = readInventory().products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  try {
    const EbayAPI = require('./platforms/ebay');
    const api = new EbayAPI(settings);
    const result = await api.listItem(product);
    const inv = readInventory();
    const idx = inv.products.findIndex(p => p.id === req.params.id);
    inv.products[idx].listings.ebay = { status: 'listed', id: result.id, url: result.url, listedAt: new Date().toISOString() };
    writeInventory(inv);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Etsy Direct Post ──────────────────────────────────────────────────────────

app.post('/api/products/:id/post/etsy', async (req, res) => {
  const settings = readSettings();
  if (!settings.etsyAccessToken) return res.status(400).json({ error: 'Etsy credentials not configured in Settings' });
  const product = readInventory().products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  try {
    const EtsyAPI = require('./platforms/etsy');
    const api = new EtsyAPI(settings);
    const result = await api.createListing(product);
    const inv = readInventory();
    const idx = inv.products.findIndex(p => p.id === req.params.id);
    inv.products[idx].listings.etsy = { status: 'listed', id: result.id, url: result.url, listedAt: new Date().toISOString() };
    writeInventory(inv);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   ResaleHub is running!               ║`);
  console.log(`║   http://localhost:${PORT}               ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});
