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
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) => {
      const customerName = getJsonbValue(orderJsonb, 'Customer Name');
      const orderNumber =
        getJsonbValue(orderJsonb, 'Order Number') ||
        getJsonbValue(orderJsonb, 'PO#') ||
        getJsonbValue(orderJsonb, 'PO Number');

      let streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
      let streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
      let city = getJsonbValue(orderJsonb, 'City');
      let state = getJsonbValue(orderJsonb, 'State');
      let zip = getJsonbValue(orderJsonb, 'Zip');
      const phone = '6262099751';

      // If street address is empty, try to get from Walmart's Address field
      if (!streetAddress) {
        const addressField = getJsonbValue(orderJsonb, 'Address');
        if (addressField && addressField.trim()) {
          const hasLetters = /[a-zA-Z]/.test(addressField);
          if (hasLetters && !addressField.includes(',')) {
            streetAddress = addressField;
          } else if (hasLetters) {
            const shippingAddress = getJsonbValue(orderJsonb, 'Shipping Address') ||
              getJsonbValue(orderJsonb, 'Customer Shipping Address');
            if (shippingAddress) {
              const addressWithoutPhone = shippingAddress.replace(/,?\s*Phone:\s*\d+/i, '').trim();
              const parts = addressWithoutPhone.split(',').map(p => p.trim());
              if (parts.length >= 3) {
                streetAddress = parts[1] || '';
                if (!city || !state || !zip) {
                  const cityStateZipPart = parts[2] || '';
                  const cityStateZipMatch = cityStateZipPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{4,5})$/);
                  if (cityStateZipMatch) {
                    city = city || cityStateZipMatch[1];
                    state = state || cityStateZipMatch[2];
                    zip = zip || cityStateZipMatch[3];
                  }
                }
              }
            }
          }
        }
      }

      const fullStreet = streetAddress2
        ? `${streetAddress}\n${streetAddress2}`
        : streetAddress;

      const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

      const skuList =
        subSKUs.length > 0
          ? subSKUs.map(s => `- ${s}`).join('\n')
          : `- ${getJsonbValue(orderJsonb, 'SKU') || '(No SKU provided)'}`;

      return `Team,

Please palletize this order and provide shipping info and images for our records. PLease provide sales order acknowledgement for review?

Shipping docs (BOL/Label) attached.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm?
Thank You.
Best Regards.
`;
    },
    cc: (carrier: Carrier) => getDefaultCCEmails(carrier),
  },

  PROCESSED_PARCEL: {
    subject: (customerName: string, orderNumber: string) =>
      getProcessedParcelEmailSubject(customerName, orderNumber),
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) =>
      getProcessedParcelEmailBody(orderJsonb, subSKUs),
    to: () => ['gofaiz23@gmail.com'],
    cc: () => ['fhshyderbad@gmail.com'],
  },

  PROCESSED_ESTES: {
    subject: (customerName: string, orderNumber: string) =>
      getProcessedEstesEmailSubject(customerName, orderNumber),
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) =>
      getProcessedEstesEmailBody(orderJsonb, subSKUs),
    to: () => ['gofaiz23@gmail.com'],
    cc: () => ['fhshyderbad@gmail.com'],
  },

  PROCESSED_XPO: {
    subject: (customerName: string, orderNumber: string) =>
      getProcessedXPOEmailSubject(customerName, orderNumber),
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) =>
      getProcessedXPOEmailBody(orderJsonb, subSKUs),
    to: () => ['gofaiz23@gmail.com'],
    cc: () => ['fhshyderbad@gmail.com'],
  },

  PROCESSED_MULTIPLE: {
    subject: (orderCount: number) =>
      getProcessedMultipleEmailSubject(orderCount),
    body: (orders: Array<{ orderId: number; orderNumber: string; customerName: string; subSKUs: string[] }>) =>
      getProcessedMultipleEmailBody(orders),
    to: () => ['gofaiz23@gmail.com'],
    cc: () => ['fhshyderbad@gmail.com', 'gofaiz23@gmail.com'],
  },
} as const;

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

  let streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
  let streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
  let city = getJsonbValue(orderJsonb, 'City');
  let state = getJsonbValue(orderJsonb, 'State');
  let zip = getJsonbValue(orderJsonb, 'Zip');
  const phone = '6262099751';

  // If street address is empty, try to get from Walmart's Address field
  if (!streetAddress) {
    const addressField = getJsonbValue(orderJsonb, 'Address');
    console.log('🔍 Checking Address field:', addressField);

    if (addressField && addressField.trim()) {
      // Check if it's a valid street address (should contain letters, not just numbers like "4309")
      const hasLetters = /[a-zA-Z]/.test(addressField);

      if (hasLetters && !addressField.includes(',')) {
        // Simple street address like "13100 Broxton Bay Dr"
        streetAddress = addressField;
        console.log('🏠 Using Address field directly as street:', streetAddress);
      } else if (!hasLetters) {
        // Just a number like "4309" - skip it and try other fields
        console.log('⚠️ Address field is just a number, skipping:', addressField);
      } else {
        // Full formatted address - try to parse it
        // Try Shipping Address field instead
        const shippingAddress = getJsonbValue(orderJsonb, 'Shipping Address') ||
          getJsonbValue(orderJsonb, 'Customer Shipping Address');
        console.log('🔍 Parsing from Shipping Address field:', shippingAddress);

        if (shippingAddress) {
          // Parse format: "Fnu Hosay, 13100 Broxton Bay Dr, Jacksonville, FL 32218, Phone: 9049998283"
          const addressWithoutPhone = shippingAddress.replace(/,?\s*Phone:\s*\d+/i, '').trim();
          console.log('📍 Address without phone:', addressWithoutPhone);

          const parts = addressWithoutPhone.split(',').map(p => p.trim());
          console.log('📍 Split parts:', parts);

          if (parts.length >= 3) {
            // parts[0] = customer name (skip it)
            // parts[1] = street address
            // parts[2] = city, state zip
            streetAddress = parts[1] || '';
            console.log('🏠 Extracted street address:', streetAddress);

            // Parse city, state, zip if not already available
            if (!city || !state || !zip) {
              const cityStateZipPart = parts[2] || '';
              const cityStateZipMatch = cityStateZipPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{4,5})$/);
              if (cityStateZipMatch) {
                city = city || cityStateZipMatch[1];
                state = state || cityStateZipMatch[2];
                zip = zip || cityStateZipMatch[3];
                console.log('📍 Parsed city/state/zip:', { city, state, zip });
              }
            }
          } else {
            console.warn('⚠️ Shipping Address parts length is less than 3:', parts.length);
          }
        }
      }
    } else {
      console.warn('⚠️ No Address field found in orderJsonb');
      console.log('📦 Available keys:', Object.keys(orderJsonb));
    }
  }

  const fullStreet = streetAddress2
    ? `${streetAddress}\n${streetAddress2}`
    : streetAddress;

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

  const skuList =
    subSKUs.length > 0
      ? subSKUs.map(s => `- ${s}`).join('\n')
      : '- (No sub-SKUs provided)';

  return `Team,

Please palletize this order and provide shipping info and images for our records. PLease provide sales order acknowledgement for review?
Shipping docs (BOL/Label) attached.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm?
Thank You.
Best Regards.
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

  let streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
  let streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
  let city = getJsonbValue(orderJsonb, 'City');
  let state = getJsonbValue(orderJsonb, 'State');
  let zip = getJsonbValue(orderJsonb, 'Zip');
  const phone = '6262099751';

  // If street address is empty, try to get from Walmart's Address field
  if (!streetAddress) {
    const addressField = getJsonbValue(orderJsonb, 'Address');
    console.log('🔍 [Parcel] Checking Address field:', addressField);

    if (addressField && addressField.trim()) {
      // Check if it's a valid street address (should contain letters, not just numbers like "4309")
      const hasLetters = /[a-zA-Z]/.test(addressField);

      if (hasLetters && !addressField.includes(',')) {
        // Simple street address like "13100 Broxton Bay Dr"
        streetAddress = addressField;
        console.log('🏠 [Parcel] Using Address field directly as street:', streetAddress);
      } else if (!hasLetters) {
        // Just a number like "4309" - skip it and try other fields
        console.log('⚠️ [Parcel] Address field is just a number, skipping:', addressField);
      } else {
        // Full formatted address - try to parse it
        // Try Shipping Address field instead
        const shippingAddress = getJsonbValue(orderJsonb, 'Shipping Address') ||
          getJsonbValue(orderJsonb, 'Customer Shipping Address');
        console.log('🔍 [Parcel] Parsing from Shipping Address field:', shippingAddress);

        if (shippingAddress) {
          // Parse format: "Fnu Hosay, 13100 Broxton Bay Dr, Jacksonville, FL 32218, Phone: 9049998283"
          const addressWithoutPhone = shippingAddress.replace(/,?\s*Phone:\s*\d+/i, '').trim();
          console.log('📍 [Parcel] Address without phone:', addressWithoutPhone);

          const parts = addressWithoutPhone.split(',').map(p => p.trim());
          console.log('📍 [Parcel] Split parts:', parts);

          if (parts.length >= 3) {
            // parts[0] = customer name (skip it)
            // parts[1] = street address
            // parts[2] = city, state zip
            streetAddress = parts[1] || '';
            console.log('🏠 [Parcel] Extracted street address:', streetAddress);

            // Parse city, state, zip if not already available
            if (!city || !state || !zip) {
              const cityStateZipPart = parts[2] || '';
              const cityStateZipMatch = cityStateZipPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{4,5})$/);
              if (cityStateZipMatch) {
                city = city || cityStateZipMatch[1];
                state = state || cityStateZipMatch[2];
                zip = zip || cityStateZipMatch[3];
                console.log('📍 [Parcel] Parsed city/state/zip:', { city, state, zip });
              }
            }
          } else {
            console.warn('⚠️ [Parcel] Shipping Address parts length is less than 3:', parts.length);
          }
        }
      }
    } else {
      console.warn('⚠️ [Parcel] No Address field found in orderJsonb');
      console.log('📦 [Parcel] Available keys:', Object.keys(orderJsonb));
    }
  }

  const fullStreet = streetAddress2
    ? `${streetAddress}\n${streetAddress2}`
    : streetAddress;

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

  const skuList =
    subSKUs.length > 0
      ? subSKUs.map(s => `- ${s}`).join('\n')
      : '- (No sub-SKUs provided)';

  return `Team,

