// Etsy Open API v3 — get credentials at https://www.etsy.com/developers/
const formatter = require('./formatter');

class EtsyAPI {
  constructor(settings) {
    this.apiKey = settings.etsyApiKey;
    this.accessToken = settings.etsyAccessToken;
    this.shopId = settings.etsyShopId;
  }

  async createListing(product) {
    const listing = formatter.generate(product, 'etsy');
    const body = JSON.stringify({
      quantity: 1,
      title: listing.title,
      description: listing.description,
      price: parseFloat(listing.price),
      who_made: 'i_did',
      when_made: 'before_2020',
      taxonomy_id: this._taxonomyId(product.category),
      tags: listing.tags,
      materials: [],
      is_supply: false,
      is_customizable: false,
      is_digital: false,
      should_auto_renew: true,
      state: 'draft'
    });

    const response = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${this.shopId}/listings`,
      {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Etsy error: ${err.substring(0, 300)}`);
    }

    const data = await response.json();
    return { id: String(data.listing_id), url: `https://www.etsy.com/listing/${data.listing_id}` };
  }

  _taxonomyId(category) {
    const map = { furniture: 1, art: 1242, decor: 68887209, lighting: 68887210, rugs: 68887211, other: 1 };
    return map[category] || 1;
  }
}

module.exports = EtsyAPI;
