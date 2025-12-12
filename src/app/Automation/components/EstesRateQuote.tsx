'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Loader2, ChevronDown, ChevronUp, Info, Plus } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { buildEstesRequestBody } from '@/app/logistics/estes/utils/requestBuilder';
import { EstesQuoteCard } from '@/app/logistics/estes/components/EstesQuoteCard';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildApiUrl } from '../../../../BaseUrl';
import { ESTES_ACCOUNTS, ESTES_RATE_QUOTE_DEFAULTS, ESTES_RATE_QUOTE_FORM_DEFAULTS, ESTES_ADDRESS_BOOK } from '@/Shared/constant';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';

type EstesRateQuoteProps = {
  order: Order;
};

export type EstesRateQuoteRef = {
  getQuote: () => Promise<void>;
};

type HandlingUnit = {
  id: string;
  doNotStack: boolean;
  handlingUnitType: string;
  quantity: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  class: string;
  nmfc: string;
  sub: string;
  hazardous: boolean;
  description: string;
  items: any[];
};

type CommodityItem = {
  id: string;
  description?: string;
};

// Helper function to extract value from JSONB
const getJsonbValue = (jsonb: Order['jsonb'], key: string): string => {
  if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '';
  const obj = jsonb as Record<string, unknown>;
  
  const normalizedKey = key.trim();
  const keyWithoutHash = normalizedKey.replace(/#/g, '');
  const keyLower = normalizedKey.toLowerCase();
  const keyWithoutHashLower = keyWithoutHash.toLowerCase();
  
  const keysToTry = [
    normalizedKey,
    keyWithoutHash,
    `#${keyWithoutHash}`,
    keyLower,
    keyWithoutHashLower,
    `#${keyWithoutHashLower}`,
  ];
  
  for (const k of keysToTry) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
      return String(obj[k]);
    }
  }
  
  const allKeys = Object.keys(obj);
  for (const objKey of allKeys) {
    const objKeyLower = objKey.toLowerCase();
    if (
      objKeyLower === keyLower ||
      objKeyLower === keyWithoutHashLower ||
      objKeyLower.includes(keyWithoutHashLower)
    ) {
      const value = obj[objKey];
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }
  }
  
  return '';
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const EstesRateQuote = forwardRef<EstesRateQuoteRef, EstesRateQuoteProps>(({ order }, ref) => {
  const { getToken, isTokenExpired, refreshToken, isSessionActive } = useLogisticsStore();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  const [storedToken, setStoredToken] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(true);

  // Account Information
  const [myAccount, setMyAccount] = useState(ESTES_ACCOUNTS[0]?.accountNumber || '');
  const [role, setRole] = useState<string>(ESTES_RATE_QUOTE_DEFAULTS.role);
  const [term, setTerm] = useState('Prepaid');
  const [shipDate, setShipDate] = useState(getTodayDate());
  const [shipTime, setShipTime] = useState<string>(ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultShipTime);

  // Requestor Information
  const [requestorName, setRequestorName] = useState(ESTES_RATE_QUOTE_DEFAULTS.requestorName);
  const [requestorPhone, setRequestorPhone] = useState(ESTES_RATE_QUOTE_DEFAULTS.requestorPhone);
  const [requestorEmail, setRequestorEmail] = useState<string>(ESTES_RATE_QUOTE_DEFAULTS.requestorEmail);

  // Address book data from constants
  const addressBookOptions = ESTES_ADDRESS_BOOK;

  // Origin Information
  const [originAddressBook, setOriginAddressBook] = useState<string>('');
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originZipCode, setOriginZipCode] = useState('');
  const [originCountry, setOriginCountry] = useState('USA');
  const [customOriginCountries, setCustomOriginCountries] = useState<string[]>([]);
  const [originLoadingZip, setOriginLoadingZip] = useState(false);

  // Destination Information
  const [destinationAddressBook, setDestinationAddressBook] = useState<string>('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [destinationZipCode, setDestinationZipCode] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('USA');
  const [customDestinationCountries, setCustomDestinationCountries] = useState<string[]>([]);
  const [destinationLoadingZip, setDestinationLoadingZip] = useState(false);

  // Accessorials
  const [liftGateService, setLiftGateService] = useState<boolean>(ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultLiftGateService);
  const [residentialDelivery, setResidentialDelivery] = useState<boolean>(ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultResidentialDelivery);
  const [appointmentRequest, setAppointmentRequest] = useState<boolean>(ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultAppointmentRequest);
  const [selectedAccessorials, setSelectedAccessorials] = useState<string[]>(() => {
    const accessorials: string[] = [];
    if (ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultLiftGateService) {
      accessorials.push('Lift-Gate Service (Delivery)');
    }
    if (ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultResidentialDelivery) {
      accessorials.push('Residential Delivery');
    }
    return accessorials;
  });

  // Handling Units
  const defaultHandlingUnit: HandlingUnit = {
    id: 'default-unit',
    doNotStack: false,
    handlingUnitType: 'PALLET',
    quantity: 1,
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    class: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultClass,
    nmfc: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultNMFC,
    sub: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultSub,
    hazardous: false,
    description: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription,
    items: [],
  };
  const [handlingUnits, setHandlingUnits] = useState<HandlingUnit[]>([defaultHandlingUnit]);

  // ZIP code lookup function
  const lookupZipCode = async (zipCode: string, type: 'origin' | 'destination') => {
    if (!zipCode || zipCode.length < 5) return;

    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    if (type === 'origin') {
      setOriginLoadingZip(true);
    } else {
      setDestinationLoadingZip(true);
    }

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${cleanedZip}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place['place name'];
          const state = place['state abbreviation'];
          const country = 'USA';

          if (type === 'origin') {
            setOriginCity(city);
            setOriginState(state);
            setOriginCountry(country);
          } else {
            setDestinationCity(city);
            setDestinationState(state);
            setDestinationCountry(country);
          }
        }
      }
    } catch (error) {
      // Silently fail
    } finally {
      if (type === 'origin') {
        setOriginLoadingZip(false);
      } else {
        setDestinationLoadingZip(false);
      }
    }
  };

  // Handle address book selection for origin
  const handleOriginAddressBookChange = (value: string) => {
    setOriginAddressBook(value);
    if (value) {
      const address = addressBookOptions.find(opt => opt.value === value);
      if (address) {
        setOriginCity(address.city);
        setOriginState(address.state);
        setOriginZipCode(address.zip);
        setOriginCountry(address.country);
      }
    }
  };

  // Handle address book selection for destination
  const handleDestinationAddressBookChange = (value: string) => {
    setDestinationAddressBook(value);
    if (value) {
      const address = addressBookOptions.find(opt => opt.value === value);
      if (address) {
        setDestinationCity(address.city);
        setDestinationState(address.state);
        setDestinationZipCode(address.zip);
        setDestinationCountry(address.country);
      }
    }
  };

  // Handle ZIP code change with auto-lookup
  useEffect(() => {
    if (originZipCode && originZipCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(originZipCode, 'origin');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [originZipCode]);

  useEffect(() => {
    if (destinationZipCode && destinationZipCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(destinationZipCode, 'destination');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [destinationZipCode]);

  // Auto-populate form from order data on mount
  useEffect(() => {
    if (!order?.jsonb) return;

    const orderJsonb = order.jsonb as Record<string, unknown>;

    // Requestor Information
    const customerName = getJsonbValue(orderJsonb, 'Customer Name');
    if (customerName) {
      setRequestorName(customerName);
    }

    const customerPhone = getJsonbValue(orderJsonb, 'Customer Phone Number') || 
                         getJsonbValue(orderJsonb, 'Phone') ||
                         getJsonbValue(orderJsonb, 'Phone Number');
    if (customerPhone) {
      setRequestorPhone(customerPhone);
    }

    const customerEmail = getJsonbValue(orderJsonb, 'Customer Email') || 
                          getJsonbValue(orderJsonb, 'Email') ||
                          getJsonbValue(orderJsonb, 'Customer Email Address');
    if (customerEmail) {
      setRequestorEmail(customerEmail);
    }

    // Destination Information
    const shipToCity = getJsonbValue(orderJsonb, 'Ship to City') ||
                      getJsonbValue(orderJsonb, 'City') ||
                      getJsonbValue(orderJsonb, 'Shipping City');
    if (shipToCity) {
      setDestinationCity(shipToCity);
    }

    const shipToState = getJsonbValue(orderJsonb, 'Ship to State') ||
                       getJsonbValue(orderJsonb, 'State') ||
                       getJsonbValue(orderJsonb, 'Ship to State/Province') ||
                       getJsonbValue(orderJsonb, 'Shipping State');
    if (shipToState) {
      setDestinationState(shipToState);
    }

    const shipToZip = getJsonbValue(orderJsonb, 'Ship to Zip Code') ||
                     getJsonbValue(orderJsonb, 'Zip') ||
                     getJsonbValue(orderJsonb, 'Ship to Postal Code') ||
                     getJsonbValue(orderJsonb, 'Shipping Zip Code');
    if (shipToZip) {
      setDestinationZipCode(shipToZip);
    }

    const shipToCountry = getJsonbValue(orderJsonb, 'Ship to Country') ||
                         getJsonbValue(orderJsonb, 'Shipping Country');
    if (shipToCountry) {
      const country = shipToCountry.toUpperCase();
      if (country === 'US' || country === 'USA' || country === 'UNITED STATES') {
        setDestinationCountry('USA');
      } else if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        setDestinationCountry('Canada');
      } else if (country === 'MX' || country === 'MEX' || country === 'MEXICO') {
        setDestinationCountry('Mexico');
      } else {
        setDestinationCountry(shipToCountry);
      }
    }

    // Weight from order
    const weight = getJsonbValue(orderJsonb, 'Weight');
    if (weight) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum > 0) {
        setHandlingUnits([{
          ...defaultHandlingUnit,
          weight: weightNum,
        }]);
      }
    }

    // Ship Date
    const orderDate = getJsonbValue(orderJsonb, 'Order Date') ||
                     getJsonbValue(orderJsonb, 'Date') ||
                     getJsonbValue(orderJsonb, 'Ship Date');
    if (orderDate) {
      try {
        const date = new Date(orderDate);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toISOString().split('T')[0];
          setShipDate(formattedDate);
        }
      } catch (e) {
        // If parsing fails, use today's date
      }
    }
  }, [order]);

  // Initialize token on mount
  useEffect(() => {
    setIsMounted(true);
    const normalizedCarrier = 'estes';
    const tokenFromStore = getToken(normalizedCarrier) || '';
    setStoredToken(tokenFromStore);
  }, [getToken]);

  // Build request body
  const buildRequestBody = () => {
    return buildEstesRequestBody({
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
    });
  };

  const handleAccessorialChange = (accessorial: string, checked: boolean) => {
    if (checked) {
      setSelectedAccessorials([...selectedAccessorials, accessorial]);
    } else {
      setSelectedAccessorials(selectedAccessorials.filter((a) => a !== accessorial));
    }
  };

  const addHandlingUnit = () => {
    const newUnit: HandlingUnit = {
      id: Date.now().toString(),
      doNotStack: false,
      handlingUnitType: 'PALLET',
      quantity: 1,
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      class: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultClass,
      nmfc: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultNMFC,
      sub: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultSub,
      hazardous: false,
      description: ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription,
      items: [],
    };
    setHandlingUnits([...handlingUnits, newUnit]);
  };

  const updateHandlingUnit = (id: string, field: keyof HandlingUnit, value: any) => {
    setHandlingUnits(
      handlingUnits.map((unit) => (unit.id === id ? { ...unit, [field]: value } : unit))
    );
  };

  const removeHandlingUnit = (id: string) => {
    if (handlingUnits.length > 1) {
      setHandlingUnits(handlingUnits.filter((unit) => unit.id !== id));
    }
  };

  const addItemToUnit = (unitId: string) => {
    setHandlingUnits(
      handlingUnits.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              items: [...unit.items, { id: Date.now().toString() }],
            }
          : unit
      )
    );
  };

  const handleGetQuote = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const normalizedCarrier = 'estes';
      let currentToken = getToken(normalizedCarrier) || storedToken;

      // Check if token exists and is valid
      if (!currentToken || isTokenExpired(normalizedCarrier, 10)) {
        if (isSessionActive()) {
          const refreshed = await refreshToken(normalizedCarrier);
          if (refreshed) {
            const refreshedToken = getToken(normalizedCarrier);
            if (refreshedToken) {
              currentToken = refreshedToken;
              setStoredToken(refreshedToken);
            }
          } else {
            setIsAuthModalOpen(true);
            setLoading(false);
            return;
          }
        } else {
          setIsAuthModalOpen(true);
          setLoading(false);
          return;
        }
      }

      if (!currentToken) {
        setIsAuthModalOpen(true);
        setLoading(false);
        return;
      }

      const requestBody = buildRequestBody();

      // Validate required fields
      if (!requestBody.payment?.account) {
        throw new Error('Account number is required');
      }
      if (!requestBody.origin?.address?.city || !requestBody.origin?.address?.postalCode) {
        throw new Error('Origin city and ZIP code are required');
      }
      if (!requestBody.destination?.address?.city || !requestBody.destination?.address?.postalCode) {
        throw new Error('Destination city and ZIP code are required');
      }
      if (!requestBody.commodity?.handlingUnits || requestBody.commodity.handlingUnits.length === 0) {
        throw new Error('At least one handling unit is required');
      }

      const payload = {
        shippingCompany: 'estes',
        ...requestBody,
      };

      const res = await fetch(buildApiUrl('/Logistics/create-rate-quote'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthModalOpen(true);
          setLoading(false);
          return;
        }

        let errorMessage = `Rate quote creation failed: ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : errorData.error.message || errorMessage;
          }
        } catch (parseError) {
          // Use default error message
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResponse(data);
      setShowAccountInfo(false);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Expose getQuote function via ref
  useImperativeHandle(ref, () => ({
    getQuote: () => handleGetQuote(),
  }));

  // Calculate totals
  const calculateTotals = () => {
    let totalCube = 0;
    let totalWeight = 0;
    let totalPieces = 0;

    handlingUnits.forEach((unit) => {
      const cube = (unit.length * unit.width * unit.height) / 1728;
      totalCube += cube * unit.quantity;
      totalWeight += unit.weight * unit.quantity;
      totalPieces += unit.quantity;
    });

    const totalDensity = totalCube > 0 ? totalWeight / totalCube : 0;

    return {
      totalCube: totalCube.toFixed(3),
      totalDensity: totalDensity.toFixed(3),
      totalWeight,
      totalPieces,
      totalHandlingUnits: handlingUnits.length,
    };
  };

  const totals = calculateTotals();
  const totalDensityValue = parseFloat(totals.totalDensity);
  const isDensityValid = totalDensityValue > 2 && totalDensityValue < 4;
  const densityError = !isNaN(totalDensityValue) && totalDensityValue > 0 && !isDensityValid;

  return (
    <div className="space-y-4">
      <form onSubmit={handleGetQuote} className="space-y-4">
        {/* Account Information - Accordion */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAccountInfo(!showAccountInfo)}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-base font-bold text-slate-900">Account Information</h2>
            {showAccountInfo ? (
              <ChevronUp className="text-slate-600" size={18} />
            ) : (
              <ChevronDown className="text-slate-600" size={18} />
            )}
          </button>
          {showAccountInfo && (
            <div className="p-4 space-y-4">
              {/* Account Information Section */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <SearchableDropdown
                      options={ESTES_ACCOUNTS.map(account => ({
                        value: account.accountNumber,
                        label: `${account.accountNumber} - ${account.type} - ${account.companyName} - ${account.address}`,
                      })) as SearchableDropdownOption[]}
                      value={myAccount}
                      onChange={setMyAccount}
                      label="My Accounts"
                      placeholder="Search or select account..."
                      required
                      filterKeys={['label', 'value']}
                      className="[&_input]:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-900">Role</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Shipper"
                          checked={role === 'Shipper'}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-3.5 h-3.5 text-green-600"
                        />
                        <span className="text-xs text-slate-700">Shipper</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Consignee"
                          checked={role === 'Consignee'}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-3.5 h-3.5 text-green-600"
                        />
                        <span className="text-xs text-slate-700">Consignee</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Third-Party"
                          checked={role === 'Third-Party'}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-3.5 h-3.5 text-green-600"
                        />
                        <span className="text-xs text-slate-700">Third-Party</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-900">Term</label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Prepaid">Prepaid</option>
                      <option value="Collect">Collect</option>
                      <option value="Third-Party">Third-Party</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-900">Ship Date</label>
                    <input
                      type="date"
                      value={shipDate}
                      onChange={(e) => setShipDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-900">Ship Time</label>
                    <input
                      type="time"
                      value={shipTime}
                      onChange={(e) => setShipTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </section>

              {/* Requestor Information */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Requestor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-900">Name</label>
                    <input
                      type="text"
                      value={requestorName}
                      onChange={(e) => setRequestorName(e.target.value)}
                      placeholder="Enter name"
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-900">Phone</label>
                    <input
                      type="tel"
                      value={requestorPhone}
                      onChange={(e) => setRequestorPhone(e.target.value)}
                      placeholder="Enter phone"
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-900">Email</label>
                    <input
                      type="email"
                      value={requestorEmail}
                      onChange={(e) => setRequestorEmail(e.target.value)}
                      placeholder="Enter email"
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </section>

              {/* Routing Information */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Routing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Origin */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Origin</h3>
                    <div className="space-y-3">
                      <SearchableDropdown
                        options={addressBookOptions as SearchableDropdownOption[]}
                        value={originAddressBook}
                        onChange={handleOriginAddressBookChange}
                        label="Address Book (Optional)"
                        placeholder="Search or select address..."
                        filterKeys={['label', 'city', 'state', 'zip']}
                      />

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-300"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-2 text-slate-500">or</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-900">
                            ZIP Code <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={originZipCode}
                              onChange={(e) => setOriginZipCode(e.target.value)}
                              placeholder="Enter ZIP code"
                              maxLength={10}
                              className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            {originLoadingZip && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={originCity}
                            onChange={(e) => setOriginCity(e.target.value)}
                            placeholder="City"
                            className="px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <input
                            type="text"
                            value={originState}
                            onChange={(e) => setOriginState(e.target.value.toUpperCase())}
                            placeholder="State"
                            maxLength={2}
                            className="px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-900">
                            Country <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={originCountry}
                            onChange={(e) => {
                              setOriginCountry(e.target.value);
                              if (e.target.value && 
                                  e.target.value !== 'USA' && 
                                  e.target.value !== 'Canada' && 
                                  e.target.value !== 'Mexico' &&
                                  !customOriginCountries.includes(e.target.value)) {
                                setCustomOriginCountries(prev => [...prev, e.target.value]);
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select Country</option>
                            <option value="USA">USA</option>
                            <option value="Canada">Canada</option>
                            <option value="Mexico">Mexico</option>
                            {customOriginCountries.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Destination</h3>
                    <div className="space-y-3">
                      <SearchableDropdown
                        options={addressBookOptions as SearchableDropdownOption[]}
                        value={destinationAddressBook}
                        onChange={handleDestinationAddressBookChange}
                        label="Address Book (Optional)"
                        placeholder="Search or select address..."
                        filterKeys={['label', 'city', 'state', 'zip']}
                      />

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-300"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-2 text-slate-500">or</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-900">
                            ZIP Code <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={destinationZipCode}
                              onChange={(e) => setDestinationZipCode(e.target.value)}
                              placeholder="Enter ZIP code"
                              maxLength={10}
                              className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            {destinationLoadingZip && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={destinationCity}
                            onChange={(e) => setDestinationCity(e.target.value)}
                            placeholder="City"
                            className="px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <input
                            type="text"
                            value={destinationState}
                            onChange={(e) => setDestinationState(e.target.value.toUpperCase())}
                            placeholder="State"
                            maxLength={2}
                            className="px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-900">
                            Country <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={destinationCountry}
                            onChange={(e) => {
                              setDestinationCountry(e.target.value);
                              if (e.target.value && 
                                  e.target.value !== 'USA' && 
                                  e.target.value !== 'Canada' && 
                                  e.target.value !== 'Mexico' &&
                                  !customDestinationCountries.includes(e.target.value)) {
                                setCustomDestinationCountries(prev => [...prev, e.target.value]);
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select Country</option>
                            <option value="USA">USA</option>
                            <option value="Canada">Canada</option>
                            <option value="Mexico">Mexico</option>
                            {customDestinationCountries.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Freight Accessorials */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Freight Accessorials</h3>
                  <Info className="text-green-500" size={16} />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={appointmentRequest}
                      onChange={(e) => setAppointmentRequest(e.target.checked)}
                      className="w-3.5 h-3.5 text-green-600 rounded"
                    />
                    <span className="text-xs text-slate-700">Appointment Request</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={liftGateService}
                      onChange={(e) => {
                        setLiftGateService(e.target.checked);
                        handleAccessorialChange('Lift-Gate Service (Delivery)', e.target.checked);
                      }}
                      className="w-3.5 h-3.5 text-green-600 rounded"
                    />
                    <span className="text-xs text-slate-700">Lift-Gate Service (Delivery)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={residentialDelivery}
                      onChange={(e) => {
                        setResidentialDelivery(e.target.checked);
                        handleAccessorialChange('Residential Delivery', e.target.checked);
                      }}
                      className="w-3.5 h-3.5 text-green-600 rounded"
                    />
                    <span className="text-xs text-slate-700">Residential Delivery</span>
                  </label>
                </div>
              </section>

              {/* Commodities */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Commodities</h3>
                  <Info className="text-green-500" size={16} />
                </div>
                {handlingUnits.map((unit, index) => (
                  <div key={unit.id} className="mb-4 p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Handling Unit {index + 1}
                      </h4>
                      {handlingUnits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHandlingUnit(unit.id)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={unit.doNotStack}
                          onChange={(e) => updateHandlingUnit(unit.id, 'doNotStack', e.target.checked)}
                          className="w-3.5 h-3.5 text-green-600 rounded"
                        />
                        <span className="text-xs text-slate-700">Do Not Stack</span>
                      </label>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">Type</label>
                        <select
                          value={unit.handlingUnitType}
                          onChange={(e) => updateHandlingUnit(unit.id, 'handlingUnitType', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="PALLET">PALLET</option>
                          <option value="SKID">SKID</option>
                          <option value="CRATE">CRATE</option>
                          <option value="BOX">BOX</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">Quantity</label>
                        <input
                          type="number"
                          value={unit.quantity}
                          onChange={(e) => updateHandlingUnit(unit.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">L (in)</label>
                        <input
                          type="number"
                          value={unit.length}
                          onChange={(e) => updateHandlingUnit(unit.id, 'length', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">W (in)</label>
                        <input
                          type="number"
                          value={unit.width}
                          onChange={(e) => updateHandlingUnit(unit.id, 'width', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">H (in)</label>
                        <input
                          type="number"
                          value={unit.height}
                          onChange={(e) => updateHandlingUnit(unit.id, 'height', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">Weight (lbs)</label>
                        <input
                          type="number"
                          value={unit.weight}
                          onChange={(e) => updateHandlingUnit(unit.id, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">Class</label>
                        <select
                          value={unit.class}
                          onChange={(e) => updateHandlingUnit(unit.id, 'class', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select</option>
                          <option value="50">50</option>
                          <option value="55">55</option>
                          <option value="60">60</option>
                          <option value="65">65</option>
                          <option value="70">70</option>
                          <option value="77.5">77.5</option>
                          <option value="85">85</option>
                          <option value="92.5">92.5</option>
                          <option value="100">100</option>
                          <option value="110">110</option>
                          <option value="125">125</option>
                          <option value="150">150</option>
                          <option value="175">175</option>
                          <option value="200">200</option>
                          <option value="250">250</option>
                          <option value="300">300</option>
                          <option value="400">400</option>
                          <option value="500">500</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">NMFC</label>
                        <input
                          type="text"
                          value={unit.nmfc}
                          onChange={(e) => updateHandlingUnit(unit.id, 'nmfc', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-900">Sub</label>
                        <input
                          type="text"
                          value={unit.sub}
                          onChange={(e) => updateHandlingUnit(unit.id, 'sub', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={unit.hazardous}
                          onChange={(e) => updateHandlingUnit(unit.id, 'hazardous', e.target.checked)}
                          className="w-3.5 h-3.5 text-green-600 rounded"
                        />
                        <span className="text-xs text-slate-700">Hazardous</span>
                      </label>
                    </div>

                    <div className="mt-3 space-y-1">
                      <label className="block text-xs font-semibold text-slate-900">Description</label>
                      <input
                        type="text"
                        value={unit.description || ''}
                        onChange={(e) => updateHandlingUnit(unit.id, 'description', e.target.value)}
                        placeholder="Enter description"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addHandlingUnit}
                  className="px-3 py-1.5 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-xs font-semibold flex items-center gap-2"
                >
                  <Plus size={14} />
                  ADD HANDLING UNIT
                </button>

                {/* Summary */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div>
                      <p className="text-slate-600">Total Cube:</p>
                      <p className="font-semibold text-slate-900">{totals.totalCube} ft³</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Total Density:</p>
                      <p className={`font-semibold ${densityError ? 'text-red-600' : 'text-green-600'}`}>
                        {totals.totalDensity} lb/ft³
                      </p>
                    </div>
          <div>
                      <p className="text-slate-600">Total Units:</p>
                      <p className="font-semibold text-slate-900">{totals.totalHandlingUnits}</p>
          </div>
          <div>
                      <p className="text-slate-600">Total Pieces:</p>
                      <p className="font-semibold text-slate-900">{totals.totalPieces}</p>
          </div>
          <div>
                      <p className="text-slate-600">Total Weight:</p>
                      <p className="font-semibold text-slate-900">{totals.totalWeight} lbs</p>
                    </div>
                  </div>
                  {densityError && (
                    <div className="mt-3">
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2">
                        <p className="text-red-700 text-xs font-bold">
                          ⚠️ Total Density must be greater than 2 and less than 4 (Current: {totals.totalDensity} lb/ft³)
                        </p>
          </div>
        </div>
                  )}
                </div>
              </section>
            </div>
          )}
      </div>

        {/* Submit Button */}
        <div className="flex justify-end">
      <button
            type="submit"
            disabled={!isMounted || loading}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting Quote...
          </>
        ) : (
              'GET QUOTE'
        )}
      </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-4">
          <ErrorDisplay error={error} />
        </div>
      )}

      {/* Quotes Display */}
      {response && response.data?.data && response.data.data.length > 0 && (
        <div className="space-y-4 mt-4">
          <h4 className="text-sm font-semibold text-slate-900">Rate Quote Results</h4>
          <div className="grid grid-cols-1 gap-3">
            {response.data.data.map((quote: any, index: number) => (
              <EstesQuoteCard key={quote.quoteId || index} quote={quote} index={index} />
            ))}
                </div>
        </div>
      )}

      {/* Logistics Authentication Modal */}
      <LogisticsAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          const normalizedCarrier = 'estes';
          const updatedToken = getToken(normalizedCarrier);
          if (updatedToken) {
            setStoredToken(updatedToken);
            setError(null);
          }
        }}
        carrier="estes"
      />
    </div>
  );
});

EstesRateQuote.displayName = 'EstesRateQuote';
