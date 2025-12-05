/**
 * Estes Rate Quote Field Definitions
 * Based on backend ShippingDB.js configuration
 */

export interface EstesRateQuoteFields {
  // Quote Request
  shipDate: string; // YYYY-MM-DD
  shipTime: string; // HH:MM
  serviceLevels: string[]; // e.g., ["LTL", "LTLTC"]
  
  // Origin Address
  originCity: string;
  originStateProvince: string;
  originPostalCode: string;
  originCountry: string;
  
  // Destination Address
  destinationCity: string;
  destinationStateProvince: string;
  destinationPostalCode: string;
  destinationCountry: string;
  
  // Payment
  account: string;
  payor: string; // "Shipper", "Consignee", "Third Party"
  terms: string; // "Prepaid", "Collect", etc.
  
  // Requestor
  requestorName: string;
  requestorPhone: string;
  requestorEmail: string;
  
  // Commodity
  handlingUnits: EstesHandlingUnit[];
  
  // Accessorials
  accessorialCodes: string[]; // e.g., ["LGATE", "HD"]
}

export interface EstesHandlingUnit {
  count: number;
  type: string; // e.g., "BX", "PL", "SK", "CR"
  weight: number;
  weightUnit: string; // "Pounds"
  length: number;
  width: number;
  height: number;
  dimensionsUnit: string; // "Inches"
  isStackable: boolean;
  isTurnable: boolean;
  lineItems: EstesLineItem[];
}

export interface EstesLineItem {
  description: string;
  weight: number;
  pieces: number;
  packagingType: string;
  classification: string;
  nmfc: string;
  nmfcSub: string;
  isHazardous: boolean;
}

export const ESTES_RATE_QUOTE_FIELD_DEFAULTS: Partial<EstesRateQuoteFields> = {
  shipDate: '',
  shipTime: '11:00',
  serviceLevels: ['LTL', 'LTLTC'],
  originCity: '',
  originStateProvince: '',
  originPostalCode: '',
  originCountry: 'USA',
  destinationCity: '',
  destinationStateProvince: '',
  destinationPostalCode: '',
  destinationCountry: 'USA',
  account: '',
  payor: 'Shipper',
  terms: 'Prepaid',
  requestorName: '',
  requestorPhone: '',
  requestorEmail: '',
  handlingUnits: [],
  accessorialCodes: [],
};

export const ESTES_HANDLING_UNIT_DEFAULTS: EstesHandlingUnit = {
  count: 1,
  type: 'BX',
  weight: 0,
  weightUnit: 'Pounds',
  length: 0,
  width: 0,
  height: 0,
  dimensionsUnit: 'Inches',
  isStackable: true,
  isTurnable: false,
  lineItems: [],
};

export const ESTES_LINE_ITEM_DEFAULTS: EstesLineItem = {
  description: '',
  weight: 0,
  pieces: 1,
  packagingType: '',
  classification: '',
  nmfc: '',
  nmfcSub: '',
  isHazardous: false,
};

export const ESTES_RATE_QUOTE_FIELD_LABELS: Record<string, string> = {
  shipDate: 'Ship Date',
  shipTime: 'Ship Time',
  serviceLevels: 'Service Levels',
  originCity: 'Origin City',
  originStateProvince: 'Origin State/Province',
  originPostalCode: 'Origin Postal Code',
  originCountry: 'Origin Country',
  destinationCity: 'Destination City',
  destinationStateProvince: 'Destination State/Province',
  destinationPostalCode: 'Destination Postal Code',
  destinationCountry: 'Destination Country',
  account: 'Account',
  payor: 'Payor',
  terms: 'Terms',
  requestorName: 'Requestor Name',
  requestorPhone: 'Requestor Phone',
  requestorEmail: 'Requestor Email',
  handlingUnits: 'Handling Units',
  accessorialCodes: 'Accessorial Codes',
  count: 'Count',
  type: 'Type',
  weight: 'Weight',
  weightUnit: 'Weight Unit',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  dimensionsUnit: 'Dimensions Unit',
  isStackable: 'Stackable',
  isTurnable: 'Turnable',
  description: 'Description',
  pieces: 'Pieces',
  packagingType: 'Packaging Type',
  classification: 'Classification',
  nmfc: 'NMFC',
  nmfcSub: 'NMFC Sub',
  isHazardous: 'Hazardous',
};

export const ESTES_PAYOR_OPTIONS = [
  { value: 'Shipper', label: 'Shipper' },
  { value: 'Consignee', label: 'Consignee' },
  { value: 'Third Party', label: 'Third Party' },
];

export const ESTES_TERMS_OPTIONS = [
  { value: 'Prepaid', label: 'Prepaid' },
  { value: 'Collect', label: 'Collect' },
  { value: 'Third Party', label: 'Third Party' },
];

export const ESTES_HANDLING_UNIT_TYPE_OPTIONS = [
  { value: 'BX', label: 'Box' },
  { value: 'PL', label: 'Pallet' },
  { value: 'SK', label: 'Skid' },
  { value: 'CR', label: 'Crate' },
];

export const ESTES_ACCESSORIAL_CODES = [
  { value: 'LGATE', label: 'Lift Gate Service' },
  { value: 'HD', label: 'Residential Delivery' },
  { value: 'APPT', label: 'Appointment Request' },
  { value: 'INS', label: 'Inside Delivery' },
  { value: 'LFTD', label: 'Lift Gate Delivery' },
  { value: 'RES', label: 'Residential' },
];

export const ESTES_RATE_QUOTE_REQUIRED_FIELDS: string[] = [
  'shipDate',
  'shipTime',
  'originCity',
  'originStateProvince',
  'originPostalCode',
  'originCountry',
  'destinationCity',
  'destinationStateProvince',
  'destinationPostalCode',
  'destinationCountry',
  'account',
  'payor',
  'terms',
  'requestorName',
  'requestorPhone',
  'requestorEmail',
  'handlingUnits',
];

