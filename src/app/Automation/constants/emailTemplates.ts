/**
 * Email templates for automation workflows
 */

type Carrier = 'estes' | 'xpo';

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
    // Add default Estes CC emails here
    // Example: 'team@example.com',
  ],
  XPO: [
    // Add default XPO CC emails here
    // Example: 'logistics@example.com',
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
} as const;

