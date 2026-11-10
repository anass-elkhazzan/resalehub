const fs = require('fs');
const path = require('path');

function generate(products, settings) {
  const outDir = path.join(__dirname, '..', 'website');
  const imgDir = path.join(outDir, 'images');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);

  const shopName = settings.shopName || 'My Shop';
  const shopDesc = settings.shopDescription || 'Quality furniture and art for your home';
  const email = settings.email || '';

  const active = products.filter(p => !p.sold);
  const sold = products.filter(p => p.sold);

  // Copy images
  products.forEach(p => {
    (p.photos || []).forEach(photo => {
      const src = path.join(__dirname, '..', 'public', 'uploads', photo);
      const dst = path.join(imgDir, photo);
      if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
    });
  });

  function card(p) {
    const img = p.photos?.[0]
      ? `<img src="images/${p.photos[0]}" alt="${esc(p.title)}" loading="lazy">`
      : `<div class="no-img">🪑</div>`;
    return `
<div class="card${p.sold ? ' sold' : ''}" data-category="${p.category}" onclick="showModal('${p.id}')">
  <div class="card-img">${img}${p.sold ? '<span class="sold-tag">SOLD</span>' : ''}</div>
  <div class="card-body">
    <h3>${esc(p.title)}</h3>
    <div class="card-meta">
      <span class="price">${p.sold ? `SOLD · $${p.soldPrice||p.price}` : `$${p.price}`}</span>
      <span class="cond">${formatCond(p.condition)}</span>
    </div>
  </div>
</div>`;
  }

  function modal(p) {
    const photos = (p.photos || []).map((ph, i) =>
      `<img src="images/${ph}" alt="${esc(p.title)}" class="thumb${i===0?' active':''}" onclick="switchPhoto(this,'${ph}')">`
    ).join('');
    const mainPhoto = p.photos?.[0]
      ? `<img id="main-${p.id}" src="images/${p.photos[0]}" alt="${esc(p.title)}">`
      : `<div class="no-img-lg">🪑</div>`;
    const action = p.sold
      ? `<div class="sold-banner">This item has been sold</div>`
      : email
        ? `<a href="mailto:${esc(email)}?subject=${encodeURIComponent('Interested in: '+p.title)}&body=${encodeURIComponent('Hi, I am interested in the '+p.title+' listed at $'+p.price+'.\n\nPlease let me know if it is still available.\n\nThank you!')}" class="btn-contact">Contact to Purchase</a>`
        : `<p class="no-email">Contact the seller for pricing and availability.</p>`;

    return `
<div id="m-${p.id}" class="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal-inner">
    <button class="close-btn" onclick="closeModal()">✕</button>
    <div class="modal-photos">
      <div class="main-photo">${mainPhoto}</div>
      ${p.photos?.length > 1 ? `<div class="thumbs">${photos}</div>` : ''}
    </div>
    <div class="modal-info">
      <h2>${esc(p.title)}</h2>
      <div class="modal-price">${p.sold ? `SOLD · $${p.soldPrice||p.price}` : `$${p.price}`}</div>
      <div class="modal-tags">
        <span class="tag">${formatCond(p.condition)}</span>
        <span class="tag">${p.category}</span>
        ${p.color ? `<span class="tag">${esc(p.color)}</span>` : ''}
      </div>
      <p class="modal-desc">${esc(p.description).replace(/\n/g,'<br>')}</p>
      ${p.dimensions ? `<p class="detail"><b>Dimensions:</b> ${esc(p.dimensions)}</p>` : ''}
      ${p.location ? `<p class="detail"><b>Location:</b> ${esc(p.location)}</p>` : ''}
      ${action}
    </div>
  </div>
</div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(shopName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Georgia',serif;background:#f7f4ef;color:#2c2c2c;min-height:100vh}
header{background:#1a1a1a;color:#fff;padding:3rem 1rem;text-align:center}
header h1{font-size:2.8rem;letter-spacing:.05em;margin-bottom:.5rem}
header p{color:#aaa;font-style:italic;font-size:1.1rem}
nav{background:#222;padding:.8rem 1rem;text-align:center;position:sticky;top:0;z-index:100}
.nav-btn{background:none;border:1px solid #555;color:#ccc;padding:.4rem 1.2rem;margin:.2rem;border-radius:20px;cursor:pointer;font-size:.85rem;transition:.2s}
.nav-btn.active,.nav-btn:hover{background:#c9a227;border-color:#c9a227;color:#1a1a1a}
.container{max-width:1200px;margin:2rem auto;padding:0 1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.5rem}
.card{background:#fff;border-radius:10px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.card:hover{transform:translateY(-5px);box-shadow:0 10px 25px rgba(0,0,0,.15)}
.card.sold{opacity:.6}
.card-img{height:240px;background:#f0ede8;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.card-img img{width:100%;height:100%;object-fit:cover}
.no-img{font-size:4rem}
.sold-tag{position:absolute;top:.8rem;right:.8rem;background:#c0392b;color:#fff;padding:.3rem .8rem;border-radius:4px;font-size:.75rem;font-weight:bold;letter-spacing:.05em}
.card-body{padding:1rem}
.card-body h3{font-size:.95rem;margin-bottom:.5rem;line-height:1.3}
.card-meta{display:flex;justify-content:space-between;align-items:center}
.price{color:#2d6a4f;font-weight:bold;font-size:1.1rem}
.cond{color:#888;font-size:.8rem;text-transform:capitalize}
.section-title{font-size:1.5rem;margin:2rem 0 1rem;color:#1a1a1a;border-bottom:2px solid #c9a227;padding-bottom:.5rem;display:inline-block}
.empty-state{text-align:center;padding:4rem;color:#aaa;font-style:italic}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:1000;overflow-y:auto;padding:2rem 1rem}
.modal.open{display:flex;align-items:flex-start;justify-content:center}
.modal-inner{background:#fff;border-radius:12px;max-width:880px;width:100%;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;position:relative;margin:auto}
@media(max-width:650px){.modal-inner{grid-template-columns:1fr}}
.close-btn{position:absolute;top:.8rem;right:.8rem;background:#1a1a1a;color:#fff;border:none;width:2rem;height:2rem;border-radius:50%;cursor:pointer;font-size:1rem;z-index:10;display:flex;align-items:center;justify-content:center}
.modal-photos{background:#f0ede8;padding:1rem;display:flex;flex-direction:column;gap:.5rem}
.main-photo{flex:1;display:flex;align-items:center;justify-content:center;min-height:280px}
.main-photo img{max-width:100%;max-height:360px;object-fit:contain;border-radius:4px}
.no-img-lg{font-size:6rem;text-align:center}
.thumbs{display:flex;gap:.5rem;flex-wrap:wrap}
.thumbs img{width:60px;height:60px;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid transparent;transition:.2s}
.thumbs img.active,.thumbs img:hover{border-color:#c9a227}
.modal-info{padding:2rem;display:flex;flex-direction:column;gap:1rem;overflow-y:auto}
.modal-info h2{font-size:1.4rem;line-height:1.3}
.modal-price{font-size:2rem;color:#2d6a4f;font-weight:bold}
.modal-tags{display:flex;gap:.5rem;flex-wrap:wrap}
.tag{background:#f0ede8;color:#555;padding:.3rem .8rem;border-radius:20px;font-size:.8rem;text-transform:capitalize}
.modal-desc{color:#555;line-height:1.7;font-size:.95rem}
.detail{color:#666;font-size:.9rem}
.btn-contact{display:block;background:#1a1a1a;color:#fff;text-align:center;padding:1rem 2rem;border-radius:8px;text-decoration:none;font-size:1rem;transition:.2s;margin-top:.5rem}
.btn-contact:hover{background:#c9a227;color:#1a1a1a}
.sold-banner{background:#fdecea;color:#c0392b;text-align:center;padding:1rem;border-radius:8px;font-weight:bold}
footer{background:#1a1a1a;color:#666;text-align:center;padding:2rem;margin-top:4rem;font-size:.9rem}
footer a{color:#c9a227;text-decoration:none}
</style>
</head>
<body>
<header>
  <h1>${esc(shopName)}</h1>
  <p>${esc(shopDesc)}</p>
</header>
<nav>
  <button class="nav-btn active" onclick="filter('all',this)">All Items (${active.length})</button>
  <button class="nav-btn" onclick="filter('furniture',this)">Furniture</button>
  <button class="nav-btn" onclick="filter('art',this)">Art</button>
  <button class="nav-btn" onclick="filter('decor',this)">Decor</button>
  ${sold.length ? `<button class="nav-btn" onclick="filter('sold',this)">Sold (${sold.length})</button>` : ''}
  ${email ? `<a href="mailto:${esc(email)}" style="display:inline-block;padding:.4rem 1.2rem;color:#c9a227;text-decoration:none;font-size:.85rem">✉ Contact</a>` : ''}
</nav>
<div class="container">
  <div id="grid" class="grid">
    ${active.map(card).join('')}
    ${!active.length ? '<p class="empty-state">No items available right now. Check back soon!</p>' : ''}
  </div>
  <div id="sold-section" style="display:none">
    <div class="section-title">Sold Items</div>
    <div class="grid">${sold.map(card).join('')}</div>
  </div>
</div>
${products.map(modal).join('')}
<footer>
  <p>${esc(shopName)}${email ? ` · <a href="mailto:${esc(email)}">${esc(email)}</a>` : ''}</p>
  <p style="margin-top:.5rem;font-size:.8rem">Generated with ResaleHub</p>
</footer>
<script>
var currentModal=null;
function showModal(id){
  var m=document.getElementById('m-'+id);
  if(m){m.classList.add('open');currentModal=id;document.body.style.overflow='hidden';}
}
function closeModal(){
  if(currentModal){
    var m=document.getElementById('m-'+currentModal);
    if(m){m.classList.remove('open');document.body.style.overflow='';}
    currentModal=null;
  }
}
function switchPhoto(el,filename){
  var parent=el.closest('.modal-inner');
  var mainId=parent.querySelector('.main-photo img');
  if(mainId){mainId.src='images/'+filename;}
  parent.querySelectorAll('.thumbs img').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
}
function filter(cat,btn){
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  var cards=document.querySelectorAll('#grid .card');
  var soldSection=document.getElementById('sold-section');
  if(cat==='sold'){
    cards.forEach(function(c){c.style.display='none';});
    soldSection.style.display='block';
  } else {
    soldSection.style.display='none';
    cards.forEach(function(c){
      c.style.display=(cat==='all'||c.dataset.category===cat)?'':'none';
    });
  }
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('Website generated: website/index.html');
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatCond(c) {
  const map = { new:'New',like_new:'Like New',excellent:'Excellent',very_good:'Very Good',good:'Good',fair:'Fair',poor:'Poor' };
  return map[c] || (c||'');
}

module.exports = { generate };
