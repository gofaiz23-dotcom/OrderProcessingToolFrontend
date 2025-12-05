/**
 * XPO Rate Quote Field Definitions
 * Based on backend ShippingDB.js configuration
 */

export interface XPORateQuoteFields {
  // Shipment Info
  paymentTermCd: string; // e.g., "P" for Prepaid
  shipmentDate: string; // ISO 8601 format: "2025-12-05T12:00:00.000Z"
  accessorials: string[];
  
  // Shipper Address
  shipperPostalCd: string;
  
  // Consignee Address
  consigneePostalCd: string;
  
  // Commodity
  commodity: XPORateQuoteCommodity[];
  
  // Optional fields
  palletCnt?: number;
  linealFt?: number;
}

export interface XPORateQuoteCommodity {
  pieceCnt: number;
  packageCode: string; // e.g., "BOX", "PLT"
  grossWeight: {
    weight: number;
    weightUom: string; // e.g., "LBS"
  };
  nmfcClass: string; // e.g., "85"
  hazmatInd: boolean;
  dimensions: {
    length: number;
    width: number;
    height: number;
    dimensionsUom: string; // e.g., "INCH"
  };
}

export const XPO_RATE_QUOTE_FIELD_DEFAULTS: Partial<XPORateQuoteFields> = {
  paymentTermCd: 'P', // Prepaid
  shipmentDate: '',
  accessorials: [],
  shipperPostalCd: '',
  consigneePostalCd: '',
  commodity: [],
  palletCnt: 0,
  linealFt: 0,
};

export const XPO_RATE_QUOTE_COMMODITY_DEFAULTS: XPORateQuoteCommodity = {
  pieceCnt: 1,
  packageCode: 'BOX',
  grossWeight: {
    weight: 0,
    weightUom: 'LBS',
  },
  nmfcClass: '',
  hazmatInd: false,
  dimensions: {
    length: 0,
    width: 0,
    height: 0,
    dimensionsUom: 'INCH',
  },
};

export const XPO_RATE_QUOTE_FIELD_LABELS: Record<string, string> = {
  paymentTermCd: 'Payment Term',
  shipmentDate: 'Shipment Date',
  accessorials: 'Accessorials',
  shipperPostalCd: 'Shipper Postal Code',
  consigneePostalCd: 'Consignee Postal Code',
  commodity: 'Commodity',
  palletCnt: 'Pallet Count',
  linealFt: 'Lineal Feet',
  pieceCnt: 'Piece Count',
  packageCode: 'Package Code',
  weight: 'Weight',
  weightUom: 'Weight Unit',
  nmfcClass: 'NMFC Class',
  hazmatInd: 'Hazmat',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  dimensionsUom: 'Dimensions Unit',
};

export const XPO_PAYMENT_TERM_OPTIONS = [
  { value: 'P', label: 'Prepaid' },
  { value: 'C', label: 'Collect' },
  { value: '3', label: 'Third Party' },
];

export const XPO_PACKAGE_CODE_OPTIONS = [
  { value: 'BOX', label: 'Box' },
  { value: 'PLT', label: 'Pallet' },
  { value: 'CRT', label: 'Crate' },
  { value: 'DRM', label: 'Drum' },
  { value: 'SKD', label: 'Skid' },
];

export const XPO_WEIGHT_UNIT_OPTIONS = [
  { value: 'LBS', label: 'Pounds' },
  { value: 'KG', label: 'Kilograms' },
];

export const XPO_DIMENSIONS_UNIT_OPTIONS = [
  { value: 'INCH', label: 'Inches' },
  { value: 'CM', label: 'Centimeters' },
  { value: 'FT', label: 'Feet' },
];

export const XPO_RATE_QUOTE_REQUIRED_FIELDS: string[] = [
  'paymentTermCd',
  'shipmentDate',
  'shipperPostalCd',
  'consigneePostalCd',
  'commodity',
];

// Role options for Requester
export const XPO_ROLE_OPTIONS = [
  { value: 'S', label: 'Shipper' },
  { value: 'C', label: 'Consignee' },
  { value: '3', label: 'Third Party' },
];

// Pickup Services options
export const XPO_PICKUP_SERVICES = [
  { value: 'BLIND', label: 'Blind Shipment' },
  { value: 'CONST', label: 'Construction/Utility' },
  { value: 'CONTAINER', label: 'Container Station' },
  { value: 'EXHIBIT', label: 'Exhibition/Trade Show' },
  { value: 'HOLIDAY', label: 'Holiday/Weekend' },
  { value: 'INSIDE', label: 'Inside Pickup' },
  { value: 'MINE', label: 'Mine/Govt/Airport' },
  { value: 'LIFT', label: 'Lift Gate' },
  { value: 'ORIGIN_LIMITED', label: 'Origin Limited Access' },
  { value: 'RESI', label: 'Residential' },
  { value: 'SINGLE', label: 'Single Shipment' },
  { value: 'SORT', label: 'Sorting/Segregation' },
];

// Delivery Services options
export const XPO_DELIVERY_SERVICES = [
  { value: 'AFTER_HOURS', label: 'After Business hours Delivery' },
  { value: 'APPT', label: 'Appointment' },
  { value: 'CONST', label: 'Construction/Utility' },
  { value: 'CONTAINER', label: 'Container Station' },
  { value: 'LIFT', label: 'Lift Gate' },
  { value: 'DEST_LIMITED', label: 'Destination Limited Access' },
  { value: 'EXHIBIT', label: 'Exhibition/Trade Show' },
  { value: 'GROCERY', label: 'Grocery Consolidation Delivery' },
  { value: 'HOLIDAY', label: 'Holiday/Weekend' },
  { value: 'INBOND', label: 'In Bond Freight' },
  { value: 'INBOND_TIR', label: 'In Bond TIR Carnet' },
  { value: 'INSIDE', label: 'Inside Delivery' },
  { value: 'MINE', label: 'Mine/Govt/Airport' },
  { value: 'NOTIFY', label: 'Notification Prior to Delivery' },
  { value: 'PIERS', label: 'Piers/Wharves Loading' },
  { value: 'REMOVE', label: 'Removal of Pallet / Debris' },
  { value: 'RESI', label: 'Residential' },
  { value: 'SORT', label: 'Sorting/Segregation' },
];

// Premium Services options
export const XPO_PREMIUM_SERVICES = [
  { value: 'FREEZABLE', label: 'Freezable Protection' },
  { value: 'GUARANTEED', label: 'Guaranteed (G!)' },
  { value: 'GUARANTEED_NOON', label: 'Guaranteed by Noon (G!12)' },
  { value: 'MABD', label: 'MABD' },
];

// Country options
export const XPO_COUNTRY_OPTIONS = [
  { value: 'United States', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Mexico', label: 'Mexico' },
];

