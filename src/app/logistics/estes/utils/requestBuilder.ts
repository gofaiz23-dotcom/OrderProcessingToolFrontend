/**
 * Estes-specific request body builder
 * Converts form data to Estes API format
 */

type BuildRequestBodyParams = {
  myAccount: string;
  role: string;
  term: string;
  shipDate: string;
  shipTime: string;
  requestorName: string;
  requestorPhone: string;
  requestorEmail: string;
  originCity: string;
  originZipCode: string;
  originCountry: string;
  destinationCity: string;
  destinationZipCode: string;
  destinationCountry: string;
  handlingUnits: any[];
  liftGateService: boolean;
  residentialDelivery: boolean;
  appointmentRequest: boolean;
};

export const buildEstesRequestBody = (params: BuildRequestBodyParams) => {
  const {
    myAccount,
    role,
    term,
    shipDate,
    shipTime,
    requestorName,
    requestorPhone,
    requestorEmail,
    originCity,
    originZipCode,
    originCountry,
    destinationCity,
    destinationZipCode,
    destinationCountry,
    handlingUnits,
    liftGateService,
    residentialDelivery,
    appointmentRequest,
  } = params;

  // Map accessorials to codes
  const accessorialCodes: string[] = [];
  if (liftGateService) accessorialCodes.push('LGATE');
  if (residentialDelivery) accessorialCodes.push('HD');
  if (appointmentRequest) accessorialCodes.push('APPT');

  // Map handling unit types
  const typeMap: Record<string, string> = {
    'PALLET': 'PL',
    'SKID': 'SK',
    'CRATE': 'CR',
    'BOX': 'BX',
  };

  // Extract account number from myAccount (format: "0216496 - ...")
  const accountNumber = myAccount.split(' - ')[0] || myAccount;

  // Map role to payor
  const payorMap: Record<string, string> = {
    'Shipper': 'Shipper',
    'Consignee': 'Consignee',
    'Third-Party': 'Third Party',
  };

  // Extract state from city (format: "City, ST" or just use city)
  const getStateFromCity = (city: string) => {
    const parts = city.split(', ');
    return parts.length > 1 ? parts[1] : '';
  };

  return {
    quoteRequest: {
      shipDate: shipDate || undefined,
      shipTime: shipTime || undefined,
      serviceLevels: ['LTL', 'LTLTC'],
    },
    payment: {
      account: accountNumber,
      payor: payorMap[role] || role || undefined,
      terms: term || undefined,
    },
    requestor: {
      name: requestorName || undefined,
      phone: requestorPhone || undefined,
      email: requestorEmail || undefined,
    },
    origin: {
      address: {
        city: originCity || undefined,
        stateProvince: getStateFromCity(originCity) || undefined,
        postalCode: originZipCode || undefined,
        country: originCountry === 'USA' ? 'US' : originCountry || undefined,
      },
    },
    destination: {
      address: {
        city: destinationCity || undefined,
        stateProvince: getStateFromCity(destinationCity) || undefined,
        postalCode: destinationZipCode || undefined,
        country: destinationCountry === 'USA' ? 'US' : destinationCountry || undefined,
      },
    },
    commodity: {
      handlingUnits: handlingUnits.map((unit) => ({
        count: unit.quantity || undefined,
        type: typeMap[unit.handlingUnitType] || unit.handlingUnitType || undefined,
        weight: unit.weight || undefined,
        weightUnit: 'Pounds',
        length: unit.length || undefined,
        width: unit.width || undefined,
        height: unit.height || undefined,
        dimensionsUnit: 'Inches',
        isStackable: !unit.doNotStack,
        isTurnable: true,
        lineItems: unit.items.map((item) => ({
          description: item.description || undefined,
          weight: unit.weight || undefined,
          pieces: unit.quantity || undefined,
          packagingType: typeMap[unit.handlingUnitType] || unit.handlingUnitType || undefined,
          classification: unit.class || undefined,
          isHazardous: unit.hazardous || false,
        })),
      })),
    },
    accessorials: {
      codes: accessorialCodes.length > 0 ? accessorialCodes : undefined,
    },
  };
};

