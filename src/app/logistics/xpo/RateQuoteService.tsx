'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Calendar, Info, X, Plus, HelpCircle, ChevronDown, ChevronUp, MapPin, Calculator, Search, ChevronRight } from 'lucide-react';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildXPORateQuoteRequestBody } from './utils/requestBuilder';
import { XPOQuoteCard } from './components/XPOQuoteCard';
import { QuoteResultsPage } from './components/QuoteResultsPage';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';
import type { XPORateQuoteCommodity } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import { XPO_RATE_QUOTE_COMMODITY_DEFAULTS, XPO_PAYMENT_TERM_OPTIONS, XPO_PACKAGE_CODE_OPTIONS, XPO_WEIGHT_UNIT_OPTIONS, XPO_DIMENSIONS_UNIT_OPTIONS, XPO_ROLE_OPTIONS, XPO_PICKUP_SERVICES, XPO_DELIVERY_SERVICES, XPO_PREMIUM_SERVICES, XPO_COUNTRY_OPTIONS } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import { StepIndicator } from './components/StepIndicator';
import { XPOBillOfLading } from './BillOfLading';
import { XPOPickupRequest } from './PickupRequest';
import { BOLForm } from './components/BOL';
import { ResponseSummary } from './components/ResponseSummary';
import { getLogisticsShippedOrderById, getAllLogisticsShippedOrders } from '@/app/api/LogisticsApi/LogisticsShippedOrders';
import { deleteOrder } from '@/app/api/OrderApi';
import { ToastContainer } from '@/app/components/shared/Toast';
import { XPO_SHIPPER_ADDRESS_BOOK, XPO_CONSIGNEE_ADDRESS_BOOK, US_STATES_OPTIONS, FREIGHT_CLASS_OPTIONS, ADDITIONAL_COMMODITY_OPTIONS, EXCESSIVE_LENGTH_OPTIONS, XPO_DEFAULT_DELIVERY_SERVICES, XPO_RATE_QUOTE_DEFAULTS, getAllCommodityOptions, addCustomCommodity, getCustomCommodityByValue, updateCustomCommodity, type CustomCommodity } from '@/Shared/constant';

type XPORateQuoteServiceProps = {
  carrier: string;
  token?: string;
  orderData?: {
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  };
};

