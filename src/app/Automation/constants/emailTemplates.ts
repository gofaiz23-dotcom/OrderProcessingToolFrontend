/**
 * Email templates for automation workflows
 */

type Carrier = 'estes' | 'xpo';

/**
 * Helper function to extract value from JSONB (similar to the one used in components)
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
  
  const allKeys = Object.keys(jsonb);
  for (const objKey of allKeys) {
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
 * Get email body template for Estes pickup scheduled notification
 * @param orderId - The order ID
 * @param orderNumber - Optional order number from order data
 * @param sku - Optional SKU from order data
 * @returns Formatted email body
 */
export const getEstesPickupScheduledEmailBody = (
  orderId: number,
  orderNumber?: string,
  sku?: string
): string => {
  const orderRef = orderNumber || `Order ${orderId}`;
  const skuInfo = sku ? `\nSKU: ${sku}` : '';
  
  return `Dear Team,

Pickup has been successfully scheduled with Estes Express for ${orderRef}.${skuInfo}

Please find the Estes Bill of Lading attached.

Pickup Details:
- Carrier: Estes Express
- Please ensure all items are ready for pickup as scheduled

If you have any questions or need to modify the pickup, please contact Estes Express directly.

Best regards`;
};

/**
 * Get email subject template for Estes pickup scheduled notification
 * @param orderId - The order ID
 * @param orderNumber - Optional order number from order data
 * @returns Formatted email subject
 */
export const getEstesPickupScheduledEmailSubject = (
  orderId: number,
  orderNumber?: string
): string => {
  const orderRef = orderNumber || `Order ${orderId}`;
  return `Estes Express - Pickup Scheduled - ${orderRef}`;
};

/**
 * Get email body template for XPO pickup scheduled notification
 * @param orderId - The order ID
 * @param orderNumber - Optional order number from order data
 * @param sku - Optional SKU from order data
 * @returns Formatted email body
 */
export const getXPOPickupScheduledEmailBody = (
  orderId: number,
  orderNumber?: string,
  sku?: string
): string => {
  const orderRef = orderNumber || `Order ${orderId}`;
  const skuInfo = sku ? `\nSKU: ${sku}` : '';
  
  return `Dear Team,

Pickup has been successfully scheduled with XPO Logistics for ${orderRef}.${skuInfo}

Please find the XPO Bill of Lading attached.

Pickup Details:
- Carrier: XPO Logistics
- Please ensure all items are ready for pickup as scheduled

If you have any questions or need to modify the pickup, please contact XPO Logistics directly.

Best regards`;
};

/**
 * Get email subject template for XPO pickup scheduled notification
 * @param orderId - The order ID
 * @param orderNumber - Optional order number from order data
 * @returns Formatted email subject
 */
export const getXPOPickupScheduledEmailSubject = (
  orderId: number,
  orderNumber?: string
): string => {
  const orderRef = orderNumber || `Order ${orderId}`;
  return `XPO Logistics - Pickup Scheduled - ${orderRef}`;
};

/**
 * Get email body template for pickup scheduled notification (generic)
 * @param carrier - The carrier type ('estes' or 'xpo')
 * @param orderId - The order ID
 * @param orderNumber - Optional order number from order data
 * @param sku - Optional SKU from order data
 * @returns Formatted email body
 */
export const getPickupScheduledEmailBody = (
  carrier: Carrier,
  orderId: number,
  orderNumber?: string,
  sku?: string
): string => {
  if (carrier === 'estes') {
    return getEstesPickupScheduledEmailBody(orderId, orderNumber, sku);
  } else {
    return getXPOPickupScheduledEmailBody(orderId, orderNumber, sku);
  }
};

/**
 * Get email subject template for pickup scheduled notification (generic)
 * @param carrier - The carrier type ('estes' or 'xpo')
 * @param orderId - The order ID
 * @param orderNumber - Optional order number from order data
 * @returns Formatted email subject
 */
export const getPickupScheduledEmailSubject = (
  carrier: Carrier,
  orderId: number,
  orderNumber?: string
): string => {
  if (carrier === 'estes') {
    return getEstesPickupScheduledEmailSubject(orderId, orderNumber);
  } else {
    return getXPOPickupScheduledEmailSubject(orderId, orderNumber);
  }
};

/**
 * Default CC email addresses for each carrier
 */
export const DEFAULT_CC_EMAILS = {
  ESTES: [
    'gofaiz23@gmail.com',
    // Add more Estes CC emails here if needed
  ],
  XPO: [
    'gofaiz23@gmail.com',
    // Add more XPO CC emails here if needed
  ],
} as const;

/**
 * Get default CC emails for a carrier
 * @param carrier - The carrier type ('estes' or 'xpo')
 * @returns Array of CC email addresses
 */
