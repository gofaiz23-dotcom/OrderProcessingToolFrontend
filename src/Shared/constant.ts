export const MARKETPLACES = [
  'Amazon',
  'Walmart',
  'eBay',
  'Shopify',
  'Overstock',
  'Wayfair',
  'Sears',
  'Target',
  'HomeDepot',
  'NewEgg',
  'Rakuten',
  'GigaB2B',
] as const;

export type Marketplace = typeof MARKETPLACES[number];

// Marketplace abbreviation mapping (2 letters)
export const MARKETPLACE_ABBREVIATIONS: Record<string, string> = {
  'Walmart': 'WM',
  'Amazon': 'AZ',
  'eBay': 'EB',
  'Shopify': 'SF',
  'Overstock': 'OS',
  'Wayfair': 'WF',
  'Sears': 'SR',
  'Target': 'TG',
  'HomeDepot': 'HD',
  'NewEgg': 'NE',
  'Rakuten': 'RT',
  'GigaB2B': 'GB',
} as const;

export const LOGISTICS_CARRIERS = [
  // 'FedEx',
  'XPO',
  'Estes',
 
] as const;

export type LogisticsCarrier = typeof LOGISTICS_CARRIERS[number];

// Default values for Rate Quote form
export const ESTES_RATE_QUOTE_DEFAULTS = {
  requestorEmail: "gofaiz23@gmail.com",
  requestorName: "Decora2z exit crownmark NC",
  requestorPhone: "3368046700",
  role: "Third-Party"
};

// Default values for Bill To Information in Bill of Lading
export const ESTES_BILL_TO_DEFAULTS = {
  companyName: "DECORA2Z",
  email: "SHAMYASLI@YAHOO.COM",
  contactName: "TARIF HAWASLY",
  address1: "19150 SUMMIT RIDGE",
  address2: "",
  city: "Walnut",
  state: "CA",
  zipCode: "91789",
  country: "USA",
  phone: "(626) 715-0682"
};

// Default values for Shipper Information in Bill of Lading
export const ESTES_SHIPPER_DEFAULTS = {
  companyName: "Decora2z exit crownmark NC",
  email: "gofaiz23@gmail.com",
  contactName: "Lynn/Andrea",
  address1: "728 gallimore Dairy Rd",
  address2: "",
  zipCode: "27265",
  city: "High Point",
  state: "NC",
  country: "USA",
  phone: "3368046700"
};





export const ESTES_AUTOFILL_DATA = {
  "quoteRequest": {
    "shipDate": "2025-11-24",
    "shipTime": "14:30",
    "serviceLevels": ["LTL", "LTLTC"]
  },
  "payment": {
    "account": "0216496",
    "payor": "Third Party",
    "terms": "Prepaid"
  },
  "requestor": {
    "name": "Mary Smith",
    "phone": "8045551234",
    "email": "hawaslytech@gmail.com"
  },
  "origin": {
    "address": {
      "city": "Washington",
      "stateProvince": "DC",
      "postalCode": "20001",
      "country": "US"
    }
  },
  "destination": {
    "address": {
      "city": "Richmond",
      "stateProvince": "VA",
      "postalCode": "23234",
      "country": "US"
    }
  },
  "commodity": {
    "handlingUnits": [
      {
        "count": 1,
        "type": "PLT",
        "weight": 300,
        "weightUnit": "Pounds",
        "length": 48,
        "width": 40,
        "height": 92,
        "dimensionsUnit": "Inches",
        "isStackable": true,
        "isTurnable": true,
        "lineItems": [
          {
            "description": "Boxes of widgets",
            "weight": 300,
            "pieces": 5,
            "packagingType": "PLT",
            "classification": "250",
            "nmfc": "079300",
            "nmfcSub": "03",
            "isHazardous": false
          }
        ]
      }
    ]
  },
  "accessorials": {
    "codes": ["LGATE", "HD"]
  }
} as const;

