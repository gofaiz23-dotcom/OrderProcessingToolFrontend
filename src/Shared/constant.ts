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

export const LOGISTICS_CARRIERS = [
  'FedEx',
  'XPO',
  'Estes',
  'UPS',
  'Arcbest',
] as const;

export type LogisticsCarrier = typeof LOGISTICS_CARRIERS[number];