export const getDefaultCCEmails = (carrier: Carrier): string[] => {
  if (carrier === 'estes') {
    return [...DEFAULT_CC_EMAILS.ESTES];
  } else {
    return [...DEFAULT_CC_EMAILS.XPO];
  }
};

/**
 * Email templates organized by carrier
 */
export const EMAIL_TEMPLATES = {
  ESTES: {
    PICKUP_SCHEDULED: {
      subject: (orderId: number, orderNumber?: string) => 
        getEstesPickupScheduledEmailSubject(orderId, orderNumber),
      body: (orderId: number, orderNumber?: string, sku?: string) => 
        getEstesPickupScheduledEmailBody(orderId, orderNumber, sku),
      cc: () => getDefaultCCEmails('estes'),
    },
  },
  XPO: {
    PICKUP_SCHEDULED: {
      subject: (orderId: number, orderNumber?: string) => 
        getXPOPickupScheduledEmailSubject(orderId, orderNumber),
      body: (orderId: number, orderNumber?: string, sku?: string) => 
        getXPOPickupScheduledEmailBody(orderId, orderNumber, sku),
      cc: () => getDefaultCCEmails('xpo'),
    },
  },
  // Generic template that auto-detects carrier
  PICKUP_SCHEDULED: {
    subject: (carrier: Carrier, orderId: number, orderNumber?: string) => 
      getPickupScheduledEmailSubject(carrier, orderId, orderNumber),
    body: (carrier: Carrier, orderId: number, orderNumber?: string, sku?: string) => 
      getPickupScheduledEmailBody(carrier, orderId, orderNumber, sku),
    cc: (carrier: Carrier) => getDefaultCCEmails(carrier),
  },
  // LTL Order Draft Email Template
  LTL_ORDER_DRAFT: {
    subject: (customerName: string, orderNumber: string) => 
      getLTLOrderDraftEmailSubject(customerName, orderNumber),
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) => 
      getLTLOrderDraftEmailBody(orderJsonb, subSKUs),
    cc: () => [],
  },
  // Parcel Order Draft Email Template
  PARCEL_ORDER_DRAFT: {
    subject: (customerName: string, orderNumber: string) => 
      getParcelOrderDraftEmailSubject(customerName, orderNumber),
    body: (orderJsonb: Record<string, unknown>, subSKUs: string[] = []) => 
      getParcelOrderDraftEmailBody(orderJsonb, subSKUs),
    cc: () => [],
  },
} as const;

/**
 * Get email subject template for LTL order draft
 * @param customerName - Customer name from order
 * @param orderNumber - Order number from order
 * @returns Formatted email subject
 */
export const getLTLOrderDraftEmailSubject = (
  customerName: string,
  orderNumber: string
): string => {
  return `Hawasly Furniture order - ${customerName} ${orderNumber}`;
};

/**
 * Get email body template for LTL order draft
 * @param orderJsonb - Order JSONB data from order table
 * @param subSKUs - Array of sub-SKUs to include in order details
 * @returns Formatted email body
 */
export const getLTLOrderDraftEmailBody = (
  orderJsonb: Record<string, unknown>,
  subSKUs: string[] = []
): string => {
  // Extract order details
  const customerName = getJsonbValue(orderJsonb, 'Customer Name') || '';
  const orderNumber = getJsonbValue(orderJsonb, 'Order Number') || 
                     getJsonbValue(orderJsonb, 'PO#') || 
                     getJsonbValue(orderJsonb, 'PO Number') || '';
  
  // Extract shipping address - try multiple field name variations (same as XPOBOLForm)
  const streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1') ||
                       getJsonbValue(orderJsonb, 'Shipping Address') ||
                       getJsonbValue(orderJsonb, 'Customer Address') ||
                       getJsonbValue(orderJsonb, 'Customer Address 1') ||
                       getJsonbValue(orderJsonb, 'Address') ||
                       getJsonbValue(orderJsonb, 'Address 1') ||
                       getJsonbValue(orderJsonb, 'Ship to Address') || '';
  
  const streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2') ||
                        getJsonbValue(orderJsonb, 'Customer Address 2') ||
                        getJsonbValue(orderJsonb, 'Address 2') || '';
  
  const city = getJsonbValue(orderJsonb, 'Ship to City') ||
              getJsonbValue(orderJsonb, 'Shipping City') ||
              getJsonbValue(orderJsonb, 'Customer City') || '';
  
  const state = getJsonbValue(orderJsonb, 'Ship to State') ||
               getJsonbValue(orderJsonb, 'Shipping State') ||
               getJsonbValue(orderJsonb, 'Ship to State/Province') ||
               getJsonbValue(orderJsonb, 'Customer State') || '';
  
  const zip = getJsonbValue(orderJsonb, 'Ship to Zip Code') ||
             getJsonbValue(orderJsonb, 'Shipping Zip Code') ||
             getJsonbValue(orderJsonb, 'Ship to Postal Code') ||
             getJsonbValue(orderJsonb, 'Customer Zip Code') ||
             getJsonbValue(orderJsonb, 'Customer Postal Code') || '';
  
  // Phone number should always be the same
  const phone = '6262099751';
  
  // Format full address with Address Line 2 if present
  const fullStreetAddress = streetAddress2 
    ? `${streetAddress}\n${streetAddress2}`.trim()
    : streetAddress;
  
  // Format city, state, zip
  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');
  
  // Format subSKUs list - use subSKUs if available, otherwise show message
  const skuList = subSKUs.length > 0 
    ? subSKUs.map(sku => `- ${sku}`).join('\n')
    : '- (No sub-SKUs provided)';
  
  return `Team,

Please palletize this order and provide shipping info and images for our records. Please provide sales order acknowledgement for review?

Shipping docs (BOL/Label) attached.

Order details:
${skuList}

shipping address:

${customerName}

${fullStreetAddress}

${cityStateZip}

${phone}

Please confirm?

Thank You.

Best Regards.`;
};

