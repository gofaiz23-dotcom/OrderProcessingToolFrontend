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

export const LOGISTICS_CARRIERS = [
  // 'FedEx',
  'XPO',
  'Estes',
 
] as const;

export type LogisticsCarrier = typeof LOGISTICS_CARRIERS[number];

// Default values for Rate Quote form
export const ESTES_RATE_QUOTE_DEFAULTS = {
  requestorEmail: "gofaiz23@gmail.com",
  role: "Third-Party"
};

// Default values for Bill To Information in Bill of Lading
export const ESTES_BILL_TO_DEFAULTS = {
  companyName: "DECORA2Z",
  email: "SHAMYASLI@YAHOO.COM",
  contactName: "TARIF HAWASLY",
  address1: "19150 SUMMIT RIDGE",
  address2: "",
  zipCode: "91789",
  country: "USA",
  phone: "(626) 715-0682"
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

