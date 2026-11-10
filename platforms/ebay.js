// eBay Trading API — get credentials at https://developer.ebay.com/
const https = require('https');
const formatter = require('./formatter');

class EbayAPI {
  constructor(settings) {
    this.appId = settings.ebayAppId;
    this.devId = settings.ebayDevId;
    this.certId = settings.ebayCertId;
    this.userToken = settings.ebayUserToken;
    this.sandbox = settings.ebaySandbox || false;
  }

  async listItem(product) {
    const listing = formatter.generate(product, 'ebay');
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${this.userToken}</eBayAuthToken></RequesterCredentials>
  <Item>
    <Title>${this._esc(listing.title)}</Title>
    <Description><![CDATA[${listing.description}]]></Description>
    <PrimaryCategory><CategoryID>${listing.category}</CategoryID></PrimaryCategory>
    <StartPrice>${listing.startingPrice}</StartPrice>
    <BuyItNowPrice>${listing.buyItNowPrice}</BuyItNowPrice>
    <ListingDuration>Days_30</ListingDuration>
    <ListingType>Chinese</ListingType>
    <Country>US</Country>
    <Currency>USD</Currency>
    <ConditionID>${listing.condition}</ConditionID>
    <Location>${this._esc(product.location || 'United States')}</Location>
    <PaymentMethods>PayPal</PaymentMethods>
    <BestOfferDetails><BestOfferEnabled>true</BestOfferEnabled></BestOfferDetails>
    <ReturnPolicy><ReturnsAcceptedOption>ReturnsNotAccepted</ReturnsAcceptedOption></ReturnPolicy>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSParcelSelect</ShippingService>
        <ShippingServiceCost>0.00</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
  </Item>
</AddItemRequest>`;

    const host = this.sandbox ? 'api.sandbox.ebay.com' : 'api.ebay.com';
    return new Promise((resolve, reject) => {
      const options = {
        hostname: host, path: '/ws/api.dll', method: 'POST',
        headers: {
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-CALL-NAME': 'AddItem',
          'X-EBAY-API-APP-NAME': this.appId,
          'X-EBAY-API-DEV-NAME': this.devId,
          'X-EBAY-API-CERT-NAME': this.certId,
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(xml)
        }
      };
      const req = https.request(options, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          const m = data.match(/<ItemID>(\d+)<\/ItemID>/);
          if (m) resolve({ id: m[1], url: `https://www.ebay.com/itm/${m[1]}` });
          else reject(new Error(`eBay error: ${data.substring(0, 500)}`));
        });
      });
      req.on('error', reject);
      req.write(xml);
      req.end();
    });
  }

  _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}

module.exports = EbayAPI;
