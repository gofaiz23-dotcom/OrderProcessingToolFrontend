/**
 * XPO Bill of Lading Field Definitions
 * Based on backend ShippingDB.js configuration
 */

export interface XPOBillOfLadingFields {
  bol: {
    requester: {
      role: string; // e.g., "S" for Shipper
    };
    consignee: XPOBillOfLadingAddress;
    shipper: XPOBillOfLadingAddress;
    billToCust: XPOBillOfLadingAddress;
    commodityLine: XPOBillOfLadingCommodity[];
    remarks?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: {
      phoneNbr: string;
    };
    chargeToCd: string; // e.g., "P" for Prepaid
    additionalService?: string[];
    suppRef?: {
      otherRefs: XPOBillOfLadingReference[];
    };
    pickupInfo?: XPOBillOfLadingPickupInfo;
    declaredValueAmt?: {
      amt: number;
    };
    declaredValueAmtPerLb?: {
      amt: number;
    };
    excessLiabilityChargeInit?: string;
  };
  autoAssignPro?: boolean;
}

export interface XPOBillOfLadingAddress {
  acctInstId?: string; // Account instance ID (optional, used when selecting from address book)
  address: {
    addressLine1: string;
    cityName: string;
    stateCd: string;
    countryCd: string; // e.g., "US"
    postalCd: string;
  };
  contactInfo: {
    companyName: string;
    email: {
      emailAddr: string;
    };
    phone: {
      phoneNbr: string;
    };
  };
}

export interface XPOBillOfLadingCommodity {
  pieceCnt: number;
  packaging: {
    packageCd: string; // e.g., "PLT", "BOX"
  };
  grossWeight: {
    weight: number;
  };
  desc: string;
  nmfcClass: string; // e.g., "250"
  nmfcItemCd: string; // e.g., "079300"
  sub: string; // e.g., "03"
  hazmatInd: boolean;
  length?: number;
  width?: number;
  height?: number;
  freezableProtection?: boolean;
}

export interface XPOBillOfLadingReference {
  referenceCode: string; // e.g., "RQ#"
  reference: string;
  referenceDescr?: string;
  referenceTypeCd?: string; // e.g., "Other"
}

export interface XPOBillOfLadingPickupInfo {
  pkupDate: string; // ISO 8601 format with timezone: "2025-12-15T12:00:00-08:00"
  pkupTime: string; // ISO 8601 format with timezone
  dockCloseTime: string; // ISO 8601 format with timezone
  contact: {
    companyName: string;
    fullName: string;
    phone: {
      phoneNbr: string;
    };
  };
}

export const XPO_BOL_FIELD_DEFAULTS: Partial<XPOBillOfLadingFields> = {
  bol: {
    requester: {
      role: 'S', // Shipper
    },
    consignee: {
      address: {
        addressLine1: '',
        cityName: '',
        stateCd: '',
        countryCd: 'US',
        postalCd: '',
      },
      contactInfo: {
        companyName: '',
        email: {
          emailAddr: '',
        },
        phone: {
          phoneNbr: '',
        },
      },
    },
    shipper: {
      address: {
        addressLine1: '',
        cityName: '',
        stateCd: '',
        countryCd: 'US',
        postalCd: '',
      },
      contactInfo: {
        companyName: '',
        email: {
          emailAddr: '',
        },
        phone: {
          phoneNbr: '',
        },
      },
    },
    billToCust: {
      address: {
        addressLine1: '',
        cityName: '',
        stateCd: '',
        countryCd: 'US',
        postalCd: '',
      },
      contactInfo: {
        companyName: '',
        email: {
          emailAddr: '',
        },
        phone: {
          phoneNbr: '',
        },
      },
    },
    commodityLine: [],
    chargeToCd: 'P', // Prepaid
    additionalService: [],
  },
  autoAssignPro: true,
};

export const XPO_BOL_COMMODITY_DEFAULTS: XPOBillOfLadingCommodity = {
  pieceCnt: 1,
  packaging: {
    packageCd: 'PLT',
  },
  grossWeight: {
    weight: 0,
  },
  desc: '',
  nmfcClass: '',
  nmfcItemCd: '079300', // Default NMFC Code (editable)
  sub: '03', // Default Sub (editable)
  hazmatInd: false,
};

export const XPO_BOL_FIELD_LABELS: Record<string, string> = {
  requesterRole: 'Requester Role',
  consignee: 'Consignee',
  shipper: 'Shipper',
  billToCust: 'Bill To Customer',
  addressLine1: 'Address Line 1',
  cityName: 'City',
  stateCd: 'State',
  countryCd: 'Country',
  postalCd: 'Postal Code',
  companyName: 'Company Name',
  emailAddr: 'Email Address',
  phoneNbr: 'Phone Number',
  commodityLine: 'Commodity Line',
  pieceCnt: 'Piece Count',
  packageCd: 'Package Code',
  weight: 'Weight',
  desc: 'Description',
  nmfcClass: 'NMFC Class',
  nmfcItemCd: 'NMFC Item Code',
  sub: 'Sub',
  hazmatInd: 'Hazmat',
  remarks: 'Remarks',
  emergencyContactName: 'Emergency Contact Name',
  emergencyContactPhone: 'Emergency Contact Phone',
  chargeToCd: 'Charge To Code',
  additionalService: 'Additional Services',
  pickupInfo: 'Pickup Information',
  pkupDate: 'Pickup Date',
  pkupTime: 'Pickup Time',
  dockCloseTime: 'Dock Close Time',
  fullName: 'Full Name',
  autoAssignPro: 'Auto Assign PRO',
  declaredValueAmt: 'Declared Value Amount',
  declaredValueAmtPerLb: 'Declared Value Amount Per Pound',
  excessLiabilityChargeInit: 'Excess Liability Charge Init',
};

export const XPO_BOL_REQUESTER_ROLE_OPTIONS = [
  { value: 'S', label: 'Shipper' },
  { value: 'C', label: 'Consignee' },
  { value: 'T', label: 'Third Party' },
];

export const XPO_BOL_CHARGE_TO_OPTIONS = [
  { value: 'P', label: 'Prepaid' },
  { value: 'C', label: 'Collect' },
  { value: '3', label: 'Third Party' },
];

export const XPO_BOL_PACKAGE_CODE_OPTIONS = [
  { value: 'PLT', label: 'Pallet' },
  { value: 'BOX', label: 'Box' },
  { value: 'CRT', label: 'Crate' },
  { value: 'DRM', label: 'Drum' },
  { value: 'SKD', label: 'Skid' },
];

export const XPO_BOL_COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'MX', label: 'Mexico' },
];

export const XPO_BOL_REQUIRED_FIELDS: string[] = [
  'bol.requester.role',
  'bol.consignee.address.addressLine1',
  'bol.consignee.address.cityName',
  'bol.consignee.address.stateCd',
  'bol.consignee.address.postalCd',
  'bol.consignee.contactInfo.companyName',
  'bol.shipper.address.addressLine1',
  'bol.shipper.address.cityName',
  'bol.shipper.address.stateCd',
  'bol.shipper.address.postalCd',
  'bol.shipper.contactInfo.companyName',
  'bol.billToCust.address.addressLine1',
  'bol.billToCust.address.cityName',
  'bol.billToCust.address.stateCd',
  'bol.billToCust.address.postalCd',
  'bol.billToCust.contactInfo.companyName',
  'bol.commodityLine',
  'bol.chargeToCd',
];

