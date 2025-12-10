'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Info, X, Plus, Save, HelpCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildEstesRequestBody } from './utils/requestBuilder';
import { EstesQuoteCard } from './components/EstesQuoteCard';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';
import { ESTES_AUTOFILL_DATA, ESTES_ACCOUNTS, ESTES_RATE_QUOTE_DEFAULTS, ESTES_ADDRESS_BOOK, ESTES_RATE_QUOTE_FORM_DEFAULTS } from '@/Shared/constant';
import { StepIndicator } from './components/StepIndicator';
import { BillOfLanding } from './BillOfLanding';
import { PickupRequest } from './PickupRequest';
import { ResponseSummary } from './components/ResponseSummary';
import { getLogisticsShippedOrderById, getAllLogisticsShippedOrders } from '@/app/api/LogisticsApi/LogisticsShippedOrders';
import { deleteOrder } from '@/app/api/OrderApi';
import { ToastContainer } from '@/app/components/shared/Toast';

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
  items: CommodityItem[];
};

type CommodityItem = {
  id: string;
  description?: string;
};

type RateQuoteServiceProps = {
  carrier: string;
  token?: string;
  orderData?: {
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  };
};

export const EstesRateQuoteService = ({ carrier, token, orderData: initialOrderData }: RateQuoteServiceProps) => {
  const searchParams = useSearchParams();
  const { getToken, isTokenExpired, refreshToken, isSessionActive } = useLogisticsStore();
  const [storedToken, setStoredToken] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadingOrderData, setLoadingOrderData] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>>([]);
  const [currentOrderId, setCurrentOrderId] = useState<number | undefined>(undefined);

  // Avoid hydration mismatch by getting token after mount
  useEffect(() => {
    setIsMounted(true);
    // Normalize carrier name to match how it's stored in Zustand (lowercase)
    const normalizedCarrier = carrier.toLowerCase();
    const tokenFromStore = getToken(normalizedCarrier) || token || '';
    setStoredToken(tokenFromStore);
  }, [carrier, token, getToken]);

  // Update token when it changes in store
  useEffect(() => {
    // Normalize carrier name to match how it's stored in Zustand (lowercase)
    const normalizedCarrier = carrier.toLowerCase();
    const tokenFromStore = getToken(normalizedCarrier) || token || '';
    setStoredToken(tokenFromStore);
  }, [carrier, getToken]);

  // Helper function to save form data to localStorage (more reliable than sessionStorage in normal Chrome)
  const saveFormDataToStorage = () => {
    try {
      const formData = {
        myAccount,
        role,
        term,
        shipDate,
        shipTime,
        requestorName,
        requestorPhone,
        requestorEmail,
        originAddressBook,
        originAddress1,
        originAddress2,
        originZipCode,
        originCity,
        originState,
        originCountry,
        originAddressSearch,
        destinationAddressBook,
        destinationAddress1,
        destinationAddress2,
        destinationZipCode,
        destinationCity,
        destinationState,
        destinationCountry,
        destinationAddressSearch,
        liftGateService,
        residentialDelivery,
        appointmentRequest,
        selectedAccessorials,
        handlingUnits,
        linearFeet,
        fullValueCoverage,
        fullValueCoverageAmount,
        warehouseDistributionCenter,
        savedAt: Date.now(), // Add timestamp to track when data was saved
      };
      
      // Try localStorage first (more persistent in normal Chrome)
      try {
        localStorage.setItem('estesRateQuoteFormData', JSON.stringify(formData));
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Form data saved to localStorage', formData);
        }
      } catch (localStorageError) {
        // Fallback to sessionStorage if localStorage fails (e.g., quota exceeded)
        sessionStorage.setItem('estesRateQuoteFormData', JSON.stringify(formData));
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ localStorage failed, saved to sessionStorage instead', localStorageError);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to save form data:', error);
      }
    }
  };

  // Helper function to restore form data from localStorage (with sessionStorage fallback)
  const restoreFormDataFromStorage = () => {
    try {
      // Try localStorage first, then fallback to sessionStorage
      let savedData = localStorage.getItem('estesRateQuoteFormData');
      let storageType = 'localStorage';
      
      if (!savedData) {
        savedData = sessionStorage.getItem('estesRateQuoteFormData');
        storageType = 'sessionStorage';
      }
      
      if (savedData) {
        const formData = JSON.parse(savedData);
        
        // Check if data is too old (more than 1 hour) - optional cleanup
        if (formData.savedAt && Date.now() - formData.savedAt > 3600000) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Saved form data is older than 1 hour, clearing it');
          }
          localStorage.removeItem('estesRateQuoteFormData');
          sessionStorage.removeItem('estesRateQuoteFormData');
          return;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Restoring form data from ${storageType}`, formData);
        }
        
        setMyAccount(formData.myAccount || ESTES_ACCOUNTS[0]?.accountNumber || '');
        setRole(formData.role || ESTES_RATE_QUOTE_DEFAULTS.role);
        setTerm(formData.term || 'Prepaid');
        setShipDate(formData.shipDate || getTodayDate());
        setShipTime(formData.shipTime || ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultShipTime);
        setRequestorName(formData.requestorName || ESTES_RATE_QUOTE_DEFAULTS.requestorName);
        setRequestorPhone(formData.requestorPhone || ESTES_RATE_QUOTE_DEFAULTS.requestorPhone);
        setRequestorEmail(formData.requestorEmail || ESTES_RATE_QUOTE_DEFAULTS.requestorEmail);
        setOriginAddressBook(formData.originAddressBook || '');
        setOriginAddress1(formData.originAddress1 || '');
        setOriginAddress2(formData.originAddress2 || '');
        setOriginZipCode(formData.originZipCode || '');
        setOriginCity(formData.originCity || '');
        setOriginState(formData.originState || '');
        setOriginCountry(formData.originCountry || '');
        setOriginAddressSearch(formData.originAddressSearch || '');
        setDestinationAddressBook(formData.destinationAddressBook || '');
        setDestinationAddress1(formData.destinationAddress1 || '');
        setDestinationAddress2(formData.destinationAddress2 || '');
        setDestinationZipCode(formData.destinationZipCode || '');
        setDestinationCity(formData.destinationCity || '');
        setDestinationState(formData.destinationState || '');
        setDestinationCountry(formData.destinationCountry || '');
        setDestinationAddressSearch(formData.destinationAddressSearch || '');
        setLiftGateService(formData.liftGateService ?? ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultLiftGateService);
        setResidentialDelivery(formData.residentialDelivery ?? ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultResidentialDelivery);
        setAppointmentRequest(formData.appointmentRequest ?? ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultAppointmentRequest);
        setSelectedAccessorials(formData.selectedAccessorials || []);
        if (formData.handlingUnits && Array.isArray(formData.handlingUnits)) {
          setHandlingUnits(formData.handlingUnits);
        }
        setLinearFeet(formData.linearFeet || '');
        setFullValueCoverage(formData.fullValueCoverage || false);
        setFullValueCoverageAmount(formData.fullValueCoverageAmount || '');
        setWarehouseDistributionCenter(formData.warehouseDistributionCenter || '');
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Form data restored successfully from ${storageType}`);
        }
        
        // Clear saved data after restoring (from both storages to be safe)
        localStorage.removeItem('estesRateQuoteFormData');
        sessionStorage.removeItem('estesRateQuoteFormData');
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('ℹ️ No saved form data found in localStorage or sessionStorage');
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to restore form data:', error);
      }
      // Clear potentially corrupted data
      try {
        localStorage.removeItem('estesRateQuoteFormData');
        sessionStorage.removeItem('estesRateQuoteFormData');
      } catch (clearError) {
        // Ignore clear errors
      }
    }
  };

  // Restore form data on mount if available
  useEffect(() => {
    if (isMounted) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        restoreFormDataFromStorage();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);
  
  // Also restore when auth modal closes (in case login happened without navigation)
  useEffect(() => {
    if (!isAuthModalOpen && isMounted) {
      // Check if we have a token now (user just logged in)
      const normalizedCarrier = carrier.toLowerCase();
      const currentToken = getToken(normalizedCarrier);
      if (currentToken) {
        // Small delay to ensure state is updated
        const timer = setTimeout(() => {
          restoreFormDataFromStorage();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthModalOpen, isMounted]);

  // Check token expiration and auto-refresh if session is active
  useEffect(() => {
    const checkTokenAndRefresh = async () => {
      const normalizedCarrier = carrier.toLowerCase();
      const currentToken = getToken(normalizedCarrier) || token;
      
      // If no token and session is not active (browser was closed), show login
      if (!currentToken && !isSessionActive()) {
        setIsAuthModalOpen(true);
        return;
      }
      
      // If token exists but expired and session is active, try to refresh
      if (currentToken && isTokenExpired(normalizedCarrier, 10) && isSessionActive()) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Token expired for ${normalizedCarrier}, attempting auto-refresh...`);
        }
        const refreshed = await refreshToken(normalizedCarrier);
        if (refreshed) {
          // Token refreshed successfully, update stored token
          const newToken = getToken(normalizedCarrier);
          if (newToken) {
            setStoredToken(newToken);
          }
        } else {
          // Refresh failed, save form data and show login modal
          saveFormDataToStorage();
          setIsAuthModalOpen(true);
        }
      } else if (!currentToken && isSessionActive()) {
        // No token but session is active - save form data and show login
        saveFormDataToStorage();
        setIsAuthModalOpen(true);
      }
    };
    
    if (isMounted) {
      checkTokenAndRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, carrier, isSessionActive, isTokenExpired, refreshToken]);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Account Information
  const [myAccount, setMyAccount] = useState(ESTES_ACCOUNTS[0]?.accountNumber || '');
  const [role, setRole] = useState<string>(ESTES_RATE_QUOTE_DEFAULTS.role);
  const [term, setTerm] = useState('Prepaid'); // Default to 'Prepaid'
  const [shipDate, setShipDate] = useState(getTodayDate()); // Today's date
  const [shipTime, setShipTime] = useState<string>(ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultShipTime); // 11AM
  
  // Requestor Information
  const [requestorName, setRequestorName] = useState(ESTES_RATE_QUOTE_DEFAULTS.requestorName);
  const [requestorPhone, setRequestorPhone] = useState(ESTES_RATE_QUOTE_DEFAULTS.requestorPhone);
  const [requestorEmail, setRequestorEmail] = useState<string>(ESTES_RATE_QUOTE_DEFAULTS.requestorEmail);

  // Address book data from constants
  const addressBookOptions = ESTES_ADDRESS_BOOK;

  // Routing Information - Origin (empty by default, user selects or enters)
  const [originAddressBook, setOriginAddressBook] = useState<string>('');
  const [originAddress1, setOriginAddress1] = useState('');
  const [originAddress2, setOriginAddress2] = useState('');
  const [originZipCode, setOriginZipCode] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [customOriginCountries, setCustomOriginCountries] = useState<string[]>([]);
  const [originLoadingZip, setOriginLoadingZip] = useState(false);
  
  // Searchable Address Book state for Origin
  const [originAddressSearch, setOriginAddressSearch] = useState('');
  const [showOriginAddressDropdown, setShowOriginAddressDropdown] = useState(false);

  // Routing Information - Destination (empty by default, user selects or enters)
  const [destinationAddressBook, setDestinationAddressBook] = useState<string>('');
  const [destinationAddress1, setDestinationAddress1] = useState('');
  const [destinationAddress2, setDestinationAddress2] = useState('');
  const [destinationZipCode, setDestinationZipCode] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [customDestinationCountries, setCustomDestinationCountries] = useState<string[]>([]);
  const [destinationLoadingZip, setDestinationLoadingZip] = useState(false);
  
  // Searchable Address Book state for Destination
  const [destinationAddressSearch, setDestinationAddressSearch] = useState('');
  const [showDestinationAddressDropdown, setShowDestinationAddressDropdown] = useState(false);

  // ZIP code lookup function using a free API
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
      // Using Zippopotam.us - free ZIP code API
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
      // Silently fail - user can still enter manually
      if (process.env.NODE_ENV === 'development') {
        console.log('ZIP code lookup failed:', error);
      }
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
        // Set search input to the selected label
        setOriginAddressSearch(address.label);
      }
    } else {
      // Clear search when clearing selection
      setOriginAddressSearch('');
    }
    setShowOriginAddressDropdown(false);
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
        // Set search input to the selected label
        setDestinationAddressSearch(address.label);
      }
    } else {
      // Clear search when clearing selection
      setDestinationAddressSearch('');
    }
    setShowDestinationAddressDropdown(false);
  };

  // Filter addresses based on search for Destination
  const filteredDestinationAddresses = addressBookOptions.filter((address) =>
    address.label.toLowerCase().includes(destinationAddressSearch.toLowerCase()) ||
    address.city.toLowerCase().includes(destinationAddressSearch.toLowerCase()) ||
    address.state.toLowerCase().includes(destinationAddressSearch.toLowerCase()) ||
    address.zip.includes(destinationAddressSearch)
  );

  // Handle click outside to close dropdown for Destination
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-destination-address-book-dropdown]')) {
        setShowDestinationAddressDropdown(false);
      }
    };

    if (showDestinationAddressDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDestinationAddressDropdown]);

  // Initialize search input with selected address label if address is already selected for Destination
  useEffect(() => {
    if (destinationAddressBook && !destinationAddressSearch) {
      const address = addressBookOptions.find(opt => opt.value === destinationAddressBook);
      if (address) {
        setDestinationAddressSearch(address.label);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationAddressBook]);

  // Handle ZIP code change with auto-lookup - using useEffect for debouncing
  useEffect(() => {
    if (originZipCode && originZipCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(originZipCode, 'origin');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originZipCode]);

  useEffect(() => {
    if (destinationZipCode && destinationZipCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(destinationZipCode, 'destination');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationZipCode]);

  // Freight Accessorials (with defaults)
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

  // Commodities (with default handling unit)
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
  const [linearFeet, setLinearFeet] = useState('');

  // Freight Information
  const [fullValueCoverage, setFullValueCoverage] = useState(false);
  const [fullValueCoverageAmount, setFullValueCoverageAmount] = useState('');
  const [warehouseDistributionCenter, setWarehouseDistributionCenter] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [response, setResponse] = useState<any>(null);
  const [rateQuoteRequestPayload, setRateQuoteRequestPayload] = useState<any>(null);
  const [showAccountInfo, setShowAccountInfo] = useState(true);
  const [showResponseDropdown, setShowResponseDropdown] = useState(false);

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  
  // Store BOL form data and response to persist across step navigation
  const [bolFormData, setBolFormData] = useState<any>(null);
  const [bolResponseData, setBolResponseData] = useState<any>(null);
  
  // Store pickup response data
  const [pickupResponseData, setPickupResponseData] = useState<any>(null);
  
  // Store order data (will be passed as prop or fetched)
  const [orderData, setOrderData] = useState<{
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  } | null>(initialOrderData || null);
  
  // Flag to track if form has been auto-populated from order data
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  
  // Helper function to extract value from JSONB with flexible key matching
  const getJsonbValue = (jsonb: Record<string, unknown> | null | undefined, key: string): string => {
    if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '';
    const obj = jsonb as Record<string, unknown>;
    
    // Normalize the key for matching
    const normalizedKey = key.trim();
    const keyWithoutHash = normalizedKey.replace(/#/g, '');
    const keyLower = normalizedKey.toLowerCase();
    const keyWithoutHashLower = keyWithoutHash.toLowerCase();
    
    // Generate all possible key variations
    const keysToTry = [
      normalizedKey,                    // Exact match: "Customer Name"
      keyWithoutHash,                   // Without #: "Customer Name"
      `#${keyWithoutHash}`,             // With # prefix: "#Customer Name"
      keyLower,                         // Lowercase: "customer name"
      keyWithoutHashLower,              // Lowercase without #: "customer name"
      `#${keyWithoutHashLower}`,        // Lowercase with #: "#customer name"
      normalizedKey.replace(/#/g, '').trim(), // Remove all #
    ];
    
    // Try exact matches first
    for (const k of keysToTry) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
        return String(obj[k]);
      }
    }
    
    // Try case-insensitive partial matching
    const allKeys = Object.keys(obj);
    for (const objKey of allKeys) {
      const objKeyLower = objKey.toLowerCase();
      if (
        objKeyLower === keyLower ||
        objKeyLower === keyWithoutHashLower ||
        objKeyLower.includes(keyWithoutHashLower) ||
        keyWithoutHashLower.includes(objKeyLower)
      ) {
        const value = obj[objKey];
        if (value !== undefined && value !== null && value !== '') {
          return String(value);
        }
      }
    }
    
    return '';
  };

  // Function to extract and parse address components
  const parseAddress = (address: string): { address1: string; address2: string; city: string; zipCode: string; country: string } => {
    if (!address) return { address1: '', address2: '', city: '', zipCode: '', country: '' };
    
    // Try to parse address - common formats:
    // "123 Main St, City, ST 12345"
    // "123 Main St\nCity, ST 12345"
    const parts = address.split(/[,\n]/).map(p => p.trim()).filter(p => p);
    
    let address1 = parts[0] || '';
    let address2 = '';
    let city = '';
    let zipCode = '';
    let country = 'USA'; // Default
    
    if (parts.length > 1) {
      city = parts[1] || '';
    }
    
    // Try to extract zip code from last part
    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      const zipMatch = lastPart.match(/\b\d{5}(-\d{4})?\b/);
      if (zipMatch) {
        zipCode = zipMatch[0];
      }
    }
    
    // Check if there's a second address line
    if (parts.length > 2 && !zipCode) {
      address2 = parts[1] || '';
      city = parts[2] || '';
    }
    
    return { address1, address2, city, zipCode, country };
  };

  // Function to auto-populate form from order data
  const populateFormFromOrder = (orderJsonb: Record<string, unknown> | null | undefined) => {
    if (!orderJsonb || typeof orderJsonb !== 'object' || Array.isArray(orderJsonb)) return;
    
    // Mark as auto-populated to prevent overwriting user input
    setHasAutoPopulated(true);
    
    // Requestor Information
    const customerName = getJsonbValue(orderJsonb, 'Customer Name');
    if (customerName && !requestorName) {
      setRequestorName(customerName);
    }
    
    const customerPhone = getJsonbValue(orderJsonb, 'Customer Phone Number') || 
                         getJsonbValue(orderJsonb, 'Phone') ||
                         getJsonbValue(orderJsonb, 'Phone Number');
    if (customerPhone && !requestorPhone) {
      setRequestorPhone(customerPhone);
    }
    
    const customerEmail = getJsonbValue(orderJsonb, 'Customer Email') || 
                          getJsonbValue(orderJsonb, 'Email') ||
                          getJsonbValue(orderJsonb, 'Customer Email Address');
    if (customerEmail && !requestorEmail) {
      setRequestorEmail(customerEmail);
    }
    
    // Destination Information (Ship To)
    const shipToAddress = getJsonbValue(orderJsonb, 'Ship to Address 1') ||
                         getJsonbValue(orderJsonb, 'Shipping Address') ||
                         getJsonbValue(orderJsonb, 'Customer Shipping Address') ||
                         getJsonbValue(orderJsonb, 'Ship To Address');
    
    if (shipToAddress) {
      const parsed = parseAddress(shipToAddress);
      if (parsed.address1 && !destinationAddress1) {
        setDestinationAddress1(parsed.address1);
      }
      if (parsed.address2 && !destinationAddress2) {
        setDestinationAddress2(parsed.address2);
      }
    }
    
    const shipToAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
    if (shipToAddress2 && !destinationAddress2) {
      setDestinationAddress2(shipToAddress2);
    }
    
    const shipToCity = getJsonbValue(orderJsonb, 'Ship to City') ||
                      getJsonbValue(orderJsonb, 'Shipping City');
    if (shipToCity && !destinationCity) {
      setDestinationCity(shipToCity);
    }
    
    const shipToState = getJsonbValue(orderJsonb, 'Ship to State') ||
                       getJsonbValue(orderJsonb, 'Ship to State/Province') ||
                       getJsonbValue(orderJsonb, 'Shipping State') ||
                       getJsonbValue(orderJsonb, 'Shipping State/Province');
    if (shipToState && !destinationState) {
      setDestinationState(shipToState);
    }
    
    const shipToZip = getJsonbValue(orderJsonb, 'Ship to Zip Code') ||
                     getJsonbValue(orderJsonb, 'Ship to Postal Code') ||
                     getJsonbValue(orderJsonb, 'Shipping Zip Code') ||
                     getJsonbValue(orderJsonb, 'Shipping Postal Code');
    if (shipToZip && !destinationZipCode) {
      setDestinationZipCode(shipToZip);
    }
    
    const shipToCountry = getJsonbValue(orderJsonb, 'Ship to Country') ||
                         getJsonbValue(orderJsonb, 'Shipping Country');
    if (shipToCountry && !destinationCountry) {
      // Map common country codes/names to standard format
      const country = shipToCountry.toUpperCase();
      let mappedCountry = shipToCountry; // Default to original value
      
      if (country === 'US' || country === 'USA' || country === 'UNITED STATES') {
        mappedCountry = 'USA';
      } else if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        mappedCountry = 'Canada';
      } else if (country === 'MX' || country === 'MEX' || country === 'MEXICO') {
        mappedCountry = 'Mexico';
      } else {
        // For other countries, use the original value and add to custom countries list
        mappedCountry = shipToCountry;
        setCustomDestinationCountries(prev => {
          if (!prev.includes(mappedCountry)) {
            return [...prev, mappedCountry];
          }
          return prev;
        });
      }
      setDestinationCountry(mappedCountry);
    } else if (!destinationCountry) {
      setDestinationCountry('USA'); // Default
    }
    
    // Note: Origin Information is NOT auto-populated from customer data
    // Origin should be entered manually or come from warehouse/shipper data
    
    // Ship Date - if available in order
    const orderDate = getJsonbValue(orderJsonb, 'Order Date') ||
                     getJsonbValue(orderJsonb, 'Date') ||
                     getJsonbValue(orderJsonb, 'Ship Date');
    if (orderDate && !shipDate) {
      // Try to parse date and format as YYYY-MM-DD
      try {
        const date = new Date(orderDate);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toISOString().split('T')[0];
          setShipDate(formattedDate);
        }
      } catch (e) {
        // If parsing fails, leave date empty
        // Date will remain empty if not found or cannot be parsed
      }
    }
    // If no order date found, leave shipDate empty (no default)
  };

  // Update order data when prop changes and auto-populate form
  useEffect(() => {
    if (initialOrderData && !hasAutoPopulated) {
      setOrderData(initialOrderData);
      // Auto-populate form when order data is available
      if (initialOrderData.ordersJsonb) {
        populateFormFromOrder(initialOrderData.ordersJsonb);
      }
    }
  }, [initialOrderData, hasAutoPopulated]);

  // Get orderId from URL params or sessionStorage and auto-populate form
  useEffect(() => {
    const orderIdParam = searchParams?.get('orderId');
    if (orderIdParam) {
      const orderId = parseInt(orderIdParam, 10);
      if (!isNaN(orderId)) {
        setCurrentOrderId(orderId);
      }
    } else {
      // Try to get from sessionStorage
      const storedOrder = sessionStorage.getItem('selectedOrderForLogistics');
      if (storedOrder) {
        try {
          const parsed = JSON.parse(storedOrder);
          if (parsed.id) {
            setCurrentOrderId(parsed.id);
          }
          // Auto-populate form from stored order data (only if not already populated)
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

  // Fetch order data from database when Response Summary step is reached
  useEffect(() => {
    const fetchOrderData = async () => {
      // Only fetch if we're on step 4 (Response Summary) and don't already have order data
      if (currentStep === 4 && !orderData) {
        setLoadingOrderData(true);
        try {
          // Check if orderId is in URL params
          const orderIdParam = searchParams?.get('orderId');
          
          let orderFound = false;
          
          if (orderIdParam) {
            // Fetch specific order by ID
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
                  // Auto-populate form from order data (only if not already populated)
                  if (response.data.ordersJsonb && typeof response.data.ordersJsonb === 'object' && !Array.isArray(response.data.ordersJsonb) && !hasAutoPopulated) {
                    populateFormFromOrder(response.data.ordersJsonb as Record<string, unknown>);
                  }
                  orderFound = true;
                } else {
                  // Order not found - fall back to sessionStorage or most recent order
                  if (process.env.NODE_ENV === 'development') {
                    console.warn(`Order with ID ${orderId} not found, falling back to sessionStorage or most recent order`);
                  }
                }
              } catch (error) {
                // Handle any other errors gracefully
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`Error fetching order ${orderId}:`, error);
                }
              }
            }
          }
          
          // If orderIdParam was not provided, or order was not found, try other sources
          if (!orderFound) {
            // Try sessionStorage first
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
                  // Auto-populate form from order data (only if not already populated)
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
            
            // Fallback: Fetch the most recent order
            if (!orderFound) {
              try {
                const response = await getAllLogisticsShippedOrders();
                if (response.data && response.data.length > 0) {
                  const mostRecentOrder = response.data[0]; // Orders are sorted by createdAt desc
                  setOrderData({
                    sku: mostRecentOrder.sku,
                    orderOnMarketPlace: mostRecentOrder.orderOnMarketPlace,
                    ordersJsonb: mostRecentOrder.ordersJsonb as Record<string, unknown>,
                  });
                  // Auto-populate form from order data (only if not already populated)
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
          // Don't set error state here, just log it - order data is optional
        } finally {
          setLoadingOrderData(false);
        }
      }
    };

    fetchOrderData();
  }, [currentStep, orderData, searchParams]);

  // Handle submission success - Delete order AFTER database save is confirmed
  const handleSubmitSuccess = async (orderId: number, sku: string) => {
    try {
      // Step 1: Database save is already complete at this point
      if (process.env.NODE_ENV === 'development') {
        console.log(`Database save confirmed for Order ID: ${orderId}, SKU: ${sku}`);
      }
      
      // Step 2: Now delete the order (after DB save is confirmed)
      if (orderId) {
        try {
          await deleteOrder(orderId);
          if (process.env.NODE_ENV === 'development') {
            console.log(`Order (ID: ${orderId}) deleted successfully after database save`);
          }
        } catch (deleteError) {
          // Order might not exist or already deleted - that's okay
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Order (ID: ${orderId}) could not be deleted:`, deleteError);
          }
          // Continue with cache clearing even if order deletion fails
        }
      }

      // Step 3: Clear all cache after deletion
      sessionStorage.removeItem('selectedOrderForLogistics');
      localStorage.clear();
      
      // Clear any other relevant caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Show info message
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
    let totalHandlingUnits = handlingUnits.length;
    let totalPieces = 0;

    handlingUnits.forEach((unit) => {
      const cube = (unit.length * unit.width * unit.height) / 1728; // Convert to cubic feet
      totalCube += cube * unit.quantity;
      totalWeight += unit.weight * unit.quantity;
      totalPieces += unit.quantity;
    });

    const totalDensity = totalCube > 0 ? totalWeight / totalCube : 0;

    return {
      totalCube: totalCube.toFixed(3),
      totalDensity: totalDensity.toFixed(3),
      totalHandlingUnits,
      totalPieces,
      totalWeight,
    };
  };

  const totals = calculateTotals();
  
  // Validate Total Density: must be between 2 and 4 (greater than 2 and less than 4)
  const totalDensityValue = parseFloat(totals.totalDensity);
  const isDensityValid = totalDensityValue > 2 && totalDensityValue < 4;
  const densityError = !isNaN(totalDensityValue) && totalDensityValue > 0 && !isDensityValid;

  // Build request body using Estes-specific logic
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

  const removeAccessorial = (accessorial: string) => {
    setSelectedAccessorials(selectedAccessorials.filter((a) => a !== accessorial));
    if (accessorial === 'Lift-Gate Service (Delivery)') setLiftGateService(false);
    if (accessorial === 'Residential Delivery') setResidentialDelivery(false);
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

  const handleAutofill = () => {
    const data = ESTES_AUTOFILL_DATA;

    // Account Information
    if (data.payment?.account) {
      setMyAccount(data.payment.account);
    }
    if (data.payment?.payor) {
      // Map "Third Party" to "Third-Party"
      const payorMap: Record<string, string> = {
        'Shipper': 'Shipper',
        'Consignee': 'Consignee',
        'Third Party': 'Third-Party',
      };
      setRole(payorMap[data.payment.payor] || data.payment.payor);
    }
    if (data.payment?.terms) {
      setTerm(data.payment.terms);
    }
    if (data.quoteRequest?.shipDate) {
      setShipDate(data.quoteRequest.shipDate);
    }
    if (data.quoteRequest?.shipTime) {
      setShipTime(data.quoteRequest.shipTime);
    }

    // Requestor Information
    if (data.requestor?.name) {
      setRequestorName(data.requestor.name);
    }
    if (data.requestor?.phone) {
      setRequestorPhone(data.requestor.phone);
    }
    if (data.requestor?.email) {
      setRequestorEmail(data.requestor.email);
    }

    // Origin Information
    if (data.origin?.address?.city) {
      setOriginCity(data.origin.address.city);
    }
    if (data.origin?.address?.stateProvince) {
      setOriginState(data.origin.address.stateProvince);
    }
    if (data.origin?.address?.postalCode) {
      setOriginZipCode(data.origin.address.postalCode);
    }
    if (data.origin?.address?.country) {
      // Map "US" to "USA"
      setOriginCountry(data.origin.address.country === 'US' ? 'USA' : data.origin.address.country);
    }

    // Destination Information
    if (data.destination?.address?.city) {
      setDestinationCity(data.destination.address.city);
    }
    if (data.destination?.address?.stateProvince) {
      setDestinationState(data.destination.address.stateProvince);
    }
    if (data.destination?.address?.postalCode) {
      setDestinationZipCode(data.destination.address.postalCode);
    }
    if (data.destination?.address?.country) {
      // Map "US" to "USA"
      setDestinationCountry(data.destination.address.country === 'US' ? 'USA' : data.destination.address.country);
    }

    // Accessorials
    const accessorialCodes = data.accessorials?.codes || [];
    const hasLiftGate = accessorialCodes.includes('LGATE');
    const hasResidential = accessorialCodes.includes('HD');
    
    setLiftGateService(hasLiftGate);
    setResidentialDelivery(hasResidential);
    
    const selected: string[] = [];
    if (hasLiftGate) selected.push('Lift-Gate Service (Delivery)');
    if (hasResidential) selected.push('Residential Delivery');
    setSelectedAccessorials(selected);

    // Handling Units
    if (data.commodity?.handlingUnits && data.commodity.handlingUnits.length > 0) {
      const mappedUnits: HandlingUnit[] = data.commodity.handlingUnits.map((unit, index) => {
        // Map type from API format to component format
        const typeMap: Record<string, string> = {
          'BX': 'BOX',
          'PL': 'PALLET',
          'PLT': 'PALLET',
          'SK': 'SKID',
          'CR': 'CRATE',
        };
        const handlingUnitType = typeMap[unit.type] || unit.type || 'BOX';

        // Map lineItems to items
        const items: CommodityItem[] = (unit.lineItems || []).map((item, itemIndex) => ({
          id: `${Date.now()}-${index}-${itemIndex}`,
          description: item.description,
        }));

        return {
          id: `${Date.now()}-${index}`,
          doNotStack: !unit.isStackable,
          handlingUnitType,
          quantity: unit.count || 1,
          length: unit.length || 0,
          width: unit.width || 0,
          height: unit.height || 0,
          weight: unit.weight || 0,
          class: unit.lineItems?.[0]?.classification || '',
          nmfc: unit.lineItems?.[0]?.nmfc || '',
          sub: unit.lineItems?.[0]?.nmfcSub || '',
          hazardous: unit.lineItems?.[0]?.isHazardous || false,
          description: unit.lineItems?.[0]?.description || '', // Set description from first lineItem
          items,
        };
      });
      setHandlingUnits(mappedUnits);
    }

    // Show the main accordion after autofill
    setShowAccountInfo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if token exists
    // Normalize carrier name to match how it's stored in Zustand (lowercase)
    const normalizedCarrier = carrier.toLowerCase();
    let currentToken = getToken(normalizedCarrier) || storedToken;
    
    // If no token or token expired, try to refresh if session is active
    if (!currentToken || isTokenExpired(normalizedCarrier, 10)) {
      if (isSessionActive()) {
        // Session is active, try to refresh token automatically
        const refreshed = await refreshToken(normalizedCarrier);
        if (refreshed) {
          const refreshedToken = getToken(normalizedCarrier);
          if (refreshedToken) {
            currentToken = refreshedToken;
            setStoredToken(refreshedToken);
          }
        } else {
          // Refresh failed, save form data and show login modal
          saveFormDataToStorage();
          setIsAuthModalOpen(true);
          return;
        }
      } else {
        // No token and session not active (browser was closed), save form data and show login modal
        saveFormDataToStorage();
        setIsAuthModalOpen(true);
        return;
      }
    }
    
    if (!currentToken) {
      // Still no token after refresh attempt, save form data and show login modal
      saveFormDataToStorage();
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setRateQuoteRequestPayload(null);

    try {
      const requestBody = buildRequestBody();
      
      // Validate required fields before sending
      if (!requestBody.payment?.account) {
        throw new Error('Account number is required');
      }
      if (!requestBody.origin?.address?.city) {
        throw new Error('Origin city is required');
      }
      if (!requestBody.origin?.address?.postalCode) {
        throw new Error('Origin ZIP/postal code is required');
      }
      if (!requestBody.origin?.address?.stateProvince) {
        throw new Error('Origin state/province is required for accurate rate quotes');
      }
      if (!requestBody.origin?.address?.country) {
        throw new Error('Origin country is required');
      }
      if (!requestBody.destination?.address?.city) {
        throw new Error('Destination city is required');
      }
      if (!requestBody.destination?.address?.postalCode) {
        throw new Error('Destination ZIP/postal code is required');
      }
      if (!requestBody.destination?.address?.stateProvince) {
        throw new Error('Destination state/province is required for accurate rate quotes');
      }
      if (!requestBody.destination?.address?.country) {
        throw new Error('Destination country is required');
      }
      if (!requestBody.commodity?.handlingUnits || requestBody.commodity.handlingUnits.length === 0) {
        throw new Error('At least one handling unit is required');
      }
      
      // Get shippingCompany from carrier prop (normalize to lowercase)
      const shippingCompany = normalizedCarrier === 'estes' ? 'estes' : normalizedCarrier;
      
      // Ensure shippingCompany is at the top level - this is critical!
      const payload = {
        shippingCompany: shippingCompany,
        ...requestBody,
      };
      
      // Log request only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Rate Quote Request:', JSON.stringify(payload, null, 2));
      }

      // Store request payload for later submission
      setRateQuoteRequestPayload(payload);

      const res = await fetch(buildApiUrl('/Logistics/create-rate-quote'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Check if token is expired (401 Unauthorized)
        if (res.status === 401) {
          // Token expired, save form data and show login modal
          saveFormDataToStorage();
          setIsAuthModalOpen(true);
          setError(new Error('Your session has expired. Please login again.'));
          setLoading(false); // Reset loading state since we're not proceeding
          return;
        }
        
        // Try to get detailed error message
        let errorMessage = `Rate quote creation failed: ${res.statusText}`;
        try {
          const errorData = await res.json();
          // Handle different error response formats
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : errorData.error.message || errorMessage;
          } else if (errorData.data?.message) {
            errorMessage = errorData.data.message;
          }
          
          // Include validation errors if present
          if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage += `\nValidation errors: ${errorData.errors.join(', ')}`;
          } else if (errorData.errors && typeof errorData.errors === 'object') {
            const validationErrors = Object.entries(errorData.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            if (validationErrors) {
              errorMessage += `\nValidation errors: ${validationErrors}`;
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, use status text
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to parse error response:', parseError);
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResponse(data);
      
      // Mark step 1 as completed
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      
      // Collapse the main accordion only after successful response
      setShowAccountInfo(false);
      // Open the response dropdown when response is received
      setShowResponseDropdown(true);
    } catch (err) {
      // Check if error is related to authentication
      if (err instanceof Error && (
        err.message.includes('401') ||
        err.message.includes('Unauthorized') ||
        err.message.includes('expired') ||
        err.message.includes('invalid token')
      )) {
        // Token error, save form data and show login modal
        saveFormDataToStorage();
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
      // Scroll to top when navigating to next step
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Scroll to top when navigating to previous step
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleBookShipment = () => {
    // Check if a quote is selected
    if (response && response.data?.data && response.data.data.length > 0) {
      // Get the first quote (or selected quote)
      const quote = response.data.data[0];
      setSelectedQuote({
        quote,
        formData: {
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
        },
      });
      handleStepComplete(1);
      setCurrentStep(2);
      // Scroll to top when navigating to next step
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleBillOfLandingNext = () => {
    handleStepComplete(2);
    
    // Scroll to top immediately
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Change step to Pickup Request
    setCurrentStep(3);
    
    // Enhanced scroll to top after step change - multiple attempts to ensure it works
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo(0, 0);
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
      // Also try scrolling to the pickup request section if it exists
      const pickupSection = document.querySelector('[data-pickup-request-section]');
      if (pickupSection) {
        pickupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Try scrolling to the pickup request top ID
      const pickupTop = document.getElementById('pickup-request-top');
      if (pickupTop) {
        pickupTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    
    // Use requestAnimationFrame and multiple timeouts to ensure scroll happens after render
    requestAnimationFrame(() => {
      scrollToTop();
      setTimeout(scrollToTop, 0);
      setTimeout(scrollToTop, 50);
      setTimeout(scrollToTop, 100);
      setTimeout(scrollToTop, 200);
      setTimeout(scrollToTop, 300);
      setTimeout(scrollToTop, 500);
      setTimeout(scrollToTop, 700);
    });
  };

  const handlePickupRequestComplete = (pickupResponse?: any) => {
    handleStepComplete(3);
    if (pickupResponse) {
      setPickupResponseData(pickupResponse);
    }
    // Move to step 4 (Response Summary)
    setCurrentStep(4);
    handleStepComplete(4);
    // Scroll to top when navigating to next step
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  
  // Scroll to top when step changes
  useEffect(() => {
    const scrollToTop = () => {
      // Try all possible scroll methods
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
    
    // Use requestAnimationFrame to ensure DOM is ready
    const timeoutIds: NodeJS.Timeout[] = [];
    const rafId = requestAnimationFrame(() => {
      scrollToTop();
      // Multiple attempts with delays to ensure it works, especially for step 3 (PickupRequest)
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
    
    // Cleanup function
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
        
        // Create File object from blob and add to bolFiles
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
      // Clear files if no BOL response
      setBolFiles([]);
      setBolPdfUrl(null);
    }
    
    // Cleanup: revoke URL when component unmounts or bolResponseData changes
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [bolResponseData]);

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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Estes Rate Quote Service</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAutofill}
                className="hidden px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-semibold w-full sm:w-auto"
              >
                <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Autofill</span>
                <span className="sm:hidden">Autofill</span>
              </button>
              <button
                type="button"
                className="px-3 sm:px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-semibold w-full sm:w-auto"
              >
                <HelpCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Walk Me Through</span>
                <span className="sm:hidden">Help</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Account Information - Main Accordion */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAccountInfo(!showAccountInfo)}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Account Information</h2>
            {showAccountInfo ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showAccountInfo && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Account Information Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="[&_input]:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Role</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Shipper"
                    checked={role === 'Shipper'}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Shipper</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Consignee"
                    checked={role === 'Consignee'}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Consignee</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="Third-Party"
                    checked={role === 'Third-Party'}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Third-Party</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Prepaid">Prepaid</option>
                <option value="Collect">Collect</option>
                <option value="Third-Party">Third-Party</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Ship Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={shipDate}
                  onChange={(e) => setShipDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Ship Time</label>
              <input
                type="time"
                value={shipTime}
                onChange={(e) => setShipTime(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
              </div>
            </section>

            {/* Requestor Information */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Requestor Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Name</label>
              <input
                type="text"
                value={requestorName}
                onChange={(e) => setRequestorName(e.target.value)}
                placeholder="Enter name"
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Phone</label>
              <input
                type="tel"
                value={requestorPhone}
                onChange={(e) => setRequestorPhone(e.target.value)}
                placeholder="Enter phone"
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Email</label>
              <input
                type="email"
                value={requestorEmail}
                onChange={(e) => setRequestorEmail(e.target.value)}
                placeholder="Enter email"
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
              </div>
            </section>

            {/* Routing Information */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Routing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Origin */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Origin</h3>
              <div className="space-y-3">
                {/* Address Book Dropdown - Searchable */}
                <SearchableDropdown
                  options={addressBookOptions as SearchableDropdownOption[]}
                  value={originAddressBook}
                  onChange={handleOriginAddressBookChange}
                  label="Address Book (Optional)"
                  placeholder="Search or select address..."
                  filterKeys={['label', 'city', 'state', 'zip']}
                  onSelect={(option) => {
                    const address = addressBookOptions.find(opt => opt.value === option.value);
                    if (address) {
                      setOriginCity(address.city);
                      setOriginState(address.state);
                      setOriginZipCode(address.zip);
                      setOriginCountry(address.country);
                    }
                  }}
                />

                {/* Separator with "or" */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-slate-500">or</span>
                  </div>
                </div>

                {/* Manual Entry Fields */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-900">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={originZipCode}
                        onChange={(e) => setOriginZipCode(e.target.value)}
                        placeholder="Enter ZIP code"
                        maxLength={10}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {originLoadingZip && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* City/State Display - shows auto-filled values, editable below */}
                  <div className="space-y-1">
                    {(originCity || originState) ? (
                      <div className="px-2 py-1 text-sm text-slate-700">
                        {originCity && originState ? `${originCity}, ${originState}` : originCity || originState}
                      </div>
                    ) : null}
                    {/* Editable inputs for city and state */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={originCity}
                        onChange={(e) => setOriginCity(e.target.value)}
                        placeholder="City"
                        className="px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={originState}
                        onChange={(e) => setOriginState(e.target.value.toUpperCase())}
                        placeholder="State"
                        maxLength={2}
                        className="px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-900">
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
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      {originCountry && 
                       originCountry !== 'USA' && 
                       originCountry !== 'Canada' && 
                       originCountry !== 'Mexico' &&
                       !customOriginCountries.includes(originCountry) && (
                        <option value={originCountry}>{originCountry}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Destination</h3>
              <div className="space-y-3">
                {/* Address Book Dropdown - Searchable */}
                <SearchableDropdown
                  options={addressBookOptions as SearchableDropdownOption[]}
                  value={destinationAddressBook}
                  onChange={handleDestinationAddressBookChange}
                  label="Address Book (Optional)"
                  placeholder="Search or select address..."
                  filterKeys={['label', 'city', 'state', 'zip']}
                  onSelect={(option) => {
                    const address = addressBookOptions.find(opt => opt.value === option.value);
                    if (address) {
                      setDestinationCity(address.city);
                      setDestinationState(address.state);
                      setDestinationZipCode(address.zip);
                      setDestinationCountry(address.country);
                    }
                  }}
                />

                {/* Separator with "or" */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-slate-500">or</span>
                  </div>
                </div>

                {/* Manual Entry Fields */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-900">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={destinationZipCode}
                        onChange={(e) => setDestinationZipCode(e.target.value)}
                        placeholder="Enter ZIP code"
                        maxLength={10}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {destinationLoadingZip && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* City/State Display - shows auto-filled values, editable below */}
                  <div className="space-y-1">
                    {(destinationCity || destinationState) ? (
                      <div className="px-2 py-1 text-sm text-slate-700">
                        {destinationCity && destinationState ? `${destinationCity}, ${destinationState}` : destinationCity || destinationState}
                      </div>
                    ) : null}
                    {/* Editable inputs for city and state */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={destinationCity}
                        onChange={(e) => setDestinationCity(e.target.value)}
                        placeholder="City"
                        className="px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={destinationState}
                        onChange={(e) => setDestinationState(e.target.value.toUpperCase())}
                        placeholder="State"
                        maxLength={2}
                        className="px-3 py-2 text-sm border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-900">
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
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      {destinationCountry && 
                       destinationCountry !== 'USA' && 
                       destinationCountry !== 'Canada' && 
                       destinationCountry !== 'Mexico' &&
                       !customDestinationCountries.includes(destinationCountry) && (
                        <option value={destinationCountry}>{destinationCountry}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </section>

            {/* Freight Accessorials */}
            <section>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Freight Accessorials</h3>
                <Info className="text-blue-500" size={20} />
              </div>
              <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">Service Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appointmentRequest}
                    onChange={(e) => setAppointmentRequest(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Appointment Request</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={liftGateService}
                    onChange={(e) => {
                      setLiftGateService(e.target.checked);
                      handleAccessorialChange('Lift-Gate Service (Delivery)', e.target.checked);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Lift-Gate Service (Delivery)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={residentialDelivery}
                    onChange={(e) => {
                      setResidentialDelivery(e.target.checked);
                      handleAccessorialChange('Residential Delivery', e.target.checked);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Residential Delivery</span>
                </label>
              </div>
            </div>
              </div>
            </section>

            {/* Commodities */}
            <section>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Commodities</h3>
                <Info className="text-blue-500" size={20} />
              </div>
          {handlingUnits.map((unit, index) => (
            <div key={unit.id} className="mb-6 p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Handling Unit {index + 1}
                </h3>
                {handlingUnits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHandlingUnit(unit.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={unit.doNotStack}
                    onChange={(e) => updateHandlingUnit(unit.id, 'doNotStack', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Do Not Stack</span>
                </label>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Handling Unit Type
                  </label>
                  <select
                    value={unit.handlingUnitType}
                    onChange={(e) => updateHandlingUnit(unit.id, 'handlingUnitType', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PALLET">PALLET</option>
                    <option value="SKID">SKID</option>
                    <option value="CRATE">CRATE</option>
                    <option value="BOX">BOX</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Quantity</label>
                  <input
                    type="number"
                    value={unit.quantity}
                    onChange={(e) => updateHandlingUnit(unit.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">L (Length)</label>
                  <input
                    type="number"
                    value={unit.length}
                    onChange={(e) => updateHandlingUnit(unit.id, 'length', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">W (Width)</label>
                  <input
                    type="number"
                    value={unit.width}
                    onChange={(e) => updateHandlingUnit(unit.id, 'width', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">H (Height)</label>
                  <input
                    type="number"
                    value={unit.height}
                    onChange={(e) => updateHandlingUnit(unit.id, 'height', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Weight (lbs)</label>
                  <input
                    type="number"
                    value={unit.weight}
                    onChange={(e) => updateHandlingUnit(unit.id, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Class</label>
                  <select
                    value={unit.class}
                    onChange={(e) => updateHandlingUnit(unit.id, 'class', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Class</option>
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

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">NMFC</label>
                  <input
                    type="text"
                    value={unit.nmfc}
                    onChange={(e) => updateHandlingUnit(unit.id, 'nmfc', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Sub</label>
                  <input
                    type="text"
                    value={unit.sub}
                    onChange={(e) => updateHandlingUnit(unit.id, 'sub', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={unit.hazardous}
                    onChange={(e) => updateHandlingUnit(unit.id, 'hazardous', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Hazardous</span>
                </label>
              </div>

              {/* Description Field */}
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Description</label>
                <input
                  type="text"
                  value={unit.description || ''}
                  onChange={(e) => updateHandlingUnit(unit.id, 'description', e.target.value)}
                  placeholder="Enter description for this handling unit"
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => addItemToUnit(unit.id)}
                  className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  <Plus size={16} />
                  ADD ITEM
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addHandlingUnit}
            className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2 mb-4"
          >
            <Plus size={16} />
            ADD HANDLING UNIT
          </button>

          {/* Summary */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Total Cube:</p>
                <p className="font-semibold text-slate-900">{totals.totalCube} ft³</p>
              </div>
              <div>
                <p className="text-slate-600">Total Density:</p>
                <p className={`font-semibold ${densityError ? 'text-red-600' : 'text-blue-600'}`}>
                  {totals.totalDensity} lb/ft³
                </p>
              </div>
              <div>
                <p className="text-slate-600">Total Handling Units:</p>
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
              <div className="mt-4">
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                  <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                    <span className="text-red-600 text-lg">⚠️</span>
                    Total Density must be greater than 2 and less than 4 (Current: {totals.totalDensity} lb/ft³)
                  </p>
                </div>
              </div>
            )}
              </div>
            </section>

            {/* JSON Preview */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Request Body Preview</h3>
              <div className="bg-slate-50 rounded-lg border border-slate-300 p-4 overflow-auto max-h-96">
                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
                  {JSON.stringify(buildRequestBody(), null, 2)}
                </pre>
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
            className="px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold text-sm sm:text-base lg:text-lg disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Getting Quote...
              </>
            ) : (
              'GET QUOTE'
            )}
          </button>
        </div>
      </form>

      {/* Response JSON Dropdown */}
      {response && (
        <div className="mt-6 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowResponseDropdown(!showResponseDropdown)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h3 className="text-lg font-semibold text-slate-900">Response JSON</h3>
            {showResponseDropdown ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showResponseDropdown && (
            <div className="p-6 border-t border-slate-200">
              <div className="bg-slate-50 rounded-lg border border-slate-300 p-4 overflow-auto max-h-96">
                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

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
          // Refresh token from store after modal closes (in case user logged in)
          // Normalize carrier name to match how it's stored in Zustand (lowercase)
          const normalizedCarrier = carrier.toLowerCase();
          const updatedToken = getToken(normalizedCarrier);
          if (updatedToken) {
            setStoredToken(updatedToken);
            setError(null);
            // Restore form data after login
            restoreFormDataFromStorage();
          }
        }}
        carrier={carrier}
      />

          {response && response.data?.data && (
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
                    <EstesQuoteCard key={quote.quoteId || index} quote={quote} index={index} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 2: Bill of Lading */}
      {currentStep === 2 && (
        <BillOfLanding
          onNext={handleBillOfLandingNext}
          onPrevious={handlePreviousStep}
          quoteData={selectedQuote}
          orderData={orderData}
          initialFormData={bolFormData}
          initialResponseData={bolResponseData}
          onFormDataChange={setBolFormData}
          onResponseDataChange={setBolResponseData}
        />
      )}

      {/* Step 3: Pickup Request */}
      {currentStep === 3 && (
        <div data-pickup-request-section>
          <PickupRequest
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
            rateQuotesRequestJsonb={rateQuoteRequestPayload || undefined}
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

