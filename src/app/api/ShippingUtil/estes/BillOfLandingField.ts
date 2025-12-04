/**
 * Estes Bill of Lading Field Definitions
 * Based on backend ShippingDB.js configuration
 */

export interface EstesBillOfLadingFields {
  version: string; // e.g., "v2.0.1"
  bol: {
    function: string; // e.g., "Create"
    isTest: boolean;
    requestorRole: string; // e.g., "Third Party"
    requestedPickupDate: string; // ISO 8601 format: "2025-11-27T00:00:00.000"
    specialInstructions?: string;
  };
  payment: {
    terms: string; // e.g., "Prepaid"
  };
  origin: EstesBOLAddress;
  destination: EstesBOLAddress;
  billTo: EstesBOLAddress;
  referenceNumbers?: {
    masterBol?: string;
    quoteID?: string;
  };
  commodities: {
    lineItemLayout: string; // e.g., "Nested"
    handlingUnits: EstesBOLHandlingUnit[];
  };
  accessorials?: {
    codes: string[]; // e.g., ["LFTD", "RES", "PREACC"]
  };
  images?: {
    includeBol?: boolean;
    includeShippingLabels?: boolean;
    shippingLabels?: {
      format?: string; // e.g., "Zebra"
      quantity?: number;
      position?: number;
    };
    email?: {
      includeBol?: boolean;
      includeLabels?: boolean;
      addresses?: string[];
    };
  };
  notifications?: Array<{
    email: string;
  }>;
}

export interface EstesBOLAddress {
  account?: string;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string; // e.g., "USA"
  contact: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface EstesBOLHandlingUnit {
  count: number;
  type: string; // e.g., "PAT", "BX"
  weight: number;
  weightUnit: string; // e.g., "Pounds"
  length: number;
  width: number;
  height: number;
  dimensionsUnit: string; // e.g., "Inches"
  stackable: boolean;
  lineItems: EstesBOLLineItem[];
}

export interface EstesBOLLineItem {
  description: string;
  weight: number;
  weightUnit: string; // e.g., "Pounds"
  pieces: number;
  packagingType: string; // e.g., "CTN"
  classification: string;
  nmfc: string;
  nmfcSub: string;
  hazardous: boolean;
}

export const ESTES_BOL_FIELD_DEFAULTS: Partial<EstesBillOfLadingFields> = {
  version: 'v2.0.1',
  bol: {
    function: 'Create',
    isTest: false,
    requestorRole: 'Third Party',
    requestedPickupDate: '',
    specialInstructions: '',
  },
  payment: {
    terms: 'Prepaid',
  },
  origin: {
    account: '',
    name: '',
    address1: '',
    address2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'USA',
    contact: {
      name: '',
      phone: '',
      email: '',
    },
  },
  destination: {
    name: '',
    address1: '',
    address2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'USA',
    contact: {
      phone: '',
      email: '',
    },
  },
  billTo: {
    account: '',
    name: '',
    address1: '',
    address2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'USA',
    contact: {
      name: '',
      phone: '',
      email: '',
    },
  },
  referenceNumbers: {
    masterBol: '',
    quoteID: '',
  },
  commodities: {
    lineItemLayout: 'Nested',
    handlingUnits: [],
  },
  accessorials: {
    codes: [],
  },
};

export const ESTES_BOL_HANDLING_UNIT_DEFAULTS: EstesBOLHandlingUnit = {
  count: 1,
  type: 'PAT',
  weight: 0,
  weightUnit: 'Pounds',
  length: 0,
  width: 0,
  height: 0,
  dimensionsUnit: 'Inches',
  stackable: true,
  lineItems: [],
};

export const ESTES_BOL_LINE_ITEM_DEFAULTS: EstesBOLLineItem = {
  description: '',
  weight: 0,
  weightUnit: 'Pounds',
  pieces: 1,
  packagingType: 'CTN',
  classification: '',
  nmfc: '',
  nmfcSub: '',
  hazardous: false,
};

export const ESTES_BOL_FIELD_LABELS: Record<string, string> = {
  version: 'Version',
  function: 'Function',
  isTest: 'Is Test',
  requestorRole: 'Requestor Role',
  requestedPickupDate: 'Requested Pickup Date',
  specialInstructions: 'Special Instructions',
  terms: 'Terms',
  origin: 'Origin',
  destination: 'Destination',
  billTo: 'Bill To',
  account: 'Account',
  name: 'Name',
  address1: 'Address Line 1',
  address2: 'Address Line 2',
  city: 'City',
  stateProvince: 'State/Province',
  postalCode: 'Postal Code',
  country: 'Country',
  contact: 'Contact',
  phone: 'Phone',
  email: 'Email',
  referenceNumbers: 'Reference Numbers',
  masterBol: 'Master BOL',
  quoteID: 'Quote ID',
  commodities: 'Commodities',
  lineItemLayout: 'Line Item Layout',
  handlingUnits: 'Handling Units',
  count: 'Count',
  type: 'Type',
  weight: 'Weight',
  weightUnit: 'Weight Unit',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  dimensionsUnit: 'Dimensions Unit',
  stackable: 'Stackable',
  lineItems: 'Line Items',
  description: 'Description',
  pieces: 'Pieces',
  packagingType: 'Packaging Type',
  classification: 'Classification',
  nmfc: 'NMFC',
  nmfcSub: 'NMFC Sub',
  hazardous: 'Hazardous',
  accessorials: 'Accessorials',
  codes: 'Codes',
};

export const ESTES_BOL_REQUESTOR_ROLE_OPTIONS = [
  { value: 'Shipper', label: 'Shipper' },
  { value: 'Consignee', label: 'Consignee' },
  { value: 'Third Party', label: 'Third Party' },
];

export const ESTES_BOL_TERMS_OPTIONS = [
  { value: 'Prepaid', label: 'Prepaid' },
  { value: 'Collect', label: 'Collect' },
  { value: 'Third Party', label: 'Third Party' },
];

export const ESTES_BOL_HANDLING_UNIT_TYPE_OPTIONS = [
  { value: 'PAT', label: 'Pallet' },
  { value: 'BX', label: 'Box' },
  { value: 'SK', label: 'Skid' },
  { value: 'CR', label: 'Crate' },
];

export const ESTES_BOL_ACCESSORIAL_CODES = [
  { value: 'LFTD', label: 'Lift Gate Delivery' },
  { value: 'RES', label: 'Residential' },
  { value: 'PREACC', label: 'Pre-Arranged Delivery' },
  { value: 'INS', label: 'Inside Delivery' },
  { value: 'APPT', label: 'Appointment Required' },
];

export const ESTES_BOL_REQUIRED_FIELDS: string[] = [
  'version',
  'bol.function',
  'bol.requestorRole',
  'bol.requestedPickupDate',
  'payment.terms',
  'origin.name',
  'origin.address1',
  'origin.city',
  'origin.stateProvince',
  'origin.postalCode',
  'origin.country',
  'destination.name',
  'destination.address1',
  'destination.city',
  'destination.stateProvince',
  'destination.postalCode',
  'destination.country',
  'billTo.name',
  'billTo.address1',
  'billTo.city',
  'billTo.stateProvince',
  'billTo.postalCode',
  'billTo.country',
  'commodities.handlingUnits',
];