export const ESTES_BOL_AUTOFILL_DATA = {
  "account": {
    "myAccount": "0216496",
    "role": "Third-Party"
  },
  "billing": {
    "payer": "Third Party",
    "terms": "Prepaid"
  },
  "shipment": {
    "masterBol": "nw-abc123-wm",
    "shipDate": "2025-11-29",
    "quoteId": "LTW2WP2",
    "autoAssignPro": true
  },
  "origin": {
    "account": "0216496",
    "name": "hawasly exit poundex",
    "address1": "21490 baker parkway",
    "address2": "",
    "city": "City Of Industry",
    "stateProvince": "CA",
    "postalCode": "91789",
    "country": "USA",
    "contactName": "olga",
    "phone": "(909) 444-5878",
    "email": "gofaiz23@gmail.com"
  },
  "destination": {
    "name": "abc123",
    "address1": "1234-n street",
    "address2": "",
    "city": "Arlington",
    "stateProvince": "TX",
    "postalCode": "76011",
    "country": "USA",
    "contactName": "",
    "phone": "(123) 123-1234",
    "email": "gofaiz23@gmail.com"
  },
  "billTo": {
    "account": "0216496",
    "name": "DECORA2Z",
    "address1": "19150 SUMMIT RIDGE",
    "address2": "",
    "city": "Walnut",
    "stateProvince": "CA",
    "postalCode": "91789",
    "country": "USA",
    "contactName": "TARIF HAWASLY",
    "phone": "(626) 715-0682",
    "email": "SHAMYASLI@YAHOO.COM"
  },
  "accessorials": {
    "liftGateService": true,
    "residentialDelivery": true,
    "appointmentRequest": false
  },
  "specialHandling": [
    "Added Accessorials Require Pre Approval",
    "Do Not Break Down the Pallet",
    "Do Not Remove Shrink Wrap from Skid",
    "Fragile-Handle with Care"
  ],
  "commodities": {
    "handlingUnits": [
      {
        "doNotStack": true,
        "handlingUnitType": "PALLET",
        "quantity": 1,
        "length": 48,
        "width": 40,
        "height": 92,
        "weight": 300,
        "class": "250",
        "nmfc": "079300",
        "sub": "03",
        "items": [
          {
            "description": "kd furniture items -subsku1, subsku2, subsku3",
            "pieces": 3,
            "pieceType": "CARTON"
          }
        ]
      }
    ]
  },
  "notifications": {
    "billOfLadingNotification": true,
    "shippingLabelsNotification": true,
    "trackingUpdatesNotification": true,
    "shippingLabelFormat": "Zebra 4 X 6",
    "shippingLabelQuantity": 1,
    "shippingLabelPosition": 1,
    "emails": ["gofaiz23@gmail.com"],
    "sendTo": {
      "billOfLading": { "shipper": true, "consignee": false, "thirdParty": false },
      "shippingLabels": { "shipper": true, "consignee": false, "thirdParty": false },
      "trackingUpdates": { "shipper": true, "consignee": false, "thirdParty": false }
    }
  }
} as const;

export type User = {
  id: string;
  username: string;
  password: string;
  email: string;
  name: string;
};

/**
 * Parse allowed users from environment variable
 * Returns empty array if env variable is not set or invalid
 */
