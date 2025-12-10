/**
 * XPO-specific request body builder
 * Converts form data to XPO API format
 */

import type { XPORateQuoteCommodity } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import type { XPOBillOfLadingFields, XPOBillOfLadingCommodity } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import type { XPOPickupRequestFields } from '@/app/api/ShippingUtil/xpo/PickupRequestField';

// Mapping for accessorial codes to their descriptions and types
// Maps frontend service codes to backend accessorial codes
const ACCESSORIAL_MAPPING: Record<string, { code: string; desc: string; type: 'Origin' | 'Destination' }> = {
  // Delivery Services - map frontend codes to backend codes
  'LIFT': { code: 'DLG', desc: 'DLG DEST LIFTGATE SERVICE', type: 'Destination' },
  'DLG': { code: 'DLG', desc: 'DLG DEST LIFTGATE SERVICE', type: 'Destination' },
  'RESI': { code: 'RSD', desc: 'RSD DEST RESIDENTIAL DELIVERY', type: 'Destination' },
  'RSD': { code: 'RSD', desc: 'RSD DEST RESIDENTIAL DELIVERY', type: 'Destination' },
  'NOTIFY': { code: 'DNC', desc: 'DNC DEST NOTIFICATION', type: 'Destination' },
  'DNC': { code: 'DNC', desc: 'DNC DEST NOTIFICATION', type: 'Destination' },
  'AFTER_HOURS': { code: 'AFTER_HOURS', desc: 'After Business hours Delivery', type: 'Destination' },
  'APPT': { code: 'APPT', desc: 'Appointment', type: 'Destination' },
  'CONST': { code: 'CONST', desc: 'Construction/Utility', type: 'Destination' },
  'CONTAINER': { code: 'CONTAINER', desc: 'Container Station', type: 'Destination' },
  'DEST_LIMITED': { code: 'DEST_LIMITED', desc: 'Destination Limited Access', type: 'Destination' },
  'EXHIBIT': { code: 'EXHIBIT', desc: 'Exhibition/Trade Show', type: 'Destination' },
  'GROCERY': { code: 'GROCERY', desc: 'Grocery Consolidation Delivery', type: 'Destination' },
  'HOLIDAY': { code: 'HOLIDAY', desc: 'Holiday/Weekend', type: 'Destination' },
  'INBOND': { code: 'INBOND', desc: 'In Bond Freight', type: 'Destination' },
  'INBOND_TIR': { code: 'INBOND_TIR', desc: 'In Bond TIR Carnet', type: 'Destination' },
  'INSIDE': { code: 'INSIDE', desc: 'Inside Delivery', type: 'Destination' },
  'MINE': { code: 'MINE', desc: 'Mine/Govt/Airport', type: 'Destination' },
  'PIERS': { code: 'PIERS', desc: 'Piers/Wharves Loading', type: 'Destination' },
  'REMOVE': { code: 'REMOVE', desc: 'Removal of Pallet / Debris', type: 'Destination' },
  'SORT': { code: 'SORT', desc: 'Sorting/Segregation', type: 'Destination' },
  // Pickup Services
  'BLIND': { code: 'BLIND', desc: 'Blind Shipment', type: 'Origin' },
  'ORIGIN_LIMITED': { code: 'ORIGIN_LIMITED', desc: 'Origin Limited Access', type: 'Origin' },
  'SINGLE': { code: 'SINGLE', desc: 'Single Shipment', type: 'Origin' },
  // Premium Services
  'FREEZABLE': { code: 'FREEZABLE', desc: 'Freezable Protection', type: 'Destination' },
  'GUARANTEED': { code: 'GUARANTEED', desc: 'Guaranteed (G!)', type: 'Destination' },
  'GUARANTEED_NOON': { code: 'GUARANTEED_NOON', desc: 'Guaranteed by Noon (G!12)', type: 'Destination' },
  'MABD': { code: 'MABD', desc: 'MABD', type: 'Destination' },
};

