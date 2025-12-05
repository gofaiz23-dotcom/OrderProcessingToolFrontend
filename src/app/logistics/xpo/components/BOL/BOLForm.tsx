'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { buildApiUrl } from '../../../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildXPOBillOfLadingRequestBody } from '../../utils/requestBuilder';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import {
  BasicInformationSection,
  LocationSection,
  BillToSection,
  CommodityDetailsSection,
  AdditionalCommoditySection,
  EmergencyContactSection,
  DeclaredValueSection,
  ServicesSection,
  PickupRequestSection,
  XPOProNumberSection,
  ReferenceNumbersSection,
  AdditionalCommentsSection,
  BOLFooterActions,
} from './index';
import { PICKUP_SERVICES, DELIVERY_SERVICES, PREMIUM_SERVICES } from './constants';
import { XPO_SHIPPER_ADDRESS_BOOK, XPO_BOL_DEFAULTS } from '@/Shared/constant';
import type { XPOBillOfLadingCommodity, XPOBillOfLadingReference, XPOBillOfLadingFields } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import { XPO_BOL_COMMODITY_DEFAULTS } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';

type LocationData = {
  searchValue: string;
  company: string;
  careOf?: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  extension?: string;
  email?: string;
};

type BOLFormProps = {
  onNext?: () => void;
  onPrevious?: () => void;
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

export const BOLForm = ({
  onNext,
  onPrevious,
  quoteData,
  orderData,
  initialFormData,
  initialResponseData,
  onFormDataChange,
  onResponseDataChange,
  consigneeData,
}: BOLFormProps) => {
  const { getToken } = useLogisticsStore();
  const carrier = 'xpo';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [responseJson, setResponseJson] = useState<any>(null);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [showResponseJson, setShowResponseJson] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<any>(null);
  // Basic Information
  const [requesterRole, setRequesterRole] = useState(XPO_BOL_DEFAULTS.requesterRole);
  const [paymentTerms, setPaymentTerms] = useState(XPO_BOL_DEFAULTS.paymentTerms);

  // Pickup Location
  const [pickupLocation, setPickupLocation] = useState<LocationData>({
    searchValue: XPO_BOL_DEFAULTS.pickupLocation.searchValue,
    company: XPO_BOL_DEFAULTS.pickupLocation.company,
    careOf: XPO_BOL_DEFAULTS.pickupLocation.careOf,
    streetAddress: XPO_BOL_DEFAULTS.pickupLocation.streetAddress,
    addressLine2: XPO_BOL_DEFAULTS.pickupLocation.addressLine2,
    city: XPO_BOL_DEFAULTS.pickupLocation.city,
    state: XPO_BOL_DEFAULTS.pickupLocation.state,
    postalCode: XPO_BOL_DEFAULTS.pickupLocation.postalCode,
    country: XPO_BOL_DEFAULTS.pickupLocation.country,
    phone: XPO_BOL_DEFAULTS.pickupLocation.phone,
    extension: XPO_BOL_DEFAULTS.pickupLocation.extension,
    email: XPO_BOL_DEFAULTS.pickupLocation.email,
  });
  const [pickupLoadingZip, setPickupLoadingZip] = useState(false);

  // Delivery Location
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData>({
    searchValue: XPO_BOL_DEFAULTS.deliveryLocation.searchValue,
    company: XPO_BOL_DEFAULTS.deliveryLocation.company,
    careOf: XPO_BOL_DEFAULTS.deliveryLocation.careOf,
    streetAddress: XPO_BOL_DEFAULTS.deliveryLocation.streetAddress,
    addressLine2: XPO_BOL_DEFAULTS.deliveryLocation.addressLine2,
    city: XPO_BOL_DEFAULTS.deliveryLocation.city,
    state: XPO_BOL_DEFAULTS.deliveryLocation.state,
    postalCode: XPO_BOL_DEFAULTS.deliveryLocation.postalCode,
    country: XPO_BOL_DEFAULTS.deliveryLocation.country,
    phone: XPO_BOL_DEFAULTS.deliveryLocation.phone,
    extension: XPO_BOL_DEFAULTS.deliveryLocation.extension,
    email: XPO_BOL_DEFAULTS.deliveryLocation.email,
  });
  const [deliveryLoadingZip, setDeliveryLoadingZip] = useState(false);

  // Bill To
  const [billTo, setBillTo] = useState(XPO_BOL_DEFAULTS.billTo);

  // Commodities
  const [commodities, setCommodities] = useState<XPOBillOfLadingCommodity[]>([
    {
      ...XPO_BOL_COMMODITY_DEFAULTS,
      desc: XPO_BOL_DEFAULTS.commodity.desc,
      grossWeight: XPO_BOL_DEFAULTS.commodity.grossWeight,
      nmfcClass: XPO_BOL_DEFAULTS.commodity.nmfcClass,
      pieceCnt: XPO_BOL_DEFAULTS.commodity.pieceCnt,
      packaging: XPO_BOL_DEFAULTS.commodity.packaging,
    }
  ]);

  // Emergency Contact
  const [emergencyContactName, setEmergencyContactName] = useState(XPO_BOL_DEFAULTS.emergencyContactName);
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(XPO_BOL_DEFAULTS.emergencyContactPhone);

  // Declared Value
  const [totalDeclaredValue, setTotalDeclaredValue] = useState(XPO_BOL_DEFAULTS.totalDeclaredValue);
  const [excessiveLiabilityAuth, setExcessiveLiabilityAuth] = useState(XPO_BOL_DEFAULTS.excessiveLiabilityAuth);

  // Services
  const [selectedPickupServices, setSelectedPickupServices] = useState<string[]>([...XPO_BOL_DEFAULTS.defaultPickupServices]);
  const [selectedDeliveryServices, setSelectedDeliveryServices] = useState<string[]>([...XPO_BOL_DEFAULTS.defaultDeliveryServices]);
  const [selectedPremiumServices, setSelectedPremiumServices] = useState<string[]>([...XPO_BOL_DEFAULTS.defaultPremiumServices]);

  // Pickup Request
  const [schedulePickup, setSchedulePickup] = useState(XPO_BOL_DEFAULTS.schedulePickup);
  const [pickupDate, setPickupDate] = useState(XPO_BOL_DEFAULTS.pickupDate);
  const [pickupReadyTime, setPickupReadyTime] = useState(XPO_BOL_DEFAULTS.pickupReadyTime);
  const [dockCloseTime, setDockCloseTime] = useState(XPO_BOL_DEFAULTS.dockCloseTime);
  const [useMyContactInfo, setUseMyContactInfo] = useState(XPO_BOL_DEFAULTS.useMyContactInfo);
  const [contactCompanyName, setContactCompanyName] = useState(XPO_BOL_DEFAULTS.contactCompanyName);
  const [contactName, setContactName] = useState(XPO_BOL_DEFAULTS.contactName);
  const [contactPhone, setContactPhone] = useState(XPO_BOL_DEFAULTS.contactPhone);
  const [contactExtension, setContactExtension] = useState(XPO_BOL_DEFAULTS.contactExtension);

  // Auto-populate contact info from pickup location when "Use My Contact Information" is clicked
  useEffect(() => {
    if (useMyContactInfo && pickupLocation.company) {
      setContactCompanyName(pickupLocation.company);
      setContactName(pickupLocation.careOf || '');
      setContactPhone(pickupLocation.phone || '');
      setContactExtension(pickupLocation.extension || '');
    }
  }, [useMyContactInfo, pickupLocation]);

  // XPO Pro Number
  const [proNumberOption, setProNumberOption] = useState<'none' | 'auto' | 'preassigned'>(XPO_BOL_DEFAULTS.proNumberOption);
  const [preAssignedProNumber, setPreAssignedProNumber] = useState(XPO_BOL_DEFAULTS.preAssignedProNumber);

  // Reference Numbers
  const [references, setReferences] = useState<XPOBillOfLadingReference[]>([...XPO_BOL_DEFAULTS.referenceNumbers]);

  // Additional Comments
  const [comments, setComments] = useState(XPO_BOL_DEFAULTS.comments);

  // Footer Options
  const [saveAsTemplate, setSaveAsTemplate] = useState(XPO_BOL_DEFAULTS.saveAsTemplate);
  const [signBOLWithRequester, setSignBOLWithRequester] = useState(XPO_BOL_DEFAULTS.signBOLWithRequester);
  const [agreeToTerms, setAgreeToTerms] = useState(XPO_BOL_DEFAULTS.agreeToTerms);

  // ZIP/Postal Code Lookup - Auto-fills city, state, and country
  const lookupZipCode = async (zipCode: string, type: 'pickup' | 'delivery') => {
    if (!zipCode || zipCode.trim().length === 0) return;

    // Get current location data to determine country
    const currentLocation = type === 'pickup' ? pickupLocation : deliveryLocation;
    let currentCountry = currentLocation.country || 'US';
    
    // Normalize country code (handle both 'US' and 'United States')
    if (currentCountry === 'United States' || currentCountry === 'USA') {
      currentCountry = 'US';
    } else if (currentCountry === 'Canada') {
      currentCountry = 'CA';
    } else if (currentCountry === 'Mexico') {
      currentCountry = 'MX';
    }

    // Clean the postal code based on country
    let cleanedPostalCode = zipCode.trim().toUpperCase();
    
    // For US: extract 5 digits
    if (currentCountry === 'US') {
      cleanedPostalCode = zipCode.replace(/\D/g, '').substring(0, 5);
      if (cleanedPostalCode.length < 5) return;
    }
    // For Canada: format A1A 1A1 (alphanumeric, 6 chars)
    else if (currentCountry === 'CA') {
      cleanedPostalCode = zipCode.replace(/\s+/g, '').substring(0, 6).toUpperCase();
      if (cleanedPostalCode.length < 6) return;
    }
    // For Mexico: extract 5 digits
    else if (currentCountry === 'MX') {
      cleanedPostalCode = zipCode.replace(/\D/g, '').substring(0, 5);
      if (cleanedPostalCode.length < 5) return;
    }
    // Default: try to extract digits (minimum 3 for international)
    else {
      cleanedPostalCode = zipCode.replace(/\s+/g, '').substring(0, 10);
      if (cleanedPostalCode.length < 3) return;
    }

    if (type === 'pickup') {
      setPickupLoadingZip(true);
    } else {
      setDeliveryLoadingZip(true);
    }

    try {
      // Map country codes to API country codes
      const countryCodeMap: Record<string, string> = {
        'US': 'us',
        'CA': 'ca',
        'MX': 'mx',
      };
      
      const apiCountryCode = countryCodeMap[currentCountry] || 'us';
      const apiUrl = `https://api.zippopotam.us/${apiCountryCode}/${cleanedPostalCode}`;
      
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place['place name'] || place['placeName'] || '';
          const state = place['state abbreviation'] || place['stateAbbreviation'] || place['state'] || '';
          
          // Map API country code to form country code (ISO format)
          const apiCountry = data.country || apiCountryCode.toUpperCase();
          const formCountry = apiCountry.toUpperCase() === 'USA' ? 'US' : 
                             apiCountry.toUpperCase() === 'CAN' ? 'CA' :
                             apiCountry.toUpperCase() === 'MEX' ? 'MX' :
                             apiCountry.toUpperCase();

          if (type === 'pickup') {
            setPickupLocation(prev => ({ 
              ...prev, 
              city: city || prev.city, 
              state: state || prev.state, 
              country: formCountry || prev.country 
            }));
          } else {
            setDeliveryLocation(prev => ({ 
              ...prev, 
              city: city || prev.city, 
              state: state || prev.state, 
              country: formCountry || prev.country 
            }));
          }
        }
      } else if (response.status === 404) {
        // Postal code not found - silently fail, user can enter manually
        if (process.env.NODE_ENV === 'development') {
          console.log(`Postal code ${cleanedPostalCode} not found for country ${currentCountry}`);
        }
      }
    } catch (error) {
      // Silently fail - user can still enter manually
      if (process.env.NODE_ENV === 'development') {
        console.error('Postal code lookup failed:', error);
      }
    } finally {
      if (type === 'pickup') {
        setPickupLoadingZip(false);
      } else {
        setDeliveryLoadingZip(false);
      }
    }
  };

  // Commodity Management
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

  const addCommodity = () => {
    setCommodities([...commodities, { ...XPO_BOL_COMMODITY_DEFAULTS }]);
  };

  const removeCommodity = (index: number) => {
    if (commodities.length > 1) {
      setCommodities(commodities.filter((_, i) => i !== index));
    }
  };

  // Service Toggle Handlers
  const handlePickupServiceToggle = (service: string) => {
    setSelectedPickupServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleDeliveryServiceToggle = (service: string) => {
    setSelectedDeliveryServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handlePremiumServiceToggle = (service: string) => {
    setSelectedPremiumServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  // Form Handlers
  const handleClearForm = () => {
    setRequesterRole(XPO_BOL_DEFAULTS.requesterRole);
    setPaymentTerms(XPO_BOL_DEFAULTS.paymentTerms);
    setPickupLocation({
      searchValue: XPO_BOL_DEFAULTS.pickupLocation.searchValue,
      company: XPO_BOL_DEFAULTS.pickupLocation.company,
      careOf: XPO_BOL_DEFAULTS.pickupLocation.careOf,
      streetAddress: XPO_BOL_DEFAULTS.pickupLocation.streetAddress,
      addressLine2: XPO_BOL_DEFAULTS.pickupLocation.addressLine2,
      city: XPO_BOL_DEFAULTS.pickupLocation.city,
      state: XPO_BOL_DEFAULTS.pickupLocation.state,
      postalCode: XPO_BOL_DEFAULTS.pickupLocation.postalCode,
      country: XPO_BOL_DEFAULTS.pickupLocation.country,
      phone: XPO_BOL_DEFAULTS.pickupLocation.phone,
      extension: XPO_BOL_DEFAULTS.pickupLocation.extension,
      email: XPO_BOL_DEFAULTS.pickupLocation.email,
    });
    setDeliveryLocation({
      searchValue: XPO_BOL_DEFAULTS.deliveryLocation.searchValue,
      company: XPO_BOL_DEFAULTS.deliveryLocation.company,
      careOf: XPO_BOL_DEFAULTS.deliveryLocation.careOf,
      streetAddress: XPO_BOL_DEFAULTS.deliveryLocation.streetAddress,
      addressLine2: XPO_BOL_DEFAULTS.deliveryLocation.addressLine2,
      city: XPO_BOL_DEFAULTS.deliveryLocation.city,
      state: XPO_BOL_DEFAULTS.deliveryLocation.state,
      postalCode: XPO_BOL_DEFAULTS.deliveryLocation.postalCode,
      country: XPO_BOL_DEFAULTS.deliveryLocation.country,
      phone: XPO_BOL_DEFAULTS.deliveryLocation.phone,
      extension: XPO_BOL_DEFAULTS.deliveryLocation.extension,
      email: XPO_BOL_DEFAULTS.deliveryLocation.email,
    });
    setBillTo(XPO_BOL_DEFAULTS.billTo);
    setCommodities([{
      ...XPO_BOL_COMMODITY_DEFAULTS,
      desc: XPO_BOL_DEFAULTS.commodity.desc,
      grossWeight: XPO_BOL_DEFAULTS.commodity.grossWeight,
      nmfcClass: XPO_BOL_DEFAULTS.commodity.nmfcClass,
      pieceCnt: XPO_BOL_DEFAULTS.commodity.pieceCnt,
      packaging: XPO_BOL_DEFAULTS.commodity.packaging,
    }]);
    setEmergencyContactName(XPO_BOL_DEFAULTS.emergencyContactName);
    setEmergencyContactPhone(XPO_BOL_DEFAULTS.emergencyContactPhone);
    setTotalDeclaredValue(XPO_BOL_DEFAULTS.totalDeclaredValue);
    setExcessiveLiabilityAuth(XPO_BOL_DEFAULTS.excessiveLiabilityAuth);
    setSelectedPickupServices([...XPO_BOL_DEFAULTS.defaultPickupServices]);
    setSelectedDeliveryServices([...XPO_BOL_DEFAULTS.defaultDeliveryServices]);
    setSelectedPremiumServices([...XPO_BOL_DEFAULTS.defaultPremiumServices]);
    setSchedulePickup(XPO_BOL_DEFAULTS.schedulePickup);
    setPickupDate(XPO_BOL_DEFAULTS.pickupDate);
    setPickupReadyTime(XPO_BOL_DEFAULTS.pickupReadyTime);
    setDockCloseTime(XPO_BOL_DEFAULTS.dockCloseTime);
    setUseMyContactInfo(XPO_BOL_DEFAULTS.useMyContactInfo);
    setContactCompanyName(XPO_BOL_DEFAULTS.contactCompanyName);
    setContactName(XPO_BOL_DEFAULTS.contactName);
    setContactPhone(XPO_BOL_DEFAULTS.contactPhone);
    setContactExtension(XPO_BOL_DEFAULTS.contactExtension);
    setProNumberOption(XPO_BOL_DEFAULTS.proNumberOption);
    setPreAssignedProNumber(XPO_BOL_DEFAULTS.preAssignedProNumber);
    setReferences([...XPO_BOL_DEFAULTS.referenceNumbers]);
    setComments(XPO_BOL_DEFAULTS.comments);
    setSaveAsTemplate(XPO_BOL_DEFAULTS.saveAsTemplate);
    setSignBOLWithRequester(XPO_BOL_DEFAULTS.signBOLWithRequester);
    setAgreeToTerms(XPO_BOL_DEFAULTS.agreeToTerms);
  };

  // Auto-populate from consigneeData (Delivery Location from order table)
  useEffect(() => {
    if (consigneeData && !initialFormData) {
      const deliveryData: LocationData = {
        searchValue: consigneeData.contactInfo.companyName || '',
        company: consigneeData.contactInfo.companyName || '',
        streetAddress: consigneeData.address.addressLine1 || '',
        city: consigneeData.address.cityName || '',
        state: consigneeData.address.stateCd || '',
        country: consigneeData.address.countryCd || 'US',
        postalCode: consigneeData.address.postalCd || '',
        email: consigneeData.contactInfo.email.emailAddr || '',
        phone: consigneeData.contactInfo.phone.phoneNbr || '',
        careOf: '',
        addressLine2: '',
        extension: '',
      };
      setDeliveryLocation(deliveryData);
    }
  }, [consigneeData, initialFormData]);

  // Load initial form data if provided
  useEffect(() => {
    if (initialFormData) {
      // Load form data from previous step
      if (initialFormData.requesterRole) setRequesterRole(initialFormData.requesterRole);
      if (initialFormData.paymentTerms) setPaymentTerms(initialFormData.paymentTerms);
      if (initialFormData.pickupLocation) setPickupLocation(initialFormData.pickupLocation);
      if (initialFormData.deliveryLocation) setDeliveryLocation(initialFormData.deliveryLocation);
      if (initialFormData.commodities) setCommodities(initialFormData.commodities);
      // ... load other fields
    }
  }, [initialFormData]);

  // Load response data if provided
  useEffect(() => {
    if (initialResponseData && onResponseDataChange) {
      onResponseDataChange(initialResponseData);
      setResponseJson(initialResponseData);
      setShowResponseJson(true);
    }
  }, [initialResponseData, onResponseDataChange]);

  // Helper function to format date and time to ISO 8601 with timezone
  const formatDateTimeWithTimezone = (dateStr: string, timeStr: string): string => {
    if (!dateStr || !timeStr) return '';
    
    // Parse date (YYYY-MM-DD) and time (HH:MM)
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Create date in local timezone
    const date = new Date(dateStr + 'T' + timeStr + ':00');
    
    // Get timezone offset in minutes (negative for timezones ahead of UTC)
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    // Note: getTimezoneOffset() returns positive for timezones behind UTC (like PST -08:00)
    // So we need to negate it to get the correct sign
    const offsetSign = offsetMinutes > 0 ? '-' : '+';
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    // Format as ISO 8601 with timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetStr}`;
  };

  const buildRequestBody = useCallback((): XPOBillOfLadingFields => {
    // Build pickupInfo if schedulePickup is enabled
    let pickupInfo: any = undefined;
    if (schedulePickup && pickupDate && pickupReadyTime && dockCloseTime && contactCompanyName && contactName && contactPhone) {
      pickupInfo = {
        pkupDate: formatDateTimeWithTimezone(pickupDate, pickupReadyTime),
        pkupTime: formatDateTimeWithTimezone(pickupDate, pickupReadyTime),
        dockCloseTime: formatDateTimeWithTimezone(pickupDate, dockCloseTime),
        contact: {
          companyName: contactCompanyName,
          fullName: contactName,
          phone: {
            phoneNbr: contactPhone,
          },
        },
      };
    }

    return {
      bol: {
        requester: {
          role: requesterRole,
        },
        consignee: {
          address: {
            addressLine1: deliveryLocation.streetAddress,
            cityName: deliveryLocation.city,
            stateCd: deliveryLocation.state,
            countryCd: deliveryLocation.country,
            postalCd: deliveryLocation.postalCode,
          },
          contactInfo: {
            companyName: deliveryLocation.company,
            email: {
              emailAddr: deliveryLocation.email || null,
            },
            phone: {
              phoneNbr: deliveryLocation.phone || '',
            },
          },
        },
        shipper: {
          address: {
            addressLine1: pickupLocation.streetAddress,
            cityName: pickupLocation.city,
            stateCd: pickupLocation.state,
            countryCd: pickupLocation.country,
            postalCd: pickupLocation.postalCode,
          },
          contactInfo: {
            companyName: pickupLocation.company,
            email: {
              emailAddr: pickupLocation.email || null,
            },
            phone: {
              phoneNbr: pickupLocation.phone || '',
            },
          },
        },
        billToCust: {
          address: {
            addressLine1: pickupLocation.streetAddress, // Use pickup as default, can be updated
            cityName: pickupLocation.city,
            stateCd: pickupLocation.state,
            countryCd: pickupLocation.country,
            postalCd: pickupLocation.postalCode,
          },
          contactInfo: {
            companyName: pickupLocation.company,
            email: {
              emailAddr: pickupLocation.email || null,
            },
            phone: {
              phoneNbr: pickupLocation.phone || '',
            },
          },
        },
        commodityLine: commodities,
        chargeToCd: paymentTerms,
        ...(comments && { remarks: comments }),
        // Always include emergencyContactName and emergencyContactPhone
        // Can be empty string or have values (matches working payload)
        emergencyContactName: emergencyContactName !== undefined && emergencyContactName !== null 
          ? emergencyContactName 
          : '',
        emergencyContactPhone: {
          phoneNbr: emergencyContactPhone !== undefined && emergencyContactPhone !== null 
            ? emergencyContactPhone 
            : '',
        },
        // Always include additionalService as array
        // XPO API expects array of objects, not strings - send empty array for now
        // TODO: Convert service strings to proper object format when XPO object structure is known
        additionalService: [],
        ...(references.length > 0 && references.some(r => r.reference) ? {
          suppRef: {
            otherRefs: references.filter(r => r.reference)
          }
        } : {}),
        ...(totalDeclaredValue && { declaredValueAmt: { amt: parseFloat(totalDeclaredValue) || 0 } }),
        ...(excessiveLiabilityAuth && { excessLiabilityChargeInit: excessiveLiabilityAuth }),
        ...(pickupInfo && { pickupInfo }),
      },
      autoAssignPro: proNumberOption === 'auto',
    };
  }, [
    requesterRole,
    paymentTerms,
    pickupLocation,
    deliveryLocation,
    billTo,
    commodities,
    emergencyContactName,
    emergencyContactPhone,
    totalDeclaredValue,
    excessiveLiabilityAuth,
    selectedPickupServices,
    selectedDeliveryServices,
    selectedPremiumServices,
    references,
    comments,
    proNumberOption,
    schedulePickup,
    pickupDate,
    pickupReadyTime,
    dockCloseTime,
    contactCompanyName,
    contactName,
    contactPhone,
  ]);

  // Build live payload preview
  useEffect(() => {
    try {
      const requestBody = buildRequestBody();
      const normalizedCarrier = carrier.toLowerCase();
      const token = getToken(normalizedCarrier);
      
      if (token) {
        const payload = buildXPOBillOfLadingRequestBody(requestBody);
        const finalPayload = {
          shippingCompany: normalizedCarrier,
          ...payload,
        };
        setPayloadPreview(finalPayload);
      }
    } catch (err) {
      // Silently fail - preview will update when form is valid
      setPayloadPreview(null);
    }
  }, [buildRequestBody, carrier, getToken]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setError(null);
    setLoading(true);

    // Validation
    if (!pickupLocation.streetAddress || !pickupLocation.city || !pickupLocation.state || !pickupLocation.postalCode || !pickupLocation.company) {
      setError(new Error('Please fill in all required Pickup Location fields'));
      setLoading(false);
      return;
    }
    if (!deliveryLocation.streetAddress || !deliveryLocation.city || !deliveryLocation.state || !deliveryLocation.postalCode || !deliveryLocation.company) {
      setError(new Error('Please fill in all required Delivery Location fields'));
      setLoading(false);
      return;
    }
    if (commodities.length === 0 || commodities.some(c => !c.desc || c.grossWeight.weight <= 0)) {
      setError(new Error('Please add at least one commodity with description and weight'));
      setLoading(false);
      return;
    }
    if (!agreeToTerms) {
      setError(new Error('Please agree to Terms of Service'));
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
        let errorMessage = `BOL creation failed: ${res.status} ${res.statusText}`;
        let errorDetails: any = null;
        
        try {
          // Read response as text first (can only read once)
          const errorText = await res.text();
          
          if (errorText && errorText.trim()) {
            // Try to parse as JSON if it looks like JSON
            if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
              try {
                const errorData = JSON.parse(errorText);
                errorDetails = errorData;
                
                // Extract error message from various possible formats
                const extractedMessage = 
                  errorData.message || 
                  errorData.error?.message || 
                  errorData.errorMessage ||
                  errorData.error?.errorMessage ||
                  errorData.detail ||
                  errorData.error?.detail ||
                  errorData.title ||
                  errorData.type ||
                  (typeof errorData.error === 'string' ? errorData.error : null) ||
                  (errorData.errors && Array.isArray(errorData.errors) 
                    ? errorData.errors.map((e: any) => e.message || e.msg || e.field || e).join(', ')
                    : null) ||
                  errorData.originalError ||
                  null;
                
                // Ensure we have a valid string message
                if (extractedMessage && typeof extractedMessage === 'string' && extractedMessage.trim()) {
                  errorMessage = extractedMessage;
                } else if (errorText && errorText.trim()) {
                  errorMessage = errorText.substring(0, 200);
                } else {
                  errorMessage = `BOL creation failed: ${res.status} ${res.statusText}`;
                }
              } catch (parseError) {
                // If JSON parsing fails, use the text as error message
                errorMessage = errorText.substring(0, 500) || `BOL creation failed: ${res.status} ${res.statusText}`;
              }
            } else {
              // Not JSON, use text as error message
              errorMessage = errorText.substring(0, 500) || `BOL creation failed: ${res.status} ${res.statusText}`;
            }
          }
        } catch (textError) {
          // If we can't read the response, use default error message
          console.error('Failed to extract error message:', textError);
          errorMessage = `BOL creation failed: ${res.status} ${res.statusText}`;
        }
        
        // Ensure errorMessage is always a valid non-empty string
        if (!errorMessage || typeof errorMessage !== 'string' || errorMessage.trim() === '') {
          errorMessage = `BOL creation failed: ${res.status} ${res.statusText}`;
        }
        
        // Sanitize errorMessage to ensure it's safe to use
        const safeErrorMessage = String(errorMessage).trim() || `BOL creation failed: ${res.status} ${res.statusText}`;
        
        // Create a more informative error
        const apiError = new Error(safeErrorMessage);
        (apiError as any).status = res.status;
        (apiError as any).details = errorDetails;
        throw apiError;
      }

      const data = await res.json();
      setResponseJson(data);
      setShowResponseJson(true);
      
      if (onResponseDataChange) {
        onResponseDataChange(data);
      }
      
      // Save form data
      const formData = {
        requesterRole,
        paymentTerms,
        pickupLocation,
        deliveryLocation,
        billTo,
        commodities,
        emergencyContactName,
        emergencyContactPhone,
        totalDeclaredValue,
        excessiveLiabilityAuth,
        selectedPickupServices,
        selectedDeliveryServices,
        selectedPremiumServices,
        schedulePickup,
        pickupDate,
        pickupReadyTime,
        dockCloseTime,
        contactCompanyName,
        contactName,
        contactPhone,
        contactExtension,
        proNumberOption,
        preAssignedProNumber,
        references,
        comments,
        saveAsTemplate,
        signBOLWithRequester,
        agreeToTerms,
      };
      if (onFormDataChange) {
        onFormDataChange(formData);
      }
      
      // Call onNext to proceed to next step
      if (onNext) {
        onNext();
      }
    } catch (err) {
      console.error('BOL Creation Error:', err);
      
      // Extract error message from various error types
      let errorMessage = 'An unexpected error occurred while creating the Bill of Lading.';
      
      try {
        if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
        } else if (typeof err === 'string') {
          errorMessage = err;
        } else if (err && typeof err === 'object') {
          errorMessage = (err as any).message || (err as any).error || String(err);
        } else if (err !== null && err !== undefined) {
          errorMessage = String(err);
        }
      } catch (extractError) {
        // If we can't extract the error message, use default
        console.error('Failed to extract error message:', extractError);
        errorMessage = 'An unexpected error occurred while creating the Bill of Lading.';
      }
      
      // Ensure errorMessage is always a valid string
      if (!errorMessage || typeof errorMessage !== 'string' || errorMessage.trim() === '') {
        errorMessage = 'An unexpected error occurred while creating the Bill of Lading.';
      }
      
      // Create a user-friendly error with guaranteed valid message
      const safeErrorMessage = String(errorMessage).trim() || 'An unexpected error occurred while creating the Bill of Lading.';
      const userError = new Error(safeErrorMessage);
      
      // Preserve error metadata if available
      if (err && typeof err === 'object') {
        if ('status' in err) {
          (userError as any).status = (err as any).status;
        }
        if ('details' in err) {
          (userError as any).details = (err as any).details;
        }
      }
      
      setError(userError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          {onPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              className="text-slate-600 hover:text-slate-700"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-slate-900">Create Bill Of Lading</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <BasicInformationSection
              requesterRole={requesterRole}
              onRequesterRoleChange={setRequesterRole}
              paymentTerms={paymentTerms}
              onPaymentTermsChange={setPaymentTerms}
              onClearForm={handleClearForm}
            />
          </div>

          {/* Pickup Location */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <LocationSection
              title="Pickup Location"
              data={pickupLocation}
              onDataChange={setPickupLocation}
              onZipLookup={(zip) => lookupZipCode(zip, 'pickup')}
              loadingZip={pickupLoadingZip}
              showEmail={true}
              required={true}
              addressBookOptions={XPO_SHIPPER_ADDRESS_BOOK.map(addr => ({
                value: addr.value,
                label: addr.label,
                company: addr.company,
                streetAddress: addr.streetAddress,
                addressLine2: addr.addressLine2,
                city: addr.city,
                state: addr.state,
                zip: addr.zip,
                country: addr.country,
                phone: addr.phone,
                extension: addr.extension,
                contactName: addr.contactName,
              }))}
            />
          </div>

          {/* Delivery Location */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <LocationSection
              title="Delivery Location"
              data={deliveryLocation}
              onDataChange={setDeliveryLocation}
              onZipLookup={(zip) => lookupZipCode(zip, 'delivery')}
              loadingZip={deliveryLoadingZip}
              showEmail={true}
              required={true}
            />
          </div>

          {/* Bill To */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <BillToSection
              billTo={billTo}
              onBillToChange={setBillTo}
            />
          </div>

          {/* Commodity Details */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Commodity Details</h2>
              {commodities.map((commodity, index) => (
                <CommodityDetailsSection
                  key={index}
                  commodity={commodity}
                  index={index}
                  onUpdate={updateCommodity}
                  onUpdateNested={updateCommodityNested}
                  onRemove={removeCommodity}
                  canRemove={commodities.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={addCommodity}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Commodity
              </button>
            </div>
          </div>

          {/* Additional Commodity */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <AdditionalCommoditySection />
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <EmergencyContactSection
              name={emergencyContactName}
              onNameChange={setEmergencyContactName}
              phone={emergencyContactPhone}
              onPhoneChange={setEmergencyContactPhone}
            />
          </div>

          {/* Declared Value */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <DeclaredValueSection
              totalDeclaredValue={totalDeclaredValue}
              onTotalDeclaredValueChange={setTotalDeclaredValue}
              excessiveLiabilityAuth={excessiveLiabilityAuth}
              onExcessiveLiabilityAuthChange={setExcessiveLiabilityAuth}
            />
          </div>

          {/* Pickup Services */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ServicesSection
              title="Pickup Services"
              services={PICKUP_SERVICES}
              selectedServices={selectedPickupServices}
              onServiceToggle={handlePickupServiceToggle}
              columns={3}
            />
          </div>

          {/* Delivery Services */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ServicesSection
              title="Delivery Services"
              services={DELIVERY_SERVICES}
              selectedServices={selectedDeliveryServices}
              onServiceToggle={handleDeliveryServiceToggle}
              columns={3}
            />
          </div>

          {/* Premium Services */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ServicesSection
              title="Premium Services"
              services={PREMIUM_SERVICES}
              selectedServices={selectedPremiumServices}
              onServiceToggle={handlePremiumServiceToggle}
              columns={3}
            />
          </div>

          {/* Pickup Request */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <PickupRequestSection
              schedulePickup={schedulePickup}
              onSchedulePickupChange={setSchedulePickup}
              pickupDate={pickupDate}
              onPickupDateChange={setPickupDate}
              pickupReadyTime={pickupReadyTime}
              onPickupReadyTimeChange={setPickupReadyTime}
              dockCloseTime={dockCloseTime}
              onDockCloseTimeChange={setDockCloseTime}
              useMyContactInfo={useMyContactInfo}
              onUseMyContactInfoChange={setUseMyContactInfo}
              contactCompanyName={contactCompanyName}
              onContactCompanyNameChange={setContactCompanyName}
              contactName={contactName}
              onContactNameChange={setContactName}
              contactPhone={contactPhone}
              onContactPhoneChange={setContactPhone}
              contactExtension={contactExtension}
              onContactExtensionChange={setContactExtension}
            />
          </div>

          {/* XPO Pro Number */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <XPOProNumberSection
              proNumberOption={proNumberOption}
              onProNumberOptionChange={setProNumberOption}
              preAssignedProNumber={preAssignedProNumber}
              onPreAssignedProNumberChange={setPreAssignedProNumber}
            />
          </div>

          {/* Reference Numbers */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ReferenceNumbersSection
              references={references}
              onReferencesChange={setReferences}
            />
          </div>

          {/* Additional Comments */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <AdditionalCommentsSection
              comments={comments}
              onCommentsChange={setComments}
            />
          </div>

          {/* Footer Actions */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="space-y-6 pt-6 border-t border-slate-200">
              {/* Checkboxes */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Save as a new BOL Template</span>
                </label>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signBOLWithRequester}
                      onChange={(e) => setSignBOLWithRequester(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Sign BOL with Requester Name</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1 ml-6">
                    If you check this box, we will automatically pre-print the name of the requester in the &quot;Authorized Signature&quot; field of the BOL
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-slate-700">
                    I agree to{' '}
                    <Link href="#" className="text-blue-600 underline">
                      Terms of Service
                    </Link>
                    {' '}({' '}
                    <Link href="#" className="text-blue-600 underline">
                      View tariff rules and regulations
                    </Link>
                    {' '})
                  </span>
                </label>
              </div>

              {/* Payload Preview - Below checkboxes */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Request Payload Preview</h2>
                  <button
                    type="button"
                    onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showPayloadPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>
                {showPayloadPreview && (
                  <div className="mt-4">
                    {payloadPreview ? (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <pre className="text-xs text-slate-700 overflow-auto max-h-96 whitespace-pre-wrap break-words">
                          {JSON.stringify(payloadPreview, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Fill in the form to see the payload preview</p>
                    )}
                  </div>
                )}
              </div>

              {/* Error Display - At bottom before action buttons */}
              {error && (
                <div className="pt-6 border-t border-slate-200">
                  <ErrorDisplay error={error} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-4 ml-auto">
                  <button
                    type="submit"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    disabled={loading || !agreeToTerms}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating BOL...
                      </>
                    ) : (
                      'Create BOL'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSaveAsTemplate(true);
                      handleSubmit();
                    }}
                    className="px-6 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
                  >
                    Create BOL Template
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Response JSON */}
          {responseJson && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Response JSON</h2>
                <button
                  type="button"
                  onClick={() => setShowResponseJson(!showResponseJson)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showResponseJson ? 'Hide' : 'Show'} Response
                </button>
              </div>
              {showResponseJson && (
                <div className="mt-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <pre className="text-xs text-slate-700 overflow-auto max-h-96 whitespace-pre-wrap break-words">
                      {JSON.stringify(responseJson, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

