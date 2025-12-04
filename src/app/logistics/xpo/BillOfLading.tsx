'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildXPOBillOfLadingRequestBody } from './utils/requestBuilder';
import type { XPOBillOfLadingFields, XPOBillOfLadingCommodity } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import { 
  XPO_BOL_FIELD_DEFAULTS, 
  XPO_BOL_COMMODITY_DEFAULTS,
  XPO_BOL_REQUESTER_ROLE_OPTIONS,
  XPO_BOL_CHARGE_TO_OPTIONS,
  XPO_BOL_PACKAGE_CODE_OPTIONS,
  XPO_BOL_COUNTRY_OPTIONS
} from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

type BillOfLandingProps = {
  onNext: () => void;
  onPrevious: () => void;
  quoteData?: any;
  orderData?: {
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  } | null;
  initialFormData?: any;
  initialResponseData?: any;
  onFormDataChange?: (data: any) => void;
  onResponseDataChange?: (data: any) => void;
  consigneeData?: {
    address: {
      addressLine1: string;
      cityName: string;
      stateCd: string;
      countryCd: string;
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
  };
};

export const XPOBillOfLading = ({
  onNext,
  onPrevious,
  quoteData,
  orderData,
  initialFormData,
  initialResponseData,
  onFormDataChange,
  onResponseDataChange,
  consigneeData,
}: BillOfLandingProps) => {
  const { getToken } = useLogisticsStore();
  const carrier = 'xpo';
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    requester: true,
    consignee: true,
    shipper: true,
    billTo: true,
    commodities: true,
    optional: false,
  });

  // Requester
  const [requesterRole, setRequesterRole] = useState<string>('S');

  // Consignee
  const [consigneeAddressLine1, setConsigneeAddressLine1] = useState<string>('');
  const [consigneeCity, setConsigneeCity] = useState<string>('');
  const [consigneeState, setConsigneeState] = useState<string>('');
  const [consigneeCountry, setConsigneeCountry] = useState<string>('US');
  const [consigneePostalCd, setConsigneePostalCd] = useState<string>('');
  const [consigneeCompanyName, setConsigneeCompanyName] = useState<string>('');
  const [consigneeEmail, setConsigneeEmail] = useState<string>('');
  const [consigneePhone, setConsigneePhone] = useState<string>('');
  const [consigneeLoadingZip, setConsigneeLoadingZip] = useState(false);

  // Shipper
  const [shipperAddressLine1, setShipperAddressLine1] = useState<string>('');
  const [shipperCity, setShipperCity] = useState<string>('');
  const [shipperState, setShipperState] = useState<string>('');
  const [shipperCountry, setShipperCountry] = useState<string>('US');
  const [shipperPostalCd, setShipperPostalCd] = useState<string>('');
  const [shipperCompanyName, setShipperCompanyName] = useState<string>('');
  const [shipperEmail, setShipperEmail] = useState<string>('');
  const [shipperPhone, setShipperPhone] = useState<string>('');
  const [shipperLoadingZip, setShipperLoadingZip] = useState(false);

  // Bill To Customer
  const [billToAddressLine1, setBillToAddressLine1] = useState<string>('');
  const [billToCity, setBillToCity] = useState<string>('');
  const [billToState, setBillToState] = useState<string>('');
  const [billToCountry, setBillToCountry] = useState<string>('US');
  const [billToPostalCd, setBillToPostalCd] = useState<string>('');
  const [billToCompanyName, setBillToCompanyName] = useState<string>('');
  const [billToEmail, setBillToEmail] = useState<string>('');
  const [billToPhone, setBillToPhone] = useState<string>('');
  const [billToLoadingZip, setBillToLoadingZip] = useState(false);

  // Commodities
  const [commodities, setCommodities] = useState<XPOBillOfLadingCommodity[]>([
    { ...XPO_BOL_COMMODITY_DEFAULTS }
  ]);

  // Optional fields
  const [chargeToCd, setChargeToCd] = useState<string>('P');
  const [remarks, setRemarks] = useState<string>('');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');
  const [additionalService, setAdditionalService] = useState<string[]>([]);
  const [autoAssignPro, setAutoAssignPro] = useState<boolean>(true);

  // Ref to track previous form data to prevent infinite loops
  const prevFormDataRef = useRef<any>(null);
  const isInitialMountRef = useRef(true);
  const isLoadingFromInitialDataRef = useRef(false);

  // Auto-populate from consigneeData
  useEffect(() => {
    if (consigneeData && !initialFormData) {
      isLoadingFromInitialDataRef.current = true;
      setConsigneeAddressLine1(consigneeData.address.addressLine1 || '');
      setConsigneeCity(consigneeData.address.cityName || '');
      setConsigneeState(consigneeData.address.stateCd || '');
      setConsigneeCountry(consigneeData.address.countryCd || 'US');
      setConsigneePostalCd(consigneeData.address.postalCd || '');
      setConsigneeCompanyName(consigneeData.contactInfo.companyName || '');
      setConsigneeEmail(consigneeData.contactInfo.email.emailAddr || '');
      setConsigneePhone(consigneeData.contactInfo.phone.phoneNbr || '');
      // Reset flag after a short delay to allow all state updates to complete
      setTimeout(() => {
        isLoadingFromInitialDataRef.current = false;
      }, 0);
    }
  }, [consigneeData, initialFormData]);

  // Load initial form data if provided
  useEffect(() => {
    if (initialFormData) {
      isLoadingFromInitialDataRef.current = true;
      // Load form data from previous step
      if (initialFormData.requesterRole) setRequesterRole(initialFormData.requesterRole);
      if (initialFormData.consignee) {
        setConsigneeAddressLine1(initialFormData.consignee.address?.addressLine1 || '');
        setConsigneeCity(initialFormData.consignee.address?.cityName || '');
        setConsigneeState(initialFormData.consignee.address?.stateCd || '');
        setConsigneeCountry(initialFormData.consignee.address?.countryCd || 'US');
        setConsigneePostalCd(initialFormData.consignee.address?.postalCd || '');
        setConsigneeCompanyName(initialFormData.consignee.contactInfo?.companyName || '');
        setConsigneeEmail(initialFormData.consignee.contactInfo?.email?.emailAddr || '');
        setConsigneePhone(initialFormData.consignee.contactInfo?.phone?.phoneNbr || '');
      }
      if (initialFormData.shipper) {
        setShipperAddressLine1(initialFormData.shipper.address?.addressLine1 || '');
        setShipperCity(initialFormData.shipper.address?.cityName || '');
        setShipperState(initialFormData.shipper.address?.stateCd || '');
        setShipperCountry(initialFormData.shipper.address?.countryCd || 'US');
        setShipperPostalCd(initialFormData.shipper.address?.postalCd || '');
        setShipperCompanyName(initialFormData.shipper.contactInfo?.companyName || '');
        setShipperEmail(initialFormData.shipper.contactInfo?.email?.emailAddr || '');
        setShipperPhone(initialFormData.shipper.contactInfo?.phone?.phoneNbr || '');
      }
      if (initialFormData.billToCust) {
        setBillToAddressLine1(initialFormData.billToCust.address?.addressLine1 || '');
        setBillToCity(initialFormData.billToCust.address?.cityName || '');
        setBillToState(initialFormData.billToCust.address?.stateCd || '');
        setBillToCountry(initialFormData.billToCust.address?.countryCd || 'US');
        setBillToPostalCd(initialFormData.billToCust.address?.postalCd || '');
        setBillToCompanyName(initialFormData.billToCust.contactInfo?.companyName || '');
        setBillToEmail(initialFormData.billToCust.contactInfo?.email?.emailAddr || '');
        setBillToPhone(initialFormData.billToCust.contactInfo?.phone?.phoneNbr || '');
      }
      if (initialFormData.commodityLine) setCommodities(initialFormData.commodityLine);
      if (initialFormData.chargeToCd) setChargeToCd(initialFormData.chargeToCd);
      if (initialFormData.remarks) setRemarks(initialFormData.remarks);
      if (initialFormData.autoAssignPro !== undefined) setAutoAssignPro(initialFormData.autoAssignPro);
      
      // Reset flag after a short delay to allow all state updates to complete
      setTimeout(() => {
        isLoadingFromInitialDataRef.current = false;
      }, 0);
    }
  }, [initialFormData]);

  // Save form data when it changes - use useRef to prevent infinite loops
  useEffect(() => {
    // Skip on initial mount to prevent calling onFormDataChange with empty data
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Skip if we're currently loading from initialFormData to prevent infinite loops
    if (isLoadingFromInitialDataRef.current) {
      return;
    }

    if (!onFormDataChange) return;
    
    const formData = {
      requesterRole,
      consignee: {
        address: {
          addressLine1: consigneeAddressLine1,
          cityName: consigneeCity,
          stateCd: consigneeState,
          countryCd: consigneeCountry,
          postalCd: consigneePostalCd,
        },
        contactInfo: {
          companyName: consigneeCompanyName,
          email: { emailAddr: consigneeEmail },
          phone: { phoneNbr: consigneePhone },
        },
      },
      shipper: {
        address: {
          addressLine1: shipperAddressLine1,
          cityName: shipperCity,
          stateCd: shipperState,
          countryCd: shipperCountry,
          postalCd: shipperPostalCd,
        },
        contactInfo: {
          companyName: shipperCompanyName,
          email: { emailAddr: shipperEmail },
          phone: { phoneNbr: shipperPhone },
        },
      },
      billToCust: {
        address: {
          addressLine1: billToAddressLine1,
          cityName: billToCity,
          stateCd: billToState,
          countryCd: billToCountry,
          postalCd: billToPostalCd,
        },
        contactInfo: {
          companyName: billToCompanyName,
          email: { emailAddr: billToEmail },
          phone: { phoneNbr: billToPhone },
        },
      },
      commodityLine: commodities,
      chargeToCd,
      remarks,
      autoAssignPro,
    };

    // Only call onFormDataChange if data actually changed
    const formDataString = JSON.stringify(formData);
    const prevFormDataString = JSON.stringify(prevFormDataRef.current);
    
    if (formDataString !== prevFormDataString) {
      prevFormDataRef.current = formData;
      onFormDataChange(formData);
    }
    // Note: onFormDataChange is intentionally NOT in dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    requesterRole,
    consigneeAddressLine1, consigneeCity, consigneeState, consigneeCountry, consigneePostalCd,
    consigneeCompanyName, consigneeEmail, consigneePhone,
    shipperAddressLine1, shipperCity, shipperState, shipperCountry, shipperPostalCd,
    shipperCompanyName, shipperEmail, shipperPhone,
    billToAddressLine1, billToCity, billToState, billToCountry, billToPostalCd,
    billToCompanyName, billToEmail, billToPhone,
    commodities, chargeToCd, remarks, autoAssignPro,
  ]);

  // Load response data if provided
  useEffect(() => {
    if (initialResponseData && onResponseDataChange) {
      onResponseDataChange(initialResponseData);
    }
  }, [initialResponseData, onResponseDataChange]);

  const addCommodity = () => {
    setCommodities([...commodities, { ...XPO_BOL_COMMODITY_DEFAULTS }]);
  };

  const removeCommodity = (index: number) => {
    if (commodities.length > 1) {
      setCommodities(commodities.filter((_, i) => i !== index));
    }
  };

  // ZIP code lookup function using Zippopotam.us API
  const lookupZipCode = async (zipCode: string, type: 'consignee' | 'shipper' | 'billTo') => {
    if (!zipCode || zipCode.length < 5) return;

    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    if (type === 'consignee') {
      setConsigneeLoadingZip(true);
    } else if (type === 'shipper') {
      setShipperLoadingZip(true);
    } else {
      setBillToLoadingZip(true);
    }

    try {
      // Using Zippopotam.us - free ZIP code API
      const response = await fetch(`https://api.zippopotam.us/us/${cleanedZip}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place['place name'];
          const state = place['state abbreviation'];
          const country = data.country || 'US';

          if (type === 'consignee') {
            setConsigneeCity(city);
            setConsigneeState(state);
            setConsigneeCountry(country);
          } else if (type === 'shipper') {
            setShipperCity(city);
            setShipperState(state);
            setShipperCountry(country);
          } else {
            setBillToCity(city);
            setBillToState(state);
            setBillToCountry(country);
          }
        }
      }
    } catch (error) {
      // Silently fail - user can still enter manually
      if (process.env.NODE_ENV === 'development') {
        console.error('ZIP code lookup failed:', error);
      }
    } finally {
      if (type === 'consignee') {
        setConsigneeLoadingZip(false);
      } else if (type === 'shipper') {
        setShipperLoadingZip(false);
      } else {
        setBillToLoadingZip(false);
      }
    }
  };

  // Debounced ZIP code lookup for Consignee
  useEffect(() => {
    if (consigneePostalCd && consigneePostalCd.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(consigneePostalCd, 'consignee');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [consigneePostalCd]);

  // Debounced ZIP code lookup for Shipper
  useEffect(() => {
    if (shipperPostalCd && shipperPostalCd.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(shipperPostalCd, 'shipper');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [shipperPostalCd]);

  // Debounced ZIP code lookup for Bill To Customer
  useEffect(() => {
    if (billToPostalCd && billToPostalCd.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(billToPostalCd, 'billTo');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [billToPostalCd]);

  const updateCommodity = (index: number, field: keyof XPOBillOfLadingCommodity, value: any) => {
    const updated = [...commodities];
    updated[index] = { ...updated[index], [field]: value };
    setCommodities(updated);
  };

  const updateCommodityNested = (index: number, path: string[], value: any) => {
    const updated = [...commodities];
    const commodity = { ...updated[index] };
    let current: any = commodity;
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    updated[index] = commodity;
    setCommodities(updated);
  };

  const buildRequestBody = (): XPOBillOfLadingFields => {
    return {
      bol: {
        requester: {
          role: requesterRole,
        },
        consignee: {
          address: {
            addressLine1: consigneeAddressLine1,
            cityName: consigneeCity,
            stateCd: consigneeState,
            countryCd: consigneeCountry,
            postalCd: consigneePostalCd,
          },
          contactInfo: {
            companyName: consigneeCompanyName,
            email: {
              emailAddr: consigneeEmail,
            },
            phone: {
              phoneNbr: consigneePhone,
            },
          },
        },
        shipper: {
          address: {
            addressLine1: shipperAddressLine1,
            cityName: shipperCity,
            stateCd: shipperState,
            countryCd: shipperCountry,
            postalCd: shipperPostalCd,
          },
          contactInfo: {
            companyName: shipperCompanyName,
            email: {
              emailAddr: shipperEmail,
            },
            phone: {
              phoneNbr: shipperPhone,
            },
          },
        },
        billToCust: {
          address: {
            addressLine1: billToAddressLine1,
            cityName: billToCity,
            stateCd: billToState,
            countryCd: billToCountry,
            postalCd: billToPostalCd,
          },
          contactInfo: {
            companyName: billToCompanyName,
            email: {
              emailAddr: billToEmail,
            },
            phone: {
              phoneNbr: billToPhone,
            },
          },
        },
        commodityLine: commodities,
        chargeToCd,
        ...(remarks && { remarks }),
        ...(emergencyContactName && { emergencyContactName }),
        ...(emergencyContactPhone && { emergencyContactPhone: { phoneNbr: emergencyContactPhone } }),
        ...(additionalService.length > 0 && { additionalService }),
      },
      autoAssignPro,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!consigneeAddressLine1 || !consigneeCity || !consigneeState || !consigneePostalCd || !consigneeCompanyName) {
      setError(new Error('Please fill in all required Consignee fields'));
      setLoading(false);
      return;
    }
    if (!shipperAddressLine1 || !shipperCity || !shipperState || !shipperPostalCd || !shipperCompanyName) {
      setError(new Error('Please fill in all required Shipper fields'));
      setLoading(false);
      return;
    }
    if (!billToAddressLine1 || !billToCity || !billToState || !billToPostalCd || !billToCompanyName) {
      setError(new Error('Please fill in all required Bill To Customer fields'));
      setLoading(false);
      return;
    }
    if (commodities.length === 0 || commodities.some(c => !c.desc || c.grossWeight.weight <= 0)) {
      setError(new Error('Please add at least one commodity with description and weight'));
      setLoading(false);
      return;
    }

    const normalizedCarrier = carrier.toLowerCase();
    const token = getToken(normalizedCarrier);
    if (!token) {
      setError(new Error('Authentication required. Please login.'));
      setLoading(false);
      return;
    }

    try {
      const requestBody = buildRequestBody();
      const payload = buildXPOBillOfLadingRequestBody(requestBody);
      
      // Add shippingCompany to payload
      const finalPayload = {
        shippingCompany: normalizedCarrier,
        ...payload,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('XPO BOL Request:', JSON.stringify(finalPayload, null, 2));
      }

      const res = await fetch(buildApiUrl('/Logistics/create-bill-of-lading'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `BOL creation failed: ${res.statusText}`);
      }

      const data = await res.json();
      if (onResponseDataChange) {
        onResponseDataChange(data);
      }
      
      // Call onNext to proceed to next step
      onNext();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setShowSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderAddressSection = (
    title: string,
    addressLine1: string,
    setAddressLine1: (v: string) => void,
    city: string,
    setCity: (v: string) => void,
    state: string,
    setState: (v: string) => void,
    country: string,
    setCountry: (v: string) => void,
    postalCd: string,
    setPostalCd: (v: string) => void,
    companyName: string,
    setCompanyName: (v: string) => void,
    email: string,
    setEmail: (v: string) => void,
    phone: string,
    setPhone: (v: string) => void,
    loadingZip: boolean,
  ) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Postal Code <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={postalCd}
              onChange={(e) => setPostalCd(e.target.value)}
              placeholder="Enter ZIP code"
              maxLength={10}
              className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              required
            />
            {loadingZip && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          {/* City/State Display - shows auto-filled values, editable below */}
          <div className="space-y-1">
            {(city || state) ? (
              <div className="px-2 py-1 text-sm text-slate-700">
                {city && state ? `${city}, ${state}` : city || state}
              </div>
            ) : null}
            {/* Editable inputs for city and state */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="State"
                maxLength={2}
                className="px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {XPO_BOL_COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-4 sm:pb-6 lg:pb-8 px-3 sm:px-4 lg:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">XPO Bill of Lading</h1>
        <p className="text-slate-600 mt-1">Create a bill of lading for XPO shipping</p>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorDisplay error={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Requester Role */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('requester')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Requester Information</h2>
            {showSections.requester ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.requester && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Requester Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={requesterRole}
                  onChange={(e) => setRequesterRole(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {XPO_BOL_REQUESTER_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Consignee */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('consignee')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Consignee Information</h2>
            {showSections.consignee ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.consignee && (
            <div className="p-4 sm:p-6">
              {renderAddressSection(
                'Consignee',
                consigneeAddressLine1, setConsigneeAddressLine1,
                consigneeCity, setConsigneeCity,
                consigneeState, setConsigneeState,
                consigneeCountry, setConsigneeCountry,
                consigneePostalCd, setConsigneePostalCd,
                consigneeCompanyName, setConsigneeCompanyName,
                consigneeEmail, setConsigneeEmail,
                consigneePhone, setConsigneePhone,
                consigneeLoadingZip,
              )}
            </div>
          )}
        </div>

        {/* Shipper */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('shipper')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Shipper Information</h2>
            {showSections.shipper ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.shipper && (
            <div className="p-4 sm:p-6">
              {renderAddressSection(
                'Shipper',
                shipperAddressLine1, setShipperAddressLine1,
                shipperCity, setShipperCity,
                shipperState, setShipperState,
                shipperCountry, setShipperCountry,
                shipperPostalCd, setShipperPostalCd,
                shipperCompanyName, setShipperCompanyName,
                shipperEmail, setShipperEmail,
                shipperPhone, setShipperPhone,
                shipperLoadingZip,
              )}
            </div>
          )}
        </div>

        {/* Bill To Customer */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('billTo')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Bill To Customer Information</h2>
            {showSections.billTo ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.billTo && (
            <div className="p-4 sm:p-6">
              {renderAddressSection(
                'Bill To Customer',
                billToAddressLine1, setBillToAddressLine1,
                billToCity, setBillToCity,
                billToState, setBillToState,
                billToCountry, setBillToCountry,
                billToPostalCd, setBillToPostalCd,
                billToCompanyName, setBillToCompanyName,
                billToEmail, setBillToEmail,
                billToPhone, setBillToPhone,
                billToLoadingZip,
              )}
            </div>
          )}
        </div>

        {/* Commodities */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('commodities')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Commodities</h2>
              <Info className="text-blue-500" size={20} />
            </div>
            {showSections.commodities ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.commodities && (
            <div className="p-4 sm:p-6 space-y-4">
              {commodities.map((commodity, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Commodity {index + 1}</h3>
                    {commodities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCommodity(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Piece Count <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={commodity.pieceCnt || 0}
                        onChange={(e) => updateCommodity(index, 'pieceCnt', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Package Code <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={commodity.packaging?.packageCd || 'PLT'}
                        onChange={(e) => updateCommodityNested(index, ['packaging', 'packageCd'], e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {XPO_BOL_PACKAGE_CODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Weight (lbs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={commodity.grossWeight?.weight || 0}
                        onChange={(e) => updateCommodityNested(index, ['grossWeight', 'weight'], parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-semibold text-slate-900">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={commodity.desc || ''}
                        onChange={(e) => updateCommodity(index, 'desc', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">NMFC Class</label>
                      <input
                        type="text"
                        value={commodity.nmfcClass || ''}
                        onChange={(e) => updateCommodity(index, 'nmfcClass', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">NMFC Item Code</label>
                      <input
                        type="text"
                        value={commodity.nmfcItemCd || ''}
                        onChange={(e) => updateCommodity(index, 'nmfcItemCd', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Sub</label>
                      <input
                        type="text"
                        value={commodity.sub || ''}
                        onChange={(e) => updateCommodity(index, 'sub', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={commodity.hazmatInd || false}
                          onChange={(e) => updateCommodity(index, 'hazmatInd', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700">Hazmat</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCommodity}
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
              >
                <Plus size={16} />
                Add Commodity
              </button>
            </div>
          )}
        </div>

        {/* Optional Fields */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('optional')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Optional Information</h2>
            {showSections.optional ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.optional && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Charge To Code <span className="text-red-500">*</span>
                </label>
                <select
                  value={chargeToCd}
                  onChange={(e) => setChargeToCd(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {XPO_BOL_CHARGE_TO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Emergency Contact Name</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoAssignPro}
                    onChange={(e) => setAutoAssignPro(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Auto Assign PRO</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-between gap-4">
          <button
            type="button"
            onClick={onPrevious}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold"
          >
            Previous
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating BOL...
              </>
            ) : (
              'Create Bill of Lading'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
