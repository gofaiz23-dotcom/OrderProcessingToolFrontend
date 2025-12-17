/**
 * Email templates for automation workflows
 */

type Carrier = 'estes' | 'xpo';

/**
 * Helper function to extract value from JSONB
 */
const getJsonbValue = (jsonb: Record<string, unknown>, key: string): string => {
  if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '';

  const normalizedKey = key.trim();
  const keyWithoutHash = normalizedKey.replace(/#/g, '');
  const keyLower = normalizedKey.toLowerCase();
  const keyWithoutHashLower = keyWithoutHash.toLowerCase();

  const keysToTry = [
    normalizedKey,
    keyWithoutHash,
    `#${keyWithoutHash}`,
    keyLower,
    keyWithoutHashLower,
    `#${keyWithoutHashLower}`,
  ];

  for (const k of keysToTry) {
    if (jsonb[k] !== undefined && jsonb[k] !== null && jsonb[k] !== '') {
      return String(jsonb[k]);
    }
  }

  for (const objKey of Object.keys(jsonb)) {
    const objKeyLower = objKey.toLowerCase();
    if (
      objKeyLower === keyLower ||
      objKeyLower === keyWithoutHashLower ||
      objKeyLower.includes(keyWithoutHashLower)
    ) {
      const value = jsonb[objKey];
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }
  }

  return '';
};

/**
 * Pickup scheduled EMAIL SUBJECTS ONLY
 */
export const getEstesPickupScheduledEmailSubject = (
  orderId: number,
  orderNumber?: string
): string => {
  const orderRef = orderNumber || `Order ${orderId}`;
  return `Estes Express - Pickup Scheduled - ${orderRef}`;
};

export const getXPOPickupScheduledEmailSubject = (
  orderId: number,
  orderNumber?: string
): string => {
  const orderRef = orderNumber || `Order ${orderId}`;
  return `XPO Logistics - Pickup Scheduled - ${orderRef}`;
};

/**
 * Default CC email addresses for each carrier
 */
export const DEFAULT_CC_EMAILS = {
  ESTES: ['fhshyderbad@gmail.com'],
  XPO: ['gofaiz23@gmail.com'],
} as const;

export const getDefaultCCEmails = (carrier: Carrier): string[] => {
  return carrier === 'estes'
    ? [...DEFAULT_CC_EMAILS.ESTES]
    : [...DEFAULT_CC_EMAILS.XPO];
};

/**
 * Marketplace shorthands for BOL filenames
 */
export const MARKETPLACE_SHORTHANDS: Record<string, string> = {
  Walmart: 'WM',
  Amazon: 'AZ',
  eBay: 'EB',
  Shopify: 'SF',
  Overstock: 'OS',
  Wayfair: 'WF',
  Sears: 'SR',
  Target: 'TG',
  HomeDepot: 'HD',
  NewEgg: 'NE',
  Rakuten: 'RT',
  GigaB2B: 'GB',
} as const;

export const getFormattedBOLFilename = (
  customerName: string,
  marketplace: string,
  orderNumber: string
): string => {
  const mpKey = Object.keys(MARKETPLACE_SHORTHANDS).find(
    key => key.toLowerCase() === (marketplace || '').toLowerCase()
  );

  const mpShorthand = mpKey
    ? MARKETPLACE_SHORTHANDS[mpKey]
    : marketplace || 'UNK';

  const safeCustomerName = customerName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
  const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();

  return `${safeCustomerName} ${mpShorthand} ${safeOrderNumber}`;
};

/**
 * EMAIL TEMPLATES (Pickup BODY REMOVED)
 */
export const EMAIL_TEMPLATES = {
  LTL_ORDER_DRAFT: {
    subject: (customerName: string, orderNumber: string) =>
      getLTLOrderDraftEmailSubject(customerName, orderNumber),
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) =>
      getLTLOrderDraftEmailBody(orderJsonb, subSKUs),
    cc: () => [],
  },

  PARCEL_ORDER_DRAFT: {
    subject: (customerName: string, orderNumber: string) =>
      getParcelOrderDraftEmailSubject(customerName, orderNumber),
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) =>
      getParcelOrderDraftEmailBody(orderJsonb, subSKUs),
    cc: () => [],
  },

  PICKUP_SCHEDULED: {
    subject: (carrier: Carrier, orderId: number, orderNumber?: string) =>
      carrier === 'estes'
        ? getEstesPickupScheduledEmailSubject(orderId, orderNumber)
        : getXPOPickupScheduledEmailSubject(orderId, orderNumber),
    body: (carrier: Carrier, orderId: number, orderNumber?: string, sku?: string) =>
      getPickupScheduledEmailBody(carrier, orderId, orderNumber, sku),
    cc: (carrier: Carrier) => getDefaultCCEmails(carrier),
  },
} as const;

