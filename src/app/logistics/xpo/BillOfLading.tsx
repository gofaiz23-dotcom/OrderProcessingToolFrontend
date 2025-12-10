'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildXPOBillOfLadingRequestBody, buildXPOPickupRequestRequestBody } from './utils/requestBuilder';
import type { XPOBillOfLadingFields, XPOBillOfLadingCommodity, XPOBillOfLadingAddress, XPOBillOfLadingPickupInfo } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import type { XPOPickupRequestFields } from '@/app/api/ShippingUtil/xpo/PickupRequestField';
import { 
  XPO_BOL_COMMODITY_DEFAULTS,
  XPO_BOL_REQUESTER_ROLE_OPTIONS,
  XPO_BOL_CHARGE_TO_OPTIONS,
  XPO_BOL_PACKAGE_CODE_OPTIONS,
  XPO_BOL_COUNTRY_OPTIONS
} from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { XPO_SHIPPER_ADDRESS_BOOK } from '@/Shared/constant';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';

type RateQuoteData = {
  data?: {
    data?: {
      rateQuote?: {
        shipmentInfo?: {
          shipper?: XPOBillOfLadingAddress;
          commodity?: XPOBillOfLadingCommodity[];
        };
      };
    };
  };
  quote?: {
    shipmentInfo?: {
      shipper?: XPOBillOfLadingAddress;
      commodity?: XPOBillOfLadingCommodity[];
    };
  };
  shipmentInfo?: {
    shipper?: XPOBillOfLadingAddress;
    commodity?: XPOBillOfLadingCommodity[];
  };
};

type FormData = {
  requesterRole?: string;
  consignee?: XPOBillOfLadingAddress;
  shipper?: XPOBillOfLadingAddress;
  billToCust?: XPOBillOfLadingAddress;
  commodityLine?: XPOBillOfLadingCommodity[];
  chargeToCd?: string;
  remarks?: string;
  autoAssignPro?: boolean;
  schedulePickup?: boolean;
  pickupDate?: string;
  pickupTime?: string;
  dockCloseTime?: string;
  pickupContactCompanyName?: string;
  pickupContactFullName?: string;
  pickupContactPhone?: string;
  pickupInfo?: XPOBillOfLadingPickupInfo;
  declaredValueAmt?: number;
  declaredValueAmtPerLb?: number;
  excessLiabilityChargeInit?: string;
  rateQuoteNumber?: string;
};