export const XPORateQuoteService = ({ carrier, token, orderData: initialOrderData }: XPORateQuoteServiceProps) => {
  const searchParams = useSearchParams();
  const { getToken } = useLogisticsStore();
  const [storedToken, setStoredToken] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadingOrderData, setLoadingOrderData] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>>([]);
  const [currentOrderId, setCurrentOrderId] = useState<number | undefined>(undefined);

  // Avoid hydration mismatch by getting token after mount
  useEffect(() => {
    setIsMounted(true);
    const normalizedCarrier = carrier.toLowerCase();
    const tokenFromStore = getToken(normalizedCarrier) || token || '';
    setStoredToken(tokenFromStore);
  }, [carrier, token, getToken]);

  // Update token when it changes in store
  useEffect(() => {
    const normalizedCarrier = carrier.toLowerCase();
    const tokenFromStore = getToken(normalizedCarrier) || token || '';
    setStoredToken(tokenFromStore);
  }, [carrier, getToken]);

  // Get today's date in datetime-local format with default time of 12:00 PM
  const getTodayDateTimeLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = '12'; // Default to 12:00 PM
    const minutes = '00';
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Convert datetime-local format or date string to ISO 8601 format
  const convertToISO8601 = (dateString: string): string => {
    if (!dateString) return '';
    
    // Handle MM/DD/YYYY format
    if (dateString.includes('/')) {
      const [month, day, year] = dateString.split('/');
      if (month && day && year) {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    
    // Handle datetime-local format (YYYY-MM-DDTHH:mm)
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    console.warn('Invalid date string provided to convertToISO8601:', dateString);
    return '';
  };

  // Form state - Requester
  const [requesterRole, setRequesterRole] = useState<string>('S');
  const [pickupDate, setPickupDate] = useState<string>(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  });
  
  // Ref for date input
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Convert MM/DD/YYYY to YYYY-MM-DD for date input
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
  
  // Handle date input change
  const handlePickupDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setPickupDate(convertFromDateInputFormat(dateValue));
    }
  };
  
  // Handle calendar icon click
  const handleCalendarIconClick = () => {
    dateInputRef.current?.showPicker?.() || dateInputRef.current?.click();
  };

  // Form state - Pickup Location
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

  // Form state - Delivery Location
  const [deliveryLocation, setDeliveryLocation] = useState<string>('');
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const [deliveryCompany, setDeliveryCompany] = useState<string>('');
  const [deliveryStreetAddress, setDeliveryStreetAddress] = useState<string>('');
  const [deliveryAddressLine2, setDeliveryAddressLine2] = useState<string>('');
  const [deliveryCity, setDeliveryCity] = useState<string>('');
  const [deliveryState, setDeliveryState] = useState<string>('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>('');
  const [deliveryCountry, setDeliveryCountry] = useState<string>('United States');
  const [deliveryPhone, setDeliveryPhone] = useState<string>('');
  const [deliveryExtension, setDeliveryExtension] = useState<string>('');
  const [deliveryContactName, setDeliveryContactName] = useState<string>('');

  // Form state - Payment and Shipment Info
  const [paymentTermCd, setPaymentTermCd] = useState<string>('P');
  const [initialShipmentDate] = useState<string>(getTodayDateTimeLocal());
  const [shipmentDate, setShipmentDate] = useState<string>(initialShipmentDate);
  const [accessorials, setAccessorials] = useState<string[]>([]);

  // Form state - Packaging
  const [packaging, setPackaging] = useState<string>('PLT');
  const [freezableProtection, setFreezableProtection] = useState<boolean>(false);
  const [hazmatItem, setHazmatItem] = useState<boolean>(false);
  const [additionalCommodity, setAdditionalCommodity] = useState<string>('');
  const [excessiveLength, setExcessiveLength] = useState<string>(XPO_RATE_QUOTE_DEFAULTS.excessiveLength);
  const [excessValueCoverage, setExcessValueCoverage] = useState<string>('');
  
  // Custom commodities state
  const [allCommodityOptions, setAllCommodityOptions] = useState<Array<{ value: string; label: string; id?: string }>>(getAllCommodityOptions());
  const [selectedCommodityId, setSelectedCommodityId] = useState<string | null>(null);
  const [showNewCommodityForm, setShowNewCommodityForm] = useState<boolean>(false);

  // Form state - Services
  const [pickupServices, setPickupServices] = useState<string[]>([]);
  const [deliveryServices, setDeliveryServices] = useState<string[]>(XPO_DEFAULT_DELIVERY_SERVICES);
  const [premiumServices, setPremiumServices] = useState<string[]>([]);

  // Form state - Reference Numbers
  const [referenceNumbers, setReferenceNumbers] = useState<string>('');

  // Address Information - Shipper
  const [shipperPostalCd, setShipperPostalCd] = useState<string>('');
  const [shipperLoadingZip, setShipperLoadingZip] = useState(false);
  const [shipperCity, setShipperCity] = useState<string>('');
  const [shipperState, setShipperState] = useState<string>('');
  const [shipperAddressBook, setShipperAddressBook] = useState<string>('');
  
  // Address Information - Consignee
  const [consigneePostalCd, setConsigneePostalCd] = useState<string>('');
  const [consigneeLoadingZip, setConsigneeLoadingZip] = useState(false);
  const [consigneeCity, setConsigneeCity] = useState<string>('');
  const [consigneeState, setConsigneeState] = useState<string>('');
  const [consigneeAddressBook, setConsigneeAddressBook] = useState<string>('');

  // Delivery postal code loading state
  const [deliveryLoadingZip, setDeliveryLoadingZip] = useState(false);

  // ZIP code lookup function using Zippopotam.us API
  const lookupZipCode = async (zipCode: string, type: 'shipper' | 'consignee' | 'delivery') => {
    if (!zipCode || zipCode.length < 5) return;

    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    if (type === 'shipper') {
      setShipperLoadingZip(true);
    } else if (type === 'consignee') {
      setConsigneeLoadingZip(true);
    } else if (type === 'delivery') {
      setDeliveryLoadingZip(true);
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

          if (type === 'shipper') {
            setShipperCity(city);
            setShipperState(state);
          } else if (type === 'consignee') {
            setConsigneeCity(city);
            setConsigneeState(state);
          } else if (type === 'delivery') {
            setDeliveryCity(city);
            setDeliveryState(state);
            // Also update consignee fields for backward compatibility
            setConsigneeCity(city);
            setConsigneeState(state);
          }
        }
      }
    } catch (error) {
      // Silently fail - user can still enter manually
      if (process.env.NODE_ENV === 'development') {
        console.log('ZIP code lookup failed:', error);
      }
    } finally {
      if (type === 'shipper') {
        setShipperLoadingZip(false);
      } else if (type === 'consignee') {
        setConsigneeLoadingZip(false);
      } else if (type === 'delivery') {
        setDeliveryLoadingZip(false);
      }
    }
  };

  // Handle ZIP code change with auto-lookup
  useEffect(() => {
    if (shipperPostalCd && shipperPostalCd.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(shipperPostalCd, 'shipper');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [shipperPostalCd]);

  useEffect(() => {
    if (consigneePostalCd && consigneePostalCd.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(consigneePostalCd, 'consignee');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [consigneePostalCd]);

  useEffect(() => {
    if (deliveryPostalCode && deliveryPostalCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(deliveryPostalCode, 'delivery');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [deliveryPostalCode]);

  // Handle address book selection for shipper
  const handleShipperAddressBookChange = (value: string) => {
    setShipperAddressBook(value);
    if (value) {
      const address = XPO_SHIPPER_ADDRESS_BOOK.find(opt => opt.value === value);
      if (address) {
        setShipperCity(address.city);
        setShipperState(address.state);
        setShipperPostalCd(address.zip);
      }
    }
  };

  // Handle address book selection for consignee
  const handleConsigneeAddressBookChange = (value: string) => {
    setConsigneeAddressBook(value);
    if (value) {
      const address = XPO_CONSIGNEE_ADDRESS_BOOK.find(opt => opt.value === value);
      if (address) {
        setConsigneeCity(address.city);
        setConsigneeState(address.state);
        setConsigneePostalCd(address.zip);
      }
    }
  };

  // Handle additional commodity dropdown change
  const handleAdditionalCommodityChange = (value: string) => {
    if (value === 'add_new') {
      // Clear Commodity 1 form with defaults
      const defaultCommodity = { 
        ...XPO_RATE_QUOTE_COMMODITY_DEFAULTS,
        nmfcClass: XPO_RATE_QUOTE_DEFAULTS.freightClass, // Set Freight Class to 250
        packageCode: XPO_RATE_QUOTE_DEFAULTS.packaging, // Set Packaging to PLT
      };
      setCommodities([defaultCommodity]);
      setCommodityDescriptions({ 0: '' });
      setFreezableProtection(false);
      setHazmatItem(false);
      setSelectedCommodityId(null);
      setAdditionalCommodity('');
      setExcessiveLength(XPO_RATE_QUOTE_DEFAULTS.excessiveLength); // Set Excessive Length to 'none'
      setShowNewCommodityForm(true);
    } else if (value === '') {
      // Clear selection
      setShowNewCommodityForm(false);
      setSelectedCommodityId(null);
      setAdditionalCommodity('');
    } else {
      // Load saved commodity data into Commodity 1
      const savedCommodity = getCustomCommodityByValue(value);
      if (savedCommodity) {
        setSelectedCommodityId(savedCommodity.id);
        setAdditionalCommodity(value);
        setShowNewCommodityForm(true);
        
        // Populate Commodity 1 with saved data
        if (commodities.length > 0) {
          const updatedCommodity = { ...commodities[0] };
          
          if (savedCommodity.description) {
            setCommodityDescriptions({ 0: savedCommodity.description });
          } else {
            setCommodityDescriptions({ 0: '' });
          }
          if (savedCommodity.weight) {
            updatedCommodity.grossWeight = {
              ...updatedCommodity.grossWeight,
              weight: savedCommodity.weight,
            };
          }
          if (savedCommodity.freightClass) {
            updatedCommodity.nmfcClass = savedCommodity.freightClass;
          }
          if (savedCommodity.length || savedCommodity.width || savedCommodity.height) {
            updatedCommodity.dimensions = {
              length: savedCommodity.length || 0,
              width: savedCommodity.width || 0,
              height: savedCommodity.height || 0,
              dimensionsUom: updatedCommodity.dimensions?.dimensionsUom || 'INCH',
            };
          }
          if (savedCommodity.pieces) {
            updatedCommodity.pieceCnt = savedCommodity.pieces;
          }
          if (savedCommodity.packageCode) {
            updatedCommodity.packageCode = savedCommodity.packageCode;
          }
          
          setCommodities([updatedCommodity]);
          setFreezableProtection(savedCommodity.freezableProtection || false);
          setHazmatItem(savedCommodity.hazmatItem || false);
        }
      }
    }
  };

  // Handle saving current Commodity 1 as new commodity
  const handleSaveAsNew = () => {
    if (commodities.length === 0) return;
    
    const commodity = commodities[0];
    const description = commodityDescriptions[0] || '';
    const commodityName = description || `Commodity ${Date.now()}`;
    
    const newCommodity = addCustomCommodity({
      label: commodityName,
      description: description,
      weight: commodity.grossWeight?.weight,
      freightClass: commodity.nmfcClass,
      length: commodity.dimensions?.length,
      width: commodity.dimensions?.width,
      height: commodity.dimensions?.height,
      pieces: commodity.pieceCnt,
      packageCode: commodity.packageCode,
      freezableProtection: freezableProtection,
      hazmatItem: hazmatItem,
    });
    
    setAllCommodityOptions(getAllCommodityOptions());
    setSelectedCommodityId(newCommodity.id);
    setAdditionalCommodity(newCommodity.value);
    
    // Show success message
    const toastId = `toast-${Date.now()}`;
    setToasts(prev => [...prev, {
      id: toastId,
      message: 'Commodity saved successfully!',
      type: 'success',
    }]);
  };

  // Handle updating selected commodity
  const handleUpdateCommodity = () => {
    if (!selectedCommodityId || commodities.length === 0) return;
    
    const commodity = commodities[0];
    
    updateCustomCommodity(selectedCommodityId, {
      description: commodityDescriptions[0] || '',
      weight: commodity.grossWeight?.weight,
      freightClass: commodity.nmfcClass,
      length: commodity.dimensions?.length,
      width: commodity.dimensions?.width,
      height: commodity.dimensions?.height,
      pieces: commodity.pieceCnt,
      packageCode: commodity.packageCode,
      freezableProtection: freezableProtection,
      hazmatItem: hazmatItem,
    });
    
    setAllCommodityOptions(getAllCommodityOptions());
    
    // Show success message
    const toastId = `toast-${Date.now()}`;
    setToasts(prev => [...prev, {
      id: toastId,
      message: 'Commodity updated successfully!',
      type: 'success',
    }]);
  };

  // Refresh commodity options on mount and when localStorage changes
  useEffect(() => {
    setAllCommodityOptions(getAllCommodityOptions());
    
    // Listen for storage changes (in case another tab adds a commodity)
    const handleStorageChange = () => {
      setAllCommodityOptions(getAllCommodityOptions());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Commodities with defaults
  const [commodities, setCommodities] = useState<XPORateQuoteCommodity[]>([{ 
    ...XPO_RATE_QUOTE_COMMODITY_DEFAULTS,
    nmfcClass: XPO_RATE_QUOTE_DEFAULTS.freightClass, // Default Freight Class: 250
    packageCode: XPO_RATE_QUOTE_DEFAULTS.packaging, // Default Packaging: PLT
  }]);
  
  // Commodity descriptions (stored separately since not in API type)
  const [commodityDescriptions, setCommodityDescriptions] = useState<Record<number, string>>({ 0: '' });

  // Optional fields
  const [palletCnt, setPalletCnt] = useState<number>(0);
  const [linealFt, setLinealFt] = useState<number>(0);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [response, setResponse] = useState<any>(null);
  const [showAccountInfo, setShowAccountInfo] = useState(true);
  const [showResponseDropdown, setShowResponseDropdown] = useState(false);
  const [showQuoteResultsPage, setShowQuoteResultsPage] = useState(false);
  const [requestPayload, setRequestPayload] = useState<any>(null);
  const [showPayloadJson, setShowPayloadJson] = useState(false);
  const [showResponseJson, setShowResponseJson] = useState(false);

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  
  // Store BOL form data and response
  const [bolFormData, setBolFormData] = useState<any>(null);
  const [bolResponseData, setBolResponseData] = useState<any>(null);
  
  // Store pickup response data
  const [pickupResponseData, setPickupResponseData] = useState<any>(null);
  
  // Store order data
  const [orderData, setOrderData] = useState<{
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  } | null>(initialOrderData || null);
  
  // Consignee (Customer) Information - for BOL form
  const [consigneeData, setConsigneeData] = useState<{
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
  }>({
    address: {
      addressLine1: '',
      cityName: '',
      stateCd: '',
      countryCd: 'US',
      postalCd: '',
    },
    contactInfo: {
      companyName: '',
      email: {
        emailAddr: '',
      },
      phone: {
        phoneNbr: '',
      },
    },
  });
  
  // Flag to track if form has been auto-populated
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);

  // Helper function to extract value from JSONB
  const getJsonbValue = (jsonb: Record<string, unknown> | null | undefined, key: string): string => {
    if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '';
    const obj = jsonb as Record<string, unknown>;
    const normalizedKey = key.trim().toLowerCase();
    
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase() === normalizedKey && v !== undefined && v !== null && v !== '') {
        return String(v);
      }
    }
    return '';
  };

  // Helper function to find any field containing zip/postal code
  const findZipCodeInJsonb = (jsonb: Record<string, unknown> | null | undefined): string => {
    if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '';
    
    const zipKeywords = ['zip', 'postal', 'postcode', 'post code'];
    
    for (const [key, value] of Object.entries(jsonb)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains zip/postal keywords
      if (zipKeywords.some(keyword => lowerKey.includes(keyword)) && 
          value !== undefined && value !== null && value !== '') {
        const zipStr = String(value);
        // Try to extract 5-digit zip code
        const zipMatch = zipStr.match(/\d{5}/);
        if (zipMatch) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Found ZIP code in field "${key}": ${zipMatch[0]}`);
          }
          return zipMatch[0];
        }
        // If no match, try to extract digits
        const digits = zipStr.replace(/\D/g, '');
        if (digits.length >= 5) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Extracted ZIP code from field "${key}": ${digits.substring(0, 5)}`);
          }
          return digits.substring(0, 5);
        }
      }
    }
    return '';
  };

  // Helper function to parse address string
  const parseAddress = (addressStr: string): { address1?: string; address2?: string } => {
    if (!addressStr || typeof addressStr !== 'string') return {};
    const parts = addressStr.split(',').map(p => p.trim());
    return {
      address1: parts[0] || undefined,
      address2: parts[1] || undefined,
    };
  };

  // Function to auto-populate form from order data
  const populateFormFromOrder = (orderJsonb: Record<string, unknown> | null | undefined) => {
    if (!orderJsonb || typeof orderJsonb !== 'object' || Array.isArray(orderJsonb)) return;
    
    setHasAutoPopulated(true);
    
    // Consignee (Customer) Information - populate all fields
    // Address Line 1
    const shipToAddress1 = getJsonbValue(orderJsonb, 'Customer Address') ||
                           getJsonbValue(orderJsonb, 'Customer Address 1') ||
                           getJsonbValue(orderJsonb, 'Ship to Address 1') ||
                           getJsonbValue(orderJsonb, 'Shipping Address') ||
                           getJsonbValue(orderJsonb, 'Customer Shipping Address') ||
                           getJsonbValue(orderJsonb, 'Ship To Address');
    
    // City
    const shipToCity = getJsonbValue(orderJsonb, 'Customer City') ||
                      getJsonbValue(orderJsonb, 'Ship to City') ||
                      getJsonbValue(orderJsonb, 'Shipping City') ||
                      getJsonbValue(orderJsonb, 'Customer Shipping City');
    
    // State
    const shipToState = getJsonbValue(orderJsonb, 'Customer State') ||
                       getJsonbValue(orderJsonb, 'Customer State/Province') ||
                       getJsonbValue(orderJsonb, 'Ship to State') ||
                       getJsonbValue(orderJsonb, 'Ship to State/Province') ||
                       getJsonbValue(orderJsonb, 'Shipping State') ||
                       getJsonbValue(orderJsonb, 'Shipping State/Province');
    
    // Postal Code - try multiple methods
    let shipToZip = getJsonbValue(orderJsonb, 'Customer Zip Code') ||
                   getJsonbValue(orderJsonb, 'Customer Postal Code') ||
                   getJsonbValue(orderJsonb, 'Customer Shipping Zip Code') ||
                   getJsonbValue(orderJsonb, 'Customer Shipping Postal Code') ||
                   getJsonbValue(orderJsonb, 'Ship to Zip Code') ||
                   getJsonbValue(orderJsonb, 'Ship to Postal Code') ||
                   getJsonbValue(orderJsonb, 'Shipping Zip Code') ||
                   getJsonbValue(orderJsonb, 'Shipping Postal Code') ||
                   getJsonbValue(orderJsonb, 'Destination Zip Code') ||
                   getJsonbValue(orderJsonb, 'Destination Postal Code') ||
                   getJsonbValue(orderJsonb, 'Bill to Zip Code') ||
                   getJsonbValue(orderJsonb, 'Bill to Postal Code') ||
                   getJsonbValue(orderJsonb, 'Zip') ||
                   getJsonbValue(orderJsonb, 'Postal Code') ||
                   getJsonbValue(orderJsonb, 'ZIP Code') ||
                   getJsonbValue(orderJsonb, 'ZIP');
    
    // If not found with specific field names, search for any field containing zip/postal
    if (!shipToZip) {
      shipToZip = findZipCodeInJsonb(orderJsonb);
    }
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Order JSONB keys:', Object.keys(orderJsonb));
      console.log('Found shipToZip:', shipToZip);
    }
    
    // Country
    const shipToCountry = getJsonbValue(orderJsonb, 'Customer Country') ||
                         getJsonbValue(orderJsonb, 'Ship to Country') ||
                         getJsonbValue(orderJsonb, 'Shipping Country');
    
    // Company Name
    const customerName = getJsonbValue(orderJsonb, 'Customer Name') ||
                        getJsonbValue(orderJsonb, 'Company Name') ||
                        getJsonbValue(orderJsonb, 'Ship to Name') ||
                        getJsonbValue(orderJsonb, 'Shipping Name');
    
    // Email
    const customerEmail = getJsonbValue(orderJsonb, 'Customer Email') ||
                         getJsonbValue(orderJsonb, 'Customer Email Address') ||
                         getJsonbValue(orderJsonb, 'Email') ||
                         getJsonbValue(orderJsonb, 'Ship to Email') ||
                         getJsonbValue(orderJsonb, 'Shipping Email');
    
    // Phone
    const customerPhone = getJsonbValue(orderJsonb, 'Customer Phone Number') ||
                         getJsonbValue(orderJsonb, 'Customer Phone') ||
                         getJsonbValue(orderJsonb, 'Phone') ||
                         getJsonbValue(orderJsonb, 'Phone Number') ||
                         getJsonbValue(orderJsonb, 'Ship to Phone') ||
                         getJsonbValue(orderJsonb, 'Shipping Phone');
    
    // Update Rate Quote form - Postal Code (always set if found, regardless of current value)
    if (shipToZip) {
      // Extract just the ZIP code (first 5 digits)
      const zipMatch = shipToZip.match(/\d{5}/);
      const extractedZip = zipMatch ? zipMatch[0] : shipToZip.replace(/\D/g, '').substring(0, 5);
      
      if (extractedZip.length >= 5) {
        setConsigneePostalCd(extractedZip);
        // Also set delivery postal code for the "To" section
        setDeliveryPostalCode(extractedZip);
        if (process.env.NODE_ENV === 'development') {
          console.log('Set consigneePostalCd and deliveryPostalCode to:', extractedZip);
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('No ZIP code found in order data. Available fields:', Object.keys(orderJsonb));
    }
    
    // Update Delivery Country (To Country)
    if (shipToCountry) {
      const normalizedCountry = shipToCountry.toUpperCase();
      let countryValue = 'United States';
      
      if (normalizedCountry === 'USA' || normalizedCountry === 'US' || normalizedCountry === 'UNITED STATES') {
        countryValue = 'United States';
      } else if (normalizedCountry === 'CANADA' || normalizedCountry === 'CA') {
        countryValue = 'Canada';
      } else if (normalizedCountry === 'MEXICO' || normalizedCountry === 'MX') {
        countryValue = 'Mexico';
      } else {
        // Try to find matching country from options
        const matchingCountry = XPO_COUNTRY_OPTIONS.find(opt => 
          opt.label.toUpperCase().includes(normalizedCountry) || 
          normalizedCountry.includes(opt.label.toUpperCase())
        );
        if (matchingCountry) {
          countryValue = matchingCountry.label;
        }
      }
      
      setDeliveryCountry(countryValue);
      if (process.env.NODE_ENV === 'development') {
        console.log('Set deliveryCountry to:', countryValue);
      }
    }
    
    // Update Consignee Data for BOL form
    setConsigneeData(prev => ({
      address: {
        addressLine1: shipToAddress1 || prev.address.addressLine1,
        cityName: shipToCity || prev.address.cityName,
        stateCd: shipToState || prev.address.stateCd,
        countryCd: shipToCountry ? (shipToCountry.toUpperCase() === 'USA' || shipToCountry.toUpperCase() === 'US' ? 'US' : shipToCountry.toUpperCase().substring(0, 2)) : prev.address.countryCd,
        postalCd: shipToZip ? (shipToZip.match(/\d{5}/)?.[0] || shipToZip.replace(/\D/g, '').substring(0, 5)) : prev.address.postalCd,
      },
      contactInfo: {
        companyName: customerName || prev.contactInfo.companyName,
        email: {
          emailAddr: customerEmail || prev.contactInfo.email.emailAddr,
        },
        phone: {
          phoneNbr: customerPhone || prev.contactInfo.phone.phoneNbr,
        },
      },
    }));
    
    // Shipper Postal Code (Ship From) - if available
    const shipFromZip = getJsonbValue(orderJsonb, 'Ship from Zip Code') ||
                       getJsonbValue(orderJsonb, 'Ship from Postal Code') ||
                       getJsonbValue(orderJsonb, 'Origin Zip Code') ||
                       getJsonbValue(orderJsonb, 'Origin Postal Code') ||
                       getJsonbValue(orderJsonb, 'Warehouse Zip Code') ||
                       getJsonbValue(orderJsonb, 'Warehouse Postal Code');
    if (shipFromZip && !shipperPostalCd) {
      const zipMatch = shipFromZip.match(/\d{5}/);
      if (zipMatch) {
        setShipperPostalCd(zipMatch[0]);
      } else {
        setShipperPostalCd(shipFromZip.replace(/\D/g, '').substring(0, 5));
      }
    }
    
    // Shipment Date - always use today's date with 12:00 PM time
    // (Not using order date to ensure it's always today)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}T12:00`;
    setShipmentDate(formattedDateTime);
    
    // Commodity Information - if available
    const weight = getJsonbValue(orderJsonb, 'Weight') ||
                  getJsonbValue(orderJsonb, 'Total Weight') ||
                  getJsonbValue(orderJsonb, 'Shipping Weight') ||
                  getJsonbValue(orderJsonb, 'Item Weight');
    
    const quantity = getJsonbValue(orderJsonb, 'Quantity') ||
                    getJsonbValue(orderJsonb, 'Qty') ||
                    getJsonbValue(orderJsonb, 'Piece Count') ||
                    getJsonbValue(orderJsonb, 'Items');
    
    const length = getJsonbValue(orderJsonb, 'Length') ||
                  getJsonbValue(orderJsonb, 'Package Length');
    
    const width = getJsonbValue(orderJsonb, 'Width') ||
                 getJsonbValue(orderJsonb, 'Package Width');
    
    const height = getJsonbValue(orderJsonb, 'Height') ||
                  getJsonbValue(orderJsonb, 'Package Height');
    
    // If we have weight or quantity, populate the first commodity
    if (weight || quantity) {
      setCommodities(prevCommodities => {
        if (prevCommodities.length === 0) {
          return [{ ...XPO_RATE_QUOTE_COMMODITY_DEFAULTS }];
        }
        
        const updatedCommodities = [...prevCommodities];
        const firstCommodity = { ...updatedCommodities[0] };
        
        // Update piece count
        if (quantity) {
          const qtyNum = parseInt(quantity, 10);
          if (!isNaN(qtyNum) && qtyNum > 0) {
            firstCommodity.pieceCnt = qtyNum;
          }
        }
        
        // Update weight
        if (weight) {
          const weightNum = parseFloat(weight);
          if (!isNaN(weightNum) && weightNum > 0) {
            firstCommodity.grossWeight = {
              ...firstCommodity.grossWeight,
              weight: weightNum,
              weightUom: firstCommodity.grossWeight?.weightUom || 'LBS',
            };
          }
        }
        
        // Update dimensions if available
        if (length || width || height) {
          const lengthNum = length ? parseFloat(length) : 0;
          const widthNum = width ? parseFloat(width) : 0;
          const heightNum = height ? parseFloat(height) : 0;
          
          if (lengthNum > 0 || widthNum > 0 || heightNum > 0) {
            firstCommodity.dimensions = {
              length: lengthNum || 0,
              width: widthNum || 0,
              height: heightNum || 0,
              dimensionsUom: firstCommodity.dimensions?.dimensionsUom || 'INCH',
            };
          }
        }
        
        // Update NMFC Class if available
        const nmfcClass = getJsonbValue(orderJsonb, 'NMFC Class') ||
                          getJsonbValue(orderJsonb, 'NMFC') ||
                          getJsonbValue(orderJsonb, 'Freight Class') ||
                          getJsonbValue(orderJsonb, 'Class');
        if (nmfcClass && nmfcClass.trim() !== '') {
          firstCommodity.nmfcClass = nmfcClass.trim();
        }
        
        updatedCommodities[0] = firstCommodity;
        return updatedCommodities;
      });
    }
    
    // Payment Term - check if order has payment information
    const paymentTerms = getJsonbValue(orderJsonb, 'Payment Terms') ||
                        getJsonbValue(orderJsonb, 'Terms') ||
                        getJsonbValue(orderJsonb, 'Payment Term') ||
                        getJsonbValue(orderJsonb, 'Payment Terms Code') ||
                        getJsonbValue(orderJsonb, 'Payment Method');
    if (paymentTerms) {
      const termsUpper = paymentTerms.toUpperCase();
      if (termsUpper.includes('PREPAID') || termsUpper.includes('PRE-PAID') || termsUpper === 'P') {
        setPaymentTermCd('P');
      } else if (termsUpper.includes('COLLECT') || termsUpper === 'C') {
        setPaymentTermCd('C');
      } else if (termsUpper.includes('THIRD') || termsUpper.includes('3RD') || termsUpper === '3' || termsUpper.includes('THIRD PARTY')) {
        setPaymentTermCd('3');
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('Set paymentTermCd from paymentTerms:', paymentTerms);
      }
    }
  };

  // Update order data when prop changes
  useEffect(() => {
    if (initialOrderData && !hasAutoPopulated) {
      setOrderData(initialOrderData);
      if (initialOrderData.ordersJsonb) {
        populateFormFromOrder(initialOrderData.ordersJsonb);
      }
    }
  }, [initialOrderData, hasAutoPopulated]);

  // Get orderId from URL params or sessionStorage
  useEffect(() => {
    const orderIdParam = searchParams?.get('orderId');
    if (orderIdParam) {
      const orderId = parseInt(orderIdParam, 10);
      if (!isNaN(orderId)) {
        setCurrentOrderId(orderId);
      }
    } else {
      const storedOrder = sessionStorage.getItem('selectedOrderForLogistics');
      if (storedOrder) {
        try {
          const parsed = JSON.parse(storedOrder);
          if (parsed.id) {
            setCurrentOrderId(parsed.id);
          }
          if (parsed.jsonb && typeof parsed.jsonb === 'object' && !Array.isArray(parsed.jsonb) && !hasAutoPopulated) {
            populateFormFromOrder(parsed.jsonb as Record<string, unknown>);
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to parse stored order:', e);
          }
        }
      }
    }
  }, [searchParams]);

  // Fetch order data when Response Summary step is reached
  useEffect(() => {
    const fetchOrderData = async () => {
      if (currentStep === 4 && !orderData) {
        setLoadingOrderData(true);
        try {
          const orderIdParam = searchParams?.get('orderId');
          let orderFound = false;
          
          if (orderIdParam) {
            const orderId = parseInt(orderIdParam, 10);
            if (!isNaN(orderId)) {
              setCurrentOrderId(orderId);
              try {
                const response = await getLogisticsShippedOrderById(orderId);
                if (response && response.data) {
                  setOrderData({
                    sku: response.data.sku,
                    orderOnMarketPlace: response.data.orderOnMarketPlace,
                    ordersJsonb: response.data.ordersJsonb as Record<string, unknown>,
                  });
                  if (response.data.ordersJsonb && typeof response.data.ordersJsonb === 'object' && !Array.isArray(response.data.ordersJsonb) && !hasAutoPopulated) {
                    populateFormFromOrder(response.data.ordersJsonb as Record<string, unknown>);
                  }
                  orderFound = true;
                }
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`Error fetching order ${orderId}:`, error);
                }
              }
            }
          }
          
          if (!orderFound) {
            const storedOrder = sessionStorage.getItem('selectedOrderForLogistics');
            if (storedOrder) {
              try {
                const parsed = JSON.parse(storedOrder);
                if (parsed.id) {
                  setCurrentOrderId(parsed.id);
                }
                if (parsed.sku && parsed.orderOnMarketPlace && parsed.jsonb) {
                  setOrderData({
                    sku: parsed.sku,
                    orderOnMarketPlace: parsed.orderOnMarketPlace,
                    ordersJsonb: parsed.jsonb,
                  });
                  if (typeof parsed.jsonb === 'object' && !Array.isArray(parsed.jsonb) && !hasAutoPopulated) {
                    populateFormFromOrder(parsed.jsonb as Record<string, unknown>);
                  }
                  orderFound = true;
                  setLoadingOrderData(false);
                  return;
                }
              } catch (e) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('Failed to parse stored order:', e);
                }
              }
            }
            
            if (!orderFound) {
              try {
                const response = await getAllLogisticsShippedOrders();
                if (response.data && response.data.length > 0) {
                  const mostRecentOrder = response.data[0];
                  setOrderData({
                    sku: mostRecentOrder.sku,
                    orderOnMarketPlace: mostRecentOrder.orderOnMarketPlace,
                    ordersJsonb: mostRecentOrder.ordersJsonb as Record<string, unknown>,
                  });
                  if (mostRecentOrder.ordersJsonb && typeof mostRecentOrder.ordersJsonb === 'object' && !Array.isArray(mostRecentOrder.ordersJsonb) && !hasAutoPopulated) {
                    populateFormFromOrder(mostRecentOrder.ordersJsonb as Record<string, unknown>);
                  }
                  orderFound = true;
                }
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Failed to fetch most recent order:', error);
                }
              }
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch order data:', error);
          }
        } finally {
          setLoadingOrderData(false);
        }
      }
    };

    fetchOrderData();
  }, [currentStep, orderData, searchParams]);

  // Handle submission success
  const handleSubmitSuccess = async (orderId: number, sku: string) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Database save confirmed for Order ID: ${orderId}, SKU: ${sku}`);
      }
      
      if (orderId) {
        try {
          await deleteOrder(orderId);
          if (process.env.NODE_ENV === 'development') {
            console.log(`Order (ID: ${orderId}) deleted successfully after database save`);
          }
        } catch (deleteError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Order (ID: ${orderId}) could not be deleted:`, deleteError);
          }
        }
      }

      sessionStorage.removeItem('selectedOrderForLogistics');
      localStorage.clear();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Order data saved successfully. Order deleted. Cache cleared.`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error during cleanup:', error);
      }
      const toastId = `toast-${Date.now()}`;
      setToasts(prev => [...prev, {
        id: toastId,
        message: 'Order submitted successfully, but cleanup failed. Please clear cache manually.',
        type: 'error',
      }]);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toastId = `toast-${Date.now()}`;
    setToasts(prev => [...prev, {
      id: toastId,
      message,
      type,
    }]);
  };
  
  // Store BOL PDF URL
  const [bolPdfUrl, setBolPdfUrl] = useState<string | null>(null);
  
  // Store files from BOL
  const [bolFiles, setBolFiles] = useState<File[]>([]);

  const steps = [
    { id: 1, name: 'Rate Quote', component: 'RateQuote' },
    { id: 2, name: 'Bill of Lading', component: 'BillOfLanding' },
    { id: 3, name: 'Pickup Request', component: 'PickupRequest' },
    { id: 4, name: 'Response Summary', component: 'ResponseSummary' },
  ];

  // Calculate totals
  const calculateTotals = () => {
    let totalCube = 0;
    let totalWeight = 0;
    let totalCommodities = commodities.length;
    let totalPieces = 0;

    commodities.forEach((commodity) => {
      const cube = (commodity.dimensions.length * commodity.dimensions.width * commodity.dimensions.height) / 1728;
      totalCube += cube * commodity.pieceCnt;
      totalWeight += commodity.grossWeight.weight * commodity.pieceCnt;
      totalPieces += commodity.pieceCnt;
    });

    const totalDensity = totalCube > 0 ? totalWeight / totalCube : 0;

    return {
      totalCube: totalCube.toFixed(3),
      totalDensity: totalDensity.toFixed(3),
      totalCommodities,
      totalPieces,
      totalWeight,
    };
  };

  const totals = calculateTotals();
  
  // Validate Total Density: must be between 2 and 4
  const totalDensityValue = parseFloat(totals.totalDensity);
  const isDensityValid = totalDensityValue > 2 && totalDensityValue < 4;
  const densityError = !isNaN(totalDensityValue) && totalDensityValue > 0 && !isDensityValid;

  // Build request body
  const buildRequestBody = () => {
    // Use pickupDate if available, otherwise use shipmentDate, otherwise use current date
    const dateToUse = pickupDate || shipmentDate;
    const shipmentDateISO = dateToUse ? convertToISO8601(dateToUse) : new Date().toISOString();
    
    // Use pickupPostalCode if available, otherwise fall back to shipperPostalCd
    const shipperZip = pickupPostalCode || shipperPostalCd;
    // Use deliveryPostalCode if available, otherwise fall back to consigneePostalCd
    const consigneeZip = deliveryPostalCode || consigneePostalCd;
    
    // Combine all services into accessorials
    const allAccessorials = [
      ...(accessorials || []),
      ...pickupServices,
      ...deliveryServices,
      ...premiumServices,
    ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    // TODO: Verify XPO accessorial codes are valid for rate quotes
    // Some codes like "LIFT", "NOTIFY", "RESI" might not be valid for rate quotes
    // Temporarily, we'll send accessorials only if they exist
    // If the API continues to reject, try sending without accessorials
    
    return buildXPORateQuoteRequestBody({
      paymentTermCd,
      shipmentDate: shipmentDateISO,
      accessorials: allAccessorials.length > 0 ? allAccessorials : undefined,
      shipperPostalCd: shipperZip,
      consigneePostalCd: consigneeZip,
      commodity: commodities,
      palletCnt: palletCnt > 0 ? palletCnt : undefined,
      linealFt: linealFt > 0 ? linealFt : undefined,
    });
  };

  // Update request payload live as form fields change
  useEffect(() => {
    try {
      const requestBody = buildRequestBody();
      const normalizedCarrier = carrier.toLowerCase();
      const shippingCompany = normalizedCarrier === 'expo' ? 'xpo' : normalizedCarrier;
      
      const payload = {
        shippingCompany: shippingCompany,
        ...requestBody,
      };
      
      setRequestPayload(payload);
    } catch (error) {
      // If building request body fails (e.g., missing required fields), don't update payload
      // This prevents errors while user is still filling the form
      if (process.env.NODE_ENV === 'development') {
        console.log('Cannot build payload yet:', error);
      }
    }
  }, [
    pickupDate,
    shipmentDate,
    pickupPostalCode,
    shipperPostalCd,
    deliveryPostalCode,
    consigneePostalCd,
    paymentTermCd,
    accessorials,
    pickupServices,
    deliveryServices,
    premiumServices,
    commodities,
    palletCnt,
    linealFt,
    carrier,
  ]);

  // Commodity management
  const addCommodity = () => {
    setCommodities([...commodities, { ...XPO_RATE_QUOTE_COMMODITY_DEFAULTS }]);
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

  const removeCommodity = (index: number) => {
    if (commodities.length > 1) {
      setCommodities(commodities.filter((_, i) => i !== index));
    }
  };

  // Service checkbox handlers
  const handlePickupServiceChange = (value: string, checked: boolean) => {
    if (checked) {
      setPickupServices([...pickupServices, value]);
    } else {
      setPickupServices(pickupServices.filter(s => s !== value));
    }
  };

  const handleDeliveryServiceChange = (value: string, checked: boolean) => {
    if (checked) {
      setDeliveryServices([...deliveryServices, value]);
    } else {
      setDeliveryServices(deliveryServices.filter(s => s !== value));
    }
  };

  const handlePremiumServiceChange = (value: string, checked: boolean) => {
    if (checked) {
      setPremiumServices([...premiumServices, value]);
    } else {
      setPremiumServices(premiumServices.filter(s => s !== value));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Form submitted');
    }
    
    const normalizedCarrier = carrier.toLowerCase();
    const currentToken = getToken(normalizedCarrier) || storedToken;
    if (!currentToken) {
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Validate required fields first
      // Check both old and new field names for backward compatibility
      const shipperZip = pickupPostalCode || shipperPostalCd;
      const consigneeZip = deliveryPostalCode || consigneePostalCd;
      
      if (!pickupLocation && !shipperZip) {
        const errorMsg = 'Pickup location is required';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
        }
        return;
      }
      if (!consigneeZip) {
        const errorMsg = 'Delivery postal code is required';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
        }
        return;
      }
      if (!deliveryCountry) {
        const errorMsg = 'Delivery country is required';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
        }
        return;
      }
      if (!pickupDate) {
        const errorMsg = 'Pickup date is required';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
        }
        return;
      }
      if (!commodities || commodities.length === 0) {
        const errorMsg = 'At least one commodity is required';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
        }
        return;
      }
      if (commodities.some(c => !c.pieceCnt || c.pieceCnt <= 0)) {
        const errorMsg = 'All commodities must have a piece count greater than 0';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
        }
        return;
      }
      // Validate commodity weights - handle both number and string values
      const invalidWeightCommodities = commodities.filter(c => {
        if (!c.grossWeight || c.grossWeight === null || c.grossWeight === undefined) {
          return true;
        }
        const weight = typeof c.grossWeight.weight === 'string' 
          ? parseFloat(c.grossWeight.weight) 
          : c.grossWeight.weight;
        return !weight || isNaN(weight) || weight <= 0;
      });
      
      if (invalidWeightCommodities.length > 0) {
        const errorMsg = 'All commodities must have a weight greater than 0';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
          console.error('Invalid commodities:', invalidWeightCommodities.map((c, i) => ({
            index: i,
            weight: c.grossWeight?.weight,
            type: typeof c.grossWeight?.weight
          })));
        }
        return;
      }
      
      // Validate commodity package codes
      if (commodities.some(c => !c.packageCode || c.packageCode.trim() === '')) {
        const errorMsg = 'All commodities must have a package code';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
        }
        return;
      }
      
      const requestBody = buildRequestBody();
      
      // Get shippingCompany from carrier prop
      const shippingCompany = normalizedCarrier === 'expo' ? 'xpo' : normalizedCarrier;
      
      // Ensure shippingCompany is at the top level
      const payload = {
        shippingCompany: shippingCompany,
        ...requestBody,
      };
      
      // Payload is already updated by useEffect, just ensure it's visible
      setShowPayloadJson(true);
      
      // Log the full payload for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('=== XPO Rate Quote Request ===');
        console.log('Full Payload:', JSON.stringify(payload, null, 2));
        console.log('Shipment Info:', JSON.stringify(payload.shipmentInfo, null, 2));
        console.log('Commodities:', JSON.stringify(payload.shipmentInfo?.commodity, null, 2));
        console.log('Shipper Postal Code:', payload.shipmentInfo?.shipper?.address?.postalCd);
        console.log('Consignee Postal Code:', payload.shipmentInfo?.consignee?.address?.postalCd);
        console.log('Shipment Date:', payload.shipmentInfo?.shipmentDate);
        console.log('Payment Term:', payload.shipmentInfo?.paymentTermCd);
        console.log('Accessorials:', payload.shipmentInfo?.accessorials);
      }
      
      // Validate that we have required postal codes in the payload
      if (!payload.shipmentInfo?.shipper?.address?.postalCd) {
        const errorMsg = 'Shipper postal code is required in request';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
          console.error('Payload shipmentInfo:', payload.shipmentInfo);
        }
        return;
      }
      
      if (!payload.shipmentInfo?.consignee?.address?.postalCd) {
        const errorMsg = 'Consignee postal code is required in request';
        setError(new Error(errorMsg));
        setLoading(false);
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation error:', errorMsg);
          console.error('Payload shipmentInfo:', payload.shipmentInfo);
        }
        return;
      }

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
          setError(new Error('Your session has expired. Please login again.'));
          setLoading(false);
          return;
        }
        
        let errorMessage = `Rate quote creation failed (${res.status}): ${res.statusText}`;
        let errorDetails: any = null;
        let errorText = '';
        
        try {
          errorText = await res.text();
          if (errorText && errorText.trim()) {
            try {
              errorDetails = JSON.parse(errorText);
            } catch {
              // If not JSON, use as plain text
              errorDetails = { raw: errorText };
            }
          } else {
            // Empty response body
            errorDetails = { 
              message: `Server returned ${res.status} ${res.statusText} with no error details`,
              status: res.status,
              statusText: res.statusText
            };
          }
        } catch (parseError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to parse error response:', parseError);
          }
          errorDetails = { 
            message: `Failed to parse error response: ${parseError}`,
            status: res.status,
            statusText: res.statusText
          };
        }
        
        // Build comprehensive error message
        if (errorDetails) {
          if (process.env.NODE_ENV === 'development') {
            console.error('API Error Response:', errorDetails);
            console.error('Response Status:', res.status);
            console.error('Response Status Text:', res.statusText);
            console.error('Response Headers:', Object.fromEntries(res.headers.entries()));
            console.error('Request Payload that failed:', JSON.stringify(payload, null, 2));
          }
          
          if (errorDetails.message) {
            errorMessage = errorDetails.message;
          } else if (errorDetails.error) {
            errorMessage = typeof errorDetails.error === 'string' 
              ? errorDetails.error 
              : errorDetails.error.message || errorMessage;
          } else if (errorDetails.data?.message) {
            errorMessage = errorDetails.data.message;
          } else if (errorDetails.raw) {
            errorMessage = errorDetails.raw;
          } else if (Object.keys(errorDetails).length === 0) {
            // Empty object - provide more context
            errorMessage = `Bad request (${res.status}). The server rejected the request. Please check that all required fields are filled correctly.`;
          }
          
          // Add validation errors if present
          if (errorDetails.errors) {
            if (Array.isArray(errorDetails.errors)) {
              errorMessage += `\nValidation errors: ${errorDetails.errors.join(', ')}`;
            } else if (typeof errorDetails.errors === 'object') {
              const validationErrors = Object.entries(errorDetails.errors)
                .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                .join('; ');
              if (validationErrors) {
                errorMessage += `\nValidation errors: ${validationErrors}`;
              }
            }
          }
          
          // Add any additional error details
          if (errorDetails.details) {
            errorMessage += `\nDetails: ${JSON.stringify(errorDetails.details)}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResponse(data);
      setShowResponseJson(true); // Show response JSON
      
      // Mark step 1 as completed
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      
      // Show Quote Results Page below the form when rate quote is created successfully
      // The response structure validation will happen in the render logic
      setShowQuoteResultsPage(true);
      setShowAccountInfo(false);
      setShowResponseDropdown(true);
      
      // Scroll to the results section smoothly
      setTimeout(() => {
        const resultsElement = document.querySelector('[data-quote-results]');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes('401') ||
        err.message.includes('Unauthorized') ||
        err.message.includes('expired') ||
        err.message.includes('invalid token')
      )) {
        setIsAuthModalOpen(true);
      }
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step navigation handlers
  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleBookShipment = () => {
    if (response && response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const quote = response.data.data[0];
      setSelectedQuote({
        quote,
        formData: {
          paymentTermCd,
          shipmentDate,
          accessorials,
          shipperPostalCd,
          consigneePostalCd,
          commodities,
          palletCnt,
          linealFt,
        },
      });
      handleStepComplete(1);
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleBillOfLandingNext = () => {
    handleStepComplete(2);
    // Go directly to step 3 (Pickup Request)
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };


  const handlePickupRequestComplete = (pickupResponse?: any) => {
    handleStepComplete(3);
    if (pickupResponse) {
      setPickupResponseData(pickupResponse);
    }
    setCurrentStep(4);
    handleStepComplete(4);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  
  // Scroll to top when step changes
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.scrollTo(0, 0);
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    };
    
    const timeoutIds: NodeJS.Timeout[] = [];
    const rafId = requestAnimationFrame(() => {
      scrollToTop();
      timeoutIds.push(
        setTimeout(scrollToTop, 0),
        setTimeout(scrollToTop, 10),
        setTimeout(scrollToTop, 50),
        setTimeout(scrollToTop, 100),
        setTimeout(scrollToTop, 200),
        setTimeout(scrollToTop, 300),
        setTimeout(scrollToTop, 500)
      );
    });
    
    return () => {
      cancelAnimationFrame(rafId);
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [currentStep]);

  // Extract BOL PDF URL and create File when BOL response is available
  useEffect(() => {
    let currentUrl: string | null = null;
    
    if (bolResponseData?.data?.images?.bol) {
      try {
        const base64String = bolResponseData.data.images.bol;
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setBolPdfUrl(url);
        
        const proNumber = bolResponseData?.data?.referenceNumbers?.pro || 'BOL';
        const fileName = `BillOfLading_${proNumber}.pdf`;
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
        setBolFiles([pdfFile]);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to create PDF URL:', err);
        }
        setBolPdfUrl(null);
        setBolFiles([]);
      }
    } else {
      setBolFiles([]);
      setBolPdfUrl(null);
    }
    
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [bolResponseData]);

  if (!isMounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Format commodities string for quote results page
  const formatCommoditiesString = () => {
    if (commodities.length === 0) return '';
    const commodity = commodities[0];
    const parts = [];
    if (commodity.pieceCnt) parts.push(`${commodity.pieceCnt} ${XPO_PACKAGE_CODE_OPTIONS.find(opt => opt.value === commodity.packageCode)?.label || 'Piece'}`);
    if (commodity.grossWeight?.weight) parts.push(`${commodity.grossWeight.weight} Lbs.`);
    if (commodity.nmfcClass) parts.push(`Class ${commodity.nmfcClass}`);
    if (commodity.packageCode) {
      const packageLabel = XPO_PACKAGE_CODE_OPTIONS.find(opt => opt.value === commodity.packageCode)?.label || commodity.packageCode;
      parts.push(`1 ${packageLabel}`);
    }
    return parts.join(', ');
  };

  // Format pickup location string
  const formatPickupLocation = () => {
    if (pickupLocation) {
      const address = XPO_SHIPPER_ADDRESS_BOOK.find(opt => opt.value === pickupLocation);
      if (address) {
        return `${address.city}, ${address.state} ${address.zip}`;
      }
    }
    if (pickupCity && pickupState && pickupPostalCode) {
      return `${pickupCity}, ${pickupState} ${pickupPostalCode}`;
    }
    if (shipperCity && shipperState && shipperPostalCd) {
      return `${shipperCity}, ${shipperState} ${shipperPostalCd}`;
    }
    return 'N/A';
  };

  // Format delivery location string
  const formatDeliveryLocation = () => {
    if (deliveryPostalCode) {
      if (consigneeCity && consigneeState) {
        return `${consigneeCity}, ${consigneeState} ${deliveryPostalCode}`;
      }
      return deliveryPostalCode;
    }
    if (consigneeCity && consigneeState && consigneePostalCd) {
      return `${consigneeCity}, ${consigneeState} ${consigneePostalCd}`;
    }
    return 'N/A';
  };

  // Format total weight string
  const formatTotalWeight = () => {
    const totalWeight = commodities.reduce((sum, c) => sum + (c.grossWeight?.weight || 0) * (c.pieceCnt || 1), 0);
    return `${totalWeight} Lbs.`;
  };

  // Format payment terms string
  const formatPaymentTerms = () => {
    const term = XPO_PAYMENT_TERM_OPTIONS.find(opt => opt.value === paymentTermCd);
    return term?.label || 'Prepaid';
  };

  // Show Quote Results Page if response is available
  // Handle different response structures - check multiple possible paths
  // XPO API returns: response.data.data.rateQuote (single object) or response.data.data (array)
  let quotesData: any[] = [];
  
  if (response?.data?.data) {
    // Check if it's an array
    if (Array.isArray(response.data.data)) {
      quotesData = response.data.data;
    } 
    // Check if it's a single rateQuote object
    else if (response.data.data.rateQuote) {
      quotesData = [response.data.data.rateQuote];
    }
    // Check if data itself is an array
    else if (Array.isArray(response.data)) {
      quotesData = response.data;
    }
  } else if (Array.isArray(response?.data)) {
    quotesData = response.data;
  }
  
  const hasValidQuotes = quotesData.length > 0;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Quote Results Page Check:', {
      showQuoteResultsPage,
      hasResponse: !!response,
      hasValidQuotes,
      quotesDataLength: quotesData.length,
      quotesData,
      responseStructure: {
        hasData: !!response?.data,
        hasDataData: !!response?.data?.data,
        isDataDataArray: Array.isArray(response?.data?.data),
        hasRateQuote: !!response?.data?.data?.rateQuote,
        rateQuote: response?.data?.data?.rateQuote,
      },
    });
  }
  
  // Helper functions to extract data for QuoteResultsPage
  const getQuoteResultsData = () => {
    if (!response) return null;

    // Prepare quotesData - recalculate to ensure it's fresh
    let finalQuotesData: any[] = [];
    
    if (response?.data?.data) {
      // Check if it's an array
      if (Array.isArray(response.data.data)) {
        finalQuotesData = response.data.data;
      } 
      // Check if it's a single rateQuote object
      else if (response.data.data.rateQuote) {
        finalQuotesData = [response.data.data.rateQuote];
      }
      // Check if data itself is an array
      else if (Array.isArray(response.data)) {
        finalQuotesData = response.data;
      }
    } else if (Array.isArray(response?.data)) {
      finalQuotesData = response.data;
    }
    
    // If still empty but we have rateQuote in response, add it
    if (finalQuotesData.length === 0 && response.data?.data?.rateQuote) {
      finalQuotesData = [response.data.data.rateQuote];
    }

    // Extract quote number from various possible locations
    const quoteNumber = finalQuotesData.length > 0
      ? (finalQuotesData[0]?.confirmationNbr || finalQuotesData[0]?.quoteId || finalQuotesData[0]?.spotQuoteNbr)
      : (response.data?.data?.rateQuote?.confirmationNbr || 
         response.data?.data?.rateQuote?.spotQuoteNbr ||
         response.quoteId || 
         response.data?.quoteId || 
         `10000${Date.now()}`);
    
    // Extract delivery location from response, order data, or form data
    const getDeliveryLocation = () => {
      // Try to get from response first
      const responseDelivery = response?.data?.data?.rateQuote?.consignee?.address;
      if (responseDelivery) {
        const parts = [];
        if (responseDelivery.city) parts.push(responseDelivery.city);
        if (responseDelivery.stateProvince) parts.push(responseDelivery.stateProvince);
        if (responseDelivery.postalCd) parts.push(responseDelivery.postalCd);
        if (parts.length > 0) return parts.join(', ');
      }
      
      // Try to get from order data
      if (orderData?.ordersJsonb) {
        const orderJsonb = orderData.ordersJsonb;
        const consigneeCity = getJsonbValue(orderJsonb, 'consigneeCity') || getJsonbValue(orderJsonb, 'deliveryCity');
        const consigneeState = getJsonbValue(orderJsonb, 'consigneeState') || getJsonbValue(orderJsonb, 'deliveryState');
        const consigneeZip = getJsonbValue(orderJsonb, 'consigneePostalCd') || getJsonbValue(orderJsonb, 'deliveryPostalCode') || getJsonbValue(orderJsonb, 'deliveryZip');
        if (consigneeCity && consigneeState && consigneeZip) {
          return `${consigneeCity}, ${consigneeState} ${consigneeZip}`;
        }
        if (consigneeZip) {
          return consigneeZip;
        }
      }
      
      // Fall back to form data
      return formatDeliveryLocation();
    };
    
    // Extract pickup location from response, order data, or form data
    const getPickupLocation = () => {
      // Try to get from response first
      const responsePickup = response?.data?.data?.rateQuote?.shipper?.address;
      if (responsePickup) {
        const parts = [];
        if (responsePickup.city) parts.push(responsePickup.city);
        if (responsePickup.stateProvince) parts.push(responsePickup.stateProvince);
        if (responsePickup.postalCd) parts.push(responsePickup.postalCd);
        if (parts.length > 0) return parts.join(', ');
      }
      
      // Try to get from order data
      if (orderData?.ordersJsonb) {
        const orderJsonb = orderData.ordersJsonb;
        const shipperCity = getJsonbValue(orderJsonb, 'shipperCity') || getJsonbValue(orderJsonb, 'pickupCity');
        const shipperState = getJsonbValue(orderJsonb, 'shipperState') || getJsonbValue(orderJsonb, 'pickupState');
        const shipperZip = getJsonbValue(orderJsonb, 'shipperPostalCd') || getJsonbValue(orderJsonb, 'pickupPostalCode') || getJsonbValue(orderJsonb, 'pickupZip');
        if (shipperCity && shipperState && shipperZip) {
          return `${shipperCity}, ${shipperState} ${shipperZip}`;
        }
        if (shipperZip) {
          return shipperZip;
        }
      }
      
      // Fall back to form data
      return formatPickupLocation();
    };
    
    // Extract commodities from response, order data, or form data
    const getCommodities = () => {
      // Try to get from response first
      const responseCommodities = response?.data?.data?.rateQuote?.commodity;
      if (responseCommodities && Array.isArray(responseCommodities) && responseCommodities.length > 0) {
        return responseCommodities.map((c: any) => {
          const parts = [];
          if (c.pieceCnt) parts.push(`${c.pieceCnt}x`);
          if (c.packageCode) parts.push(c.packageCode);
          if (c.grossWeight?.weight) parts.push(`${c.grossWeight.weight} Lbs.`);
          return parts.join(' ');
        }).join(', ');
      }
      
      // Try to get from order data
      if (orderData?.ordersJsonb) {
        const orderJsonb = orderData.ordersJsonb;
        const orderCommodities = getJsonbValue(orderJsonb, 'commodities') || getJsonbValue(orderJsonb, 'commodity');
        if (orderCommodities) {
          try {
            const parsed = typeof orderCommodities === 'string' ? JSON.parse(orderCommodities) : orderCommodities;
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((c: any) => {
                const parts = [];
                if (c.pieceCnt || c.pieceCount) parts.push(`${c.pieceCnt || c.pieceCount}x`);
                if (c.packageCode || c.package) parts.push(c.packageCode || c.package);
                if (c.weight || c.grossWeight?.weight) parts.push(`${c.weight || c.grossWeight?.weight || 0} Lbs.`);
                return parts.join(' ');
              }).join(', ');
            }
          } catch {
            // If parsing fails, continue to fallback
          }
        }
      }
      
      // Fall back to form data
      return formatCommoditiesString();
    };
    
    // Extract total weight from response, order data, or form data
    const getTotalWeight = () => {
      // Try to get from response first
      const responseWeight = response?.data?.data?.rateQuote?.totWeight;
      if (responseWeight?.weight) {
        return `${responseWeight.weight} ${responseWeight.weightUom || 'LBS'}`;
      }
      
      // Try to get from order data
      if (orderData?.ordersJsonb) {
        const orderJsonb = orderData.ordersJsonb;
        const totalWeight = getJsonbValue(orderJsonb, 'totalWeight') || getJsonbValue(orderJsonb, 'weight');
        if (totalWeight) {
          return `${totalWeight} LBS`;
        }
      }
      
      // Fall back to form data
      return formatTotalWeight();
    };
    
    // Extract account code and number from response
    const getAccountCode = () => {
      return response?.data?.data?.rateQuote?.accountCd || 
             response?.data?.data?.rateQuote?.billToCust?.accountCd ||
             undefined;
    };
    
    const getAccountNumber = () => {
      return response?.data?.data?.rateQuote?.billToCust?.accountNbr ||
             response?.data?.data?.rateQuote?.accountNbr ||
             undefined;
    };

    return {
      quoteNumber,
      pickupLocation: getPickupLocation(),
      deliveryLocation: getDeliveryLocation(),
      commodities: getCommodities(),
      totalWeight: getTotalWeight(),
      paymentTerms: formatPaymentTerms(),
      accountCode: getAccountCode(),
      accountNumber: getAccountNumber(),
      quotes: finalQuotesData,
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-4 sm:pb-6 lg:pb-8 px-3 sm:px-4 lg:px-6">
      {/* Step Indicator */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
        <StepIndicator 
          steps={steps} 
          currentStep={currentStep} 
          completedSteps={completedSteps}
          onStepClick={setCurrentStep}
        />
      </div>

      {/* Step 1: Rate Quote */}
      {currentStep === 1 && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">XPO Rate Quote Service</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-slate-200 p-6">
            {/* Error Display at top of form */}
            {error ? (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-semibold">Error:</p>
                <p className="text-red-700 text-sm mt-1">
                  {error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred'}
                </p>
              </div>
            ) : null}
            
            {/* Requester Section */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Requester (For This Quote I Am The)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={requesterRole}
                    onChange={(e) => setRequesterRole(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {XPO_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Pickup Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={convertToDateInputFormat(pickupDate)}
                      onChange={handlePickupDateChange}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      style={{
                        colorScheme: 'light',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleCalendarIconClick}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer z-10 pointer-events-auto"
                      aria-label="Open calendar"
                    >
                      <Calendar size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* From (Pickup Location) Section */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">From (Pickup Location)</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Pickup Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={pickupLocation}
                      onChange={(e) => {
                        setPickupLocation(e.target.value);
                        if (e.target.value) {
                          const address = XPO_SHIPPER_ADDRESS_BOOK.find(opt => opt.value === e.target.value);
                          if (address) {
                            setPickupCompany(address.company || address.label.split(' - ')[0]);
                            setPickupStreetAddress(address.streetAddress || '');
                            setPickupAddressLine2(address.addressLine2 || '');
                            setPickupCity(address.city);
                            setPickupState(address.state);
                            setPickupPostalCode(address.zip);
                            setPickupCountry(address.country || 'United States');
                            setPickupPhone(address.phone || '');
                            setPickupExtension(address.extension || '');
                            setPickupContactName(address.contactName || '');
                          }
                        }
                      }}
                      className="w-full px-4 py-3 pl-10 pr-10 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-slate-400 transition-colors"
                      required
                    >
                      <option value="" disabled style={{ color: '#94a3b8', backgroundColor: '#f8fafc' }}>
                        Select Pickup Location
                      </option>
                      {XPO_SHIPPER_ADDRESS_BOOK.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <MapPin className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    </div>
                    {pickupLocation && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickupLocation('');
                          setPickupCompany('');
                          setPickupCity('');
                          setPickupState('');
                          setPickupPostalCode('');
                        }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 hover:bg-slate-100 rounded p-1 transition-colors z-10"
                      >
                        <X size={16} className="text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPickupDetails(!showPickupDetails)}
                  className="text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  {showPickupDetails ? 'Hide Details' : 'Show Details'}
                </button>
                {showPickupDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Company</label>
                      <input
                        type="text"
                        value={pickupCompany}
                        onChange={(e) => setPickupCompany(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Street Address</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={pickupStreetAddress}
                          onChange={(e) => setPickupStreetAddress(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Search className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        value={pickupAddressLine2}
                        onChange={(e) => setPickupAddressLine2(e.target.value)}
                        placeholder="Apartment, suite, unit, building, floor, P.O, etc."
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">City</label>
                      <input
                        type="text"
                        value={pickupCity}
                        onChange={(e) => setPickupCity(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">State/Province</label>
                      <select
                        value={pickupState}
                        onChange={(e) => setPickupState(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select State</option>
                        {US_STATES_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Postal Code</label>
                      <input
                        type="text"
                        value={pickupPostalCode}
                        onChange={(e) => setPickupPostalCode(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Country</label>
                      <select
                        value={pickupCountry}
                        onChange={(e) => setPickupCountry(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {XPO_COUNTRY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Phone</label>
                      <input
                        type="text"
                        value={pickupPhone}
                        onChange={(e) => setPickupPhone(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Extension (Optional)
                      </label>
                      <input
                        type="text"
                        value={pickupExtension}
                        onChange={(e) => setPickupExtension(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-900">Contact Full Name</label>
                      <input
                        type="text"
                        value={pickupContactName}
                        onChange={(e) => setPickupContactName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Delivery Location Section */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">TO (Delivery Location)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    To Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deliveryCountry}
                    onChange={(e) => setDeliveryCountry(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {XPO_COUNTRY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    To Postal Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={deliveryPostalCode}
                      onChange={(e) => setDeliveryPostalCode(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {deliveryLoadingZip && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                  {(deliveryCity || deliveryState) && !deliveryLoadingZip && (
                    <p className="text-sm text-slate-600 mt-1">
                      {[deliveryCity, deliveryState].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentTermCd}
                  onChange={(e) => setPaymentTermCd(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {XPO_PAYMENT_TERM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Commodity Details Section */}
            <section data-commodity-section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Commodity Details</h2>
              {commodities.map((commodity, index) => (
                <div key={index} className="mb-6 p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">Commodity {index + 1}</h3>
                      <Info className="text-blue-500" size={18} />
                    </div>
                    {commodities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCommodity(index)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        <X size={16} />
                        Remove From Shipment
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-semibold text-slate-900">
                        Commodity Description (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={commodityDescriptions[index] || ''}
                        onChange={(e) => setCommodityDescriptions(prev => ({ ...prev, [index]: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Total Weight <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={commodity.grossWeight?.weight || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : parseFloat(value);
                          updateCommodity(index, 'grossWeight', { 
                            ...commodity.grossWeight, 
                            weight: isNaN(numValue) ? 0 : numValue
                          });
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-slate-500">lbs</p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Freight Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={commodity.nmfcClass || ''}
                        onChange={(e) => updateCommodity(index, 'nmfcClass', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Class</option>
                        {FREIGHT_CLASS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mt-1"
                      >
                        <Calculator className="w-4 h-4" />
                        Class Calculator
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Length (Inches) (Optional)
                      </label>
                      <input
                        type="number"
                        value={commodity.dimensions?.length || ''}
                        onChange={(e) => updateCommodity(index, 'dimensions', { ...commodity.dimensions, length: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Width (Inches) (Optional)
                      </label>
                      <input
                        type="number"
                        value={commodity.dimensions?.width || ''}
                        onChange={(e) => updateCommodity(index, 'dimensions', { ...commodity.dimensions, width: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Height (Inches) (Optional)
                      </label>
                      <input
                        type="number"
                        value={commodity.dimensions?.height || ''}
                        onChange={(e) => updateCommodity(index, 'dimensions', { ...commodity.dimensions, height: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Pieces/Quantity (Optional)
                      </label>
                      <input
                        type="number"
                        value={commodity.pieceCnt || 1}
                        onChange={(e) => updateCommodity(index, 'pieceCnt', parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                  </div>
                  
                  {/* Packaging, Checkboxes, and Buttons - Only for Commodity 1 */}
                  {index === 0 && (
                    <div className="mt-4 pt-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-900">Packaging</label>
                          <select
                            value={commodity.packageCode || 'PLT'}
                            onChange={(e) => updateCommodity(index, 'packageCode', e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-48"
                          >
                            {XPO_PACKAGE_CODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap flex-1">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={freezableProtection}
                              onChange={(e) => setFreezableProtection(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-slate-700">Freezable Protection</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hazmatItem}
                              onChange={(e) => setHazmatItem(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-slate-700">Hazmat Item</span>
                          </label>
                          <div className="flex gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={handleSaveAsNew}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Save As New
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdateCommodity}
                              disabled={!selectedCommodityId}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                              Update Commodity
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* Additional Commodity Options Section */}
            <section>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Additional Commodity</label>
                  <select
                    value={additionalCommodity}
                    onChange={(e) => handleAdditionalCommodityChange(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Commodity</option>
                    {allCommodityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="add_new" className="text-blue-600 font-semibold">
                      + Add New Commodity
                    </option>
                  </select>
                </div>
                
                {/* Show Commodity Form when Add New or Saved Commodity is Selected */}
                {showNewCommodityForm && commodities.length > 0 && (
                  <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">Commodity 1</h3>
                        <Info className="text-blue-500" size={18} />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCommodityForm(false);
                          setAdditionalCommodity('');
                          setSelectedCommodityId(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Close commodity form"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-semibold text-slate-900">
                          Commodity Description (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={commodityDescriptions[0] || ''}
                          onChange={(e) => setCommodityDescriptions(prev => ({ ...prev, 0: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Total Weight <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={commodities[0].grossWeight?.weight || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : parseFloat(value);
                            updateCommodity(0, 'grossWeight', { 
                              ...commodities[0].grossWeight, 
                              weight: isNaN(numValue) ? 0 : numValue
                            });
                          }}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-slate-500">lbs</p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Freight Class <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={commodities[0].nmfcClass || ''}
                          onChange={(e) => updateCommodity(0, 'nmfcClass', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Class</option>
                          {FREIGHT_CLASS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mt-1"
                        >
                          <Calculator className="w-4 h-4" />
                          Class Calculator
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Length (Inches) (Optional)
                        </label>
                        <input
                          type="number"
                          value={commodities[0].dimensions?.length || ''}
                          onChange={(e) => updateCommodity(0, 'dimensions', { ...commodities[0].dimensions, length: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Width (Inches) (Optional)
                        </label>
                        <input
                          type="number"
                          value={commodities[0].dimensions?.width || ''}
                          onChange={(e) => updateCommodity(0, 'dimensions', { ...commodities[0].dimensions, width: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Height (Inches) (Optional)
                        </label>
                        <input
                          type="number"
                          value={commodities[0].dimensions?.height || ''}
                          onChange={(e) => updateCommodity(0, 'dimensions', { ...commodities[0].dimensions, height: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Pieces/Quantity (Optional)
                        </label>
                        <input
                          type="number"
                          value={commodities[0].pieceCnt || 1}
                          onChange={(e) => updateCommodity(0, 'pieceCnt', parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                    </div>
                    
                    {/* Packaging, Checkboxes, and Buttons */}
                    <div className="mt-4 pt-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-900">Packaging</label>
                          <select
                            value={commodities[0].packageCode || 'PLT'}
                            onChange={(e) => updateCommodity(0, 'packageCode', e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-48"
                          >
                            {XPO_PACKAGE_CODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap flex-1">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={freezableProtection}
                              onChange={(e) => setFreezableProtection(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-slate-700">Freezable Protection</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hazmatItem}
                              onChange={(e) => setHazmatItem(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-slate-700">Hazmat Item</span>
                          </label>
                          <div className="flex gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={handleSaveAsNew}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Save As New
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdateCommodity}
                              disabled={!selectedCommodityId}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                              Update Commodity
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">Excessive Length</label>
                    <select
                      value={excessiveLength}
                      onChange={(e) => setExcessiveLength(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {EXCESSIVE_LENGTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      $ Excess Value Coverage (USD) (Optional)
                    </label>
                    <input
                      type="text"
                      value={excessValueCoverage}
                      onChange={(e) => setExcessValueCoverage(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500">USD</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Pickup Services Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Pickup Services</h3>
                <Info className="text-blue-500" size={18} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {XPO_PICKUP_SERVICES.map((service) => (
                  <label key={service.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pickupServices.includes(service.value)}
                      onChange={(e) => handlePickupServiceChange(service.value, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">{service.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Delivery Services Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Delivery Services</h3>
                <Info className="text-blue-500" size={18} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {XPO_DELIVERY_SERVICES.map((service) => (
                  <label key={service.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={deliveryServices.includes(service.value)}
                      onChange={(e) => handleDeliveryServiceChange(service.value, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">{service.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Premium Services Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Premium Services</h3>
                <Info className="text-blue-500" size={18} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {XPO_PREMIUM_SERVICES.map((service) => (
                  <label key={service.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={premiumServices.includes(service.value)}
                      onChange={(e) => handlePremiumServiceChange(service.value, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">{service.label}</span>
                    {service.value === 'FREEZABLE' && (
                      <Info className="text-blue-500" size={14} />
                    )}
                  </label>
                ))}
              </div>
            </section>

            {/* Reference Numbers Section */}
            <section>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Reference Numbers (Optional)
                </label>
                <input
                  type="text"
                  value={referenceNumbers}
                  onChange={(e) => setReferenceNumbers(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </section>

            {/* Request Payload JSON Display - Updates Live */}
            <section>
              <button
                type="button"
                onClick={() => setShowPayloadJson(!showPayloadJson)}
                className="flex items-center justify-between w-full p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-900">Request Payload JSON (Live)</span>
                {showPayloadJson ? (
                  <ChevronUp className="text-slate-600" size={20} />
                ) : (
                  <ChevronDown className="text-slate-600" size={20} />
                )}
              </button>
              {showPayloadJson && (
                <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <pre className="text-xs text-slate-800 whitespace-pre-wrap font-mono overflow-auto max-h-96">
                    {requestPayload ? JSON.stringify(requestPayload, null, 2) : 'Building payload...'}
                  </pre>
                </div>
              )}
            </section>

            {/* Response JSON Display */}
            {response && (
              <section>
                <button
                  type="button"
                  onClick={() => setShowResponseJson(!showResponseJson)}
                  className="flex items-center justify-between w-full p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-900">Response JSON</span>
                  {showResponseJson ? (
                    <ChevronUp className="text-slate-600" size={20} />
                  ) : (
                    <ChevronDown className="text-slate-600" size={20} />
                  )}
                </button>
                {showResponseJson && (
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <pre className="text-xs text-slate-800 whitespace-pre-wrap font-mono overflow-auto max-h-96">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
                )}
              </section>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4">
              <button
                type="button"
                className="px-6 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isMounted || loading}
                onClick={(e) => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Get Rate Quote button clicked');
                    console.log('Form state:', {
                      pickupLocation,
                      pickupPostalCode,
                      deliveryPostalCode,
                      deliveryCountry,
                      pickupDate,
                      commodities: commodities.length,
                      loading,
                      isMounted,
                    });
                  }
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Getting Quote...
                  </>
                ) : (
                  'Get Rate Quote'
                )}
              </button>
            </div>
          </form>


          {error ? (
            <div className="mt-6">
              <ErrorDisplay error={error} />
            </div>
          ) : null}

          {/* Logistics Authentication Modal */}
          <LogisticsAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => {
              setIsAuthModalOpen(false);
              const normalizedCarrier = carrier.toLowerCase();
              const updatedToken = getToken(normalizedCarrier);
              if (updatedToken) {
                setStoredToken(updatedToken);
                setError(null);
              }
            }}
            carrier={carrier}
          />

          {/* Quote Results Page - Show below the form when quote is retrieved */}
          {showQuoteResultsPage && response && (() => {
            const quoteData = getQuoteResultsData();
            if (!quoteData) return null;
            
            return (
              <div className="mt-6" data-quote-results>
                <QuoteResultsPage
                  quoteNumber={quoteData.quoteNumber}
                  pickupLocation={quoteData.pickupLocation}
                  deliveryLocation={quoteData.deliveryLocation}
                  commodities={quoteData.commodities}
                  totalWeight={quoteData.totalWeight}
                  paymentTerms={quoteData.paymentTerms}
                  accountCode={quoteData.accountCode}
                  accountNumber={quoteData.accountNumber}
                  quotes={quoteData.quotes}
                  onBack={() => setShowQuoteResultsPage(false)}
                  onRequote={() => {
                    setShowQuoteResultsPage(false);
                    setResponse(null);
                    setError(null);
                  }}
                  onClose={() => {
                    setShowQuoteResultsPage(false);
                    setResponse(null);
                  }}
                  onCreateBOLAndPickup={(quote) => {
                    setSelectedQuote({
                      quote,
                      formData: {
                        paymentTermCd,
                        shipmentDate,
                        accessorials,
                        shipperPostalCd: pickupPostalCode || shipperPostalCd,
                        consigneePostalCd: deliveryPostalCode || consigneePostalCd,
                        commodities,
                        palletCnt,
                        linealFt,
                      },
                    });
                    setShowQuoteResultsPage(false);
                    handleStepComplete(1);
                    setCurrentStep(2);
                  }}
                  onCreateBOL={(quote) => {
                    setSelectedQuote({
                      quote,
                      formData: {
                        paymentTermCd,
                        shipmentDate,
                        accessorials,
                        shipperPostalCd: pickupPostalCode || shipperPostalCd,
                        consigneePostalCd: deliveryPostalCode || consigneePostalCd,
                        commodities,
                        palletCnt,
                        linealFt,
                      },
                    });
                    setShowQuoteResultsPage(false);
                    handleStepComplete(1);
                    setCurrentStep(2);
                  }}
                  onSchedulePickup={(quote) => {
                    setSelectedQuote({
                      quote,
                      formData: {
                        paymentTermCd,
                        shipmentDate,
                        accessorials,
                        shipperPostalCd: pickupPostalCode || shipperPostalCd,
                        consigneePostalCd: deliveryPostalCode || consigneePostalCd,
                        commodities,
                        palletCnt,
                        linealFt,
                      },
                    });
                    setShowQuoteResultsPage(false);
                    handleStepComplete(1);
                    setCurrentStep(3);
                  }}
                />
              </div>
            );
          })()}

          {/* Legacy quote cards display - keeping for backward compatibility */}
          {response && response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0 && !showQuoteResultsPage && (
            <div className="mt-6 space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold text-slate-900">Rate Quote Results</h3>
                  <button
                    type="button"
                    onClick={handleBookShipment}
                    className="font-bold text-lg px-6 py-2.5 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors flex items-center gap-2"
                  >
                    Book Shipment
                  </button>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  {response.message || `Rate quotes for ${response.shippingCompanyName || carrier}`}
                </p>

                {/* Quote Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {response.data.data.map((quote: any, index: number) => (
                    <XPOQuoteCard key={quote.quoteId || index} quote={quote} index={index} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 2: Bill of Lading */}
      {currentStep === 2 && (
        <BOLForm
          onNext={handleBillOfLandingNext}
          onPrevious={handlePreviousStep}
          quoteData={selectedQuote}
          orderData={orderData}
          initialFormData={bolFormData}
          initialResponseData={bolResponseData}
          onFormDataChange={setBolFormData}
          onResponseDataChange={setBolResponseData}
          onPdfFileChange={(pdfFile) => {
            if (pdfFile) {
              setBolFiles([pdfFile]);
            } else {
              setBolFiles([]);
            }
          }}
          consigneeData={consigneeData}
        />
      )}

      {/* Step 3: Pickup Request */}
      {currentStep === 3 && (
        <div data-pickup-request-section>
          <XPOPickupRequest
            onPrevious={handlePreviousStep}
            onComplete={(pickupResponse) => handlePickupRequestComplete(pickupResponse)}
            quoteData={selectedQuote}
            bolFormData={bolFormData}
            bolResponseData={bolResponseData}
          />
        </div>
      )}

      {/* Step 4: Response Summary */}
      {currentStep === 4 && (
        <>
          {loadingOrderData && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <span className="ml-2 text-slate-600">Loading order data...</span>
            </div>
          )}
          <ResponseSummary
            orderData={orderData || undefined}
            rateQuotesResponseJsonb={response?.data || undefined}
            bolResponseJsonb={bolResponseData?.data || undefined}
            pickupResponseJsonb={pickupResponseData?.data || undefined}
            files={bolFiles}
            pdfUrl={bolPdfUrl}
            orderId={currentOrderId}
            onSubmitSuccess={handleSubmitSuccess}
            onFilesChange={(updatedFiles) => {
              setBolFiles(updatedFiles);
            }}
            onDownloadPDF={() => {
              if (bolPdfUrl) {
                const link = document.createElement('a');
                link.href = bolPdfUrl;
                const proNumber = bolResponseData?.data?.referenceNumbers?.pro || 'BOL';
                link.download = `BillOfLading_${proNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
          />
        </>
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && <ToastContainer toasts={toasts} onRemove={removeToast} />}
    </div>
  );
};
