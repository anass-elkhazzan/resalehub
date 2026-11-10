function generate(product, platform) {
  switch (platform) {
    case 'facebook':   return facebook(product);
    case 'ebay':       return ebay(product);
    case 'etsy':       return etsy(product);
    case 'craigslist': return craigslist(product);
    case 'offerup':    return offerup(product);
    default:           return generic(product);
  }
}

function facebook(product) {
  const lines = [product.description, ''];
  if (product.dimensions) lines.push(`📏 Dimensions: ${product.dimensions}`);
  if (product.color)      lines.push(`🎨 Color: ${product.color}`);
  if (product.condition)  lines.push(`✅ Condition: ${formatCondition(product.condition)}`);
  if (product.location)   lines.push(`📍 Location: ${product.location}`);
  lines.push('', '💬 Message me to arrange viewing or pickup.', 'Cash, Venmo, or Zelle accepted. No holds without deposit.');
  return {
    platform: 'Facebook Marketplace',
    title: product.title,
    price: `$${product.price}`,
    description: lines.filter(l => l !== null).join('\n'),
    tips: [
      'Post in local Facebook groups in addition to Marketplace',
      'Upload all photos — listings with 5+ photos get 3x more views',
      'Respond to messages quickly to stay at the top'
    ]
  };
}

function ebay(product) {
  const desc = `
<div style="font-family: Arial, sans-serif; max-width: 700px;">
  <h2>${product.title}</h2>
  <p>${product.description.replace(/\n/g, '<br>')}</p>
  <hr>
  <h3>Item Details</h3>
  <table>
    ${product.condition ? `<tr><td><b>Condition</b></td><td>${formatCondition(product.condition)}</td></tr>` : ''}
    ${product.dimensions ? `<tr><td><b>Dimensions</b></td><td>${product.dimensions}</td></tr>` : ''}
    ${product.color ? `<tr><td><b>Color / Finish</b></td><td>${product.color}</td></tr>` : ''}
    ${product.location ? `<tr><td><b>Location</b></td><td>${product.location}</td></tr>` : ''}
  </table>
  <hr>
  <h3>Shipping & Payment</h3>
  <p>Local pickup preferred. Buyer pays all shipping costs — message for quote before purchasing.</p>
  <p>Payment via PayPal only. Item must be paid within 3 days.</p>
  <p><i>All sales final. Item is as described. Please review all photos carefully.</i></p>
</div>`.trim();

  return {
    platform: 'eBay',
    title: product.title.substring(0, 80),
    startingPrice: (product.price * 0.75).toFixed(2),
    buyItNowPrice: product.price.toFixed(2),
    description: desc,
    condition: ebayConditionId(product.condition),
    category: ebayCategoryId(product.category),
    tips: [
      'Add "Best Offer" to attract buyers willing to negotiate',
      'List on Sunday evening for 7-day auctions — more eyeballs',
      'Include brand name in title if applicable'
    ]
  };
}

function etsy(product) {
  const lines = [product.description, ''];
  lines.push('── ITEM DETAILS ──');
  if (product.condition)  lines.push(`• Condition: ${formatCondition(product.condition)}`);
  if (product.dimensions) lines.push(`• Dimensions: ${product.dimensions}`);
  if (product.color)      lines.push(`• Color / Finish: ${product.color}`);
  lines.push('');
  lines.push('── PICKUP & SHIPPING ──');
  lines.push(`• Local pickup available${product.location ? ` in ${product.location}` : ''}`);
  lines.push('• Shipping available — message for a quote before purchasing');
  lines.push('');
  lines.push('Have questions? Message us anytime!');

  const baseTags = (product.tags || []).slice(0, 5);
  const extraTags = [product.category, 'vintage', 'home decor', 'furniture', 'antique', 'mid century', 'rustic', 'farmhouse'].filter(t => !baseTags.includes(t));
  const allTags = [...baseTags, ...extraTags].slice(0, 13);

  return {
    platform: 'Etsy',
    title: product.title.substring(0, 140),
    price: product.price.toFixed(2),
    description: lines.join('\n'),
    tags: allTags,
    tips: [
      'Etsy favors listings with all 13 tags filled out',
      'Use "vintage" tag for items 20+ years old',
      'Great photos are the #1 factor on Etsy — bright, natural light'
    ]
  };
}

function craigslist(product) {
  const lines = [product.description, ''];
  if (product.dimensions) lines.push(`Dimensions: ${product.dimensions}`);
  if (product.color)      lines.push(`Color: ${product.color}`);
  if (product.condition)  lines.push(`Condition: ${formatCondition(product.condition)}`);
  if (product.location)   lines.push(`Location: ${product.location}`);
  lines.push('');
  lines.push('Cash only. Firm on price. No lowballers.');
  lines.push('Text preferred. Do NOT contact me with unsolicited services or offers.');

  return {
    platform: 'Craigslist',
    title: `${product.title} - $${product.price}`,
    price: product.price,
    description: lines.join('\n'),
    tips: [
      'Repost every 48h to stay near the top',
      'Never meet a stranger alone — bring someone',
      'Mark as sold ASAP to avoid wasting time on old inquiries'
    ]
  };
}

function offerup(product) {
  const lines = [product.description, ''];
  if (product.condition)  lines.push(`Condition: ${formatCondition(product.condition)}`);
  if (product.dimensions) lines.push(`Size: ${product.dimensions}`);
  if (product.color)      lines.push(`Color: ${product.color}`);
  lines.push('', 'Local meetup only. Serious buyers please.');

  return {
    platform: 'OfferUp',
    title: product.title,
    price: product.price,
    description: lines.join('\n'),
    tips: [
      'OfferUp users expect some negotiation — price 10-15% above your floor',
      'Ship nationwide with OfferUp shipping for bigger audience',
      'Respond fast — OfferUp ranks active sellers higher'
    ]
  };
}

function generic(product) {
  return { title: product.title, price: `$${product.price}`, description: product.description };
}

function formatCondition(c) {
  const map = {
    new: 'New', like_new: 'Like New', excellent: 'Excellent',
    very_good: 'Very Good', good: 'Good', fair: 'Fair', poor: 'Poor'
  };
  return map[c] || c;
}

function ebayConditionId(c) {
  const map = { new: 1000, like_new: 1500, excellent: 2000, very_good: 2500, good: 3000, fair: 4000, poor: 5000 };
  return map[c] || 3000;
}

function ebayCategoryId(category) {
  const map = { furniture: '3197', art: '360', decor: '1465', lighting: '112581', rugs: '20571', other: '281' };
  return map[category] || '281';
}

module.exports = { generate };