/**
 * Pickup Scheduled Email Body
 */
export const getPickupScheduledEmailBody = (
  carrier: Carrier | string,
  orderId: number,
  orderNumber?: string,
  sku?: string
): string => {
  const orderRef = orderNumber || `Order ${orderId}`;
  const carrierLower = typeof carrier === 'string' ? carrier.toLowerCase() : carrier;
  const carrierName = carrierLower === 'estes' ? 'Estes Express' : 'XPO Logistics';

  return `Team,

Pickup has been scheduled for ${orderRef}${sku ? ` (SKU: ${sku})` : ''} via ${carrierName}.

Please ensure the shipment is ready for pickup.

Thank You.
`;
};

/**
 * LTL Order Draft Subject
 */
export const getLTLOrderDraftEmailSubject = (
  customerName: string,
  orderNumber: string
): string => {
  return `Hawasly Furniture order - ${customerName} ${orderNumber}`;
};

/**
 * LTL Order Draft Body
 */
export const getLTLOrderDraftEmailBody = (
  orderJsonb: Record<string, unknown>,
  subSKUs: string[] = []
): string => {
  const customerName = getJsonbValue(orderJsonb, 'Customer Name');
  const orderNumber =
    getJsonbValue(orderJsonb, 'Order Number') ||
    getJsonbValue(orderJsonb, 'PO#') ||
    getJsonbValue(orderJsonb, 'PO Number');

  const streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
  const streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
  const city = getJsonbValue(orderJsonb, 'City');
  const state = getJsonbValue(orderJsonb, 'State');
  const zip = getJsonbValue(orderJsonb, 'Zip');
  const phone = '6262099751';

  const fullStreet = streetAddress2
    ? `${streetAddress}\n${streetAddress2}`
    : streetAddress;

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

  const skuList =
    subSKUs.length > 0
      ? subSKUs.map(s => `- ${s}`).join('\n')
      : '- (No sub-SKUs provided)';

  return `Team,

Please palletize this order and provide shipping info and images for our records.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm.

Thank You.
`;
};

/**
 * Parcel Order Draft Subject
 */
export const getParcelOrderDraftEmailSubject = (
  customerName: string,
  orderNumber: string
): string => {
  return `Hawasly Furniture order - ${customerName} ${orderNumber}`;
};

/**
 * Parcel Order Draft Body
 */
export const getParcelOrderDraftEmailBody = (
  orderJsonb: Record<string, unknown>,
  subSKUs: string[] = []
): string => {
  const customerName = getJsonbValue(orderJsonb, 'Customer Name');
  const orderNumber =
    getJsonbValue(orderJsonb, 'Order Number') ||
    getJsonbValue(orderJsonb, 'PO#') ||
    getJsonbValue(orderJsonb, 'PO Number');

  const streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
  const streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
  const city = getJsonbValue(orderJsonb, 'City');
  const state = getJsonbValue(orderJsonb, 'State');
  const zip = getJsonbValue(orderJsonb, 'Zip');
  const phone = '6262099751';

  const fullStreet = streetAddress2
    ? `${streetAddress}\n${streetAddress2}`
    : streetAddress;

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

  const skuList =
    subSKUs.length > 0
      ? subSKUs.map(s => `- ${s}`).join('\n')
      : '- (No sub-SKUs provided)';

  return `Team,

Please ship this order and provide shipping info and images.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm.

Thank You.
`;
};