const parseAllowedUsers = (): User[] => {
  const envUsers = process.env.NEXT_PUBLIC_ALLOWED_USERS;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Check if env variable exists and is not the string "undefined"
  if (!envUsers || envUsers === 'undefined' || envUsers === 'null') {
    if (isDevelopment) {
      console.error('⚠️ NEXT_PUBLIC_ALLOWED_USERS environment variable is not set.');
      console.error('💡 Create a .env.local file in the OrderProcessingToolFrontend folder with:');
      console.error('   NEXT_PUBLIC_ALLOWED_USERS=[{"id":"1","username":"user","password":"pass","email":"email@example.com","name":"Name"}]');
      console.error('💡 Then restart your dev server (npm run dev)');
    }
    return [];
  }
  
  // Trim whitespace from the environment variable
  let trimmedEnvUsers = envUsers.trim();
  
  if (!trimmedEnvUsers || trimmedEnvUsers === 'undefined' || trimmedEnvUsers === 'null') {
    if (isDevelopment) {
      console.error('⚠️ NEXT_PUBLIC_ALLOWED_USERS environment variable is empty after trimming.');
    }
    return [];
  }
  
  // Remove surrounding quotes if present (common issue with env vars)
  if (
    (trimmedEnvUsers.startsWith('"') && trimmedEnvUsers.endsWith('"')) ||
    (trimmedEnvUsers.startsWith("'") && trimmedEnvUsers.endsWith("'"))
  ) {
    trimmedEnvUsers = trimmedEnvUsers.slice(1, -1);
  }
  
  try {
    const parsed = JSON.parse(trimmedEnvUsers);
    
    // Validate that it's an array
    if (!Array.isArray(parsed)) {
      if (isDevelopment) {
        console.error('NEXT_PUBLIC_ALLOWED_USERS must be a JSON array.');
      }
      return [];
    }
    
    if (parsed.length === 0) {
      if (isDevelopment) {
        console.error('NEXT_PUBLIC_ALLOWED_USERS array is empty. No users will be allowed to login.');
      }
      return [];
    }
    
    // Validate each user has required fields
    const isValid = parsed.every(
      (user: any) =>
        user.id &&
        user.username &&
        user.password &&
        user.email &&
        user.name
    );
    
    if (!isValid) {
      if (isDevelopment) {
        console.error('Invalid user format in NEXT_PUBLIC_ALLOWED_USERS. Each user must have: id, username, password, email, name.');
      }
      return [];
    }
    
    // Decode URL-encoded passwords if present (for special characters like #, !, @)
    const decodedUsers = parsed.map((user: any) => {
      if (user.password && user.password.includes('%')) {
        try {
          user.password = decodeURIComponent(user.password);
        } catch (e) {
          // If decoding fails, keep original password
        }
      }
      return user;
    });
    
    if (isDevelopment) {
      console.log(`✅ Successfully loaded ${decodedUsers.length} user(s) from NEXT_PUBLIC_ALLOWED_USERS`);
      // Log usernames for reference (not passwords for security)
      console.log('📋 Available usernames:', decodedUsers.map((u: User) => u.username).join(', '));
    }
    return decodedUsers as User[];
  } catch (error) {
    // Log the actual value first (only in development)
    if (isDevelopment) {
      console.error('❌ ========== JSON Parse Error ==========');
      console.error('Raw env value:', envUsers);
      console.error('Trimmed value:', trimmedEnvUsers);
      console.error('Value length:', trimmedEnvUsers.length);
      console.error('First 500 chars:', trimmedEnvUsers.substring(0, 500));
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 200)
      } : { error: String(error) };
      
      console.error('Error details:', errorDetails);
      console.error('💡 Expected format: [{"id":"1","username":"user","password":"pass","email":"email@example.com","name":"Name"}]');
      console.error('💡 Make sure your .env.local file has the variable set correctly');
      console.error('💡 Restart your dev server after changing .env.local');
      console.error('==========================================');
    }
    return [];
  }
};

// Safely parse allowed users, with fallback to empty array if parsing fails
let ALLOWED_USERS: User[] = [];
try {
  ALLOWED_USERS = parseAllowedUsers();
} catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Critical error parsing ALLOWED_USERS. App will continue but authentication may not work:', error);
  }
  ALLOWED_USERS = [];
}

export { ALLOWED_USERS };

export type EstesAccount = {
  accountNumber: string;
  type: string;
  companyName: string;
  address: string;
};

export const ESTES_ACCOUNTS: EstesAccount[] = [
  {
    accountNumber: '0216496',
    type: 'Regular',
    companyName: 'Decora2z',
    address: '19150 Summit Ridge, Walnut, CA 91789',
  },
] as const;