Please ship this order and provide sales order acknowledgement for review?
Shipping docs (BOL/Label) attached.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm?
Thank You.
Best Regards.
`;
};

/**
 * Processed Parcel Email Subject
 */
export const getProcessedParcelEmailSubject = (
  customerName: string,
  orderNumber: string
): string => {
  return `Hawasly Furniture order - ${customerName} ${orderNumber}`;
};

/**
 * Processed Parcel Email Body
 */
export const getProcessedParcelEmailBody = (
  orderJsonb: Record<string, unknown>,
  subSKUs: string[] = []
): string => {
  const customerName = getJsonbValue(orderJsonb, 'Customer Name');
  const orderNumber =
    getJsonbValue(orderJsonb, 'Order Number') ||
    getJsonbValue(orderJsonb, 'PO#') ||
    getJsonbValue(orderJsonb, 'PO Number');

  let streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
  let streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
  let city = getJsonbValue(orderJsonb, 'City');
  let state = getJsonbValue(orderJsonb, 'State');
  let zip = getJsonbValue(orderJsonb, 'Zip');
  const phone = '6262099751';

  // If street address is empty, try to get from Walmart's Address field
  if (!streetAddress) {
    const addressField = getJsonbValue(orderJsonb, 'Address');
    if (addressField && addressField.trim()) {
      const hasLetters = /[a-zA-Z]/.test(addressField);
      if (hasLetters && !addressField.includes(',')) {
        streetAddress = addressField;
      } else if (hasLetters) {
        const shippingAddress = getJsonbValue(orderJsonb, 'Shipping Address') ||
          getJsonbValue(orderJsonb, 'Customer Shipping Address');
        if (shippingAddress) {
          const addressWithoutPhone = shippingAddress.replace(/,?\s*Phone:\s*\d+/i, '').trim();
          const parts = addressWithoutPhone.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            streetAddress = parts[1] || '';
            if (!city || !state || !zip) {
              const cityStateZipPart = parts[2] || '';
              const cityStateZipMatch = cityStateZipPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{4,5})$/);
              if (cityStateZipMatch) {
                city = city || cityStateZipMatch[1];
                state = state || cityStateZipMatch[2];
                zip = zip || cityStateZipMatch[3];
              }
            }
          }
        }
      }
    }
  }

  const fullStreet = streetAddress2
    ? `${streetAddress}\n${streetAddress2}`
    : streetAddress;

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

  const skuList =
    subSKUs.length > 0
      ? subSKUs.map(s => `- ${s}`).join('\n')
      : '- (No sub-SKUs provided)';

  return `Team,

