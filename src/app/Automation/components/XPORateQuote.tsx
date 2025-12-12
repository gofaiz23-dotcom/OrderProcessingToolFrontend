'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Loader2, Calendar, Info, CheckCircle2, Clock, Search } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildXPORateQuoteRequestBody } from '@/app/logistics/xpo/utils/requestBuilder';
import type { XPORateQuoteCommodity } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import { XPO_RATE_QUOTE_DEFAULTS, XPO_SHIPPER_ADDRESS_BOOK, US_STATES_OPTIONS, FREIGHT_CLASS_OPTIONS, XPO_DEFAULT_DELIVERY_SERVICES } from '@/Shared/constant';
import { XPO_PAYMENT_TERM_OPTIONS, XPO_PACKAGE_CODE_OPTIONS, XPO_ROLE_OPTIONS, XPO_DELIVERY_SERVICES, XPO_PICKUP_SERVICES, XPO_PREMIUM_SERVICES, XPO_COUNTRY_OPTIONS } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import { EXCESSIVE_LENGTH_OPTIONS, ADDITIONAL_COMMODITY_OPTIONS } from '@/Shared/constant';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';
import { XPOQuoteCard } from '@/app/logistics/xpo/components/XPOQuoteCard';

type XPORateQuoteProps = {
  order: Order;
};