export type AddressBookOption = {
  value: string;
  label: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export const ESTES_ADDRESS_BOOK: AddressBookOption[] = [
  {
    value: 'coaster',
    label: 'Coaster - CA - 20300.e Business Parkway, City Of Industry, CA 91789',
    city: 'City Of Industry',
    state: 'CA',
    zip: '91789',
    country: 'USA',
  },
  {
    value: 'acme',
    label: 'Acme Furniture - IL - 900 Phoenix Lake Ave., Streamwood, IL 60107',
    city: 'Streamwood',
    state: 'IL',
    zip: '60107',
    country: 'USA',
  },
] as const;

export type ShipperAddressOption = {
  value: string;
  label: string;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  contactName?: string;
  phone?: string;
  email?: string;
  account?: string;
};

// Shipper Information addresses
export const ESTES_SHIPPER_ADDRESSES: ShipperAddressOption[] = [
  {
    value: 'Hawasly exit poundex',
    label: 'Hawasly exit poundex - CA - 21490 baker parkway, City Of Industry, CA 91789',
    name: 'hawasly exit poundex',
    address1: '21490 baker parkway',
    address2: '',
    city: 'City Of Industry',
    state: 'CA',
    zip: '91789',
    country: 'USA',
    contactName: 'olga',
    phone: '(909) 444-5878',
    email: 'gofaiz23@gmail.com',
    account: '0216496',
  },
  {
    value: 'Decora2z exit crownmark NC',
    label: 'Decora2z exit crownmark NC - NC - 728 gallimore Dairy Rd, High Point, NC 27265',
    name: 'Decora2z exit crownmark NC',
    address1: '728 gallimore Dairy Rd',
    address2: '',
    city: 'High Point',
    state: 'NC',
    zip: '27265',
    country: 'USA',
    contactName: 'Lynn/Andrea',
    phone: '3368046700',
    email: 'gofaiz23@gmail.com',
  },
] as const;

// Default values for Rate Quote form
export const ESTES_RATE_QUOTE_FORM_DEFAULTS = {
  
  // Ship time default
  defaultShipTime: '11:00', // 11AM
  
  // Accessorials defaults
  defaultLiftGateService: true,
  defaultResidentialDelivery: true,
  defaultAppointmentRequest: false,
  
  // Handling Unit defaults
  defaultClass: '250',
  defaultNMFC: '079300',
  defaultSub: '03',
  defaultDescription: 'Boxes of widgets',
} as const;

// XPO Address Book Options
export type XPOAddressBookOption = {
  id?: number;
  name?: string;
  address?: string;
  deliveryType?: string;
  // Legacy fields for backward compatibility (used in consignee address book)
  value?: string;
  label?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  streetAddress?: string;
  addressLine2?: string;
  phone?: string;
  extension?: string;
  contactName?: string;
};

// XPO Shipper Address Book
export const XPO_SHIPPER_ADDRESS_BOOK: XPOAddressBookOption[] = [
  {
    id: 2534663,
    name: 'AMMANA',
    address: '8350 PARDEE DR STE 200 OAKLAND CA 94621',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 10164998,
    name: 'AMMANA',
    address: '11591 ETIWANDA AVE FONTANA CA 92337',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 16360894,
    name: 'AMMANA',
    address: '2601 W AIRPORT FWY STE 300 DFW AIRPORT TX US 75261',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 44160022,
    name: 'AMMANA',
    address: '7510 ARDMORE ST HOUSTON TX 77054',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 62894381,
    name: 'AMMANA',
    address: '13770 NORTON AVE CHINO CA 91710',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 65098061,
    name: 'AMMANA',
    address: '1212 TREND DR CARROLLTON TX US 75006',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 68500516,
    name: 'AMMANA',
    address: '1300 LAKES PKWY # 100 LAWRENCEVILLE GA 30043',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 98186409,
    name: 'AMMANA',
    address: '2125 EXCHANGE DR ARLINGTON TX 76011',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 101013170,
    name: 'AMMANA',
    address: '7351 MCGUIRE AVE FONTANA CA 92336',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 118364408,
    name: 'AMMANA',
    address: '21490 BAKER PKWY CITY OF INDUSTRY CA 91789',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 133115897,
    name: 'AMMANA',
    address: '10881 S SAM HOUSTON PKWY W HOUSTON TX US 77031',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 139285067,
    name: 'AMMANA',
    address: '3375 DE FOREST CIR JURUPA VALLEY CA 91752',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 149428788,
    name: 'AMMANA',
    address: '21490 BAKER PKWY CITY OF INDUSTRY CA 91789',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 173403861,
    name: 'AMMANA',
    address: '5383 TRUMAN DR DECATUR GA 30035',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 196899443,
    name: 'AMMANA',
    address: '2090 S BAKER AVE ONTARIO CA 91761',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 204673487,
    name: 'AMMANA',
    address: '247 POWER CT SANFORD FL 32771',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 245266454,
    name: 'AMMANA',
    address: '7400 S LOOMIS BLVD CHICAGO IL US 60636',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 276851796,
    name: 'AMMANA',
    address: '10700 ENTERPRISE WAY MIRAMAR FL 33025',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 370277115,
    name: 'AMMANA',
    address: '1330 W HOLT AVE POMONA CA 91768',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 404476595,
    name: 'AMMANA',
    address: '127 FIELDCREST AVE EDISON NJ 08837',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 445319330,
    name: 'AMMANA',
    address: '1208 COMMERCIAL BLVD N ARLINGTON TX 76001',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 446428167,
    name: 'AMMANA',
    address: '15101 SANTA ANA AVE # 102 FONTANA CA 92337',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 456792683,
    name: 'AMMANA',
    address: '15124 GRAND RIVER RD STE 100 FORT WORTH TX 76155',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 473508218,
    name: 'AMMANA',
    address: '9500 W SAM HOUSTON PKWY S HOUSTON TX 77099',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 490616957,
    name: 'AMMANA',
    address: '728 GALLIMORE DAIRY RD HIGH POINT NC US 27265',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 531230732,
    name: 'AMMANA',
    address: '10506 SHOEMAKER AVE SANTA FE SPRINGS CA 90670',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 553331869,
    name: 'AMMANA',
    address: '45 STULTS RD STE 2 DAYTON NJ 08810',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 578853268,
    name: 'AMMANA',
    address: '2137 E 55TH ST VERNON CA 90058',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 591972061,
    name: 'AMMANA',
    address: '20002 BUSINESS PKWY CITY OF INDUSTRY CA 91789',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 595607021,
    name: 'AMMANA',
    address: '6301 BEST FRIEND RD NORCROSS GA 30071',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 639358563,
    name: 'AMMANA',
    address: '80 STULTS RD DAYTON NJ 08810',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 660872094,
    name: 'AMMANA',
    address: '50 ENTERPRISE AVE N SECAUCUS NJ 07094',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 667231703,
    name: 'AMMANA',
    address: '9641 PREMIER PKWY MIRAMAR FL 33025',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 682167922,
    name: 'AMMANA',
    address: '3695 S WILLOW AVE FRESNO CA 93725',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 742062949,
    name: 'AMMANA',
    address: '343 BALDWIN PARK BLVD CITY OF INDUSTRY CA 91746',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 754841239,
    name: 'AMMANA',
    address: '4850 EUCALYPTUS AVE CHINO CA 91710',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 786700162,
    name: 'AMMANA',
    address: '4300B S FULTON PKWY COLLEGE PARK GA 30349',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 808842770,
    name: 'AMMANA',
    address: '14901 GRAND RIVER RD FORT WORTH TX 76155',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 837256005,
    name: 'AMMANA',
    address: '31918 HAYMAN ST HAYWARD CA 94544',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 875178338,
    name: 'AMMANA',
    address: '255 WILLE RD DES PLAINES IL 60018',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 878622937,
    name: 'AMMANA',
    address: '6557 FLOTILLA ST COMMERCE CA 90040',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 887672543,
    name: 'AMMANA',
    address: '19605 E WALNUT DR N CITY OF INDUSTRY CA 91789',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 950832236,
    name: 'AMMANA',
    address: '32 PLUM ST TRENTON NJ 08638',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 969216112,
    name: 'AMMANA',
    address: '4816 N W 159TH STREET MIAMI GARDENS FL 33014',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 974740656,
    name: 'AMMANA',
    address: '311 HALF ACRE RD CRANBURY NJ US 08512',
    deliveryType: 'Pickup/Delivery',
  },
  {
    id: 976058734,
    name: 'AMMANA',
    address: '6546 PETROPARK DR # BHOUSTON TX 77041',
    deliveryType: 'Pickup/Delivery',
  },
] as const;

// XPO Consignee Address Book
export const XPO_CONSIGNEE_ADDRESS_BOOK: XPOAddressBookOption[] = [
  {
    value: 'warehouse1',
    label: 'Warehouse 1 - TX - 2125 Exchange Drive, Arlington, TX 76011',
    city: 'Arlington',
    state: 'TX',
    zip: '76011',
    country: 'US',
  },
  {
    value: 'warehouse2',
    label: 'Warehouse 2 - CA - 1234 Main Street, Los Angeles, CA 90210',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
    country: 'US',
  },
] as const;

// US States Options
export const US_STATES_OPTIONS = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
] as const;