type BillOfLandingProps = {
  onNext: () => void;
  onNextToPickup?: () => void; // Navigate to Pickup Request page (step 3)
  onNextToSummary?: () => void; // Navigate to Response Summary page (step 4)
  onPrevious: () => void;
  quoteData?: RateQuoteData;
  orderData?: {
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  } | null;
  initialFormData?: FormData;
  initialResponseData?: Record<string, unknown>;
  onFormDataChange?: (data: FormData) => void;
  onResponseDataChange?: (data: Record<string, unknown>) => void;
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
  onNextToPickup,
  onNextToSummary,
  onPrevious,
  quoteData,
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
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<Record<string, unknown> | null>(null);
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    requester: true,
    consignee: true,
    shipper: true,
    billTo: true,
    commodities: true,
    optional: false,
    pickupRequest: false,
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
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [shipperAcctInstId, setShipperAcctInstId] = useState<string>('');
  const [shipperAcctMadCd, setShipperAcctMadCd] = useState<string>('');
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

  // Commodities - Initialize with defaults (will be populated from quoteData)
  const [commodities, setCommodities] = useState<XPOBillOfLadingCommodity[]>([
    { 
      ...XPO_BOL_COMMODITY_DEFAULTS,
      nmfcItemCd: '079300', // Default NMFC Code
      sub: '03', // Default Sub
    }
  ]);

  // Optional fields
  const [chargeToCd, setChargeToCd] = useState<string>('P');
  const [remarks, setRemarks] = useState<string>('');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');
  const [autoAssignPro, setAutoAssignPro] = useState<boolean>(true);
  
  // Declared Value and Excess Liability fields
  const [declaredValueAmt, setDeclaredValueAmt] = useState<number>(0.01);
  const [declaredValueAmtPerLb, setDeclaredValueAmtPerLb] = useState<number>(0.01);
  const [excessLiabilityChargeInit, setExcessLiabilityChargeInit] = useState<string>('');
  
  // Rate Quote Number for suppRef
  const [rateQuoteNumber, setRateQuoteNumber] = useState<string>('');

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Pickup Request fields
  const [schedulePickup, setSchedulePickup] = useState<boolean>(false);
  const [pickupDate, setPickupDate] = useState<string>(getTodayDate());
  const [pickupTime, setPickupTime] = useState<string>('11:00');
  const [dockCloseTime, setDockCloseTime] = useState<string>('12:00'); // 1 hour after pickup time
  const [pickupContactCompanyName, setPickupContactCompanyName] = useState<string>('XPO LOGISTICS FREIGHT, INC.');
  const [pickupContactFullName, setPickupContactFullName] = useState<string>('XPO Driver');
  const [pickupContactPhone, setPickupContactPhone] = useState<string>('562-9468331');

  // Ref to track previous form data to prevent infinite loops
  const prevFormDataRef = useRef<FormData | null>(null);
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
      if (initialFormData.declaredValueAmt !== undefined) setDeclaredValueAmt(initialFormData.declaredValueAmt);
      if (initialFormData.declaredValueAmtPerLb !== undefined) setDeclaredValueAmtPerLb(initialFormData.declaredValueAmtPerLb);
      if (initialFormData.excessLiabilityChargeInit !== undefined) setExcessLiabilityChargeInit(initialFormData.excessLiabilityChargeInit);
      if (initialFormData.rateQuoteNumber) setRateQuoteNumber(initialFormData.rateQuoteNumber);
      
      // Load pickup request data if available
      if (initialFormData.pickupInfo) {
        setSchedulePickup(true);
        // Parse ISO 8601 date-time strings to extract date and time
        if (initialFormData.pickupInfo.pkupDate) {
          const pkupDateObj = new Date(initialFormData.pickupInfo.pkupDate);
          if (!isNaN(pkupDateObj.getTime())) {
            const dateStr = pkupDateObj.toISOString().split('T')[0];
            const timeStr = pkupDateObj.toTimeString().split(' ')[0].substring(0, 5);
            setPickupDate(dateStr);
            setPickupTime(timeStr);
          } else {
            // If parsing fails, use defaults
            setPickupDate(getTodayDate());
            setPickupTime('11:00');
          }
        } else {
          // If no date provided, use defaults
          setPickupDate(getTodayDate());
          setPickupTime('11:00');
        }
        if (initialFormData.pickupInfo.dockCloseTime) {
          const dockCloseDateObj = new Date(initialFormData.pickupInfo.dockCloseTime);
          if (!isNaN(dockCloseDateObj.getTime())) {
            const timeStr = dockCloseDateObj.toTimeString().split(' ')[0].substring(0, 5);
            setDockCloseTime(timeStr);
          } else {
            // If parsing fails, use default (1 hour after pickup time)
            setDockCloseTime('12:00');
          }
        } else {
          // If no dock close time provided, use default (1 hour after pickup time)
          setDockCloseTime('12:00');
        }
        if (initialFormData.pickupInfo.contact) {
          if (initialFormData.pickupInfo.contact.companyName) {
            setPickupContactCompanyName(initialFormData.pickupInfo.contact.companyName);
          }
          if (initialFormData.pickupInfo.contact.fullName) {
            setPickupContactFullName(initialFormData.pickupInfo.contact.fullName);
          }
          if (initialFormData.pickupInfo.contact.phone?.phoneNbr) {
            setPickupContactPhone(initialFormData.pickupInfo.contact.phone.phoneNbr);
          }
        }
      } else if (initialFormData.schedulePickup !== undefined) {
        setSchedulePickup(initialFormData.schedulePickup);
        // If schedulePickup is enabled but no pickupInfo, ensure defaults are set
        if (initialFormData.schedulePickup) {
          setPickupDate(getTodayDate());
          setPickupTime('11:00');
          setDockCloseTime('16:30');
        }
      }
      
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
      schedulePickup,
      pickupDate,
      pickupTime,
      dockCloseTime,
      pickupContactCompanyName,
      pickupContactFullName,
      pickupContactPhone,
      declaredValueAmt,
      declaredValueAmtPerLb,
      excessLiabilityChargeInit,
      rateQuoteNumber,
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
    schedulePickup, pickupDate, pickupTime, dockCloseTime,
    pickupContactCompanyName, pickupContactFullName, pickupContactPhone,
    declaredValueAmt, declaredValueAmtPerLb, excessLiabilityChargeInit,
    rateQuoteNumber,
  ]);

  // Load response data if provided
  useEffect(() => {
    if (initialResponseData && onResponseDataChange) {
      onResponseDataChange(initialResponseData);
    }
  }, [initialResponseData, onResponseDataChange]);

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
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Payload Preview Debug:', {
            schedulePickup,
            pickupDate,
            pickupTime,
            dockCloseTime,
            hasPickupInfoInRequestBody: !!requestBody.bol?.pickupInfo,
            hasPickupInfoInPayload: !!finalPayload.bol?.pickupInfo,
            requestBodyPickupInfo: requestBody.bol?.pickupInfo,
            payloadPickupInfo: finalPayload.bol?.pickupInfo,
          });
          if (schedulePickup && !finalPayload.bol?.pickupInfo) {
            console.warn('WARNING: schedulePickup is true but pickupInfo is missing in payload!', {
              schedulePickup,
              pickupDate,
              pickupTime,
              dockCloseTime,
              requestBodyPickupInfo: requestBody.bol?.pickupInfo,
            });
          }
        }
        
        setPayloadPreview(finalPayload);
      } else {
        setPayloadPreview(null);
      }
    } catch (error) {
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error building payload preview:', error);
      }
      // Silently fail - preview will update when form is valid
      setPayloadPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    requesterRole,
    consigneeAddressLine1, consigneeCity, consigneeState, consigneeCountry, consigneePostalCd,
    consigneeCompanyName, consigneeEmail, consigneePhone,
    shipperAddressLine1, shipperCity, shipperState, shipperCountry, shipperPostalCd,
    shipperCompanyName, shipperEmail, shipperPhone, shipperAcctInstId, pickupLocation,
    billToAddressLine1, billToCity, billToState, billToCountry, billToPostalCd,
    billToCompanyName, billToEmail, billToPhone,
    commodities, chargeToCd, remarks, autoAssignPro,
    schedulePickup, pickupDate, pickupTime, dockCloseTime,
    pickupContactCompanyName, pickupContactFullName, pickupContactPhone,
    declaredValueAmt, declaredValueAmtPerLb, excessLiabilityChargeInit,
    rateQuoteNumber,
    carrier, getToken,
  ]);

  // Extract rate quote number from quoteData
  useEffect(() => {
    if (quoteData && !initialFormData) {
      let confirmationNbr: string = '';
      
      // Check if quoteData has a quote object with confirmationNbr
      if ((quoteData as any)?.quote?.confirmationNbr) {
        confirmationNbr = (quoteData as any).quote.confirmationNbr;
      }
      // Check if quoteData has data.data.rateQuote.confirmationNbr (full response structure)
      else if ((quoteData as any)?.data?.data?.rateQuote?.confirmationNbr) {
        confirmationNbr = (quoteData as any).data.data.rateQuote.confirmationNbr;
      }
      // Check if quoteData is the rateQuote object directly
      else if ((quoteData as any)?.confirmationNbr) {
        confirmationNbr = (quoteData as any).confirmationNbr;
      }
      // Also check for quoteId or spotQuoteNbr as fallback
      else if ((quoteData as any)?.data?.data?.rateQuote?.quoteId) {
        confirmationNbr = (quoteData as any).data.data.rateQuote.quoteId;
      }
      else if ((quoteData as any)?.data?.data?.rateQuote?.spotQuoteNbr) {
        confirmationNbr = (quoteData as any).data.data.rateQuote.spotQuoteNbr;
      }
      else if ((quoteData as any)?.quoteId) {
        confirmationNbr = (quoteData as any).quoteId;
      }
      else if ((quoteData as any)?.spotQuoteNbr) {
        confirmationNbr = (quoteData as any).spotQuoteNbr;
      }
      
      // Set rate quote number if found
      if (confirmationNbr && confirmationNbr.trim() !== '') {
        setRateQuoteNumber(confirmationNbr.trim());
      }
    }
  }, [quoteData, initialFormData]);

  // Populate from quoteData (rate quote response)
  useEffect(() => {
    if (quoteData && !initialFormData) {
      isLoadingFromInitialDataRef.current = true;
      // Extract data from various possible quoteData structures
      let rateQuote: RateQuoteData | null = null;
      
      // Check if quoteData has data.data.rateQuote (full response structure)
      // Structure: { data: { data: { rateQuote: { shipmentInfo: {...} } } } }
      if (quoteData?.data?.data?.rateQuote) {
        rateQuote = quoteData.data.data.rateQuote;
      }
      // Check if quoteData has a quote object with shipmentInfo
      else if (quoteData?.quote?.shipmentInfo) {
        rateQuote = quoteData.quote;
      }
      // Check if quoteData is the rateQuote object directly
      else if (quoteData?.shipmentInfo) {
        rateQuote = quoteData;
      }

      if (rateQuote?.shipmentInfo) {
        const shipmentInfo = rateQuote.shipmentInfo;

        // Populate shipper information
        if (shipmentInfo.shipper) {
          const shipper = shipmentInfo.shipper;
          
          if (shipper.acctInstId) {
            setShipperAcctInstId(shipper.acctInstId);
          }
          // Check for acctMadCd in the shipper object (may exist in response but not in type)
          if ('acctMadCd' in shipper && typeof shipper.acctMadCd === 'string') {
            setShipperAcctMadCd(shipper.acctMadCd);
          }
          if (shipper.address) {
            // Check for name property (may exist in response but not in type)
            if ('name' in shipper.address && typeof shipper.address.name === 'string') {
              setShipperCompanyName(shipper.address.name);
            }
            if (shipper.address.addressLine1) {
              setShipperAddressLine1(shipper.address.addressLine1);
            }
            // addressLine2 is optional and may be empty in response
            // Note: addressLine2 field exists in the response but may be empty string
            // The UI doesn't have a separate addressLine2 field, it's combined with addressLine1
            if (shipper.address.cityName) {
              setShipperCity(shipper.address.cityName);
            }
            if (shipper.address.stateCd) {
              setShipperState(shipper.address.stateCd);
            }
            if (shipper.address.countryCd) {
              setShipperCountry(shipper.address.countryCd);
            }
            if (shipper.address.postalCd) {
              setShipperPostalCd(shipper.address.postalCd);
            }
          }
        }

        // Populate commodity information (first commodity)
        if (shipmentInfo.commodity && Array.isArray(shipmentInfo.commodity) && shipmentInfo.commodity.length > 0) {
          const firstCommodity = shipmentInfo.commodity[0];
          
          setCommodities(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[0] = {
                ...updated[0],
                // Update weight from rate quote response
                ...(firstCommodity.grossWeight?.weight !== undefined && {
                  grossWeight: {
                    ...updated[0].grossWeight,
                    weight: firstCommodity.grossWeight.weight,
                  }
                }),
                // Update freight class (nmfcClass) from rate quote response
                // Convert "250.0" to "250" if needed
                ...(firstCommodity.nmfcClass && {
                  nmfcClass: String(firstCommodity.nmfcClass).replace(/\.0+$/, ''),
                }),
                // Set default NMFC Code and Sub (always set these defaults, editable)
                nmfcItemCd: '079300',
                sub: '03',
              };
            } else {
              // If no commodity exists, create one with data from quote
              updated.push({
                ...XPO_BOL_COMMODITY_DEFAULTS,
                ...(firstCommodity.grossWeight?.weight !== undefined && {
                  grossWeight: {
                    weight: firstCommodity.grossWeight.weight,
                  }
                }),
                ...(firstCommodity.nmfcClass && {
                  nmfcClass: String(firstCommodity.nmfcClass).replace(/\.0+$/, ''),
                }),
                nmfcItemCd: '079300',
                sub: '03',
              });
            }
            return updated;
          });
        }
      }
      
      // Reset flag after a short delay to allow all state updates to complete
      setTimeout(() => {
        isLoadingFromInitialDataRef.current = false;
      }, 0);
    }
  }, [quoteData, initialFormData]);

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

  const updateCommodity = (index: number, field: keyof XPOBillOfLadingCommodity, value: unknown) => {
    const updated = [...commodities];
    updated[index] = { ...updated[index], [field]: value };
    setCommodities(updated);
  };

  const updateCommodityNested = (index: number, path: string[], value: unknown) => {
    const updated = [...commodities];
    const commodity = { ...updated[index] };
    let current: Record<string, unknown> = commodity as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      const nextValue = current[path[i]];
      if (nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
        current[path[i]] = { ...nextValue as Record<string, unknown> };
        current = current[path[i]] as Record<string, unknown>;
      } else {
        current[path[i]] = {};
        current = current[path[i]] as Record<string, unknown>;
      }
    }
    current[path[path.length - 1]] = value;
    updated[index] = commodity;
    setCommodities(updated);
  };

  // Helper function to normalize phone number to XPO format: NNN-NNNNNNN (3 digits, hyphen, 7 digits)
  // Handles formats like "+1 (646) 504-0655" -> "646-5040655"
  const normalizePhoneNumber = (phone: string | null | undefined): string => {
    if (!phone || typeof phone !== 'string') {
      return '';
    }
    
    let normalized = phone.trim();
    
    // Remove spaces, parentheses, and other non-digit characters except hyphens
    normalized = normalized.replace(/[\s\(\)]/g, '');
    
    // Handle +1 prefix (e.g., "+1 (646) 504-0655" -> "6465040655")
    if (normalized.startsWith('+1')) {
      normalized = normalized.replace(/^\+1[\s\-]*/, '');
    } else if (normalized.startsWith('1-') && normalized.replace(/[^\d]/g, '').length >= 11) {
      normalized = normalized.replace(/^1-/, '');
    } else if (normalized.match(/^1\d{10}$/)) {
      // Handle format like "16465040655" (11 digits starting with 1)
      normalized = normalized.substring(1);
    }
    
    // Remove all non-digit characters to get just digits
    const digitsOnly = normalized.replace(/[^\d]/g, '');
    
    // Format as NNN-NNNNNNN if we have 10 digits
    if (digitsOnly.length === 10) {
      return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3)}`;
    } else if (digitsOnly.length > 0) {
      // If not exactly 10 digits, try to format anyway if we have at least 10 digits
      if (digitsOnly.length >= 10) {
        return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 10)}`;
      }
      // Return as-is if we have some digits but less than 10
      return digitsOnly;
    }
    
    // Return empty string if no digits found
    return '';
  };

  // Helper function to format date and time to ISO 8601 with PST timezone (-08:00)
  // Returns format: "2025-12-15T12:00:00-08:00"
  // Always uses PST timezone (-08:00) regardless of user's location
  const formatDateTimeWithTimezone = (date: string, time: string): string => {
    // Validate inputs - must be non-empty strings
    if (!date || !time || typeof date !== 'string' || typeof time !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('formatDateTimeWithTimezone: Invalid input types', { date, time, dateType: typeof date, timeType: typeof time });
      }
      return '';
    }
    
    // Trim whitespace
    const trimmedDate = date.trim();
    const trimmedTime = time.trim();
    
    // Check if inputs are empty after trimming
    if (!trimmedDate || !trimmedTime) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('formatDateTimeWithTimezone: Empty after trim', { trimmedDate, trimmedTime });
      }
      return '';
    }
    
    // Validate date format (should be YYYY-MM-DD for date input)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trimmedDate)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('formatDateTimeWithTimezone: Invalid date format', { trimmedDate });
      }
      return '';
    }
    
    // Validate time format (should be HH:mm for time input)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(trimmedTime)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('formatDateTimeWithTimezone: Invalid time format', { trimmedTime });
      }
      return '';
    }
    
    // Parse date components
    const [year, month, day] = trimmedDate.split('-').map(Number);
    const [hours, minutes] = trimmedTime.split(':').map(Number);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('formatDateTimeWithTimezone: Invalid parsed values', { year, month, day, hours, minutes });
      }
      return '';
    }
    
    // Validate date values
    if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('formatDateTimeWithTimezone: Invalid date/time values', { year, month, day, hours, minutes });
      }
      return '';
    }
    
    // Format as ISO 8601 with PST timezone offset (-08:00)
    // Format: "2025-12-15T12:00:00-08:00"
    // XPO BOL expects PST timezone (-08:00) as shown in backend template examples
    // This ensures consistent timezone regardless of user's browser location
    // IMPORTANT: We ALWAYS use -08:00 (PST) regardless of user's timezone
    const yearStr = String(year).padStart(4, '0');
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    
    // Use PST timezone offset (-08:00) - Pacific Standard Time
    // This matches the example in the backend template: "2025-12-15T12:00:00-08:00"
    // CRITICAL: We hardcode -08:00 to avoid timezone conversion issues
    const formatted = `${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00-08:00`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('formatDateTimeWithTimezone: Success - FORCING PST TIMEZONE (-08:00)', { 
        inputDate: date, 
        inputTime: time,
        formatted,
        note: 'This should ALWAYS end with -08:00, never with +05:30 or any other timezone'
      });
    }
    
    return formatted;
  };

  const buildRequestBody = (): XPOBillOfLadingFields => {
    // Use shipperAcctInstId from state if available, otherwise extract from pickup location selection
    let finalShipperAcctInstId: string | undefined = shipperAcctInstId || undefined;
    
    if (!finalShipperAcctInstId && pickupLocation) {
      // Extract ID from format "ammana-{id}"
      if (pickupLocation.startsWith('ammana-')) {
        const idStr = pickupLocation.replace('ammana-', '');
        const idNum = parseInt(idStr, 10);
        if (!isNaN(idNum)) {
          const selectedShipper = XPO_SHIPPER_ADDRESS_BOOK.find(s => s.id === idNum);
          if (selectedShipper?.id) {
            finalShipperAcctInstId = selectedShipper.id.toString();
          }
        }
      } else {
        // Try direct ID match
        const idNum = parseInt(pickupLocation, 10);
        if (!isNaN(idNum)) {
          const selectedShipper = XPO_SHIPPER_ADDRESS_BOOK.find(s => s.id === idNum);
          if (selectedShipper?.id) {
            finalShipperAcctInstId = selectedShipper.id.toString();
          }
        }
      }
    }

    // Build pickupInfo ONLY if schedulePickup is explicitly true and all date/time values are valid
    // When schedulePickup is false, pickupInfo should NOT be included in the payload
    let pickupInfo: any = undefined;
    
    // Debug: Log the raw state values
    if (process.env.NODE_ENV === 'development') {
      console.log('buildRequestBody - Raw pickup state:', {
        schedulePickup,
        pickupDate,
        pickupTime,
        dockCloseTime,
        pickupDateType: typeof pickupDate,
        pickupTimeType: typeof pickupTime,
        dockCloseTimeType: typeof dockCloseTime,
      });
    }
    
    if (schedulePickup === true) {
      // Validate that all required fields are present and non-empty
      const trimmedDate = pickupDate ? String(pickupDate).trim() : '';
      const trimmedTime = pickupTime ? String(pickupTime).trim() : '';
      const trimmedDockCloseTime = dockCloseTime ? String(dockCloseTime).trim() : '';
      
      const hasValidDate = trimmedDate !== '';
      const hasValidTime = trimmedTime !== '';
      const hasValidDockCloseTime = trimmedDockCloseTime !== '';
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('buildRequestBody - Validating pickup fields:', {
          schedulePickup,
          trimmedDate,
          trimmedTime,
          trimmedDockCloseTime,
          hasValidDate,
          hasValidTime,
          hasValidDockCloseTime,
        });
      }
      
      if (hasValidDate && hasValidTime && hasValidDockCloseTime) {
        // Validate that pickup date is not in the past
        const today = getTodayDate();
        if (trimmedDate < today) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('buildRequestBody - PickupInfo validation failed: Pickup date cannot be in the past', {
              pickupDate: trimmedDate,
              today,
            });
          }
          // Don't include pickupInfo if validation fails
          pickupInfo = undefined;
        } else {
          // Validate that ready time is before dock close time
          const [readyHours, readyMinutes] = trimmedTime.split(':').map(Number);
          const [closeHours, closeMinutes] = trimmedDockCloseTime.split(':').map(Number);
          const readyTimeMinutes = readyHours * 60 + readyMinutes;
          const closeTimeMinutes = closeHours * 60 + closeMinutes;
          
          if (readyTimeMinutes >= closeTimeMinutes) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('buildRequestBody - PickupInfo validation failed: Ready time must be before dock close time', {
                readyTime: trimmedTime,
                dockCloseTime: trimmedDockCloseTime,
              });
            }
            // Don't include pickupInfo if validation fails
            pickupInfo = undefined;
          } else {
          // Format all three fields as ISO 8601 with PST timezone (-08:00): "2025-12-15T12:00:00-08:00"
          // pkupDate and pkupTime use the same date and pickup time (ready time)
          // dockCloseTime uses the same date but with dock close time
          // All three must have the same date (YYYY-MM-DD part)
          // CRITICAL: formatDateTimeWithTimezone ALWAYS uses -08:00 (PST) regardless of user's location
          const formattedPkupDate = formatDateTimeWithTimezone(trimmedDate, trimmedTime);
          const formattedPkupTime = formatDateTimeWithTimezone(trimmedDate, trimmedTime);
          const formattedDockCloseTime = formatDateTimeWithTimezone(trimmedDate, trimmedDockCloseTime);
          
          // Verify timezone is correct (should always end with -08:00)
          if (process.env.NODE_ENV === 'development') {
            console.log('buildRequestBody - Date formatting verification (should all end with -08:00):', {
              formattedPkupDate,
              formattedPkupTime,
              formattedDockCloseTime,
              pkupDateEndsWithPST: formattedPkupDate.endsWith('-08:00'),
              pkupTimeEndsWithPST: formattedPkupTime.endsWith('-08:00'),
              dockCloseTimeEndsWithPST: formattedDockCloseTime.endsWith('-08:00'),
            });
          }
          
          // Validate that all three formatted dates have the same date part (YYYY-MM-DD)
          // Extract date part from formatted strings (before the 'T')
          const pkupDatePart = formattedPkupDate ? formattedPkupDate.split('T')[0] : '';
          const pkupTimeDatePart = formattedPkupTime ? formattedPkupTime.split('T')[0] : '';
          const dockCloseDatePart = formattedDockCloseTime ? formattedDockCloseTime.split('T')[0] : '';
          
          // All three must have the same date part (YYYY-MM-DD) and match the input date
          const datesMatch = pkupDatePart !== '' && 
                            pkupTimeDatePart !== '' && 
                            dockCloseDatePart !== '' &&
                            pkupDatePart === pkupTimeDatePart && 
                            pkupTimeDatePart === dockCloseDatePart && 
                            pkupDatePart === trimmedDate;
          
          // Validate phone number is not empty
          const contactPhone = pickupContactPhone && pickupContactPhone.trim() !== '' 
            ? pickupContactPhone.trim() 
            : null;
          
          // Debug logging in development
          if (process.env.NODE_ENV === 'development') {
            console.log('buildRequestBody - Formatted pickup times:', {
              schedulePickup,
              pickupDate: trimmedDate,
              pickupTime: trimmedTime,
              dockCloseTime: trimmedDockCloseTime,
              formattedPkupDate,
              formattedPkupTime,
              formattedDockCloseTime,
              pkupDatePart,
              pkupTimeDatePart,
              dockCloseDatePart,
              datesMatch,
              contactPhone,
              allFormatted: !!(formattedPkupDate && formattedPkupTime && formattedDockCloseTime),
            });
          }
          
          // Only include pickupInfo if all formatted values are valid and dates match
          if (formattedPkupDate && formattedPkupTime && formattedDockCloseTime && datesMatch && contactPhone) {
            // Normalize phone number using the helper function
            let normalizedPhone = normalizePhoneNumber(contactPhone);
            
            // If normalization resulted in empty string, use default
            if (!normalizedPhone || normalizedPhone.trim() === '') {
              if (process.env.NODE_ENV === 'development') {
                console.warn('buildRequestBody - Pickup contact phone normalization resulted in empty string, using default');
              }
              normalizedPhone = '562-9468331';
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log('buildRequestBody - Pickup contact phone normalized:', {
                original: contactPhone,
                normalized: normalizedPhone,
              });
            }
            
            // CRITICAL VALIDATION: Ensure all dates end with -08:00 (PST timezone)
            // If they don't, something is wrong with the formatting
            if (!formattedPkupDate.endsWith('-08:00') || !formattedPkupTime.endsWith('-08:00') || !formattedDockCloseTime.endsWith('-08:00')) {
              console.error('CRITICAL ERROR: Dates are not formatted with -08:00 timezone!', {
                formattedPkupDate,
                formattedPkupTime,
                formattedDockCloseTime,
                pkupDateEndsWithPST: formattedPkupDate.endsWith('-08:00'),
                pkupTimeEndsWithPST: formattedPkupTime.endsWith('-08:00'),
                dockCloseTimeEndsWithPST: formattedDockCloseTime.endsWith('-08:00'),
              });
              // Don't include pickupInfo if timezone is wrong
              pickupInfo = undefined;
            } else {
              pickupInfo = {
                pkupDate: formattedPkupDate,
                pkupTime: formattedPkupTime,
                dockCloseTime: formattedDockCloseTime,
                contact: {
                  companyName: pickupContactCompanyName || 'XPO LOGISTICS FREIGHT, INC.',
                  fullName: pickupContactFullName || 'XPO Driver',
                  phone: {
                    phoneNbr: normalizedPhone,
                  },
                },
              };
              
              if (process.env.NODE_ENV === 'development') {
                console.log('buildRequestBody - pickupInfo built successfully with PST timezone (-08:00):', {
                  pkupDate: pickupInfo.pkupDate,
                  pkupTime: pickupInfo.pkupTime,
                  dockCloseTime: pickupInfo.dockCloseTime,
                  contactPhone: pickupInfo.contact.phone.phoneNbr,
                });
              }
            }
          } else if (process.env.NODE_ENV === 'development') {
            console.warn('buildRequestBody - PickupInfo not included: Validation failed', {
              formattedPkupDate: formattedPkupDate || 'EMPTY',
              formattedPkupTime: formattedPkupTime || 'EMPTY',
              formattedDockCloseTime: formattedDockCloseTime || 'EMPTY',
              datesMatch,
              contactPhone: contactPhone || 'EMPTY',
            });
          }
          }
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('buildRequestBody - PickupInfo not included: Missing required fields', {
          hasValidDate,
          hasValidTime,
          hasValidDockCloseTime,
          trimmedDate,
          trimmedTime,
          trimmedDockCloseTime,
        });
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('buildRequestBody - schedulePickup is false, pickupInfo will not be included');
    }
    // When schedulePickup is false, pickupInfo remains undefined and will not be included

    // Normalize all phone numbers to XPO format: NNN-NNNNNNN
    const normalizedConsigneePhone = normalizePhoneNumber(consigneePhone);
    const normalizedShipperPhone = normalizePhoneNumber(shipperPhone);
    const normalizedBillToPhone = normalizePhoneNumber(billToPhone);

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
            // Always include email object - set to empty string if empty (backend will handle it)
            email: {
              emailAddr: consigneeEmail && consigneeEmail.trim() !== '' ? consigneeEmail.trim() : '',
            },
            phone: {
              phoneNbr: normalizedConsigneePhone,
            },
          },
        },
        shipper: {
          ...(finalShipperAcctInstId && { acctInstId: finalShipperAcctInstId }),
          address: {
            addressLine1: shipperAddressLine1,
            cityName: shipperCity,
            stateCd: shipperState,
            countryCd: shipperCountry,
            postalCd: shipperPostalCd,
          },
          contactInfo: {
            companyName: shipperCompanyName,
            // Always include email object - set to empty string if empty (backend will handle it)
            email: {
              emailAddr: shipperEmail && shipperEmail.trim() !== '' ? shipperEmail.trim() : '',
            },
            phone: {
              phoneNbr: normalizedShipperPhone,
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
            // Always include email object - set to empty string if empty (backend will handle it)
            email: {
              emailAddr: billToEmail && billToEmail.trim() !== '' ? billToEmail.trim() : '',
            },
            phone: {
              phoneNbr: normalizedBillToPhone,
            },
          },
        },
        commodityLine: commodities,
        chargeToCd,
        ...(remarks && { remarks }),
        ...(emergencyContactName && { emergencyContactName }),
        ...(emergencyContactPhone && { emergencyContactPhone: { phoneNbr: emergencyContactPhone } }),
        // Include pickupInfo only if schedulePickup is true and all date/time values are valid
        ...(schedulePickup && 
            pickupDate && 
            pickupTime && 
            dockCloseTime && 
            pickupDate.trim() !== '' && 
            pickupTime.trim() !== '' && 
            dockCloseTime.trim() !== '' && 
            (() => {
              // Format all three fields as ISO 8601 with timezone: "2025-12-15T12:00:00-08:00"
              // pkupDate and pkupTime use the same date and pickup time
              // dockCloseTime uses the same date but with dock close time
              const formattedPkupDate = formatDateTimeWithTimezone(pickupDate, pickupTime);
              const formattedPkupTime = formatDateTimeWithTimezone(pickupDate, pickupTime);
              const formattedDockCloseTime = formatDateTimeWithTimezone(pickupDate, dockCloseTime);
              
              // Only include pickupInfo if all formatted values are valid (not empty strings)
              if (formattedPkupDate && formattedPkupTime && formattedDockCloseTime) {
                return {
                  pickupInfo: {
                    pkupDate: formattedPkupDate,
                    pkupTime: formattedPkupTime,
                    dockCloseTime: formattedDockCloseTime,
                    contact: {
                      companyName: pickupContactCompanyName || 'XPO LOGISTICS FREIGHT, INC.',
                      fullName: pickupContactFullName || 'XPO Driver',
                      phone: {
                        phoneNbr: pickupContactPhone || '562-9468331',
                      },
                    },
                  },
                };
              }
              return null;
            })()
        ),
      },
      autoAssignPro,
    };
  };

  // Helper function to convert date and time to ISO 8601 format for pickup request
  // Returns format: "2016-12-17T14:00:00" (without timezone)
  const convertToISO8601 = (date: string, time: string): string => {
    if (!date || !time) return '';
    const timeOnly = time.split('T')[1] || time.split(' ')[1] || time;
    // Extract just the time part (HH:mm or HH:mm:ss) and ensure seconds
    const timeParts = timeOnly.split(':');
    const hours = timeParts[0] || '00';
    const minutes = timeParts[1] || '00';
    const seconds = timeParts[2] || '00';
    return `${date}T${hours}:${minutes}:${seconds}`;
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
    // Validate pickup request fields if schedulePickup is enabled
    if (schedulePickup) {
      if (!pickupDate || !pickupTime || !dockCloseTime) {
        setError(new Error('Please fill in all required Pickup Request fields (Date, Time, Dock Close Time)'));
        setLoading(false);
        return;
      }
      
      // Validate that pickup date is not in the past
      const today = getTodayDate();
      if (pickupDate < today) {
        setError(new Error('Pickup date cannot be in the past. Please select today or a future date.'));
        setLoading(false);
        return;
      }
      
      // Validate that ready time is before dock close time
      const [readyHours, readyMinutes] = pickupTime.split(':').map(Number);
      const [closeHours, closeMinutes] = dockCloseTime.split(':').map(Number);
      const readyTimeMinutes = readyHours * 60 + readyMinutes;
      const closeTimeMinutes = closeHours * 60 + closeMinutes;
      
      if (readyTimeMinutes >= closeTimeMinutes) {
        setError(new Error('Pickup Ready Time must be before Dock Close Time'));
        setLoading(false);
        return;
      }
      
      if (!pickupContactCompanyName || !pickupContactFullName || !pickupContactPhone) {
        setError(new Error('Please fill in all required Pickup Contact fields'));
        setLoading(false);
        return;
      }
      
      // Validate phone number is not empty
      if (!pickupContactPhone || pickupContactPhone.trim() === '') {
        setError(new Error('Pickup Contact Phone Number is required'));
        setLoading(false);
        return;
      }
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
        let errorDetails: Record<string, unknown> | null = null;
        
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
                    ? errorData.errors.map((e: Record<string, unknown>) => 
                        (typeof e === 'object' && e !== null 
                          ? (e.message || e.msg || e.field || String(e))
                          : String(e))
                      ).join(', ')
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
              } catch {
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
        const apiError = new Error(safeErrorMessage) as Error & { status?: number; details?: Record<string, unknown> | null };
        apiError.status = res.status;
        apiError.details = errorDetails;
        throw apiError;
      }

      const data = await res.json();
      if (onResponseDataChange) {
        onResponseDataChange(data);
      }
      
      // If schedulePickup is true, also create a pickup request
      if (schedulePickup && pickupDate && pickupTime && dockCloseTime) {
        try {
          // Build pickup request payload from BOL form data
          const pickupRequestPayload: XPOPickupRequestFields = {
            pickupRqstInfo: {
              pkupDate: convertToISO8601(pickupDate, '00:00:00'), // Use date with 00:00:00 time
              readyTime: convertToISO8601(pickupDate, pickupTime),
              closeTime: convertToISO8601(pickupDate, dockCloseTime),
              shipper: {
                name: shipperCompanyName,
                addressLine1: shipperAddressLine1,
                cityName: shipperCity,
                stateCd: shipperState,
                countryCd: shipperCountry,
                postalCd: shipperPostalCd,
              },
              requestor: {
                contact: {
                  companyName: shipperCompanyName,
                  email: {
                    emailAddr: shipperEmail || '',
                  },
                  fullName: shipperCompanyName,
                  phone: {
                    phoneNbr: shipperPhone,
                  },
                },
                roleCd: requesterRole,
              },
              contact: {
                companyName: pickupContactCompanyName || shipperCompanyName,
                email: {
                  emailAddr: shipperEmail || '',
                },
                fullName: pickupContactFullName || shipperCompanyName,
                phone: {
                  phoneNbr: pickupContactPhone || shipperPhone,
                },
              },
              ...(remarks && { remarks }),
              pkupItem: commodities.map((commodity) => ({
                destZip6: consigneePostalCd.substring(0, 6),
                totWeight: {
                  weight: commodity.grossWeight?.weight || 0,
                },
                loosePiecesCnt: commodity.packaging?.packageCd !== 'PLT' ? (commodity.pieceCnt || 0) : 0,
                palletCnt: commodity.packaging?.packageCd === 'PLT' ? (commodity.pieceCnt || 0) : 0,
                garntInd: false,
                hazmatInd: commodity.hazmatInd || false,
                frzbleInd: false,
                holDlvrInd: false,
                foodInd: false,
                ...(commodity.desc && { remarks: commodity.desc }),
              })),
            },
          };

          const pickupPayload = buildXPOPickupRequestRequestBody(pickupRequestPayload);
          const finalPickupPayload = {
            shippingCompany: normalizedCarrier,
            ...pickupPayload,
          };

          if (process.env.NODE_ENV === 'development') {
            console.log('XPO Pickup Request:', JSON.stringify(finalPickupPayload, null, 2));
          }

          const pickupRes = await fetch(buildApiUrl('/Logistics/create-pickup-request'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(finalPickupPayload),
          });

          if (!pickupRes.ok) {
            const pickupErrorText = await pickupRes.text();
            let pickupErrorMessage = `Pickup request creation failed: ${pickupRes.status} ${pickupRes.statusText}`;
            
            try {
              if (pickupErrorText && pickupErrorText.trim()) {
                if (pickupErrorText.trim().startsWith('{') || pickupErrorText.trim().startsWith('[')) {
                  const pickupErrorData = JSON.parse(pickupErrorText);
                  pickupErrorMessage = pickupErrorData.message || pickupErrorData.error?.message || pickupErrorMessage;
                } else {
                  pickupErrorMessage = pickupErrorText.substring(0, 200);
                }
              }
            } catch {
              // Use default error message
            }

            // Log the error but don't fail the entire flow - BOL was created successfully
            console.error('Pickup Request Creation Error:', pickupErrorMessage);
            // You might want to show a warning to the user here
          } else {
            const pickupData = await pickupRes.json();
            if (process.env.NODE_ENV === 'development') {
              console.log('Pickup Request Created:', pickupData);
            }
          }
        } catch (pickupErr) {
          // Log the error but don't fail the entire flow - BOL was created successfully
          console.error('Pickup Request Creation Error:', pickupErr);
          // You might want to show a warning to the user here
        }
      }
      
      // Navigate based on schedulePickup:
      // - If schedulePickup is true: go to Response Summary (step 4) - pickup is already scheduled
      // - If schedulePickup is false: go to Pickup Request page (step 3) - user needs to schedule pickup separately
      if (schedulePickup) {
        // Pickup is already scheduled with BOL, go directly to Response Summary
        if (onNextToSummary) {
          onNextToSummary();
        } else {
          onNext(); // Fallback to default navigation
        }
      } else {
        // Pickup not scheduled, go to Pickup Request page
        if (onNextToPickup) {
          onNextToPickup();
        } else {
          onNext(); // Fallback to default navigation
        }
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
          const errObj = err as Record<string, unknown>;
          errorMessage = (errObj.message || errObj.error || String(err)) as string;
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
      const userError = new Error(safeErrorMessage) as Error & { status?: number; details?: Record<string, unknown> | null };
      
      // Preserve error metadata if available
      if (err && typeof err === 'object') {
        const errObj = err as Record<string, unknown>;
        if ('status' in errObj) {
          userError.status = errObj.status as number;
        }
        if ('details' in errObj) {
          userError.details = errObj.details as Record<string, unknown> | null;
        }
      }
      
      setError(userError);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setShowSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Parse address string to extract components
  const parseAddressString = (addressStr: string): { streetAddress: string; addressLine2: string; city: string; state: string; zip: string } => {
    if (!addressStr || addressStr.trim() === '') {
      return { streetAddress: '', addressLine2: '', city: '', state: '', zip: '' };
    }

    // Remove "US" if present before zip
    const cleaned = addressStr.trim().replace(/\s+US\s+(\d{5})$/, ' $1');
    
    // Extract zip (5 digits at the end)
    const zipMatch = cleaned.match(/(\d{5})$/);
    const zip = zipMatch ? zipMatch[1] : '';
    
    // Remove zip from string
    const withoutZip = cleaned.replace(/\s+\d{5}$/, '').trim();
    
    // Extract state (2 uppercase letters before zip/at end)
    const stateMatch = withoutZip.match(/\s+([A-Z]{2})\s*$/);
    const state = stateMatch ? stateMatch[1] : '';
    
    // Remove state from string
    let withoutStateZip = withoutZip.replace(/\s+[A-Z]{2}\s*$/, '').trim();
    
    // Handle special case: "# BHOUSTON" -> "# B" + "HOUSTON"
    withoutStateZip = withoutStateZip.replace(/#\s*B([A-Z])/gi, '# B $1');
    
    // Split by spaces to analyze components
    const parts = withoutStateZip.split(/\s+/);
    
    // Find where city starts (usually last 1-4 words before state)
    const streetAbbrevs = ['ST', 'AVE', 'DR', 'RD', 'PKWY', 'BLVD', 'CIR', 'CT', 'FWY', 'HWY', 'LN', 'PL', 'WAY', 'STREET'];
    const addressIndicators = ['STE', 'SUITE', '#', 'UNIT', 'APT', 'FLOOR', 'FL'];
    
    let cityStartIndex = parts.length;
    
    // Find the last street indicator or address indicator
    for (let i = parts.length - 1; i >= 0; i--) {
      const word = parts[i].toUpperCase();
      if (streetAbbrevs.includes(word) || addressIndicators.includes(word)) {
        cityStartIndex = i + 1;
        break;
      }
      // City names typically don't have numbers and are 1-3 words
      if (cityStartIndex === parts.length && i < parts.length - 1 && /^[A-Z]+$/.test(word) && i > 0) {
        const prevWord = parts[i - 1].toUpperCase();
        if (streetAbbrevs.includes(prevWord) || addressIndicators.includes(prevWord)) {
          cityStartIndex = i;
          break;
        }
      }
    }
    
    // If no clear city start found, try to identify city by pattern
    if (cityStartIndex === parts.length) {
      // Look for multi-word city names (typically 1-3 words, all caps, no numbers)
      for (let i = parts.length - 1; i >= Math.max(0, parts.length - 4); i--) {
        const potentialCity = parts.slice(i).join(' ');
        if (/^[A-Z\s]+$/.test(potentialCity) && potentialCity.length > 2 && !/\d/.test(potentialCity)) {
          cityStartIndex = i;
          break;
        }
      }
    }
    
    // Extract city and street address
    const city = cityStartIndex < parts.length ? parts.slice(cityStartIndex).join(' ') : '';
    const streetParts = cityStartIndex > 0 ? parts.slice(0, cityStartIndex) : parts;
    
    // Separate street address and address line 2
    let streetAddress = '';
    let addressLine2 = '';
    
    // Look for address line 2 indicators
    const line2Indicators = ['STE', 'SUITE', '#', 'UNIT', 'APT', 'FLOOR', 'FL'];
    let line2StartIndex = -1;
    
    for (let i = streetParts.length - 1; i >= 0; i--) {
      const word = streetParts[i].toUpperCase();
      if (line2Indicators.includes(word) && i > 0) {
        line2StartIndex = i;
        break;
      }
    }
    
    if (line2StartIndex >= 0) {
      streetAddress = streetParts.slice(0, line2StartIndex).join(' ');
      addressLine2 = streetParts.slice(line2StartIndex).join(' ');
    } else {
      streetAddress = streetParts.join(' ');
      addressLine2 = '';
    }
    
    return {
      streetAddress: streetAddress || '',
      addressLine2: addressLine2 || '',
      city: city || '',
      state: state || '',
      zip: zip || '',
    };
  };

  // Handle pickup location selection
  const handlePickupLocationChange = (value: string) => {
    setPickupLocation(value);
    if (!value) {
      // Clear fields when selection is cleared
      setShipperCompanyName('');
      setShipperAddressLine1('');
      setShipperCity('');
      setShipperState('');
      setShipperPostalCd('');
      setShipperCountry('US');
      setShipperPhone('');
      setShipperEmail('');
      return;
    }
  };

  const handlePickupLocationSelect = (option: SearchableDropdownOption) => {
    // Find address by value (ammana-id format) or by legacy value
    const addressId = option.value?.replace('ammana-', '');
    const address = XPO_SHIPPER_ADDRESS_BOOK.find(opt => 
      (opt.id && addressId && opt.id.toString() === addressId) || 
      opt.value === option.value
    );
    
    if (address) {
      // Get phone number from address (will be used for both shipper and pickup contact)
      const locationPhone = address.phone || '';
      
      // Handle simplified format
      if (address.id && address.name && address.address) {
        const parsed = parseAddressString(address.address);
        setShipperCompanyName(address.name);
        setShipperAddressLine1(parsed.streetAddress);
        setShipperCity(parsed.city);
        setShipperState(parsed.state);
        setShipperPostalCd(parsed.zip);
        setShipperCountry('US');
        setShipperPhone(locationPhone);
        setShipperEmail('');
      } else {
        // Legacy format
        setShipperCompanyName(address.company || address.label?.split(' - ')[0] || '');
        setShipperAddressLine1(address.streetAddress || '');
        setShipperCity(address.city || '');
        setShipperState(address.state || '');
        setShipperPostalCd(address.zip || '');
        setShipperCountry(address.country || 'US');
        setShipperPhone(locationPhone);
        setShipperEmail('');
      }
      
      // Auto-populate pickup contact phone from pickup location phone
      // User can still edit it if needed
      if (locationPhone) {
        setPickupContactPhone(locationPhone);
      }
    }
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

      {error ? (
        <div className="mb-4">
          <ErrorDisplay error={error} />
        </div>
      ) : null}

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
              {/* Pickup Location Dropdown */}
              <div className="mb-6 space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Pickup Location <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={XPO_SHIPPER_ADDRESS_BOOK.map(addr => {
                    // Handle simplified format (id, name, address, deliveryType)
                    if (addr.id && addr.name && addr.address) {
                      const parsed = parseAddressString(addr.address);
                      // Extract state for label
                      const state = parsed.state || '';
                      // Create formatted address for label
                      const addressParts = [parsed.streetAddress, parsed.addressLine2, parsed.city, parsed.state, parsed.zip].filter(Boolean);
                      const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : addr.address;
                      // Ensure we have a valid label
                      const label = `${addr.name} - ${state || 'N/A'} - ${formattedAddress}`;
                      return {
                        value: `ammana-${addr.id}`,
                        label: label,
                        id: addr.id,
                        name: addr.name,
                        address: addr.address,
                        deliveryType: addr.deliveryType,
                        company: addr.name,
                        streetAddress: parsed.streetAddress,
                        addressLine2: parsed.addressLine2,
                        city: parsed.city,
                        state: parsed.state,
                        zip: parsed.zip,
                        country: 'US',
                        phone: addr.phone || '',
                        extension: addr.extension || '',
                        contactName: addr.contactName || '',
                      };
                    }
                    // Legacy format (for backward compatibility)
                    const legacyLabel = addr.label || (addr.name ? `${addr.name} - ${addr.state || ''} - ${addr.address || ''}` : 'Unknown Address');
                    return {
                      value: addr.value || `ammana-${addr.id || ''}`,
                      label: legacyLabel,
                      id: addr.id,
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
                      deliveryType: addr.deliveryType,
                      address: addr.address,
                      name: addr.name,
                    };
                  }).filter(opt => opt.value && opt.label) as SearchableDropdownOption[]}
                  value={pickupLocation}
                  onChange={handlePickupLocationChange}
                  onSelect={handlePickupLocationSelect}
                  placeholder="Search and select pickup location..."
                />
              </div>

              {/* Pickup Location Input Fields */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Account Instance ID
                  </label>
                  <input
                    type="text"
                    value={shipperAcctInstId}
                    onChange={(e) => setShipperAcctInstId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 531230732"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Account MAD Code
                  </label>
                  <input
                    type="text"
                    value={shipperAcctMadCd}
                    onChange={(e) => setShipperAcctMadCd(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., AMQKGULA002"
                  />
                </div>
              </div>
              
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
                        value={commodity.grossWeight?.weight ?? ''}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Allow empty string while typing, or parse as number
                          if (inputValue === '' || inputValue === '-') {
                            updateCommodityNested(index, ['grossWeight', 'weight'], '');
                          } else {
                            const numValue = parseFloat(inputValue);
                            // Only update if it's a valid number
                            if (!isNaN(numValue) && numValue >= 0) {
                              updateCommodityNested(index, ['grossWeight', 'weight'], numValue);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Ensure we have a valid number on blur
                          const numValue = parseFloat(e.target.value);
                          if (isNaN(numValue) || numValue < 0) {
                            updateCommodityNested(index, ['grossWeight', 'weight'], 0);
                          } else {
                            // Round to 2 decimal places to avoid floating point precision issues
                            const rounded = Math.round(numValue * 100) / 100;
                            updateCommodityNested(index, ['grossWeight', 'weight'], rounded);
                          }
                        }}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="0"
                        step="1"
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
                      <label className="block text-sm font-semibold text-slate-900">Freight Class</label>
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

        {/* Pickup Request */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('pickupRequest')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Pickup Request</h2>
            {showSections.pickupRequest ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.pickupRequest && (
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Pickup Request</h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="pickupRequest"
                    checked={schedulePickup === true}
                    onChange={() => {
                      setSchedulePickup(true);
                      // When enabling, always set to today's date and defaults
                      const today = getTodayDate();
                      setPickupDate(today);
                      // Always set defaults (don't check if empty, just set them)
            setPickupTime('11:00');
            setDockCloseTime('12:00'); // 1 hour after pickup time
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Yes, schedule a pickup request</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="pickupRequest"
                    checked={schedulePickup === false}
                    onChange={() => {
                      setSchedulePickup(false);
                      // Clear pickup fields when "No" is selected
                      setPickupDate('');
                      setPickupTime('');
                      setDockCloseTime('');
                      setPickupContactCompanyName('XPO LOGISTICS FREIGHT, INC.');
                      setPickupContactFullName('XPO Driver');
                      setPickupContactPhone('562-9468331');
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">
                    No, we have a standing pickup, or will schedule one separately
                  </span>
                </label>
              </div>

              {schedulePickup && (
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Pickup Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          const today = getTodayDate();
                          // Only allow today or future dates
                          if (selectedDate >= today) {
                            setPickupDate(selectedDate);
                          } else {
                            // If past date is selected, reset to today
                            setPickupDate(today);
                          }
                        }}
                        min={getTodayDate()}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={schedulePickup}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Pickup Ready Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={schedulePickup}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Dock Close Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={dockCloseTime}
                        onChange={(e) => setDockCloseTime(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={schedulePickup}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        // Toggle "Use My Contact Information" - for now, just show the fields
                        // This can be enhanced later if needed
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                    >
                      Use My Contact Information
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pickupContactCompanyName}
                          onChange={(e) => setPickupContactCompanyName(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={schedulePickup}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Contact Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pickupContactFullName}
                          onChange={(e) => setPickupContactFullName(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={schedulePickup}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Contact Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={pickupContactPhone}
                          onChange={(e) => setPickupContactPhone(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={schedulePickup}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Extension (Optional)
                        </label>
                        <input
                          type="text"
                          value=""
                          onChange={() => {}}
                          className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2">
                      <span className="font-semibold">NOTE:</span> Please contact{' '}
                      <a href="#" className="text-blue-600 underline">
                        Your Local Service Center
                      </a>{' '}
                      for pickup requests submitted on or after 4:00PM to verify origin departure time.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payload Preview */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-6">
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
                    <pre className="text-xs text-slate-700 overflow-auto max-h-96 whitespace-pre-wrap wrap-break-word">
                      {JSON.stringify(payloadPreview, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Fill in the form to see the payload preview</p>
                )}
              </div>
            )}
          </div>
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
                {schedulePickup ? 'Creating BOL + Pickup...' : 'Creating BOL...'}
              </>
            ) : (
              schedulePickup ? 'Create BOL + Pickup' : 'Create BOL'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