Please ship this processed order and provide sales order acknowledgement for review?
Shipping docs (BOL/Label) attached.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm?
Thank You.
Best Regards.
`;
};

/**
 * Processed Estes Email Subject
 */
export const getProcessedEstesEmailSubject = (
  customerName: string,
  orderNumber: string
): string => {
  return `Hawasly Furniture order - ${customerName} ${orderNumber} - Estes`;
};

/**
 * Processed Estes Email Body
 */
export const getProcessedEstesEmailBody = (
  orderJsonb: Record<string, unknown>,
  subSKUs: string[] = []
): string => {
  const customerName = getJsonbValue(orderJsonb, 'Customer Name');
  const orderNumber =
    getJsonbValue(orderJsonb, 'Order Number') ||
    getJsonbValue(orderJsonb, 'PO#') ||
    getJsonbValue(orderJsonb, 'PO Number');

  let streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
  let streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
  let city = getJsonbValue(orderJsonb, 'City');
  let state = getJsonbValue(orderJsonb, 'State');
  let zip = getJsonbValue(orderJsonb, 'Zip');
  const phone = '6262099751';

  // If street address is empty, try to get from Walmart's Address field
  if (!streetAddress) {
    const addressField = getJsonbValue(orderJsonb, 'Address');
    if (addressField && addressField.trim()) {
      const hasLetters = /[a-zA-Z]/.test(addressField);
      if (hasLetters && !addressField.includes(',')) {
        streetAddress = addressField;
      } else if (hasLetters) {
        const shippingAddress = getJsonbValue(orderJsonb, 'Shipping Address') ||
          getJsonbValue(orderJsonb, 'Customer Shipping Address');
        if (shippingAddress) {
          const addressWithoutPhone = shippingAddress.replace(/,?\s*Phone:\s*\d+/i, '').trim();
          const parts = addressWithoutPhone.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            streetAddress = parts[1] || '';
            if (!city || !state || !zip) {
              const cityStateZipPart = parts[2] || '';
              const cityStateZipMatch = cityStateZipPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{4,5})$/);
              if (cityStateZipMatch) {
                city = city || cityStateZipMatch[1];
                state = state || cityStateZipMatch[2];
                zip = zip || cityStateZipMatch[3];
              }
            }
          }
        }
      }
    }
  }

  const fullStreet = streetAddress2
    ? `${streetAddress}\n${streetAddress2}`
    : streetAddress;

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

  const skuList =
    subSKUs.length > 0
      ? subSKUs.map(s => `- ${s}`).join('\n')
      : '- (No sub-SKUs provided)';

  return `Team,