// Freight Class Options
export const FREIGHT_CLASS_OPTIONS = [
  { value: '50', label: '50' },
  { value: '55', label: '55' },
  { value: '60', label: '60' },
  { value: '65', label: '65' },
  { value: '70', label: '70' },
  { value: '77.5', label: '77.5' },
  { value: '85', label: '85' },
  { value: '92.5', label: '92.5' },
  { value: '100', label: '100' },
  { value: '110', label: '110' },
  { value: '125', label: '125' },
  { value: '150', label: '150' },
  { value: '175', label: '175' },
  { value: '200', label: '200' },
  { value: '250', label: '250' },
  { value: '300', label: '300' },
  { value: '400', label: '400' },
  { value: '500', label: '500' },
] as const;

// Additional Commodity Options
export const ADDITIONAL_COMMODITY_OPTIONS = [
  { value: '', label: 'Select Additional Commodity' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'automotive', label: 'Automotive Parts' },
  { value: 'machinery', label: 'Machinery' },
  { value: 'textiles', label: 'Textiles' },
  { value: 'food', label: 'Food Products' },
  { value: 'chemicals', label: 'Chemicals' },
  { value: 'building_materials', label: 'Building Materials' },
  { value: 'other', label: 'Other' },
] as const;

// Custom Commodity Type with full details
export type CustomCommodity = {
  id: string;
  value: string;
  label: string;
  createdAt: string;
  // Commodity details
  description?: string;
  weight?: number;
  freightClass?: string;
  length?: number;
  width?: number;
  height?: number;
  pieces?: number;
  packageCode?: string;
  freezableProtection?: boolean;
  hazmatItem?: boolean;
};