type BuildXPORateQuoteParams = {
  paymentTermCd: string;
  shipmentDate: string;
  accessorials?: string[];
  shipperPostalCd?: string; // Optional when shipperAcctInstId is provided
  shipperAcctInstId?: string;
  consigneePostalCd: string;
  consigneeCountryCd?: string;
  commodity: XPORateQuoteCommodity[];
  commodityDescriptions?: Record<number, string>;
  palletCnt?: number;
  linealFt?: number;
  freezableInd?: boolean;
  hazmatInd?: boolean;
  bill2PartyUsZip4?: string;
};

export const buildXPORateQuoteRequestBody = (params: BuildXPORateQuoteParams) => {
  const {
    paymentTermCd,
    shipmentDate,
    shipperPostalCd,
    shipperAcctInstId,
    consigneePostalCd,
    consigneeCountryCd,
    commodity,
    commodityDescriptions,
    palletCnt,
    linealFt,
    freezableInd,
    hazmatInd,
    bill2PartyUsZip4,
    accessorials,
  } = params;

  type AccessorialType = {
    accessorialCd: string;
    accessorialDesc: string;
    accessorialType: 'Origin' | 'Destination';
  };

  type ShipmentInfoType = {
    paymentTermCd: string;
    shipmentDate?: string;
    accessorials?: AccessorialType[];
    freezableInd?: boolean;
    hazmatInd?: boolean;
    shipper?: {
      acctInstId?: string;
      address?: {
        postalCd: string;
      };
    };
    consignee?: {
      address: {
        postalCd: string;
        countryCd?: string;
      };
    };
    bill2Party?: {
      address: {
        usZip4?: string;
      };
    };
    commodity?: Array<{
      pieceCnt: number;
      packageCode: string;
      grossWeight: {
        weight: number;
        weightUom: string;
      };
      desc?: string;
      nmfcClass?: string;
      nmfcItemCd?: string;
      hazmatInd: boolean;
      dimensions?: {
        length: number;
        width: number;
        height: number;
        dimensionsUom: string;
      };
    }>;
    palletCnt?: number;
    linealFt?: number;
  };

  const shipmentInfo: ShipmentInfoType = {
      paymentTermCd: paymentTermCd || 'P',
  };
  
  // Convert accessorials from string array to array of objects
  if (accessorials && accessorials.length > 0) {
    shipmentInfo.accessorials = accessorials.map(code => {
      const mapping = ACCESSORIAL_MAPPING[code];
      if (mapping) {
        return {
          accessorialCd: mapping.code, // Use backend code (e.g., DLG instead of LIFT)
          accessorialDesc: mapping.desc,
          accessorialType: mapping.type,
        };
      }
      // Fallback for unknown codes
      return {
        accessorialCd: code,
        accessorialDesc: code,
        accessorialType: 'Destination' as const,
      };
    });
  }
  
  // Add freezableInd and hazmatInd at shipmentInfo level
  if (freezableInd !== undefined) {
    shipmentInfo.freezableInd = freezableInd;
  }
  if (hazmatInd !== undefined) {
    shipmentInfo.hazmatInd = hazmatInd;
  }
  
  // Only add shipmentDate if it exists and is valid
  // XPO API requires shipmentDate to be a valid ISO 8601 date string
  if (shipmentDate && shipmentDate.trim() !== '') {
    // Validate the date format
    const date = new Date(shipmentDate);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid shipment date format: ${shipmentDate}`);
    }
    
    // Validate date range: not more than 1 year in future, not more than 30 days in past
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(now.getFullYear() + 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    if (date > oneYearFromNow) {
      throw new Error(`Shipment date cannot be more than 1 year in the future. Selected date: ${shipmentDate}`);
    }
    if (date < thirtyDaysAgo) {
      throw new Error(`Shipment date cannot be more than 30 days in the past. Selected date: ${shipmentDate}`);
    }
    
    shipmentInfo.shipmentDate = shipmentDate;
  } else {
    // If no date provided, use current date
    shipmentInfo.shipmentDate = new Date().toISOString();
  }
  
  // Accessorials: Include delivery services, pickup services, and premium services
  // These services are included in the rate quote request payload
  
  // Shipper - use acctInstId if provided, otherwise use address
  shipmentInfo.shipper = {};
  if (shipperAcctInstId && shipperAcctInstId.trim() !== '') {
    // When acctInstId is provided, use ONLY acctInstId (no address)
    shipmentInfo.shipper.acctInstId = shipperAcctInstId.trim();
  } else {
    // When acctInstId is not provided, use address with postalCd
    if (!shipperPostalCd || shipperPostalCd.trim() === '') {
      throw new Error('Shipper postal code is required when account ID is not provided');
    }
    shipmentInfo.shipper.address = {
      postalCd: shipperPostalCd.trim(),
    };
  }
  
  // Consignee address - ensure postal code is valid (5 digits minimum)
  if (!consigneePostalCd || consigneePostalCd.trim() === '') {
    throw new Error('Consignee postal code is required');
  }
  shipmentInfo.consignee = {
    address: {
      postalCd: consigneePostalCd.trim(),
      countryCd: (consigneeCountryCd && consigneeCountryCd.trim() !== '') ? consigneeCountryCd.trim() : 'US',
    },
  };
  
  // Bill2Party - always include (even with empty string, as per correct payload structure)
  shipmentInfo.bill2Party = {
    address: {
      usZip4: bill2PartyUsZip4 !== undefined ? bill2PartyUsZip4.trim() : '',
    },
  };
  
  // Commodity array - type for the transformed commodity item
  type TransformedCommodityItem = {
    pieceCnt: number;
    packageCode: string;
    grossWeight: {
      weight: number;
      weightUom: string;
    };
    desc?: string;
    nmfcClass?: string;
    nmfcItemCd?: string;
    hazmatInd: boolean;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      dimensionsUom: string;
    };
  };

  let calculatedPalletCnt = 0;
  if (commodity && commodity.length > 0) {
    shipmentInfo.commodity = commodity.map((item, index) => {
        const commodityItem: TransformedCommodityItem = {
          pieceCnt: item.pieceCnt || 0,
          packageCode: item.packageCode || 'BOX',
          grossWeight: {
            weight: item.grossWeight?.weight || 0,
            weightUom: (item.grossWeight?.weightUom || 'lbs').toLowerCase(),
          },
          hazmatInd: item.hazmatInd || false,
        };
        
        // Add description if available
        // Priority: 1) commodityDescriptions[index], 2) item.desc
        if (commodityDescriptions && commodityDescriptions[index] && commodityDescriptions[index].trim() !== '') {
          commodityItem.desc = commodityDescriptions[index].trim();
        } else {
          // Check if item has desc property (may not be in type definition)
          const itemWithDesc = item as any;
          if (itemWithDesc.desc && itemWithDesc.desc.trim() !== '') {
            commodityItem.desc = itemWithDesc.desc.trim();
          }
        }
        
        // Calculate pallet count: if packageCode is "PLT" (case-insensitive), add pieceCnt to pallet count
        if (item.packageCode && item.packageCode.toUpperCase() === 'PLT') {
          calculatedPalletCnt += item.pieceCnt || 0;
        }
        
        // Only include nmfcClass if it has a value
        if (item.nmfcClass && item.nmfcClass.trim() !== '') {
          commodityItem.nmfcClass = item.nmfcClass;
        }
        
        // Add nmfcItemCd if available (checking if it exists in the item, though it's not in the type)
        const itemWithNmfcItemCd = item as any;
        if (itemWithNmfcItemCd.nmfcItemCd && itemWithNmfcItemCd.nmfcItemCd.trim() !== '') {
          commodityItem.nmfcItemCd = itemWithNmfcItemCd.nmfcItemCd.trim();
        }
        
        // Include dimensions if they exist (even if 0, as per correct payload structure)
        if (item.dimensions) {
          commodityItem.dimensions = {
            length: item.dimensions.length || 0,
            width: item.dimensions.width || 0,
            height: item.dimensions.height || 0,
            dimensionsUom: item.dimensions.dimensionsUom || 'INCH',
          };
        }
        
        return commodityItem;
    });
  }
  
  // palletCnt: Use calculated value from commodities if packageCode is "PLT", 
  // otherwise use provided value
  // Always include palletCnt (even if 0, as per correct payload structure)
  const finalPalletCnt = calculatedPalletCnt > 0 ? calculatedPalletCnt : (palletCnt || 0);
  shipmentInfo.palletCnt = finalPalletCnt;
  
  // linealFt: Always include (even if 0, as per correct payload structure)
  shipmentInfo.linealFt = linealFt || 0;
  
  // Return the shipmentInfo with only included fields
  return {
    shipmentInfo,
  };
};

// Helper function to normalize country code to 2-letter ISO format
const normalizeCountryCode = (country: string): string => {
  if (!country) return 'US';
  
  const normalized = country.trim().toUpperCase();
  
  // Handle common variations
  if (normalized === 'UNITED STATES' || normalized === 'USA' || normalized === 'US') {
    return 'US';
  }
  if (normalized === 'CANADA' || normalized === 'CA') {
    return 'CA';
  }
  if (normalized === 'MEXICO' || normalized === 'MX') {
    return 'MX';
  }
  
  // If already a 2-letter code, return as-is
  if (normalized.length === 2) {
    return normalized;
  }
  
  // Default to US if unknown
  return 'US';
};

// Helper function to remove null and undefined values from object
// XPO API rejects requests with null values for required fields
// This matches the backend logic in BillOfLadingService.js
const removeNullValues = <T>(obj: T): T | undefined => {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  if (Array.isArray(obj)) {
    const cleaned = obj.map(removeNullValues).filter((item): item is NonNullable<typeof item> => item !== undefined && item !== null);
    return cleaned.length > 0 ? (cleaned as T) : undefined;
  }
  
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const key in obj) {
      // Special handling for email objects - if emailAddr is null, remove the entire email object
      // This matches backend logic in BillOfLadingService.js
      if (key === 'email' && typeof obj[key] === 'object' && obj[key] !== null) {
        const emailObj = obj[key] as { emailAddr?: string | null };
        if (emailObj.emailAddr === null || emailObj.emailAddr === undefined) {
          // Skip this email object entirely if emailAddr is null/undefined
          continue;
        }
      }
      
      const value = removeNullValues(obj[key]);
      // Only include the key if the value is not undefined/null
      if (value !== undefined && value !== null) {
        // Special handling for objects that become empty after cleaning (but allow arrays)
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
          continue;
        }
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? (cleaned as T) : undefined;
  }
  
  return obj;
};

// Helper function to clean empty strings (convert to undefined for optional fields)
const cleanEmptyStrings = <T>(obj: T): T | undefined => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return (obj.trim() === '' ? undefined : obj.trim()) as T;
  }
  
  if (Array.isArray(obj)) {
    const filtered = obj.map(cleanEmptyStrings).filter((item): item is NonNullable<typeof item> => item !== undefined);
    return filtered as T;
  }
  
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const key in obj) {
      const value = cleanEmptyStrings(obj[key]);
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned as T;
  }
  
  return obj;
};

// Helper function to normalize address country codes and clean empty strings
const normalizeAddress = (address: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined => {
  if (!address) return address;
  
  const cleaned = cleanEmptyStrings(address);
  if (!cleaned) return cleaned;
  
  return {
    ...cleaned,
    countryCd: normalizeCountryCode((cleaned.countryCd as string) || 'US'),
  };
};

// Helper function to normalize phone number to XPO format: NNN-NNNNNNN (3 digits, hyphen, 7 digits)
// Handles formats like "+1 (646) 504-0655" -> "646-5040655"
const normalizePhoneNumber = (phone: string | null | undefined): string => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  let normalized = phone.trim();
  
  // Remove spaces, parentheses, and other non-digit characters except hyphens
  normalized = normalized.replace(/[\s\(\)]/g, '');
  
  // Handle +1 prefix (e.g., "+1 (646) 504-0655" -> "6465040655")
  if (normalized.startsWith('+1')) {
    normalized = normalized.replace(/^\+1[\s\-]*/, '');
  } else if (normalized.startsWith('1-') && normalized.replace(/[^\d]/g, '').length >= 11) {
    normalized = normalized.replace(/^1-/, '');
  } else if (normalized.match(/^1\d{10}$/)) {
    // Handle format like "16465040655" (11 digits starting with 1)
    normalized = normalized.substring(1);
  }
  
  // Remove all non-digit characters to get just digits
  const digitsOnly = normalized.replace(/[^\d]/g, '');
  
  // Format as NNN-NNNNNNN if we have 10 digits
  if (digitsOnly.length === 10) {
    return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3)}`;
  } else if (digitsOnly.length > 0) {
    // If not exactly 10 digits, try to format anyway if we have at least 10 digits
    if (digitsOnly.length >= 10) {
      return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 10)}`;
    }
    // Return as-is if we have some digits but less than 10
    return digitsOnly;
  }
  
  // Return empty string if no digits found
  return '';
};

// Helper function to normalize contact info and clean empty strings
// Phone numbers are normalized to XPO format: NNN-NNNNNNN
// Email objects are always included (emailAddr set to null if empty)
const normalizeContactInfo = (contactInfo: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined => {
  if (!contactInfo) return contactInfo;
  
  const cleaned = cleanEmptyStrings(contactInfo);
  if (!cleaned) return cleaned;
  
  // Always include email object - set emailAddr to null if empty
  // Backend will remove the entire email object if emailAddr is null
  const emailObj = cleaned.email as { emailAddr?: string | null } | undefined;
  if (!emailObj) {
    cleaned.email = { emailAddr: null };
  } else {
    if (emailObj.emailAddr === '' || emailObj.emailAddr === null || emailObj.emailAddr === undefined) {
      cleaned.email = { emailAddr: null };
    }
  }
  
  // Normalize phone numbers to XPO format: NNN-NNNNNNN
  // Phone numbers should already be normalized from BillOfLading.tsx, but normalize again to be safe
  const phoneObj = cleaned.phone as { phoneNbr?: string } | undefined;
  if (phoneObj && phoneObj.phoneNbr) {
    const normalizedPhone = normalizePhoneNumber(phoneObj.phoneNbr);
    cleaned.phone = { ...phoneObj, phoneNbr: normalizedPhone || phoneObj.phoneNbr.trim() };
  }
  
  return cleaned;
};

type BuildXPOBillOfLadingParams = XPOBillOfLadingFields;

export const buildXPOBillOfLadingRequestBody = (params: BuildXPOBillOfLadingParams) => {
  // Normalize country codes, clean empty strings, and ensure all required fields are present
  const builtBody = {
    bol: {
      requester: {
        role: params.bol.requester.role || 'S',
      },
      consignee: {
        ...params.bol.consignee,
        address: normalizeAddress(params.bol.consignee.address),
        contactInfo: normalizeContactInfo(params.bol.consignee.contactInfo),
      },
      shipper: {
        ...(params.bol.shipper.acctInstId && { acctInstId: params.bol.shipper.acctInstId }),
        ...params.bol.shipper,
        address: normalizeAddress(params.bol.shipper.address),
        contactInfo: normalizeContactInfo(params.bol.shipper.contactInfo),
      },
      billToCust: {
        ...params.bol.billToCust,
        address: normalizeAddress(params.bol.billToCust.address),
        contactInfo: normalizeContactInfo(params.bol.billToCust.contactInfo),
      },
      commodityLine: params.bol.commodityLine.map((item: XPOBillOfLadingCommodity) => {
        // Match backend template order: pieceCnt, packaging, grossWeight, desc, hazmatInd, nmfcClass, nmfcItemCd, sub
        return {
          pieceCnt: item.pieceCnt || 0,
          packaging: {
            packageCd: item.packaging?.packageCd || 'PLT',
          },
          grossWeight: {
            weight: item.grossWeight?.weight || 0,
          },
          desc: item.desc || '',
          hazmatInd: item.hazmatInd || false,
          ...(item.nmfcClass && item.nmfcClass.trim() !== '' && { nmfcClass: item.nmfcClass.trim() }),
          ...(item.nmfcItemCd && item.nmfcItemCd.trim() !== '' && { nmfcItemCd: item.nmfcItemCd.trim() }),
          ...(item.sub && item.sub.trim() !== '' && { sub: item.sub.trim() }),
        };
      }),
      chargeToCd: params.bol.chargeToCd || 'P',
      ...(params.bol.remarks && params.bol.remarks.trim() !== '' && { remarks: params.bol.remarks.trim() }),
      // Always include emergencyContactName and emergencyContactPhone
      // Can be empty string or have values (matches working payload)
      emergencyContactName: params.bol.emergencyContactName !== undefined && params.bol.emergencyContactName !== null
        ? params.bol.emergencyContactName
        : '',
      emergencyContactPhone: {
        phoneNbr: params.bol.emergencyContactPhone?.phoneNbr !== undefined && params.bol.emergencyContactPhone?.phoneNbr !== null
          ? (params.bol.emergencyContactPhone.phoneNbr.trim() || '')
          : '',
      },
      // Always include additionalService as array (empty array if not provided)
      additionalService: params.bol.additionalService && params.bol.additionalService.length > 0 
        ? params.bol.additionalService 
        : [],
      // Include suppRef if provided
      ...(params.bol.suppRef && { suppRef: params.bol.suppRef }),
      // Include pickupInfo if provided (backend will validate and clean it)
      // CRITICAL: Dates MUST be formatted with -08:00 timezone (PST) - never use local timezone
      // Phone numbers should already be normalized to NNN-NNNNNNN format
      ...(params.bol.pickupInfo && 
          params.bol.pickupInfo.pkupDate && 
          params.bol.pickupInfo.pkupTime && 
          params.bol.pickupInfo.dockCloseTime && {
        pickupInfo: {
          // CRITICAL: Force all dates to use -08:00 (PST timezone) - replace any existing timezone
          // This is a safety net to ensure dates are NEVER formatted with local timezone
          pkupDate: (() => {
            const date = String(params.bol.pickupInfo.pkupDate);
            // If already correct, return as-is
            if (date.endsWith('-08:00')) {
              return date;
            }
            // Extract date and time parts (before timezone)
            if (date.includes('T')) {
              const [datePart, rest] = date.split('T');
              // Remove timezone (handle both +05:30 and -08:00 formats)
              // Match pattern: HH:MM:SS followed by + or - and timezone
              const timeMatch = rest.match(/^(\d{2}):(\d{2}):(\d{2})/);
              if (timeMatch) {
                const [, hours, minutes, seconds] = timeMatch;
                // Always return with -08:00 timezone
                const fixed = `${datePart}T${hours}:${minutes}:${seconds}-08:00`;
                console.warn('Fixed pkupDate timezone from', date, 'to', fixed);
                return fixed;
              }
            }
            return date;
          })(),
          pkupTime: (() => {
            const date = String(params.bol.pickupInfo.pkupTime);
            // If already correct, return as-is
            if (date.endsWith('-08:00')) {
              return date;
            }
            // Extract date and time parts (before timezone)
            if (date.includes('T')) {
              const [datePart, rest] = date.split('T');
              // Remove timezone (handle both +05:30 and -08:00 formats)
              // Match pattern: HH:MM:SS followed by + or - and timezone
              const timeMatch = rest.match(/^(\d{2}):(\d{2}):(\d{2})/);
              if (timeMatch) {
                const [, hours, minutes, seconds] = timeMatch;
                // Always return with -08:00 timezone
                const fixed = `${datePart}T${hours}:${minutes}:${seconds}-08:00`;
                console.warn('Fixed pkupTime timezone from', date, 'to', fixed);
                return fixed;
              }
            }
            return date;
          })(),
          dockCloseTime: (() => {
            const date = String(params.bol.pickupInfo.dockCloseTime);
            // If already correct, return as-is
            if (date.endsWith('-08:00')) {
              return date;
            }
            // Extract date and time parts (before timezone)
            if (date.includes('T')) {
              const [datePart, rest] = date.split('T');
              // Remove timezone (handle both +05:30 and -08:00 formats)
              // Match pattern: HH:MM:SS followed by + or - and timezone
              const timeMatch = rest.match(/^(\d{2}):(\d{2}):(\d{2})/);
              if (timeMatch) {
                const [, hours, minutes, seconds] = timeMatch;
                // Always return with -08:00 timezone
                const fixed = `${datePart}T${hours}:${minutes}:${seconds}-08:00`;
                console.warn('Fixed dockCloseTime timezone from', date, 'to', fixed);
                return fixed;
              }
            }
            return date;
          })(),
          contact: {
            companyName: params.bol.pickupInfo.contact?.companyName || 'XPO LOGISTICS FREIGHT, INC.',
            fullName: params.bol.pickupInfo.contact?.fullName || 'XPO Driver',
            phone: {
              // Normalize phone number to ensure it's in NNN-NNNNNNN format
              phoneNbr: normalizePhoneNumber(params.bol.pickupInfo.contact?.phone?.phoneNbr) || '562-9468331',
            },
          },
        },
      }),
      // Always include declaredValueAmt (default to 0.01 if not provided)
      declaredValueAmt: {
        amt: params.bol.declaredValueAmt?.amt !== undefined && params.bol.declaredValueAmt?.amt !== null
          ? params.bol.declaredValueAmt.amt
          : 0.01,
      },
      // Always include declaredValueAmtPerLb (default to 0.01 if not provided)
      declaredValueAmtPerLb: {
        amt: params.bol.declaredValueAmtPerLb?.amt !== undefined && params.bol.declaredValueAmtPerLb?.amt !== null
          ? params.bol.declaredValueAmtPerLb.amt
          : 0.01,
      },
      // Always include excessLiabilityChargeInit (empty string if not provided)
      excessLiabilityChargeInit: params.bol.excessLiabilityChargeInit !== undefined && params.bol.excessLiabilityChargeInit !== null
        ? params.bol.excessLiabilityChargeInit
        : '',
    },
    autoAssignPro: params.autoAssignPro !== undefined ? params.autoAssignPro : true,
  };

  // Remove null and undefined values (matching backend logic)
  // XPO API rejects requests with null values for required fields
  const cleanedBody = removeNullValues(builtBody);

  // Log the cleaned body for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Cleaned BOL Request Body:', JSON.stringify(cleanedBody, null, 2));
  }

  return cleanedBody;
};

type BuildXPOPickupRequestParams = XPOPickupRequestFields;

export const buildXPOPickupRequestRequestBody = (params: BuildXPOPickupRequestParams) => {
  return {
    pickupRqstInfo: {
      pkupDate: params.pickupRqstInfo.pkupDate || undefined,
      readyTime: params.pickupRqstInfo.readyTime || undefined,
      closeTime: params.pickupRqstInfo.closeTime || undefined,
      ...(params.pickupRqstInfo.specialEquipmentCd && { specialEquipmentCd: params.pickupRqstInfo.specialEquipmentCd }),
      ...(params.pickupRqstInfo.insidePkupInd !== undefined && { insidePkupInd: params.pickupRqstInfo.insidePkupInd }),
      shipper: params.pickupRqstInfo.shipper,
      requestor: params.pickupRqstInfo.requestor,
      contact: params.pickupRqstInfo.contact,
      ...(params.pickupRqstInfo.remarks && { remarks: params.pickupRqstInfo.remarks }),
      pkupItem: params.pickupRqstInfo.pkupItem.map(item => ({
        destZip6: item.destZip6 || undefined,
        totWeight: {
          weight: item.totWeight.weight || 0,
        },
        loosePiecesCnt: item.loosePiecesCnt || 0,
        palletCnt: item.palletCnt || 0,
        garntInd: item.garntInd || false,
        hazmatInd: item.hazmatInd || false,
        frzbleInd: item.frzbleInd || false,
        holDlvrInd: item.holDlvrInd || false,
        foodInd: item.foodInd || false,
        ...(item.remarks && { remarks: item.remarks }),
      })),
    },
  };
};

