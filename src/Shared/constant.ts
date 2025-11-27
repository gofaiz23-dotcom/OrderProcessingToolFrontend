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
    "shipDate": "2025-11-27",
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