/**
 * Get email subject template for Parcel order draft
 * @param customerName - Customer name from order
 * @param orderNumber - Order number from order
 * @returns Formatted email subject
 */
export const getParcelOrderDraftEmailSubject = (
  customerName: string,
  orderNumber: string
): string => {
  return `[Hawasly Furniture order] - ${customerName} and ${orderNumber} (Draft for Parcel order)`;
};

/**
 * Get email body template for Parcel order draft
 * @param orderJsonb - Order JSONB data from order table
 * @param subSKUs - Array of sub-SKUs to include in order details
 * @returns Formatted email body
 */
export const getParcelOrderDraftEmailBody = (
  orderJsonb: Record<string, unknown>,
  subSKUs: string[] = []
): string => {
  // Extract order details
  const customerName = getJsonbValue(orderJsonb, 'Customer Name') || '';
  const orderNumber = getJsonbValue(orderJsonb, 'Order Number') || 
                     getJsonbValue(orderJsonb, 'PO#') || 
                     getJsonbValue(orderJsonb, 'PO Number') || '';
  
  // Extract shipping address - try multiple field name variations (same as XPOBOLForm)
  const streetAddress = getJsonbValue(orderJsonb, 'Ship to Address 1') ||
                       getJsonbValue(orderJsonb, 'Shipping Address') ||
                       getJsonbValue(orderJsonb, 'Customer Address') ||
                       getJsonbValue(orderJsonb, 'Customer Address 1') ||
                       getJsonbValue(orderJsonb, 'Address') ||
                       getJsonbValue(orderJsonb, 'Address 1') ||
                       getJsonbValue(orderJsonb, 'Ship to Address') || '';
  
  const streetAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2') ||
                        getJsonbValue(orderJsonb, 'Customer Address 2') ||
                        getJsonbValue(orderJsonb, 'Address 2') || '';
  
  const city = getJsonbValue(orderJsonb, 'Ship to City') ||
              getJsonbValue(orderJsonb, 'Shipping City') ||
              getJsonbValue(orderJsonb, 'Customer City') || '';
  
  const state = getJsonbValue(orderJsonb, 'Ship to State') ||
               getJsonbValue(orderJsonb, 'Shipping State') ||
               getJsonbValue(orderJsonb, 'Ship to State/Province') ||
               getJsonbValue(orderJsonb, 'Customer State') || '';
  
  const zip = getJsonbValue(orderJsonb, 'Ship to Zip Code') ||
             getJsonbValue(orderJsonb, 'Shipping Zip Code') ||
             getJsonbValue(orderJsonb, 'Ship to Postal Code') ||
             getJsonbValue(orderJsonb, 'Customer Zip Code') ||
             getJsonbValue(orderJsonb, 'Customer Postal Code') || '';
  
  // Phone number should always be the same
  const phone = '6262099751';
  
  // Format full address with Address Line 2 if present
  const fullStreetAddress = streetAddress2 
    ? `${streetAddress}\n${streetAddress2}`.trim()
    : streetAddress;
  
  // Format city, state, zip
  const cityStateZip = [city, state, zip].filter(Boolean).join(', ');
  
  // Format subSKUs list - use subSKUs if available, otherwise show message
  const skuList = subSKUs.length > 0 
    ? subSKUs.map(sku => `- ${sku}`).join('\n')
    : '- (No sub-SKUs provided)';
  
  return `Team,

Please ship this order and provide shipping info and images for our records. Please provide sales order acknowledgement for review?

Shipping docs (BOL/Label) attached.

Order details:
${skuList}

shipping address:

${customerName}

${fullStreetAddress}

${cityStateZip}

${phone}

Please confirm?

Thank You.

Best Regards.`;
};

