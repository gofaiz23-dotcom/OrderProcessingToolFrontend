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
  'FedEx',
  'XPO',
  'Estes',
  'UPS',
  'Arcbest',
] as const;

export type LogisticsCarrier = typeof LOGISTICS_CARRIERS[number];

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

