/**
 * XPO-specific request body builder
 * Converts form data to XPO API format
 */

import type { XPORateQuoteFields, XPORateQuoteCommodity } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import type { XPOBillOfLadingFields } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import type { XPOPickupRequestFields } from '@/app/api/ShippingUtil/xpo/PickupRequestField';

type BuildXPORateQuoteParams = {
  paymentTermCd: string;
  shipmentDate: string;
  accessorials?: string[];
  shipperPostalCd: string;
  consigneePostalCd: string;
  commodity: XPORateQuoteCommodity[];
  palletCnt?: number;
  linealFt?: number;
};

// Helper function to remove undefined and null values from object
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined && item !== null);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = removeUndefined(obj[key]);
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return obj;
};

export const buildXPORateQuoteRequestBody = (params: BuildXPORateQuoteParams) => {
  const {
    paymentTermCd,
    shipmentDate,
    accessorials,
    shipperPostalCd,
    consigneePostalCd,
    commodity,
    palletCnt = 0,
    linealFt = 0,
  } = params;

  const shipmentInfo: any = {
      paymentTermCd: paymentTermCd || 'P',
  };
  
  // Only add shipmentDate if it exists and is valid
  // XPO API requires shipmentDate to be a valid ISO 8601 date string
  if (shipmentDate && shipmentDate.trim() !== '') {
    // Validate the date format
    const date = new Date(shipmentDate);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid shipment date format: ${shipmentDate}`);
    }
    shipmentInfo.shipmentDate = shipmentDate;
  } else {
    // If no date provided, use current date
    shipmentInfo.shipmentDate = new Date().toISOString();
  }
  
  // Accessorials: XPO API expects an array, even if empty
  // Based on documentation, empty array [] works, but specific codes might not be valid for rate quotes
  // For now, we'll send an empty array to match the working example
  // TODO: Verify which accessorial codes are valid for XPO rate quotes
  shipmentInfo.accessorials = [];
  
  // Shipper address - ensure postal code is valid (5 digits minimum)
  if (!shipperPostalCd || shipperPostalCd.trim() === '') {
    throw new Error('Shipper postal code is required');
  }
  shipmentInfo.shipper = {
        address: {
      postalCd: shipperPostalCd.trim(),
        },
  };
  
  // Consignee address - ensure postal code is valid (5 digits minimum)
  if (!consigneePostalCd || consigneePostalCd.trim() === '') {
    throw new Error('Consignee postal code is required');
  }
  shipmentInfo.consignee = {
        address: {
      postalCd: consigneePostalCd.trim(),
        },
  };
  
  // Commodity array
  if (commodity && commodity.length > 0) {
    shipmentInfo.commodity = commodity.map(item => {
        const commodityItem: any = {
          pieceCnt: item.pieceCnt || 0,
          packageCode: item.packageCode || 'BOX',
          grossWeight: {
            weight: item.grossWeight?.weight || 0,
            weightUom: item.grossWeight?.weightUom || 'LBS',
          },
          hazmatInd: item.hazmatInd || false,
        };
        
        // Only include nmfcClass if it has a value
        if (item.nmfcClass && item.nmfcClass.trim() !== '') {
          commodityItem.nmfcClass = item.nmfcClass;
        }
        
        // Only include dimensions if at least one dimension has a value
        if (item.dimensions && (
          (item.dimensions.length && item.dimensions.length > 0) ||
          (item.dimensions.width && item.dimensions.width > 0) ||
          (item.dimensions.height && item.dimensions.height > 0)
        )) {
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
  
  // palletCnt and linealFt: XPO API expects these fields to be present (even if 0)
  // Based on documentation, these should always be included
  shipmentInfo.palletCnt = palletCnt || 0;
  shipmentInfo.linealFt = linealFt || 0;
  
  // Don't remove undefined values - XPO API might need the structure
  // Just ensure all required fields are present
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
const removeNullValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  if (Array.isArray(obj)) {
    const cleaned = obj.map(removeNullValues).filter(item => item !== undefined && item !== null);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      // Special handling for email objects - if emailAddr is null, remove the entire email object
      // This matches backend logic in BillOfLadingService.js
      if (key === 'email' && typeof obj[key] === 'object' && obj[key] !== null) {
        if (obj[key].emailAddr === null || obj[key].emailAddr === undefined) {
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
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  
  return obj;
};

// Helper function to clean empty strings (convert to undefined for optional fields)
const cleanEmptyStrings = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return obj.trim() === '' ? undefined : obj.trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanEmptyStrings).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = cleanEmptyStrings(obj[key]);
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  
  return obj;
};

// Helper function to normalize address country codes and clean empty strings
const normalizeAddress = (address: any) => {
  if (!address) return address;
  
  const cleaned = cleanEmptyStrings(address);
  
  return {
    ...cleaned,
    countryCd: normalizeCountryCode(cleaned?.countryCd || 'US'),
  };
};

// Helper function to normalize contact info and clean empty strings
// Phone numbers preserve hyphens (e.g., "123-4567890") to match backend validation
// Email objects are always included (emailAddr set to null if empty)
const normalizeContactInfo = (contactInfo: any) => {
  if (!contactInfo) return contactInfo;
  
  const cleaned = cleanEmptyStrings(contactInfo);
  
  // Always include email object - set emailAddr to null if empty
  // Backend will remove the entire email object if emailAddr is null
  if (!cleaned.email) {
    cleaned.email = { emailAddr: null };
  } else {
    if (cleaned.email.emailAddr === '' || cleaned.email.emailAddr === null || cleaned.email.emailAddr === undefined) {
      cleaned.email.emailAddr = null;
    }
  }
  
  // Phone numbers: preserve hyphens and format (backend normalizes by removing spaces/parentheses but keeps hyphens)
  // If phoneNbr is empty, keep it as empty string (backend will handle it)
  if (cleaned?.phone && cleaned.phone.phoneNbr) {
    // Only trim, don't remove hyphens - backend will normalize by removing spaces/parentheses only
    cleaned.phone.phoneNbr = cleaned.phone.phoneNbr.trim();
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
        ...params.bol.shipper,
        address: normalizeAddress(params.bol.shipper.address),
        contactInfo: normalizeContactInfo(params.bol.shipper.contactInfo),
      },
      billToCust: {
        ...params.bol.billToCust,
        address: normalizeAddress(params.bol.billToCust.address),
        contactInfo: normalizeContactInfo(params.bol.billToCust.contactInfo),
      },
      commodityLine: params.bol.commodityLine.map((item: any) => {
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