Please palletize this processed Estes order and provide shipping info and images for our records. Please provide sales order acknowledgement for review?
Shipping docs (BOL/Label) attached.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm?
Thank You.
Best Regards.
`;
};

/**
 * Processed XPO Email Subject
 */
export const getProcessedXPOEmailSubject = (
  customerName: string,
  orderNumber: string
): string => {
  return `Hawasly Furniture order - ${customerName} ${orderNumber} - XPO`;
};

/**
 * Processed XPO Email Body
 */
export const getProcessedXPOEmailBody = (
  orderJsonb: Record<string, unknown>,
  subSKUs: string[] = []
): string => {
  const customerName = getJsonbValue(orderJsonb, 'Customer Name');
  const orderNumber =
    getJsonbValue(orderJsonb, 'Order Number') ||
    getJsonbValue(orderJsonb, 'PO#') ||
    getJsonbValue(orderJsonb, 'PO Number');

  let streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1');
  let streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
  let city = getJsonbValue(orderJsonb, 'City');
  let state = getJsonbValue(orderJsonb, 'State');
  let zip = getJsonbValue(orderJsonb, 'Zip');
  const phone = '6262099751';

  // If street address is empty, try to get from Walmart's Address field
  if (!streetAddress) {
    const addressField = getJsonbValue(orderJsonb, 'Address');
    if (addressField && addressField.trim()) {
      const hasLetters = /[a-zA-Z]/.test(addressField);
      if (hasLetters && !addressField.includes(',')) {
        streetAddress = addressField;
      } else if (hasLetters) {
        const shippingAddress = getJsonbValue(orderJsonb, 'Shipping Address') ||
          getJsonbValue(orderJsonb, 'Customer Shipping Address');
        if (shippingAddress) {
          const addressWithoutPhone = shippingAddress.replace(/,?\s*Phone:\s*\d+/i, '').trim();
          const parts = addressWithoutPhone.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            streetAddress = parts[1] || '';
            if (!city || !state || !zip) {
              const cityStateZipPart = parts[2] || '';
              const cityStateZipMatch = cityStateZipPart.match(/^(.+?)\s+([A-Z]{2})\s+(\d{4,5})$/);
              if (cityStateZipMatch) {
                city = city || cityStateZipMatch[1];
                state = state || cityStateZipMatch[2];
                zip = zip || cityStateZipMatch[3];
              }
            }
          }
        }
      }
    }
  }

  const fullStreet = streetAddress2
    ? `${streetAddress}\n${streetAddress2}`
    : streetAddress;

  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');

  const skuList =
    subSKUs.length > 0
      ? subSKUs.map(s => `- ${s}`).join('\n')
      : '- (No sub-SKUs provided)';

  return `Team,