// Storage key for custom commodities
export const CUSTOM_COMMODITIES_STORAGE_KEY = 'xpo_custom_commodities';

// Helper functions to manage custom commodities in localStorage
export const getCustomCommodities = (): CustomCommodity[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CUSTOM_COMMODITIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addCustomCommodity = (commodityData: Omit<CustomCommodity, 'id' | 'createdAt' | 'value'>): CustomCommodity => {
  const newCommodity: CustomCommodity = {
    id: `custom_${Date.now()}`,
    value: commodityData.label.toLowerCase().replace(/\s+/g, '_'),
    label: commodityData.label,
    createdAt: new Date().toISOString(),
    description: commodityData.description,
    weight: commodityData.weight,
    freightClass: commodityData.freightClass,
    length: commodityData.length,
    width: commodityData.width,
    height: commodityData.height,
    pieces: commodityData.pieces,
    packageCode: commodityData.packageCode,
    freezableProtection: commodityData.freezableProtection,
    hazmatItem: commodityData.hazmatItem,
  };
  
  const existing = getCustomCommodities();
  const updated = [...existing, newCommodity];
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_COMMODITIES_STORAGE_KEY, JSON.stringify(updated));
  }
  
  return newCommodity;
};

export const updateCustomCommodity = (id: string, commodityData: Partial<CustomCommodity>): void => {
  const existing = getCustomCommodities();
  const updated = existing.map(cc => 
    cc.id === id ? { ...cc, ...commodityData } : cc
  );
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_COMMODITIES_STORAGE_KEY, JSON.stringify(updated));
  }
};

export const getCustomCommodityById = (id: string): CustomCommodity | undefined => {
  const commodities = getCustomCommodities();
  return commodities.find(cc => cc.id === id);
};

export const getCustomCommodityByValue = (value: string): CustomCommodity | undefined => {
  const commodities = getCustomCommodities();
  return commodities.find(cc => cc.value === value);
};

export const getAllCommodityOptions = () => {
  const customCommodities = getCustomCommodities();
  return customCommodities.map(cc => ({ value: cc.value, label: cc.label, id: cc.id }));
};

