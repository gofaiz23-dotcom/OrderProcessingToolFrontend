/**
 * XPO-specific request body builder
 * Converts form data to XPO API format
 */

import type { XPORateQuoteCommodity } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import type { XPOBillOfLadingFields, XPOBillOfLadingCommodity } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
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

export const buildXPORateQuoteRequestBody = (params: BuildXPORateQuoteParams) => {
  const {
    paymentTermCd,
    shipmentDate,
    shipperPostalCd,
    consigneePostalCd,
    commodity,
    palletCnt,
    linealFt,
    // Note: accessorials are not included in rate quote requests as XPO rate quote API does not support them
  } = params;

  type ShipmentInfoType = {
    paymentTermCd: string;
    shipmentDate?: string;
    accessorials?: string[];
    shipper?: {
      address: {
        postalCd: string;
      };
    };
    consignee?: {
      address: {
        postalCd: string;
      };
    };
    commodity?: Array<{
      pieceCnt: number;
      packageCode: string;
      grossWeight: {
        weight: number;
        weightUom: string;
      };
      hazmatInd: boolean;
      nmfcClass?: string;
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
  
  // Accessorials: XPO rate quote API does not accept accessorials
  // Exclude accessorials from rate quote requests to avoid 400 errors
  // Accessorials should only be included in BOL creation, not rate quotes
  // Do not include accessorials in rate quote requests
  
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
  
  // Commodity array - type for the transformed commodity item
  type TransformedCommodityItem = {
    pieceCnt: number;
    packageCode: string;
    grossWeight: {
      weight: number;
      weightUom: string;
    };
    hazmatInd: boolean;
    nmfcClass?: string;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      dimensionsUom: string;
    };
  };

  let calculatedPalletCnt = 0;
  if (commodity && commodity.length > 0) {
    shipmentInfo.commodity = commodity.map(item => {
        const commodityItem: TransformedCommodityItem = {
          pieceCnt: item.pieceCnt || 0,
          packageCode: item.packageCode || 'BOX',
          grossWeight: {
            weight: item.grossWeight?.weight || 0,
            weightUom: item.grossWeight?.weightUom || 'LBS',
          },
          hazmatInd: item.hazmatInd || false,
        };
        
        // Calculate pallet count: if packageCode is "PLT" (case-insensitive), add pieceCnt to pallet count
        if (item.packageCode && item.packageCode.toUpperCase() === 'PLT') {
          calculatedPalletCnt += item.pieceCnt || 0;
        }
        
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
  
  // palletCnt: Use calculated value from commodities if packageCode is "PLT", 
  // otherwise use provided value
  // Only include palletCnt if it's greater than 0
  const finalPalletCnt = calculatedPalletCnt > 0 ? calculatedPalletCnt : (palletCnt || 0);
  if (finalPalletCnt > 0) {
    shipmentInfo.palletCnt = finalPalletCnt;
  }
  
  // linealFt: Only include if it's greater than 0
  if (linealFt && linealFt > 0) {
    shipmentInfo.linealFt = linealFt;
  }
  
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

// Helper function to normalize contact info and clean empty strings
// Phone numbers preserve hyphens (e.g., "123-4567890") to match backend validation
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
  
  // Phone numbers: preserve hyphens and format (backend normalizes by removing spaces/parentheses but keeps hyphens)
  // If phoneNbr is empty, keep it as empty string (backend will handle it)
  const phoneObj = cleaned.phone as { phoneNbr?: string } | undefined;
  if (phoneObj && phoneObj.phoneNbr) {
    // Only trim, don't remove hyphens - backend will normalize by removing spaces/parentheses only
    cleaned.phone = { ...phoneObj, phoneNbr: phoneObj.phoneNbr.trim() };
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