Please palletize this processed XPO order and provide shipping info and images for our records. Please provide sales order acknowledgement for review?
Shipping docs (BOL/Label) attached.

Order details:
${skuList}

Shipping address:
${customerName}
${fullStreet}
${cityStateZip}
${phone}

Please confirm?
Thank You.
Best Regards.
`;
};

/**
 * Processed Multiple Orders Email Subject
 */
export const getProcessedMultipleEmailSubject = (orderCount: number): string => {
  return `Hawasly Furniture orders - ${orderCount} processed order${orderCount > 1 ? 's' : ''}`;
};

/**
 * Processed Multiple Orders Email Body
 */
export const getProcessedMultipleEmailBody = (
  orders: Array<{ orderId: number; orderNumber: string; customerName: string; subSKUs: string[] }>
): string => {
  const orderList = orders.map((order, index) => {
    const skuList = order.subSKUs.length > 0
      ? order.subSKUs.map(s => `  - ${s}`).join('\n')
      : '  - (No sub-SKUs provided)';
    
    return `Order ${index + 1}:
  Order ID: ${order.orderId}
  Order Number: ${order.orderNumber}
  Customer: ${order.customerName}
  Sub-SKUs:
${skuList}`;
  }).join('\n\n');

  return `Team,

Please process the following ${orders.length} order${orders.length > 1 ? 's' : ''} and provide sales order acknowledgement for review?
Shipping docs (BOL/Label) attached for all orders.

${orderList}

Please confirm?
Thank You.
Best Regards.
`;
};