// Excessive Length Options
export const EXCESSIVE_LENGTH_OPTIONS = [
  { value: '', label: 'Select Excessive Length' },
  { value: 'none', label: 'None' },
  { value: '12ft', label: '12 Feet' },
  { value: '15ft', label: '15 Feet' },
  { value: '18ft', label: '18 Feet' },
  { value: '20ft', label: '20 Feet' },
  { value: '22ft', label: '22 Feet' },
  { value: '24ft', label: '24 Feet' },
  { value: '26ft', label: '26 Feet' },
  { value: '28ft', label: '28 Feet' },
  { value: '30ft', label: '30 Feet' },
  { value: 'custom', label: 'Custom Length' },
] as const;

// XPO Default Delivery Services
// These services are selected by default: Lift Gate, Notification Prior to Delivery, Residential
export const XPO_DEFAULT_DELIVERY_SERVICES: string[] = ['LIFT', 'NOTIFY', 'RESI'] as const;

// XPO Rate Quote Form Defaults
export const XPO_RATE_QUOTE_DEFAULTS = {
  freightClass: '250', // Default Freight Class
  packaging: 'PLT', // Default Packaging (Pallet)
  excessiveLength: 'none', // Default Excessive Length (None)
} as const;

// XPO BOL Form Default Values
export const XPO_BOL_DEFAULTS = {
  // Basic Information
  requesterRole: 'S', // Shipper
  paymentTerms: 'P', // Prepaid
  
  // Pickup Location (default values - will be populated from rate quote response)
  pickupLocation: {
    searchValue: '',
    company: '',
    careOf: '',
    streetAddress: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    extension: '',
    email: '',
  },
  
  // Delivery Location (default values from form)
  deliveryLocation: {
    searchValue: '',
    company: '',
    careOf: '',
    streetAddress: '',
    addressLine2: '',
    city: 'WASHINGTON',
    state: 'DC',
    postalCode: '20001',
    country: 'US',
    phone: '',
    extension: '',
    email: '',
  },
  
  // Commodity Defaults
  // Note: grossWeight.weight and nmfcClass will be populated from rate quote response
  // nmfcItemCd and sub have default values '079300' and '03' respectively (editable)
  commodity: {
    desc: 'KD Furniture',
    grossWeight: {
      weight: 0, // Will be populated from rate quote response
    },
    nmfcClass: '', // Will be populated from rate quote response
    pieceCnt: 1,
    packaging: {
      packageCd: 'PLT', // Pallet
    },
    nmfcItemCd: '079300', // Default NMFC Code (editable)
    sub: '03', // Default Sub (editable)
    hazmatInd: false,
    freezableProtection: false,
  },
  
  // Delivery Services (default selections)
  defaultDeliveryServices: ['LIFT_GATE', 'NOTIFICATION_PRIOR', 'RESIDENTIAL'] as string[],
  
  // Pickup Services (default selections)
  defaultPickupServices: [] as string[],
  
  // Premium Services (default selections)
  defaultPremiumServices: [] as string[],
  
  // Pickup Request
  schedulePickup: true,
  pickupDate: (() => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })(), // Today's date
  pickupReadyTime: '11:00', // 11:00 AM
  dockCloseTime: '16:30', // 4:30 PM
  contactCompanyName: 'Ammana',
  contactName: 'Warehouse person',
  contactPhone: '+1 (123) 456-7890',
  contactExtension: '',
  useMyContactInfo: false,
  
  // XPO Pro Number
  proNumberOption: 'auto' as 'none' | 'auto' | 'preassigned',
  preAssignedProNumber: '',
  
  // Reference Numbers - will be populated from rate quote response
  referenceNumbers: [] as Array<{
    referenceTypeCd: string;
    reference: string;
    referenceCode: string;
    referenceDescr: string;
  }>,
  
  // Additional Comments / Remarks
  comments: 'Added Accessorials Require Pre Approval. Do Not Break Down the Pallet. Do Not Remove Shrink Wrap from Skid. Fragile-Handle with Care.',
  
  // Footer Options
  saveAsTemplate: false,
  signBOLWithRequester: false,
  agreeToTerms: true, // Default to checked
  
  // Bill To
  billTo: '',
  
  // Emergency Contact
  emergencyContactName: '',
  emergencyContactPhone: '',
  
  // Declared Value
  totalDeclaredValue: '',
  excessiveLiabilityAuth: '',
};

