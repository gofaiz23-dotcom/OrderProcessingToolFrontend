/**
 * XPO Pickup Request Field Definitions
 * Based on backend ShippingDB.js configuration
 */

export interface XPOPickupRequestFields {
  pickupRqstInfo: {
    pkupDate: string; // ISO 8601 format: "2016-12-17T00:00:00"
    readyTime: string; // ISO 8601 format: "2016-12-17T14:00:00"
    closeTime: string; // ISO 8601 format: "2016-12-17T17:00:00"
    specialEquipmentCd?: string; // e.g., "F"
    insidePkupInd?: boolean;
    shipper: XPOPickupRequestShipper;
    requestor: XPOPickupRequestRequestor;
    contact: XPOPickupRequestContact;
    remarks?: string;
    pkupItem: XPOPickupRequestItem[];
  };
}

export interface XPOPickupRequestShipper {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  cityName: string;
  stateCd: string;
  countryCd: string; // e.g., "US"
  postalCd: string;
}

export interface XPOPickupRequestRequestor {
  contact: {
    companyName: string;
    email: {
      emailAddr: string;
    };
    fullName: string;
    phone: {
      phoneNbr: string;
    };
  };
  roleCd: string; // e.g., "S" for Shipper
}

export interface XPOPickupRequestContact {
  companyName: string;
  email: {
    emailAddr: string;
  };
  fullName: string;
  phone: {
    phoneNbr: string;
  };
}

export interface XPOPickupRequestItem {
  destZip6: string; // e.g., "55122"
  totWeight: {
    weight: number;
  };
  loosePiecesCnt: number;
  palletCnt: number;
  garntInd: boolean;
  hazmatInd: boolean;
  frzbleInd: boolean;
  holDlvrInd: boolean;
  foodInd: boolean;
  remarks?: string;
}

export const XPO_PICKUP_REQUEST_FIELD_DEFAULTS: Partial<XPOPickupRequestFields> = {
  pickupRqstInfo: {
    pkupDate: '',
    readyTime: '',
    closeTime: '',
    specialEquipmentCd: '',
    insidePkupInd: false,
    shipper: {
      name: '',
      addressLine1: '',
      addressLine2: '',
      cityName: '',
      stateCd: '',
      countryCd: 'US',
      postalCd: '',
    },
    requestor: {
      contact: {
        companyName: '',
        email: {
          emailAddr: '',
        },
        fullName: '',
        phone: {
          phoneNbr: '',
        },
      },
      roleCd: 'S', // Shipper
    },
    contact: {
      companyName: '',
      email: {
        emailAddr: '',
      },
      fullName: '',
      phone: {
        phoneNbr: '',
      },
    },
    remarks: '',
    pkupItem: [],
  },
};

export const XPO_PICKUP_REQUEST_ITEM_DEFAULTS: XPOPickupRequestItem = {
  destZip6: '',
  totWeight: {
    weight: 0,
  },
  loosePiecesCnt: 0,
  palletCnt: 0,
  garntInd: false,
  hazmatInd: false,
  frzbleInd: false,
  holDlvrInd: false,
  foodInd: false,
  remarks: '',
};

export const XPO_PICKUP_REQUEST_FIELD_LABELS: Record<string, string> = {
  pkupDate: 'Pickup Date',
  readyTime: 'Ready Time',
  closeTime: 'Close Time',
  specialEquipmentCd: 'Special Equipment Code',
  insidePkupInd: 'Inside Pickup',
  shipper: 'Shipper',
  name: 'Name',
  addressLine1: 'Address Line 1',
  addressLine2: 'Address Line 2',
  cityName: 'City',
  stateCd: 'State',
  countryCd: 'Country',
  postalCd: 'Postal Code',
  requestor: 'Requestor',
  contact: 'Contact',
  companyName: 'Company Name',
  emailAddr: 'Email Address',
  fullName: 'Full Name',
  phoneNbr: 'Phone Number',
  roleCd: 'Role Code',
  remarks: 'Remarks',
  pkupItem: 'Pickup Items',
  destZip6: 'Destination ZIP Code',
  totWeight: 'Total Weight',
  weight: 'Weight',
  loosePiecesCnt: 'Loose Pieces Count',
  palletCnt: 'Pallet Count',
  garntInd: 'Garment Indicator',
  hazmatInd: 'Hazmat Indicator',
  frzbleInd: 'Freezable Indicator',
  holDlvrInd: 'Hold Delivery Indicator',
  foodInd: 'Food Indicator',
};

export const XPO_PICKUP_REQUEST_ROLE_OPTIONS = [
  { value: 'S', label: 'Shipper' },
  { value: 'C', label: 'Consignee' },
  { value: 'T', label: 'Third Party' },
];

export const XPO_PICKUP_REQUEST_SPECIAL_EQUIPMENT_OPTIONS = [
  { value: 'F', label: 'Forklift' },
  { value: 'C', label: 'Crane' },
  { value: 'T', label: 'Tailgate' },
];

export const XPO_PICKUP_REQUEST_COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'MX', label: 'Mexico' },
];

export const XPO_PICKUP_REQUEST_REQUIRED_FIELDS: string[] = [
  'pickupRqstInfo.pkupDate',
  'pickupRqstInfo.readyTime',
  'pickupRqstInfo.closeTime',
  'pickupRqstInfo.shipper.name',
  'pickupRqstInfo.shipper.addressLine1',
  'pickupRqstInfo.shipper.cityName',
  'pickupRqstInfo.shipper.stateCd',
  'pickupRqstInfo.shipper.postalCd',
  'pickupRqstInfo.requestor.contact.companyName',
  'pickupRqstInfo.requestor.contact.fullName',
  'pickupRqstInfo.requestor.contact.phone.phoneNbr',
  'pickupRqstInfo.requestor.roleCd',
  'pickupRqstInfo.contact.companyName',
  'pickupRqstInfo.contact.fullName',
  'pickupRqstInfo.contact.phone.phoneNbr',
  'pickupRqstInfo.pkupItem',
];

