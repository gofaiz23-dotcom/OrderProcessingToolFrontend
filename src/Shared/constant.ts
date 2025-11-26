export const MARKETPLACES = [
  'Amazon',
  'Walmart',
  'eBay',
  'Shopify',
  'Overstock',
  'Wayfair',
  'Sears',
  'Target',
  'HomeDepot',
  'NewEgg',
  'Rakuten',
  'GigaB2B',
] as const;

export type Marketplace = typeof MARKETPLACES[number];