export type XPORateQuoteRef = {
  getQuote: () => Promise<void>;
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

// Helper function to parse address string
const parseAddressString = (addressStr: string): { streetAddress: string; addressLine2: string; city: string; state: string; zip: string } => {
  if (!addressStr || addressStr.trim() === '') {
    return { streetAddress: '', addressLine2: '', city: '', state: '', zip: '' };
  }

  let cleaned = addressStr.trim().replace(/\s+US\s+(\d{5})$/, ' $1');
  const zipMatch = cleaned.match(/(\d{5})$/);
  const zip = zipMatch ? zipMatch[1] : '';
  let withoutZip = cleaned.replace(/\s+\d{5}$/, '').trim();
  const stateMatch = withoutZip.match(/\s+([A-Z]{2})\s*$/);
  const state = stateMatch ? stateMatch[1] : '';
  let withoutStateZip = withoutZip.replace(/\s+[A-Z]{2}\s*$/, '').trim();
  withoutStateZip = withoutStateZip.replace(/#\s*B([A-Z])/gi, '# B $1');
  
  const parts = withoutStateZip.split(/\s+/);
  const streetAbbrevs = ['ST', 'AVE', 'DR', 'RD', 'PKWY', 'BLVD', 'CIR', 'CT', 'FWY', 'HWY', 'LN', 'PL', 'WAY', 'STREET'];
  const addressIndicators = ['STE', 'SUITE', '#', 'UNIT', 'APT', 'FLOOR', 'FL'];
  
  let cityStartIndex = parts.length;
  for (let i = parts.length - 1; i >= 0; i--) {
    const word = parts[i].toUpperCase();
    if (streetAbbrevs.includes(word) || addressIndicators.includes(word)) {
      cityStartIndex = i + 1;
      break;
    }
  }
  
  if (cityStartIndex === parts.length) {
    cityStartIndex = Math.max(1, parts.length - 2);
  }
  
  const streetParts = parts.slice(0, cityStartIndex);
  const cityParts = parts.slice(cityStartIndex);
  const city = cityParts.join(' ').toUpperCase();
  let streetAddressFull = streetParts.join(' ');
  
  let streetAddress = streetAddressFull;
  let addressLine2 = '';
  const steMatch = streetAddressFull.match(/^(.+?)\s+(STE|SUITE|#|UNIT|APT|FLOOR|FL\.?)\s*(.+)$/i);
  if (steMatch) {
    streetAddress = steMatch[1].trim();
    addressLine2 = `${steMatch[2].toUpperCase()} ${steMatch[3].trim()}`.trim();
  }
  
  return {
    streetAddress: streetAddress || '',
    addressLine2: addressLine2 || '',
    city: city || '',
    state: state || '',
    zip: zip || '',
  };
};

export const XPORateQuote = forwardRef<XPORateQuoteRef, XPORateQuoteProps>(({ order }, ref) => {
  const { getToken } = useLogisticsStore();
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [storedToken, setStoredToken] = useState<string>('');
  const [response, setResponse] = useState<any>(null);

  // Get token from store
  useEffect(() => {
    const token = getToken('xpo') || '';
    setStoredToken(token);
  }, [getToken]);

  // Get today's date in datetime-local format
  const getTodayDateTimeLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T12:00`;
  };

  // Convert datetime-local to ISO 8601
  const convertToISO8601 = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return '';
  };

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const convertToDateInputFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
  };

  // Convert YYYY-MM-DD to MM/DD/YYYY
  const convertFromDateInputFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${month}/${day}/${year}`;
    }
    return '';
  };

  // Form state
  const [requesterRole, setRequesterRole] = useState<string>('S');
  const [pickupDate, setPickupDate] = useState<string>(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  });
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handlePickupDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setPickupDate(convertFromDateInputFormat(dateValue));
    }
  };

  const handleCalendarIconClick = () => {
    dateInputRef.current?.showPicker?.() || dateInputRef.current?.click();
  };

  // Pickup Location
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [showPickupDetails, setShowPickupDetails] = useState(false);
  const [pickupCompany, setPickupCompany] = useState<string>('');
  const [pickupStreetAddress, setPickupStreetAddress] = useState<string>('');
  const [pickupAddressLine2, setPickupAddressLine2] = useState<string>('');
  const [pickupCity, setPickupCity] = useState<string>('');
  const [pickupState, setPickupState] = useState<string>('');
  const [pickupPostalCode, setPickupPostalCode] = useState<string>('');
  const [pickupCountry, setPickupCountry] = useState<string>('United States');
  const [pickupPhone, setPickupPhone] = useState<string>('');
  const [pickupExtension, setPickupExtension] = useState<string>('');
  const [pickupContactName, setPickupContactName] = useState<string>('');
  const [manualAccountId, setManualAccountId] = useState<string>('');
  const [useManualAccountId, setUseManualAccountId] = useState<boolean>(false);

  // Delivery Location
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>('');
  const [deliveryCountry, setDeliveryCountry] = useState<string>('United States');

  // Payment and Shipment
  const [paymentTermCd, setPaymentTermCd] = useState<string>('P');
  const [deliveryServices, setDeliveryServices] = useState<string[]>(XPO_DEFAULT_DELIVERY_SERVICES);
  const [pickupServices, setPickupServices] = useState<string[]>([]);
  const [premiumServices, setPremiumServices] = useState<string[]>([]);
  const [referenceNumbers, setReferenceNumbers] = useState<string>('');

  // Commodity
  const [commodities, setCommodities] = useState<XPORateQuoteCommodity[]>([{ 
    pieceCnt: 1,
    packageCode: XPO_RATE_QUOTE_DEFAULTS.packaging,
    grossWeight: {
      weight: 0,
      weightUom: 'LBS',
    },
    nmfcClass: XPO_RATE_QUOTE_DEFAULTS.freightClass,
    hazmatInd: false,
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      dimensionsUom: 'INCH',
    },
  }]);
  const [commodityDescriptions, setCommodityDescriptions] = useState<Record<number, string>>({ 0: '' });
  const [freezableProtection, setFreezableProtection] = useState<boolean>(false);
  const [hazmatItem, setHazmatItem] = useState<boolean>(false);
  const [additionalCommodity, setAdditionalCommodity] = useState<string>('');
  const [excessiveLength, setExcessiveLength] = useState<string>(XPO_RATE_QUOTE_DEFAULTS.excessiveLength);
  const [excessValueCoverage, setExcessValueCoverage] = useState<string>('');

  // Auto-populate from order data
  useEffect(() => {
    // Destination ZIP
    const zip = getJsonbValue(order.jsonb, 'Zip') || 
                getJsonbValue(order.jsonb, 'Postal Code') ||
                getJsonbValue(order.jsonb, 'ZIP Code');
    if (zip) {
      const zipMatch = zip.match(/\d{5}/);
      if (zipMatch) {
        setDeliveryPostalCode(zipMatch[0]);
      }
    }

    // Weight
    const weightStr = getJsonbValue(order.jsonb, 'Weight');
    if (weightStr) {
      const weight = parseFloat(weightStr);
      if (!isNaN(weight) && weight > 0) {
        setCommodities([{
          ...commodities[0],
          grossWeight: {
            weight: weight,
            weightUom: 'LBS',
          },
        }]);
      }
    }
  }, [order]);

  const handleDeliveryServiceChange = (value: string, checked: boolean) => {
    if (checked) {
      setDeliveryServices([...deliveryServices, value]);
    } else {
      setDeliveryServices(deliveryServices.filter(s => s !== value));
    }
  };

  const handlePickupServiceChange = (value: string, checked: boolean) => {
    if (checked) {
      setPickupServices([...pickupServices, value]);
    } else {
      setPickupServices(pickupServices.filter(s => s !== value));
    }
  };

  const handlePremiumServiceChange = (value: string, checked: boolean) => {
    if (checked) {
      setPremiumServices([...premiumServices, value]);
    } else {
      setPremiumServices(premiumServices.filter(s => s !== value));
    }
  };

  const updateCommodity = (index: number, field: keyof XPORateQuoteCommodity, value: any) => {
    const updated = [...commodities];
    if (field === 'grossWeight') {
      updated[index] = { ...updated[index], grossWeight: { ...updated[index].grossWeight, ...value } };
    } else if (field === 'dimensions') {
      updated[index] = { ...updated[index], dimensions: { ...updated[index].dimensions, ...value } };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setCommodities(updated);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    const currentToken = getToken('xpo') || storedToken;
    if (!currentToken) {
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setQuotes([]);

    try {
      // Validate
      const shipperZip = pickupPostalCode;
      const consigneeZip = deliveryPostalCode;
      
      if (useManualAccountId) {
        if (!manualAccountId || manualAccountId.trim() === '') {
          throw new Error('Account ID is required when using manual account ID');
        }
        if (!shipperZip) {
          throw new Error('Postal code is required');
        }
      } else {
        if (!pickupLocation && !shipperZip) {
          throw new Error('Pickup location is required');
        }
      }
      
      if (!consigneeZip) {
        throw new Error('Delivery postal code is required');
      }
      if (!deliveryCountry) {
        throw new Error('Delivery country is required');
      }
      if (!pickupDate) {
        throw new Error('Pickup date is required');
      }
      if (!commodities || commodities.length === 0) {
        throw new Error('At least one commodity is required');
      }

      // Build request body
      const shipmentDateISO = convertToISO8601(pickupDate) || new Date().toISOString();
      
      // Get shipper account ID
      let shipperAcctInstId: string | undefined = undefined;
      if (useManualAccountId && manualAccountId) {
        shipperAcctInstId = manualAccountId.trim();
      } else if (pickupLocation) {
        const addressId = pickupLocation.replace('ammana-', '');
        const address = XPO_SHIPPER_ADDRESS_BOOK.find(opt => opt.id?.toString() === addressId);
        if (address?.id) {
          shipperAcctInstId = address.id.toString();
        }
      }

      // Combine all services into accessorials
      const allAccessorials = [
        ...deliveryServices,
        ...pickupServices,
        ...premiumServices,
      ].filter((value, index, self) => self.indexOf(value) === index);

      // Get consignee country code
      let consigneeCountryCd = 'US';
      if (deliveryCountry) {
        const countryMap: Record<string, string> = {
          'United States': 'US',
          'Canada': 'CA',
          'Mexico': 'MX',
        };
        consigneeCountryCd = countryMap[deliveryCountry] || deliveryCountry.toUpperCase().substring(0, 2);
      }

      const requestBody = buildXPORateQuoteRequestBody({
        paymentTermCd,
        shipmentDate: shipmentDateISO,
        accessorials: allAccessorials.length > 0 ? allAccessorials : undefined,
        shipperPostalCd: shipperAcctInstId ? undefined : (shipperZip || undefined),
        shipperAcctInstId: shipperAcctInstId,
        consigneePostalCd: consigneeZip,
        consigneeCountryCd: consigneeCountryCd,
        commodity: commodities,
        commodityDescriptions: commodityDescriptions,
        palletCnt: 0,
        linealFt: 0,
        freezableInd: freezableProtection,
        hazmatInd: hazmatItem,
        bill2PartyUsZip4: '',
      });

      const payload = {
        shippingCompany: 'xpo',
        ...requestBody,
      };

      // Make API call
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
          throw new Error('Your session has expired. Please login again.');
        }
        
        let errorMessage = `Rate quote failed: ${res.statusText}`;
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
          // If JSON parsing fails, use status text
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResponse(data);
      
      // Extract quotes
      if (data.data?.data && Array.isArray(data.data.data)) {
        setQuotes(data.data.data);
      } else if (data.data?.data?.rateQuote) {
        setQuotes([data.data.data.rateQuote]);
      } else if (data.data && Array.isArray(data.data)) {
        setQuotes(data.data);
      } else if (Array.isArray(data)) {
        setQuotes(data);
      } else {
        setQuotes([data]);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Expose getQuote function via ref
  useImperativeHandle(ref, () => ({
    getQuote: () => handleSubmit(),
  }));

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : error ? String(error) : '';

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Display */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold text-sm">Error:</p>
            <p className="text-red-700 text-xs mt-1">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Requester Section */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Requester (For This Quote I Am The)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-900">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={requesterRole}
                onChange={(e) => setRequesterRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {XPO_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-900">
                Pickup Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={convertToDateInputFormat(pickupDate)}
                  onChange={handlePickupDateChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  required
                />
                <button
                  type="button"
                  onClick={handleCalendarIconClick}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Calendar size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* From (Pickup Location) Section */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">From (Pickup Location)</h3>
          <div className="space-y-2">
            <SearchableDropdown
              options={XPO_SHIPPER_ADDRESS_BOOK.map(addr => {
                if (addr.id && addr.name && addr.address) {
                  const parsed = parseAddressString(addr.address);
                  const addressParts = [parsed.streetAddress, parsed.addressLine2, parsed.city, parsed.state, parsed.zip].filter(Boolean);
                  const formattedAddress = addressParts.join(', ');
                  return {
                    value: `ammana-${addr.id}`,
                    label: `${addr.name} - ${parsed.state} - ${formattedAddress}`,
                    id: addr.id,
                    name: addr.name,
                    address: addr.address,
                    city: parsed.city,
                    state: parsed.state,
                    zip: parsed.zip,
                  };
                }
                return {
                  value: addr.value || '',
                  label: addr.label || '',
                  id: addr.id,
                  city: addr.city,
                  state: addr.state,
                  zip: addr.zip,
                };
              }) as SearchableDropdownOption[]}
              value={pickupLocation}
              onChange={(value) => {
                setPickupLocation(value);
                if (!value) {
                  // Clear fields when selection is cleared
                  setPickupCompany('');
                  setPickupStreetAddress('');
                  setPickupAddressLine2('');
                  setPickupCity('');
                  setPickupState('');
                  setPickupPostalCode('');
                  setPickupCountry('United States');
                  setPickupPhone('');
                  setPickupExtension('');
                  setPickupContactName('');
                }
              }}
              onSelect={(option: SearchableDropdownOption) => {
                const addressId = option.value?.replace('ammana-', '');
                const address = XPO_SHIPPER_ADDRESS_BOOK.find(opt => 
                  (opt.id && addressId && opt.id.toString() === addressId) || 
                  opt.value === option.value
                );
                if (address) {
                  if (address.id && address.name && address.address) {
                    const parsed = parseAddressString(address.address);
                    setPickupCompany(address.name);
                    setPickupStreetAddress(parsed.streetAddress);
                    setPickupAddressLine2(parsed.addressLine2);
                    setPickupCity(parsed.city);
                    setPickupState(parsed.state);
                    setPickupPostalCode(parsed.zip);
                    setPickupCountry('United States');
                    setPickupPhone(address.phone || '');
                    setPickupExtension(address.extension || '');
                    setPickupContactName(address.contactName || '');
                  } else {
                    setPickupCompany(address.company || address.label?.split(' - ')[0] || '');
                    setPickupStreetAddress(address.streetAddress || '');
                    setPickupAddressLine2(address.addressLine2 || '');
                    setPickupCity(address.city || '');
                    setPickupState(address.state || '');
                    setPickupPostalCode(address.zip || '');
                    setPickupCountry(address.country || 'United States');
                    setPickupPhone(address.phone || '');
                    setPickupExtension(address.extension || '');
                    setPickupContactName(address.contactName || '');
                  }
                }
              }}
              label="Pickup Location"
              placeholder="Search or select pickup location..."
              required={!useManualAccountId}
              disabled={useManualAccountId}
              filterKeys={['label', 'name', 'city', 'state', 'zip']}
            />
            
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={useManualAccountId}
                onChange={(e) => {
                  setUseManualAccountId(e.target.checked);
                  if (e.target.checked) {
                    // Clear dropdown selection when enabling manual entry
                    setPickupLocation('');
                    setPickupCompany('');
                    setPickupStreetAddress('');
                    setPickupAddressLine2('');
                    setPickupCity('');
                    setPickupState('');
                    setPickupPostalCode('');
                  } else {
                    // Clear manual account ID when disabling
                    setManualAccountId('');
                  }
                }}
                className="w-3.5 h-3.5 text-blue-600 rounded"
              />
              <span className="text-slate-700">Use Manual Account ID</span>
            </label>
            
            {useManualAccountId && (
              <div className="space-y-1.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-xs font-semibold text-slate-900">
                  Account ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualAccountId}
                  onChange={(e) => setManualAccountId(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter XPO account ID"
                  className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={useManualAccountId}
                />
                <div className="space-y-1.5 mt-2">
                  <label className="block text-xs font-semibold text-slate-900">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pickupPostalCode}
                    onChange={(e) => setPickupPostalCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={useManualAccountId}
                  />
                </div>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => setShowPickupDetails(!showPickupDetails)}
              className="text-blue-600 hover:text-blue-700 text-xs underline"
            >
              {showPickupDetails ? 'Hide Details' : 'Show Details'}
            </button>
            {showPickupDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Company</label>
                  <input
                    type="text"
                    value={pickupCompany}
                    onChange={(e) => setPickupCompany(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Street Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pickupStreetAddress}
                      onChange={(e) => setPickupStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Search className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    value={pickupAddressLine2}
                    onChange={(e) => setPickupAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, unit, etc."
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">City</label>
                  <input
                    type="text"
                    value={pickupCity}
                    onChange={(e) => setPickupCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">State/Province</label>
                  <select
                    value={pickupState}
                    onChange={(e) => setPickupState(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select State</option>
                    {US_STATES_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Postal Code</label>
                  <input
                    type="text"
                    value={pickupPostalCode}
                    onChange={(e) => setPickupPostalCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Country</label>
                  <select
                    value={pickupCountry}
                    onChange={(e) => setPickupCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {XPO_COUNTRY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Phone</label>
                  <input
                    type="text"
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Extension (Optional)</label>
                  <input
                    type="text"
                    value={pickupExtension}
                    onChange={(e) => setPickupExtension(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-900">Contact Full Name</label>
                  <input
                    type="text"
                    value={pickupContactName}
                    onChange={(e) => setPickupContactName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* TO (Delivery Location) Section */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">TO (Delivery Location)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-900">
                To Country <span className="text-red-500">*</span>
              </label>
              <select
                value={deliveryCountry}
                onChange={(e) => setDeliveryCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {XPO_COUNTRY_OPTIONS.map((option: { value: string; label: string }) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-900">
                To Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={deliveryPostalCode}
                onChange={(e) => setDeliveryPostalCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-900">
              Payment Terms <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentTermCd}
              onChange={(e) => setPaymentTermCd(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
                {XPO_PAYMENT_TERM_OPTIONS.map((option: { value: string; label: string }) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
        </section>

        {/* Commodity Details Section */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Commodity Details</h3>
          {commodities.map((commodity, index) => (
            <div key={index} className="p-3 border border-slate-200 rounded-lg space-y-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900">
                  Commodity Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={commodityDescriptions[index] || ''}
                  onChange={(e) => setCommodityDescriptions(prev => ({ ...prev, [index]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">
                    Total Weight (lbs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={commodity.grossWeight?.weight ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? 0 : Number(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        updateCommodity(index, 'grossWeight', { 
                          ...commodity.grossWeight, 
                          weight: numValue
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">
                    Freight Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={commodity.nmfcClass || ''}
                    onChange={(e) => updateCommodity(index, 'nmfcClass', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {FREIGHT_CLASS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">
                    Length (Inches) (Optional)
                  </label>
                  <input
                    type="number"
                    value={commodity.dimensions?.length || ''}
                    onChange={(e) => updateCommodity(index, 'dimensions', { ...commodity.dimensions, length: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">
                    Width (Inches) (Optional)
                  </label>
                  <input
                    type="number"
                    value={commodity.dimensions?.width || ''}
                    onChange={(e) => updateCommodity(index, 'dimensions', { ...commodity.dimensions, width: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">
                    Height (Inches) (Optional)
                  </label>
                  <input
                    type="number"
                    value={commodity.dimensions?.height || ''}
                    onChange={(e) => updateCommodity(index, 'dimensions', { ...commodity.dimensions, height: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-900">Pieces/Quantity</label>
                  <input
                    type="number"
                    value={commodity.pieceCnt || 1}
                    onChange={(e) => updateCommodity(index, 'pieceCnt', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
              {index === 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-900">Packaging</label>
                      <select
                        value={commodity.packageCode || 'PLT'}
                        onChange={(e) => updateCommodity(index, 'packageCode', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-40"
                      >
                        {XPO_PACKAGE_CODE_OPTIONS.map((option: { value: string; label: string }) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap flex-1">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={freezableProtection}
                          onChange={(e) => setFreezableProtection(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="text-slate-700">Freezable Protection</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={hazmatItem}
                          onChange={(e) => setHazmatItem(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="text-slate-700">Hazmat Item</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Additional Commodity Options */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-900">Additional Commodity</label>
              <select
                value={additionalCommodity}
                onChange={(e) => setAdditionalCommodity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Commodity</option>
                {ADDITIONAL_COMMODITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900">Excessive Length</label>
                <select
                  value={excessiveLength}
                  onChange={(e) => setExcessiveLength(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EXCESSIVE_LENGTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900">
                  $ Excess Value Coverage (USD) (Optional)
                </label>
                <input
                  type="text"
                  value={excessValueCoverage}
                  onChange={(e) => setExcessValueCoverage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">USD</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pickup Services Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Pickup Services</h3>
            <Info className="text-blue-500" size={14} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {XPO_PICKUP_SERVICES.map((service: { value: string; label: string }) => (
              <label key={service.value} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={pickupServices.includes(service.value)}
                  onChange={(e) => handlePickupServiceChange(service.value, e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded"
                />
                <span className="text-slate-700">{service.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Delivery Services Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Delivery Services</h3>
            <Info className="text-blue-500" size={14} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {XPO_DELIVERY_SERVICES.map((service: { value: string; label: string }) => (
              <label key={service.value} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={deliveryServices.includes(service.value)}
                  onChange={(e) => handleDeliveryServiceChange(service.value, e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded"
                />
                <span className="text-slate-700">{service.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Premium Services Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Premium Services</h3>
            <Info className="text-blue-500" size={14} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {XPO_PREMIUM_SERVICES.map((service: { value: string; label: string }) => (
              <label key={service.value} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={premiumServices.includes(service.value)}
                  onChange={(e) => handlePremiumServiceChange(service.value, e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded"
                />
                <span className="text-slate-700">{service.label}</span>
                {service.value === 'FREEZABLE' && (
                  <Info className="text-blue-500" size={12} />
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Reference Numbers Section */}
        <section className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-900">
              Reference Numbers (Optional)
            </label>
            <input
              type="text"
              value={referenceNumbers}
              onChange={(e) => setReferenceNumbers(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Getting Quote...
            </>
          ) : (
            'Get Rate Quote'
          )}
        </button>
      </form>

      {/* Quotes Display */}
      {quotes.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-sm font-semibold text-slate-900">Rate Quote Results</h4>
          <div className="space-y-3">
            {quotes.map((quote, index) => (
              <XPOQuoteCard key={quote.quoteId || index} quote={quote} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && quotes.length === 0 && !error && (
        <div className="text-center py-6 text-xs text-slate-500">
          Fill out the form and click "Get Rate Quote" to retrieve shipping rates
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <LogisticsAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
            const token = getToken('xpo') || '';
            setStoredToken(token);
          }}
          carrier="xpo"
        />
      )}
    </div>
  );
});

XPORateQuote.displayName = 'XPORateQuote';
