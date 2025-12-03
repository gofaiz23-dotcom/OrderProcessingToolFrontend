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
  originState: string;
  originZipCode: string;
  originCountry: string;
  destinationCity: string;
  destinationState: string;
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
    originState,
    originZipCode,
    originCountry,
    destinationCity,
    destinationState,
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

  // Helper function to get state - use state field directly, or try to extract from city as fallback
  const getState = (state: string, city: string) => {
    if (state && state.trim()) {
      return state.trim();
    }
    // Fallback: Try to extract state from city (format: "City, ST")
    const parts = city.split(', ');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return undefined;
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
      terms: term || 'Prepaid', // Default to 'Prepaid' if not specified to match autofill behavior
    },
    requestor: {
      name: requestorName || undefined,
      phone: requestorPhone || undefined,
      email: requestorEmail || undefined,
    },
    origin: {
      address: {
        city: originCity || undefined,
        stateProvince: getState(originState, originCity) || undefined,
        postalCode: originZipCode || undefined,
        country: originCountry === 'USA' ? 'US' : originCountry || undefined,
      },
    },
    destination: {
      address: {
        city: destinationCity || undefined,
        stateProvince: getState(destinationState, destinationCity) || undefined,
        postalCode: destinationZipCode || undefined,
        country: destinationCountry === 'USA' ? 'US' : destinationCountry || undefined,
      },
    },
    commodity: {
      handlingUnits: handlingUnits.map((unit) => {
        // Map items to lineItems
        let lineItems = unit.items.map((item: { description?: string }) => ({
          description: item.description || unit.description || '', // Use item description, fallback to unit description
          weight: unit.weight || undefined,
          pieces: unit.quantity || undefined,
          packagingType: typeMap[unit.handlingUnitType] || unit.handlingUnitType || undefined,
          classification: unit.class || undefined,
          isHazardous: unit.hazardous || false,
        }));
        
        // If no items, create a default lineItem from unit data
        if (lineItems.length === 0) {
          lineItems = [{
            description: unit.description || '', // Use unit description if available
            weight: unit.weight || undefined,
            pieces: unit.quantity || undefined,
            packagingType: typeMap[unit.handlingUnitType] || unit.handlingUnitType || undefined,
            classification: unit.class || undefined,
            isHazardous: unit.hazardous || false,
          }];
        }
        
        return {
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
          lineItems,
        };
      }),
    },
    accessorials: {
      codes: accessorialCodes.length > 0 ? accessorialCodes : undefined,
    },
  };
};

