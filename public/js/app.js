// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  products: [],
  settings: {},
  currentPage: 'dashboard',
  editingId: null,
  pendingDeleteId: null,
  pendingSoldId: null,
  currentDetailId: null,
  filterCategory: 'all',
  filterStatus: 'active',
  searchQuery: '',
  tags: [],
  photos: [] // for add/edit form
};

const PLATFORMS = [
  { id: 'facebook',   name: 'Facebook Marketplace', icon: '👥' },
  { id: 'ebay',       name: 'eBay',                  icon: '🛒' },
  { id: 'etsy',       name: 'Etsy',                  icon: '🎨' },
  { id: 'craigslist', name: 'Craigslist',             icon: '📋' },
  { id: 'offerup',    name: 'OfferUp',                icon: '📱' }
];

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  navigate('dashboard');
});

async function loadAll() {
  const [products, settings] = await Promise.all([api('/api/products'), api('/api/settings')]);
  state.products = products || [];
  state.settings = settings || {};
  updateSidebarCount();
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigate(page, id) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = { dashboard: 0, inventory: 1, add: 2, website: 3, settings: 4 };
  const items = document.querySelectorAll('.nav-item');
  if (navMap[page] !== undefined) items[navMap[page]]?.classList.add('active');
  closeSidebar();

  const titles = { dashboard: 'Dashboard', inventory: 'Inventory', add: state.editingId ? 'Edit Item' : 'Add Item', website: 'My Website', settings: 'Settings', detail: 'Item Detail' };
  document.getElementById('page-title').textContent = titles[page] || page;

  const content = document.getElementById('content');
  switch (page) {
    case 'dashboard': renderDashboard(content); break;
    case 'inventory': renderInventory(content); break;
    case 'add':       renderAddEdit(content, id); break;
    case 'detail':    renderDetail(content, id); break;
    case 'website':   renderWebsite(content); break;
    case 'settings':  renderSettings(content); break;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function renderDashboard(el) {
  const stats = await api('/api/stats');
  const recent = state.products.filter(p => !p.sold).slice(0, 6);

  el.innerHTML = `
<div class="stats-grid">
  <div class="stat-card"><div class="label">Total Items</div><div class="value">${stats.total}</div></div>
  <div class="stat-card"><div class="label">Active</div><div class="value blue">${stats.active}</div></div>
  <div class="stat-card"><div class="label">Listed</div><div class="value gold">${stats.listed}</div></div>
  <div class="stat-card"><div class="label">Sold</div><div class="value green">${stats.sold}</div></div>
  <div class="stat-card"><div class="label">Revenue</div><div class="value green">$${stats.revenue.toFixed(2)}</div></div>
  <div class="stat-card"><div class="label">Inventory Value</div><div class="value">${'$'+stats.inventoryValue.toFixed(2)}</div></div>
</div>
${recent.length ? `
<div style="margin-bottom:.75rem;display:flex;align-items:center;justify-content:space-between">
  <h2 style="font-size:1rem;font-weight:700">Recent Items</h2>
  <button class="btn btn-outline btn-sm" onclick="navigate('inventory')">View All</button>
</div>
<div class="products-grid">${recent.map(productCard).join('')}</div>
` : `<div class="empty-state"><div class="icon">🪑</div><p>No items yet. Add your first piece!</p><button class="btn btn-gold btn-lg" onclick="navigate('add')">Add Your First Item</button></div>`}`;
}

// ── Inventory ─────────────────────────────────────────────────────────────────
function renderInventory(el) {
  const filtered = filteredProducts();
  el.innerHTML = `
<div class="toolbar">
  <input class="search-input" placeholder="Search items..." value="${esc(state.searchQuery)}"
    oninput="state.searchQuery=this.value;renderInventory(document.getElementById('content'))">
  <div class="filter-tabs">
    ${['all','active','listed','sold'].map(s =>
      `<button class="filter-tab${state.filterStatus===s?' active':''}" onclick="state.filterStatus='${s}';renderInventory(document.getElementById('content'))">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`
    ).join('')}
  </div>
  <div class="filter-tabs">
    ${['all','furniture','art','decor','lighting','rugs','other'].map(c =>
      `<button class="filter-tab${state.filterCategory===c?' active':''}" onclick="state.filterCategory='${c}';renderInventory(document.getElementById('content'))">${c.charAt(0).toUpperCase()+c.slice(1)}</button>`
    ).join('')}
  </div>
</div>
${filtered.length
  ? `<div class="products-grid">${filtered.map(productCard).join('')}</div>`
  : `<div class="empty-state"><div class="icon">📦</div><p>No items match your filters.</p><button class="btn btn-gold" onclick="navigate('add')">Add Item</button></div>`
}`;
}

function filteredProducts() {
  return state.products.filter(p => {
    const q = state.searchQuery.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q);
    const matchCategory = state.filterCategory === 'all' || p.category === state.filterCategory;
    const isListed = Object.values(p.listings||{}).some(l => l.status === 'listed');
    const matchStatus = state.filterStatus === 'all'
      || (state.filterStatus === 'active' && !p.sold)
      || (state.filterStatus === 'listed' && isListed && !p.sold)
      || (state.filterStatus === 'sold' && p.sold);
    return matchSearch && matchCategory && matchStatus;
  });
}

function productCard(p) {
  const photo = p.photos?.[0] ? `<img src="/uploads/${p.photos[0]}" alt="">` : `<div class="no-photo">🪑</div>`;
  const listedOn = PLATFORMS.filter(pl => p.listings?.[pl.id]?.status === 'listed');
  return `
<div class="product-card${p.sold?' sold':''}">
  <div class="card-photo" onclick="navigate('detail','${p.id}')">
    ${photo}
    ${p.sold ? '<div class="sold-badge">SOLD</div>' : ''}
    ${listedOn.length ? `<div class="platform-badges">${listedOn.map(pl=>`<span class="p-badge listed">${pl.icon}</span>`).join('')}</div>` : ''}
  </div>
  <div class="card-body">
    <h3 title="${esc(p.title)}">${esc(p.title)}</h3>
    <div class="card-price">${p.sold ? `SOLD · $${p.soldPrice||p.price}` : `$${p.price}`}</div>
    <div class="card-condition">${formatCondition(p.condition)} · ${p.category}</div>
  </div>
  <div class="card-actions">
    <button class="btn btn-outline btn-sm" onclick="navigate('detail','${p.id}')">View</button>
    <button class="btn btn-outline btn-sm" onclick="navigate('add','${p.id}')">Edit</button>
    ${!p.sold ? `<button class="btn btn-success btn-sm" onclick="openSoldModal('${p.id}')">Sold</button>` : ''}
    <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${p.id}','${esc(p.title)}')">🗑</button>
  </div>
</div>`;
}

// ── Add / Edit ────────────────────────────────────────────────────────────────
function renderAddEdit(el, id) {
  const p = id ? state.products.find(x => x.id === id) : null;
  state.editingId = id || null;
  state.tags = p ? [...(p.tags||[])] : [];
  state.photos = p ? [...(p.photos||[])] : [];

  el.innerHTML = `
<div style="max-width:720px;margin:0 auto">
<form id="product-form" onsubmit="submitProduct(event)">

  <!-- Photos -->
  <div class="form-group" style="margin-bottom:1.2rem">
    <label>Photos</label>
    <div class="photo-upload-area" id="upload-area"
      onclick="document.getElementById('photo-input').click()"
      ondragover="event.preventDefault();this.classList.add('drag-over')"
      ondragleave="this.classList.remove('drag-over')"
      ondrop="handleDrop(event)">
      <div class="upload-icon">📷</div>
      <p>Click to upload photos or drag &amp; drop</p>
      <small>JPG, PNG, WEBP · Up to 10 photos · 20MB each</small>
    </div>
    <input type="file" id="photo-input" multiple accept="image/*" style="display:none" onchange="handlePhotoFiles(this.files)">
    <div class="photo-grid" id="photo-grid"></div>
  </div>

  <div class="form-grid">
    <div class="form-group span2">
      <label>Title *</label>
      <input class="form-input" id="f-title" required placeholder="e.g. Vintage Oak Dining Table" value="${esc(p?.title||'')}">
    </div>
    <div class="form-group span2">
      <label>Description *</label>
      <textarea class="form-textarea" id="f-desc" required placeholder="Describe the item — condition details, history, notable features...">${esc(p?.description||'')}</textarea>
    </div>
    <div class="form-group">
      <label>Asking Price ($) *</label>
      <input class="form-input" id="f-price" type="number" min="0" step="0.01" required placeholder="0.00" value="${p?.price||''}">
    </div>
    <div class="form-group">
      <label>Original / Retail Price ($)</label>
      <input class="form-input" id="f-orig-price" type="number" min="0" step="0.01" placeholder="0.00" value="${p?.originalPrice||''}">
      <span class="form-hint">Helps buyers see the value</span>
    </div>
    <div class="form-group">
      <label>Category</label>
      <select class="form-select" id="f-category">
        ${['furniture','art','decor','lighting','rugs','other'].map(c =>
          `<option value="${c}"${(p?.category||'furniture')===c?' selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Condition</label>
      <select class="form-select" id="f-condition">
        ${[['new','New'],['like_new','Like New'],['excellent','Excellent'],['very_good','Very Good'],['good','Good'],['fair','Fair'],['poor','Poor']].map(([v,l]) =>
          `<option value="${v}"${(p?.condition||'good')===v?' selected':''}>${l}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Color / Finish</label>
      <input class="form-input" id="f-color" placeholder="e.g. Walnut, Cream, Black" value="${esc(p?.color||'')}">
    </div>
    <div class="form-group">
      <label>Dimensions</label>
      <input class="form-input" id="f-dimensions" placeholder='e.g. 72"W x 36"D x 30"H' value="${esc(p?.dimensions||'')}">
    </div>
    <div class="form-group span2">
      <label>Your Location</label>
      <input class="form-input" id="f-location" placeholder="e.g. Brooklyn, NY" value="${esc(p?.location||state.settings?.location||'')}">
    </div>
    <div class="form-group span2">
      <label>Tags <span style="font-weight:400;text-transform:none;color:var(--text-3)">(press Enter or comma to add)</span></label>
      <div class="tags-container" id="tags-container" onclick="document.getElementById('tag-input').focus()">
        <input class="tags-input" id="tag-input" placeholder="vintage, mid-century..."
          onkeydown="handleTagKey(event)" oninput="handleTagInput(event)">
      </div>
    </div>
  </div>

  <div style="margin-top:1.5rem;display:flex;gap:.75rem;justify-content:flex-end">
    <button type="button" class="btn btn-outline btn-lg" onclick="navigate('inventory')">Cancel</button>
    <button type="submit" class="btn btn-gold btn-lg" id="submit-btn">
      ${p ? 'Save Changes' : 'Add Item'}
    </button>
  </div>
</form>
</div>`;

  renderTagsUI();
  renderPhotosUI();
  if (id) uploadPendingPhotos(id); // just render existing
}

function renderTagsUI() {
  const container = document.getElementById('tags-container');
  if (!container) return;
  const input = document.getElementById('tag-input');
  container.innerHTML = '';
  state.tags.forEach((tag, i) => {
    const span = document.createElement('span');
    span.className = 'tag-item';
    span.innerHTML = `${esc(tag)}<button type="button" onclick="removeTag(${i})">×</button>`;
    container.appendChild(span);
  });
  container.appendChild(input);
}

function handleTagKey(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag(e.target.value.replace(',','').trim());
    e.target.value = '';
  } else if (e.key === 'Backspace' && e.target.value === '' && state.tags.length) {
    state.tags.pop();
    renderTagsUI();
  }
}
function handleTagInput(e) {
  if (e.target.value.includes(',')) {
    addTag(e.target.value.replace(',','').trim());
    e.target.value = '';
  }
}
function addTag(tag) {
  if (tag && !state.tags.includes(tag)) { state.tags.push(tag); renderTagsUI(); }
}
function removeTag(i) { state.tags.splice(i, 1); renderTagsUI(); }

function renderPhotosUI() {
  const grid = document.getElementById('photo-grid');
  if (!grid) return;
  grid.innerHTML = state.photos.map(filename => `
<div class="photo-thumb">
  <img src="/uploads/${filename}" alt="">
  <button class="del-photo" type="button" onclick="deletePhoto('${filename}')">×</button>
</div>`).join('');
}

async function deletePhoto(filename) {
  if (state.editingId) {
    await api(`/api/products/${state.editingId}/photos/${filename}`, 'DELETE');
    const p = await api(`/api/products/${state.editingId}`);
    state.photos = p.photos;
    const idx = state.products.findIndex(x => x.id === state.editingId);
    if (idx !== -1) state.products[idx] = p;
  } else {
    state.photos = state.photos.filter(f => f !== filename);
  }
  renderPhotosUI();
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-area').classList.remove('drag-over');
  handlePhotoFiles(e.dataTransfer.files);
}

async function handlePhotoFiles(files) {
  if (!files || !files.length) return;
  const targetId = state.editingId;

  if (targetId) {
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('photos', f));
    const res = await fetch(`/api/products/${targetId}/photos`, { method: 'POST', body: fd });
    const data = await res.json();
    state.photos = data.photos;
    const idx = state.products.findIndex(x => x.id === targetId);
    if (idx !== -1) state.products[idx].photos = data.photos;
    renderPhotosUI();
    toast('Photos uploaded', 'success');
  } else {
    // Store files in memory for later upload
    state._pendingFiles = state._pendingFiles || [];
    state._pendingFiles.push(...Array.from(files));
    // Create local previews
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const grid = document.getElementById('photo-grid');
        if (grid) {
          const div = document.createElement('div');
          div.className = 'photo-thumb pending';
          div.innerHTML = `<img src="${e.target.result}" alt=""><div style="position:absolute;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#fff">Pending</div>`;
          grid.appendChild(div);
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

async function submitProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const data = {
    title: document.getElementById('f-title').value,
    description: document.getElementById('f-desc').value,
    price: document.getElementById('f-price').value,
    originalPrice: document.getElementById('f-orig-price').value,
    category: document.getElementById('f-category').value,
    condition: document.getElementById('f-condition').value,
    color: document.getElementById('f-color').value,
    dimensions: document.getElementById('f-dimensions').value,
    location: document.getElementById('f-location').value,
    tags: state.tags
  };

  let product;
  if (state.editingId) {
    product = await api(`/api/products/${state.editingId}`, 'PUT', data);
    const idx = state.products.findIndex(p => p.id === state.editingId);
    if (idx !== -1) state.products[idx] = product;
    toast('Item updated!', 'success');
  } else {
    product = await api('/api/products', 'POST', data);
    state.products.unshift(product);
    // Upload pending photos
    if (state._pendingFiles?.length) {
      const fd = new FormData();
      state._pendingFiles.forEach(f => fd.append('photos', f));
      const res = await fetch(`/api/products/${product.id}/photos`, { method: 'POST', body: fd });
      const photoData = await res.json();
      product.photos = photoData.photos;
      const idx = state.products.findIndex(p => p.id === product.id);
      if (idx !== -1) state.products[idx].photos = photoData.photos;
      state._pendingFiles = [];
    }
    toast('Item added!', 'success');
  }

  state.editingId = null;
  state.tags = [];
  state.photos = [];
  updateSidebarCount();
  navigate('detail', product.id);
}

// ── Product Detail ────────────────────────────────────────────────────────────
async function renderDetail(el, id) {
  state.currentDetailId = id;
  const p = state.products.find(x => x.id === id);
  if (!p) { el.innerHTML = '<p>Item not found.</p>'; return; }

  const photos = p.photos || [];
  const mainPhoto = photos[0]
    ? `<img id="main-photo" src="/uploads/${photos[0]}" alt="">`
    : `<div style="font-size:4rem;color:#ccc">🪑</div>`;

  const thumbs = photos.map((ph, i) => `
<div class="thumb-img${i===0?' active':''}" onclick="switchDetailPhoto(this,'/uploads/${ph}')">
  <img src="/uploads/${ph}" alt="">
</div>`).join('');

  const metaRows = [
    p.condition && ['Condition', formatCondition(p.condition)],
    p.category  && ['Category',  p.category],
    p.color     && ['Color',     p.color],
    p.dimensions && ['Dimensions', p.dimensions],
    p.location  && ['Location',  p.location],
    ['Added', new Date(p.createdAt).toLocaleDateString()]
  ].filter(Boolean);

  el.innerHTML = `
<div style="margin-bottom:1rem;display:flex;gap:.5rem;align-items:center">
  <button class="btn btn-outline btn-sm" onclick="navigate('inventory')">← Back</button>
  <button class="btn btn-outline btn-sm" onclick="navigate('add','${id}')">Edit</button>
  ${!p.sold ? `<button class="btn btn-success btn-sm" onclick="openSoldModal('${id}')">Mark as Sold</button>` : '<span style="background:#fdecea;color:var(--red);padding:.3rem .8rem;border-radius:20px;font-size:.8rem;font-weight:600">SOLD</span>'}
  <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${id}','${esc(p.title)}')">Delete</button>
</div>
<div class="detail-layout">
  <div class="detail-photos">
    <div class="main-img">${mainPhoto}</div>
    ${photos.length > 1 ? `<div class="thumb-row">${thumbs}</div>` : ''}
  </div>
  <div class="detail-info">
    <h2>${esc(p.title)}</h2>
    <div class="detail-price">${p.sold ? `SOLD · $${p.soldPrice||p.price}` : `$${p.price}`}${p.originalPrice ? ` <span style="font-size:1rem;color:var(--text-3);text-decoration:line-through">$${p.originalPrice}</span>` : ''}</div>
    <dl class="detail-meta">
      ${metaRows.map(([k,v]) => `<dt>${k}</dt><dd>${esc(String(v))}</dd>`).join('')}
    </dl>
    <p class="detail-desc">${esc(p.description)}</p>
    ${p.tags?.length ? `<div class="detail-tags">${p.tags.map(t=>`<span class="detail-tag">${esc(t)}</span>`).join('')}</div>` : ''}
  </div>
</div>

<div style="margin-top:2rem">
  <h2 style="font-size:1rem;font-weight:700;margin-bottom:1rem">List on Platforms</h2>
  <div class="listings-panel" id="listings-panel">
    ${PLATFORMS.map(pl => renderPlatformRow(p, pl)).join('')}
  </div>
</div>`;
}

function switchDetailPhoto(el, src) {
  document.getElementById('main-photo')?.setAttribute('src', src);
  document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function renderPlatformRow(p, pl) {
  const listing = p.listings?.[pl.id] || { status: 'not_listed' };
  const isOpen = false;
  return `
<div class="platform-row" id="row-${pl.id}">
  <div class="platform-row-header" onclick="togglePlatformRow('${p.id}','${pl.id}')">
    <div class="platform-info">
      <span class="platform-icon">${pl.icon}</span>
      <span class="platform-name">${pl.name}</span>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem">
      <span class="platform-status ${listing.status}">${listing.status === 'listed' ? '✓ Listed' : 'Not Listed'}</span>
      <span style="color:var(--text-3)">▾</span>
    </div>
  </div>
  <div class="platform-body" id="body-${pl.id}">
    <div id="listing-content-${pl.id}">Loading...</div>
  </div>
</div>`;
}

async function togglePlatformRow(productId, platformId) {
  const body = document.getElementById(`body-${platformId}`);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open');
  if (!isOpen) await loadPlatformContent(productId, platformId);
}

async function loadPlatformContent(productId, platformId) {
  const contentEl = document.getElementById(`listing-content-${platformId}`);
  contentEl.innerHTML = '<div style="color:var(--text-3);font-size:.85rem">Generating listing...</div>';

  const [listing, p] = await Promise.all([
    api(`/api/products/${productId}/listing/${platformId}`),
    Promise.resolve(state.products.find(x => x.id === productId))
  ]);
  const currentStatus = p?.listings?.[platformId] || { status: 'not_listed' };

  const listingText = formatListingDisplay(listing, platformId);
  const tips = listing.tips?.length ? `
<div class="listing-tips" style="margin-top:.75rem">
  <div style="font-size:.78rem;font-weight:600;color:var(--text-3);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.04em">Tips</div>
  ${listing.tips.map(t => `<div class="tip">${t}</div>`).join('')}
</div>` : '';

  const urlInput = currentStatus.url ? `<input class="form-input" id="url-${platformId}" value="${esc(currentStatus.url)}" placeholder="Paste the listing URL here...">` : `<input class="form-input" id="url-${platformId}" placeholder="Paste the listing URL here...">`;

  const directPostBtn = (platformId === 'ebay' || platformId === 'etsy')
    ? `<button class="btn btn-primary btn-sm" onclick="directPost('${productId}','${platformId}')">🚀 Post Now</button>`
    : '';

  contentEl.innerHTML = `
<div style="margin-bottom:.75rem;font-size:.8rem;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em">Generated Listing</div>
<div class="listing-text-area" id="listing-text-${platformId}">${listingText}</div>
<div style="display:flex;gap:.5rem;margin-top:.6rem;flex-wrap:wrap">
  <button class="btn btn-outline btn-sm" onclick="copyListing('${platformId}')">📋 Copy All</button>
  ${directPostBtn}
</div>
${tips}
<div style="margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--border)">
  <div style="font-size:.8rem;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.4rem">Tracking</div>
  <div class="url-row">
    ${urlInput}
    <button class="btn btn-outline btn-sm" onclick="saveListing('${productId}','${platformId}')">Save URL</button>
    ${currentStatus.status === 'listed'
      ? `<button class="btn btn-danger btn-sm" onclick="unlistProduct('${productId}','${platformId}')">Unlist</button>`
      : `<button class="btn btn-success btn-sm" onclick="markAsListed('${productId}','${platformId}')">Mark Listed</button>`
    }
  </div>
  ${currentStatus.url ? `<a href="${esc(currentStatus.url)}" target="_blank" style="font-size:.8rem;color:var(--blue);display:inline-block;margin-top:.4rem">🔗 View listing</a>` : ''}
</div>`;
}

function formatListingDisplay(listing, platformId) {
  if (platformId === 'ebay') {
    return `TITLE: ${esc(listing.title)}\nSTARTING PRICE: $${listing.startingPrice}\nBUY IT NOW: $${listing.buyItNowPrice}\nCONDITION ID: ${listing.condition}\nCATEGORY ID: ${listing.category}\n\n— DESCRIPTION (HTML) —\n${esc(listing.description)}`;
  }
  if (platformId === 'etsy') {
    return `TITLE: ${esc(listing.title)}\nPRICE: $${listing.price}\nTAGS: ${(listing.tags||[]).join(', ')}\n\n— DESCRIPTION —\n${esc(listing.description)}`;
  }
  if (platformId === 'facebook' || platformId === 'craigslist' || platformId === 'offerup') {
    return `TITLE: ${esc(listing.title)}\nPRICE: ${esc(String(listing.price))}\n\n— DESCRIPTION —\n${esc(listing.description)}`;
  }
  return esc(JSON.stringify(listing, null, 2));
}

function copyListing(platformId) {
  const el = document.getElementById(`listing-text-${platformId}`);
  if (!el) return;
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard!', 'success'));
}

async function saveListing(productId, platformId) {
  const url = document.getElementById(`url-${platformId}`)?.value || '';
  const p = await api(`/api/products/${productId}/listings/${platformId}`, 'POST', { url });
  updateProductInState(p);
  updatePlatformStatus(platformId, p.listings[platformId]);
  toast('Listing saved!', 'success');
}

async function markAsListed(productId, platformId) {
  const url = document.getElementById(`url-${platformId}`)?.value || '';
  const p = await api(`/api/products/${productId}/listings/${platformId}`, 'POST', { url });
  updateProductInState(p);
  updatePlatformStatus(platformId, p.listings[platformId]);
  await loadPlatformContent(productId, platformId);
  toast(`Marked as listed on ${PLATFORMS.find(pl=>pl.id===platformId)?.name}!`, 'success');
}

async function unlistProduct(productId, platformId) {
  const p = await api(`/api/products/${productId}/listings/${platformId}`, 'DELETE');
  updateProductInState(p);
  updatePlatformStatus(platformId, p.listings[platformId]);
  await loadPlatformContent(productId, platformId);
  toast('Removed from listed platforms', 'warning');
}

async function directPost(productId, platformId) {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Posting...';
  try {
    const result = await api(`/api/products/${productId}/post/${platformId}`, 'POST');
    if (result.error) throw new Error(result.error);
    const p = state.products.find(x => x.id === productId);
    if (p) updateProductInState({ ...p, listings: { ...p.listings, [platformId]: { status: 'listed', id: result.id, url: result.url } } });
    updatePlatformStatus(platformId, { status: 'listed', url: result.url });
    await loadPlatformContent(productId, platformId);
    toast(`Posted to ${platformId === 'ebay' ? 'eBay' : 'Etsy'}! 🎉`, 'success');
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '🚀 Post Now';
  }
}

function updatePlatformStatus(platformId, listing) {
  const row = document.getElementById(`row-${platformId}`);
  if (row) {
    const statusEl = row.querySelector('.platform-status');
    if (statusEl) {
      statusEl.className = `platform-status ${listing.status}`;
      statusEl.textContent = listing.status === 'listed' ? '✓ Listed' : 'Not Listed';
    }
  }
}

// ── Website ───────────────────────────────────────────────────────────────────
function renderWebsite(el) {
  el.innerHTML = `
<div style="max-width:700px;margin:0 auto">
  <div class="website-card">
    <div class="icon">🌐</div>
    <h3>Generate Your Shop Website</h3>
    <p>Create a beautiful static website from your inventory that you can share with buyers or deploy for free on GitHub Pages, Netlify, or any web host.</p>
    <button class="btn btn-gold btn-lg" onclick="generateWebsite()">Generate Website</button>
  </div>
  <div id="website-result" style="margin-top:1.5rem"></div>
</div>`;
}

async function generateWebsite() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating...';
  await api('/api/generate-website', 'POST');
  btn.disabled = false;
  btn.innerHTML = '✓ Regenerate Website';
  document.getElementById('website-result').innerHTML = `
<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem">
  <h3 style="margin-bottom:.75rem">Website Generated! 🎉</h3>
  <p style="color:var(--text-2);margin-bottom:1rem;line-height:1.6">Your website is saved in the <code style="background:var(--bg);padding:.2rem .4rem;border-radius:4px">website/</code> folder inside ResaleHub.</p>
  <div class="website-preview">
    <iframe src="/api/website-preview" title="Website Preview"></iframe>
  </div>
  <div style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap">
    <a href="/api/website-preview" target="_blank" class="btn btn-outline">🔗 Open in New Tab</a>
    <button class="btn btn-outline" onclick="copyWebsitePath()">📋 Copy Folder Path</button>
  </div>
  <div style="margin-top:1rem;padding:.75rem;background:var(--bg);border-radius:7px;font-size:.82rem;color:var(--text-2);line-height:1.7">
    <strong>To put this online for free:</strong><br>
    1. Drag the <code>website/</code> folder to <a href="https://app.netlify.com/drop" target="_blank" style="color:var(--blue)">netlify.com/drop</a><br>
    2. Or upload to GitHub Pages<br>
    3. Or share the folder directly with local buyers
  </div>
</div>`;
  toast('Website generated!', 'success');
}

function copyWebsitePath() {
  navigator.clipboard.writeText(window.location.origin + '/api/website-preview');
  toast('URL copied!');
}

// ── Settings ──────────────────────────────────────────────────────────────────
function renderSettings(el) {
  const s = state.settings;
  el.innerHTML = `
<div style="max-width:600px;margin:0 auto">

<div class="settings-section">
  <div class="settings-section-header">
    <span>🏪</span><h3>Shop Information</h3>
  </div>
  <div class="settings-section-body">
    <div class="form-grid">
      <div class="form-group span2">
        <label>Shop Name</label>
        <input class="form-input" id="s-shop-name" value="${esc(s.shopName||'')}" placeholder="My Resale Shop">
      </div>
      <div class="form-group span2">
        <label>Shop Description</label>
        <textarea class="form-textarea" id="s-shop-desc" style="min-height:70px" placeholder="Quality furniture and art...">${esc(s.shopDescription||'')}</textarea>
      </div>
      <div class="form-group">
        <label>Contact Email</label>
        <input class="form-input" id="s-email" type="email" value="${esc(s.email||'')}" placeholder="you@email.com">
      </div>
      <div class="form-group">
        <label>Default Location</label>
        <input class="form-input" id="s-location" value="${esc(s.location||'')}" placeholder="City, State">
      </div>
    </div>
  </div>
</div>

<div class="settings-section">
  <div class="settings-section-header">
    <span>🛒</span><h3>eBay API</h3>
    <span class="api-status ${s.ebayUserToken?'connected':'not-connected'}">${s.ebayUserToken?'✓ Connected':'Not Connected'}</span>
  </div>
  <div class="settings-section-body">
    <p style="font-size:.82rem;color:var(--text-2);margin-bottom:1rem">Get credentials at <a href="https://developer.ebay.com/" target="_blank" style="color:var(--blue)">developer.ebay.com</a></p>
    <div class="form-grid">
      <div class="form-group">
        <label>App ID (Client ID)</label>
        <input class="form-input" id="s-ebay-app" value="${esc(s.ebayAppId||'')}" placeholder="YourApp-xxxx-xxxx">
      </div>
      <div class="form-group">
        <label>Dev ID</label>
        <input class="form-input" id="s-ebay-dev" value="${esc(s.ebayDevId||'')}" placeholder="xxxxxxxx-xxxx-xxxx">
      </div>
      <div class="form-group">
        <label>Cert ID</label>
        <input class="form-input" id="s-ebay-cert" value="${esc(s.ebayCertId||'')}" placeholder="xxxxxxxx-xxxx-xxxx">
      </div>
      <div class="form-group">
        <label>User Token</label>
        <input class="form-input" id="s-ebay-token" value="${esc(s.ebayUserToken||'')}" placeholder="AgAAAA...">
      </div>
      <div class="form-group span2" style="flex-direction:row;align-items:center;gap:.5rem">
        <input type="checkbox" id="s-ebay-sandbox" ${s.ebaySandbox?'checked':''}>
        <label for="s-ebay-sandbox" style="text-transform:none;font-weight:400;font-size:.85rem;color:var(--text)">Use Sandbox (for testing — uncheck for real listings)</label>
      </div>
    </div>
  </div>
</div>

<div class="settings-section">
  <div class="settings-section-header">
    <span>🎨</span><h3>Etsy API</h3>
    <span class="api-status ${s.etsyAccessToken?'connected':'not-connected'}">${s.etsyAccessToken?'✓ Connected':'Not Connected'}</span>
  </div>
  <div class="settings-section-body">
    <p style="font-size:.82rem;color:var(--text-2);margin-bottom:1rem">Get credentials at <a href="https://www.etsy.com/developers/" target="_blank" style="color:var(--blue)">etsy.com/developers</a></p>
    <div class="form-grid">
      <div class="form-group">
        <label>API Key</label>
        <input class="form-input" id="s-etsy-key" value="${esc(s.etsyApiKey||'')}" placeholder="xxxxxxxxxxxxxxxxx">
      </div>
      <div class="form-group">
        <label>Access Token</label>
        <input class="form-input" id="s-etsy-token" value="${esc(s.etsyAccessToken||'')}" placeholder="xxxxxxxxxxxxxxxxx">
      </div>
      <div class="form-group span2">
        <label>Shop ID</label>
        <input class="form-input" id="s-etsy-shop" value="${esc(s.etsyShopId||'')}" placeholder="12345678">
      </div>
    </div>
  </div>
</div>

<div style="display:flex;justify-content:flex-end;margin-top:1rem">
  <button class="btn btn-gold btn-lg" onclick="saveSettings()">Save Settings</button>
</div>
</div>`;
}

async function saveSettings() {
  const settings = {
    shopName: document.getElementById('s-shop-name').value,
    shopDescription: document.getElementById('s-shop-desc').value,
    email: document.getElementById('s-email').value,
    location: document.getElementById('s-location').value,
    ebayAppId: document.getElementById('s-ebay-app').value,
    ebayDevId: document.getElementById('s-ebay-dev').value,
    ebayCertId: document.getElementById('s-ebay-cert').value,
    ebayUserToken: document.getElementById('s-ebay-token').value,
    ebaySandbox: document.getElementById('s-ebay-sandbox').checked,
    etsyApiKey: document.getElementById('s-etsy-key').value,
    etsyAccessToken: document.getElementById('s-etsy-token').value,
    etsyShopId: document.getElementById('s-etsy-shop').value
  };
  await api('/api/settings', 'POST', settings);
  state.settings = settings;
  toast('Settings saved!', 'success');
  renderSettings(document.getElementById('content'));
}

// ── Sold / Delete Modals ──────────────────────────────────────────────────────
function openSoldModal(id) {
  state.pendingSoldId = id;
  const p = state.products.find(x => x.id === id);
  document.getElementById('sold-price').value = p?.price || '';
  openModal('modal-sold');
}

async function confirmSold() {
  const p = await api(`/api/products/${state.pendingSoldId}/sold`, 'POST', {
    soldPrice: document.getElementById('sold-price').value,
    platform: document.getElementById('sold-platform').value
  });
  updateProductInState(p);
  closeModal('modal-sold');
  updateSidebarCount();
  toast(`Sold for $${p.soldPrice}! 🎉`, 'success');
  if (state.currentPage === 'detail') navigate('detail', p.id);
  else navigate('inventory');
}

function openDeleteModal(id, name) {
  state.pendingDeleteId = id;
  document.getElementById('delete-name').textContent = name;
  openModal('modal-delete');
}

async function confirmDelete() {
  await api(`/api/products/${state.pendingDeleteId}`, 'DELETE');
  state.products = state.products.filter(p => p.id !== state.pendingDeleteId);
  closeModal('modal-delete');
  updateSidebarCount();
  toast('Item deleted', 'warning');
  navigate('inventory');
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});
document.querySelectorAll?.('.modal-overlay')?.forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ── Sidebar ───────────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('backdrop').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('backdrop').classList.remove('show');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function api(url, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  return res.json().catch(() => ({}));
}

function updateProductInState(p) {
  const idx = state.products.findIndex(x => x.id === p.id);
  if (idx !== -1) state.products[idx] = p;
}

function updateSidebarCount() {
  const active = state.products.filter(p => !p.sold).length;
  const sold = state.products.filter(p => p.sold).length;
  const el = document.getElementById('sidebar-count');
  if (el) el.textContent = `${active} active · ${sold} sold`;
}

function formatCondition(c) {
  const map = { new:'New',like_new:'Like New',excellent:'Excellent',very_good:'Very Good',good:'Good',fair:'Fair',poor:'Poor' };
  return map[c] || (c||'');
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type==='success'?'✓':type==='error'?'✕':type==='warning'?'⚠':''}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
