'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, FileText, Info, HelpCircle, Plus, X, ChevronDown, ChevronUp, Sparkles, Copy, Check, Download, Printer, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';
import { ESTES_BOL_AUTOFILL_DATA, ESTES_RATE_QUOTE_DEFAULTS, ESTES_BILL_TO_DEFAULTS, ESTES_RATE_QUOTE_FORM_DEFAULTS, ESTES_SHIPPER_ADDRESSES, ESTES_SHIPPER_DEFAULTS, ESTES_ADDRESS_BOOK, ESTES_ACCOUNTS, MARKETPLACE_ABBREVIATIONS } from '@/Shared/constant';
import { useSearchParams } from 'next/navigation';

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
  items: CommodityItem[];
};

type CommodityItem = {
  id: string;
  description: string;
  pieces: number;
  pieceType: string;
};

type ReferenceNumber = {
  id: string;
  type: string;
  value: string;
};

export const BillOfLanding = ({ 
  onNext, 
  onPrevious, 
  quoteData,
  orderData,
  initialFormData,
  initialResponseData,
  onFormDataChange,
  onResponseDataChange
}: BillOfLandingProps) => {
  const { getToken, isTokenExpired, refreshToken, isSessionActive } = useLogisticsStore();
  const carrier = 'estes';
  const searchParams = useSearchParams();

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
      normalizedKey,
      keyWithoutHash,
      `#${keyWithoutHash}`,
      keyLower,
      keyWithoutHashLower,
      `#${keyWithoutHashLower}`,
      normalizedKey.replace(/#/g, '').trim(),
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

  // Function to parse address from string
  const parseAddress = (address: string): { address1: string; address2: string; city: string; zipCode: string; state: string } => {
    if (!address) return { address1: '', address2: '', city: '', zipCode: '', state: '' };
    
    const parts = address.split(/[,\n]/).map(p => p.trim()).filter(p => p);
    
    let address1 = parts[0] || '';
    let address2 = '';
    let city = '';
    let zipCode = '';
    let state = '';
    
    if (parts.length > 1) {
      city = parts[1] || '';
    }
    
    // Try to extract zip code and state from last part
    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      const zipMatch = lastPart.match(/\b\d{5}(-\d{4})?\b/);
      if (zipMatch) {
        zipCode = zipMatch[0];
        // Extract state code (2 letters before zip)
        const stateMatch = lastPart.match(/\b([A-Z]{2})\s*\d{5}/);
        if (stateMatch) {
          state = stateMatch[1];
        }
      }
    }
    
    // Check if there's a second address line
    if (parts.length > 2 && !zipCode) {
      address2 = parts[1] || '';
      city = parts[2] || '';
    }
    
    return { address1, address2, city, zipCode, state };
  };

  // Account Information
  const [myAccount, setMyAccount] = useState('0216496');
  const [role, setRole] = useState('Third-Party');
  
  // Billing Information
  const [payer, setPayer] = useState('Third Party');
  const [terms, setTerms] = useState('Prepaid');
  
  // Shipment Information
  const [masterBol, setMasterBol] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [autoAssignPro, setAutoAssignPro] = useState(true);
  
  // Function to generate Master BOL Number
  const generateMasterBolNumber = () => {
    if (!orderData?.ordersJsonb || !orderData?.orderOnMarketPlace) {
      return '';
    }
    
    // Get current month first letter
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const currentMonth = new Date().getMonth(); // 0-11
    const monthLetter = months[currentMonth];
    
    // Get marketplace
    const marketplace = orderData.orderOnMarketPlace || '';
    const marketplaceFirstLetter = marketplace.charAt(0).toUpperCase();
    
    // Get marketplace abbreviation from mapping (2 letters)
    const marketplaceAbbrev = MARKETPLACE_ABBREVIATIONS[marketplace] || marketplace.substring(0, 2).toUpperCase();
    
    // Get customer name from ordersJsonb
    const customerName = getJsonbValue(orderData.ordersJsonb, 'Customer Name');
    
    if (!customerName) {
      return '';
    }
    
    // Format: {monthLetter}{marketplaceFirstLetter}-{Customer Name} {marketplaceAbbrev}
    return `${monthLetter}${marketplaceFirstLetter}-${customerName} ${marketplaceAbbrev}`;
  };
  
  // Auto-fill Master BOL Number when orderData is available
  useEffect(() => {
    if (orderData && !masterBol) {
      const generatedBol = generateMasterBolNumber();
      if (generatedBol) {
        setMasterBol(generatedBol);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderData]);
  
  // Routing Information - Origin (Shipper) - empty by default, user selects from dropdown or fills manually
  const [originAddressBook, setOriginAddressBook] = useState('');
  const [originAccount, setOriginAccount] = useState('');
  const [originName, setOriginName] = useState('');
  const [originAddress1, setOriginAddress1] = useState('');
  const [originAddress2, setOriginAddress2] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originZipCode, setOriginZipCode] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [originContactName, setOriginContactName] = useState('');
  const [originPhone, setOriginPhone] = useState('');
  const [originEmail, setOriginEmail] = useState('');
  const [originLoadingZip, setOriginLoadingZip] = useState(false);
  
  // Consignee (Destination) Address Book
  const [destinationAddressBook, setDestinationAddressBook] = useState('');
  
  // Bill To Address Book
  const [billToAddressBook, setBillToAddressBook] = useState('');

  // ZIP code lookup function for Shipper (Origin)
  const lookupOriginZipCode = async (zipCode: string) => {
    if (!zipCode || zipCode.length < 5) return;

    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    setOriginLoadingZip(true);

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

          // Always update city, state, and country when ZIP code changes
          setOriginCity(city);
          setOriginState(state);
          setOriginCountry(country);
        }
      }
    } catch (error) {
      // Silently fail - user can still enter manually
      if (process.env.NODE_ENV === 'development') {
        console.log('Origin ZIP code lookup failed:', error);
      }
    } finally {
      setOriginLoadingZip(false);
    }
  };

  // Handle ZIP code change with auto-lookup for Origin - using useEffect for debouncing
  useEffect(() => {
    if (originZipCode && originZipCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupOriginZipCode(originZipCode);
      }, 800);
      return () => clearTimeout(timeoutId);
    } else if (!originZipCode || originZipCode.length === 0) {
      // Clear city, state, and country when ZIP code is removed
      setOriginCity('');
      setOriginState('');
      setOriginCountry('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originZipCode]);

  // Handle shipper address book selection
  const handleOriginAddressBookChange = (value: string) => {
    setOriginAddressBook(value);
    if (!value) {
      // Clear fields when selection is cleared
      setOriginName('');
      setOriginAddress1('');
      setOriginAddress2('');
      setOriginCity('');
      setOriginState('');
      setOriginZipCode('');
      setOriginCountry('');
      setOriginContactName('');
      setOriginPhone('');
      setOriginEmail('');
      setOriginAccount('');
    }
  };
  
  // Routing Information - Destination
  const [destinationName, setDestinationName] = useState('');
  const [destinationAddress1, setDestinationAddress1] = useState('');
  const [destinationAddress2, setDestinationAddress2] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [destinationZipCode, setDestinationZipCode] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('USA');
  const [destinationContactName, setDestinationContactName] = useState('');
  const [destinationPhone, setDestinationPhone] = useState('');
  const [destinationEmail, setDestinationEmail] = useState('');
  const [destinationLoadingZip, setDestinationLoadingZip] = useState(false);

  // ZIP code lookup function for Consignee (Destination)
  const lookupDestinationZipCode = async (zipCode: string) => {
    if (!zipCode || zipCode.length < 5) return;

    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    setDestinationLoadingZip(true);

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

          // Only auto-fill if fields are empty - this allows users to freely edit all Consignee fields
          // Users can manually edit any field, and their edits will be preserved
          setDestinationCity((currentCity) => currentCity || city);
          setDestinationState((currentState) => currentState || state);
          setDestinationCountry((currentCountry) => currentCountry || country);
        }
      }
    } catch (error) {
      // Silently fail - user can still enter manually
      if (process.env.NODE_ENV === 'development') {
        console.log('Destination ZIP code lookup failed:', error);
      }
    } finally {
      setDestinationLoadingZip(false);
    }
  };

  // Handle ZIP code change with auto-lookup for Destination - using useEffect for debouncing
  useEffect(() => {
    if (destinationZipCode && destinationZipCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupDestinationZipCode(destinationZipCode);
      }, 800);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationZipCode]);
  
  // Bill To Information
  const [billToAccount, setBillToAccount] = useState('0216496');
  const [billToName, setBillToName] = useState(ESTES_BILL_TO_DEFAULTS.companyName);
  const [billToAddress1, setBillToAddress1] = useState(ESTES_BILL_TO_DEFAULTS.address1);
  const [billToAddress2, setBillToAddress2] = useState(ESTES_BILL_TO_DEFAULTS.address2);
  const [billToCity, setBillToCity] = useState(ESTES_BILL_TO_DEFAULTS.city);
  const [billToState, setBillToState] = useState(ESTES_BILL_TO_DEFAULTS.state);
  const [billToZipCode, setBillToZipCode] = useState(ESTES_BILL_TO_DEFAULTS.zipCode);
  const [billToCountry, setBillToCountry] = useState(ESTES_BILL_TO_DEFAULTS.country);
  const [billToContactName, setBillToContactName] = useState(ESTES_BILL_TO_DEFAULTS.contactName);
  const [billToPhone, setBillToPhone] = useState(ESTES_BILL_TO_DEFAULTS.phone);
  const [billToEmail, setBillToEmail] = useState(ESTES_BILL_TO_DEFAULTS.email);
  const [billToLoadingZip, setBillToLoadingZip] = useState(false);
  
  // ZIP code lookup function using a free API for Bill To
  const lookupBillToZipCode = async (zipCode: string) => {
    if (!zipCode || zipCode.length < 5) return;

    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    setBillToLoadingZip(true);

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

          // Always update city, state, and country when ZIP code changes
          setBillToCity(city);
          setBillToState(state);
          setBillToCountry(country);
        }
      }
    } catch (error) {
      // Silently fail - user can still enter manually
      if (process.env.NODE_ENV === 'development') {
        console.log('Bill To ZIP code lookup failed:', error);
      }
    } finally {
      setBillToLoadingZip(false);
    }
  };

  // Handle ZIP code change with auto-lookup - using useEffect for debouncing
  // Triggers whenever ZIP code changes and has 5+ characters
  useEffect(() => {
    if (billToZipCode && billToZipCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupBillToZipCode(billToZipCode);
      }, 800);
      return () => clearTimeout(timeoutId);
    } else if (!billToZipCode || billToZipCode.length === 0) {
      // Clear city, state, and country when ZIP code is removed
      setBillToCity('');
      setBillToState('');
      setBillToCountry('USA'); // Reset to default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billToZipCode]);
  
  // Freight Accessorials
  const [selectedAccessorials, setSelectedAccessorials] = useState<string[]>([]);
  const [appointmentRequest, setAppointmentRequest] = useState(false);
  const [liftGateService, setLiftGateService] = useState(false);
  const [residentialDelivery, setResidentialDelivery] = useState(false);
  
  // Special Handling Requests - Initialize with all 4 options selected
  const [specialHandlingRequests, setSpecialHandlingRequests] = useState<string[]>([
    'Added Accessorials Require Pre Approval',
    'Do Not Break Down the Pallet',
    'Do Not Remove Shrink Wrap from Skid',
    'Fragile-Handle with Care'
  ]);
  
  // Commodities
  const [handlingUnits, setHandlingUnits] = useState<HandlingUnit[]>([]);
  
  // Freight Information
  const [fullValueCoverage, setFullValueCoverage] = useState(false);
  const [fullValueCoverageAmount, setFullValueCoverageAmount] = useState('');
  
  // Service Options
  const [selectedService, setSelectedService] = useState('LTL Standard');
  
  // Reference Numbers
  const [referenceNumbers, setReferenceNumbers] = useState<ReferenceNumber[]>([]);
  
  // Notifications
  const [billOfLadingNotification, setBillOfLadingNotification] = useState(true);
  const [shippingLabelsNotification, setShippingLabelsNotification] = useState(true);
  const [trackingUpdatesNotification, setTrackingUpdatesNotification] = useState(true);
  const [shippingLabelFormat, setShippingLabelFormat] = useState('Zebra 4 X 6');
  const [shippingLabelQuantity, setShippingLabelQuantity] = useState(1);
  const [shippingLabelPosition, setShippingLabelPosition] = useState(1);
  const [billOfLadingEmails, setBillOfLadingEmails] = useState<string[]>([ESTES_RATE_QUOTE_DEFAULTS.requestorEmail]);
  const [trackingUpdatesEmails, setTrackingUpdatesEmails] = useState<string[]>([ESTES_RATE_QUOTE_DEFAULTS.requestorEmail]);
  const [notificationSendTo, setNotificationSendTo] = useState({
    billOfLading: { shipper: true, consignee: false, thirdParty: false },
    shippingLabels: { shipper: true, consignee: false, thirdParty: false },
    trackingUpdates: { shipper: true, consignee: false, thirdParty: false },
  });
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(initialResponseData || null);
  const [showResponsePreview, setShowResponsePreview] = useState(!!initialResponseData);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [requestPayload, setRequestPayload] = useState<any>(null);
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    accountInfo: true,
    billingInfo: true,
    shipmentInfo: true,
    routingInfo: true,
    accessorials: true,
    commodities: true,
    freightInfo: true,
    serviceOptions: true,
    referenceNumbers: true,
    notifications: true,
  });

  // Accessorial codes mapping
  const accessorialCodes: Record<string, string> = {
    'Appointment Request': 'APPT',
    'Lift-Gate Service (Delivery)': 'LFTD',
    'Residential Delivery': 'RES',
  };

  const specialHandlingCodes: Record<string, string> = {
    'Added Accessorials Require Pre Approval': 'PREACC',
    'Do Not Break Down the Pallet': 'DBDP',
    'Do Not Remove Shrink Wrap from Skid': 'SKSW',
    'Fragile-Handle with Care': 'FRAG',
  };

  const handleAccessorialChange = (accessorial: string, checked: boolean) => {
    if (checked) {
      setSelectedAccessorials((prev) => [...prev, accessorial]);
    } else {
      setSelectedAccessorials((prev) => prev.filter((a) => a !== accessorial));
    }
  };

  // Track if Consignee fields have been manually edited to prevent auto-fill from overwriting
  const [consigneeFieldsEdited, setConsigneeFieldsEdited] = useState<Set<string>>(new Set());
  
  // Track if auto-fill has been performed once
  const [hasAutoFilledConsignee, setHasAutoFilledConsignee] = useState(false);

  // Track if rate quote has been used to prefill
  const [hasPrefilledFromQuote, setHasPrefilledFromQuote] = useState(false);

  // Prefill form data from rate quote (only once, and only if fields are empty or not manually edited)
  useEffect(() => {
    if (quoteData?.formData && !hasPrefilledFromQuote) {
      const data = quoteData.formData;
      
      // Account Information
      if (data.myAccount) setMyAccount(data.myAccount);
      if (data.role) {
        const roleMap: Record<string, string> = {
          'Shipper': 'Shipper',
          'Consignee': 'Consignee',
          'Third-Party': 'Third-Party',
        };
        setRole(roleMap[data.role] || data.role);
      }
      
      // Billing Information
      if (data.term) setTerms(data.term);
      if (data.role) {
        const payerMap: Record<string, string> = {
          'Shipper': 'Shipper',
          'Consignee': 'Consignee',
          'Third-Party': 'Third Party',
        };
        setPayer(payerMap[data.role] || 'Third Party');
      }
      
      // Shipment Information
      if (data.shipDate) setShipDate(data.shipDate);
      if (quoteData?.quote?.quoteId) setQuoteId(quoteData.quote.quoteId);
      
      // Note: Origin Information (Shipper) is NOT auto-filled - user must fill manually
      // Only Consignee (Destination) information is auto-filled from order data and rate quote
      
      // Destination Information (from rate quote) - only if empty and not manually edited
      if (data.destinationCity && !destinationCity && !consigneeFieldsEdited.has('city')) {
        setDestinationCity(data.destinationCity);
      }
      if (data.destinationState && !destinationState && !consigneeFieldsEdited.has('state')) {
        setDestinationState(data.destinationState);
      }
      if (data.destinationZipCode && !destinationZipCode && !consigneeFieldsEdited.has('zipCode')) {
        setDestinationZipCode(data.destinationZipCode);
      }
      if (data.destinationCountry && !destinationCountry && !consigneeFieldsEdited.has('country')) {
        setDestinationCountry(data.destinationCountry === 'US' ? 'USA' : data.destinationCountry);
      }
      
      // Destination Email - only set default if empty and not manually edited
      if (!destinationEmail && !consigneeFieldsEdited.has('email')) {
        setDestinationEmail(ESTES_RATE_QUOTE_DEFAULTS.requestorEmail);
      }
      
      // Mark as prefilled
      setHasPrefilledFromQuote(true);
      
      // Accessorials
      const accessorialsToAdd: string[] = [];
      if (data.liftGateService) {
        setLiftGateService(true);
        accessorialsToAdd.push('Lift-Gate Service (Delivery)');
      }
      if (data.residentialDelivery) {
        setResidentialDelivery(true);
        accessorialsToAdd.push('Residential Delivery');
      }
      if (data.appointmentRequest) {
        setAppointmentRequest(true);
        accessorialsToAdd.push('Appointment Request');
      }
      if (accessorialsToAdd.length > 0) {
        setSelectedAccessorials(accessorialsToAdd);
      }
      
      // Commodities - Map handling units
      if (data.handlingUnits && data.handlingUnits.length > 0) {
        const mappedUnits: HandlingUnit[] = data.handlingUnits.map((unit: any, index: number) => {
          const items: CommodityItem[] = (unit.items || []).map((item: any, itemIndex: number) => ({
            id: `${Date.now()}-${index}-${itemIndex}`,
            description: item.description || '',
            pieces: 1,
            pieceType: 'CARTON',
          }));
          
          // If no items, create one from unit data
          if (items.length === 0 && unit.class) {
            items.push({
              id: `${Date.now()}-${index}-0`,
              description: '',
              pieces: unit.quantity || 1,
              pieceType: 'CARTON',
            });
          }
          
          return {
            id: `${Date.now()}-${index}`,
            doNotStack: unit.doNotStack || false,
            handlingUnitType: unit.handlingUnitType || 'PALLET',
            quantity: unit.quantity || 1,
            length: unit.length || 0,
            width: unit.width || 0,
            height: unit.height || 0,
            weight: unit.weight || 0,
            class: unit.class || '',
            nmfc: unit.nmfc || '',
            sub: unit.sub || '',
            items,
          };
        });
        setHandlingUnits(mappedUnits);
      }
    }
  }, [quoteData, hasPrefilledFromQuote, destinationCity, destinationState, destinationZipCode, destinationCountry, destinationEmail, consigneeFieldsEdited]);

  // Auto-fill Consignee Information from order data and rate quote (only once, and only if fields are empty)
  useEffect(() => {
    if (orderData?.ordersJsonb && typeof orderData.ordersJsonb === 'object' && !Array.isArray(orderData.ordersJsonb) && !hasAutoFilledConsignee) {
      const orderJsonb = orderData.ordersJsonb as Record<string, unknown>;
      
      // Customer Name -> Destination Name (Consignee Name) - only if empty and not manually edited
      const customerName = getJsonbValue(orderJsonb, 'Customer Name');
      if (customerName && !destinationName && !consigneeFieldsEdited.has('name')) {
        setDestinationName(customerName);
      }
      
      // Customer Phone -> Destination Phone - only if empty and not manually edited
      const customerPhone = getJsonbValue(orderJsonb, 'Customer Phone Number') || 
                           getJsonbValue(orderJsonb, 'Phone') ||
                           getJsonbValue(orderJsonb, 'Phone Number');
      if (customerPhone && !destinationPhone && !consigneeFieldsEdited.has('phone')) {
        setDestinationPhone(customerPhone);
      }
      
      // Destination Email - only set default if empty and not manually edited
      if (!destinationEmail && !consigneeFieldsEdited.has('email')) {
        setDestinationEmail(ESTES_RATE_QUOTE_DEFAULTS.requestorEmail);
      }
      
      // Ship To Address -> Destination Address - only if empty and not manually edited
      const shipToAddress = getJsonbValue(orderJsonb, 'Ship to Address 1') ||
                           getJsonbValue(orderJsonb, 'Shipping Address') ||
                           getJsonbValue(orderJsonb, 'Customer Shipping Address') ||
                           getJsonbValue(orderJsonb, 'Ship To Address');
      
      if (shipToAddress && !destinationAddress1 && !consigneeFieldsEdited.has('address1')) {
        const parsed = parseAddress(shipToAddress);
        if (parsed.address1) setDestinationAddress1(parsed.address1);
        if (parsed.address2 && !consigneeFieldsEdited.has('address2')) {
          setDestinationAddress2(parsed.address2);
        }
      }
      
      // Ship To Address 2 - only if empty and not manually edited
      const shipToAddress2 = getJsonbValue(orderJsonb, 'Ship to Address 2');
      if (shipToAddress2 && !destinationAddress2 && !consigneeFieldsEdited.has('address2')) {
        setDestinationAddress2(shipToAddress2);
      }
      
      // Ship To City -> Destination City - only if empty and not manually edited
      const shipToCity = getJsonbValue(orderJsonb, 'Ship to City') ||
                        getJsonbValue(orderJsonb, 'Shipping City');
      if (shipToCity && !destinationCity && !consigneeFieldsEdited.has('city')) {
        setDestinationCity(shipToCity);
      }
      
      // Ship To State -> Destination State - only if empty and not manually edited
      const shipToState = getJsonbValue(orderJsonb, 'Ship to State') ||
                         getJsonbValue(orderJsonb, 'Ship to State/Province') ||
                         getJsonbValue(orderJsonb, 'Shipping State') ||
                         getJsonbValue(orderJsonb, 'Shipping State/Province');
      if (shipToState && !destinationState && !consigneeFieldsEdited.has('state')) {
        setDestinationState(shipToState);
      }
      
      // Ship To Zip -> Destination Zip - only if empty and not manually edited
      const shipToZip = getJsonbValue(orderJsonb, 'Ship to Zip Code') ||
                       getJsonbValue(orderJsonb, 'Ship to Postal Code') ||
                       getJsonbValue(orderJsonb, 'Shipping Zip Code') ||
                       getJsonbValue(orderJsonb, 'Shipping Postal Code');
      if (shipToZip && !destinationZipCode && !consigneeFieldsEdited.has('zipCode')) {
        setDestinationZipCode(shipToZip);
      }
      
      // Ship To Country -> Destination Country - only if empty and not manually edited
      const shipToCountry = getJsonbValue(orderJsonb, 'Ship to Country') ||
                           getJsonbValue(orderJsonb, 'Shipping Country');
      if (shipToCountry && !destinationCountry && !consigneeFieldsEdited.has('country')) {
        const country = shipToCountry.toUpperCase();
        let mappedCountry = shipToCountry;
        
        if (country === 'US' || country === 'USA' || country === 'UNITED STATES') {
          mappedCountry = 'USA';
        } else if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
          mappedCountry = 'Canada';
        } else if (country === 'MX' || country === 'MEX' || country === 'MEXICO') {
          mappedCountry = 'Mexico';
        }
        setDestinationCountry(mappedCountry);
      }
      
      // Contact Name -> Destination Contact Name - only if empty and not manually edited
      const contactName = getJsonbValue(orderJsonb, 'Contact Name') ||
                         getJsonbValue(orderJsonb, 'Customer Contact Name');
      if (contactName && !destinationContactName && !consigneeFieldsEdited.has('contactName')) {
        setDestinationContactName(contactName);
      }
      
      // Mark as auto-filled after first run
      setHasAutoFilledConsignee(true);
    }
  }, [orderData, destinationName, destinationAddress1, destinationAddress2, destinationCity, destinationState, destinationZipCode, destinationCountry, destinationPhone, destinationContactName, destinationEmail, consigneeFieldsEdited, hasAutoFilledConsignee]);


  // Function to collect all form data
  const collectFormData = () => {
    return {
      // Account Information
      myAccount,
      role,
      
      // Billing Information
      payer,
      terms,
      
      // Shipment Information
      masterBol,
      shipDate,
      quoteId,
      autoAssignPro,
      
      // Origin Information
      originAccount,
      originName,
      originAddress1,
      originAddress2,
      originCity,
      originState,
      originZipCode,
      originCountry,
      originContactName,
      originPhone,
      originEmail,
      
      // Destination Information
      destinationName,
      destinationAddress1,
      destinationAddress2,
      destinationCity,
      destinationState,
      destinationZipCode,
      destinationCountry,
      destinationContactName,
      destinationPhone,
      destinationEmail,
      
      // Bill To Information
      billToAccount,
      billToName,
      billToAddress1,
      billToAddress2,
      billToCity,
      billToState,
      billToZipCode,
      billToCountry,
      billToContactName,
      billToPhone,
      billToEmail,
      
      // Accessorials
      liftGateService,
      residentialDelivery,
      appointmentRequest,
      selectedAccessorials,
      
      // Special Handling
      specialHandlingRequests,
      
      // Commodities
      handlingUnits,
      
      // Freight Information
      fullValueCoverage,
      fullValueCoverageAmount,
      
      // Service Options
      selectedService,
      
      // Reference Numbers
      referenceNumbers,
      
      // Notifications
      billOfLadingNotification,
      shippingLabelsNotification,
      trackingUpdatesNotification,
      shippingLabelFormat,
      shippingLabelQuantity,
      shippingLabelPosition,
      billOfLadingEmails,
      trackingUpdatesEmails,
      notificationSendTo,
    };
  };

  // Initialize form fields from initialFormData if it exists
  useEffect(() => {
    if (initialFormData && !quoteData) {
      // Only initialize if we have initialFormData and no quoteData (to avoid conflicts)
      const data = initialFormData;
      
      if (data.myAccount !== undefined) setMyAccount(data.myAccount);
      if (data.role !== undefined) setRole(data.role);
      if (data.payer !== undefined) setPayer(data.payer);
      if (data.terms !== undefined) setTerms(data.terms);
      if (data.masterBol !== undefined) setMasterBol(data.masterBol);
      if (data.shipDate !== undefined) setShipDate(data.shipDate);
      if (data.quoteId !== undefined) setQuoteId(data.quoteId);
      if (data.autoAssignPro !== undefined) setAutoAssignPro(data.autoAssignPro);
      
      // Note: Origin (Shipper) Information is NOT auto-populated - always starts empty
      // User must fill Shipper Information manually each time
      // Origin fields are intentionally left empty here
      
      // Destination (Consignee) - populate from initialFormData if exists
      if (data.destinationName !== undefined) setDestinationName(data.destinationName);
      if (data.destinationAddress1 !== undefined) setDestinationAddress1(data.destinationAddress1);
      if (data.destinationAddress2 !== undefined) setDestinationAddress2(data.destinationAddress2);
      if (data.destinationCity !== undefined) setDestinationCity(data.destinationCity);
      if (data.destinationState !== undefined) setDestinationState(data.destinationState);
      if (data.destinationZipCode !== undefined) setDestinationZipCode(data.destinationZipCode);
      if (data.destinationCountry !== undefined) setDestinationCountry(data.destinationCountry);
      if (data.destinationContactName !== undefined) setDestinationContactName(data.destinationContactName);
      if (data.destinationPhone !== undefined) setDestinationPhone(data.destinationPhone);
      if (data.destinationEmail !== undefined) setDestinationEmail(data.destinationEmail);
      
      // Bill To
      if (data.billToAccount !== undefined) setBillToAccount(data.billToAccount);
      if (data.billToName !== undefined) setBillToName(data.billToName);
      if (data.billToAddress1 !== undefined) setBillToAddress1(data.billToAddress1);
      if (data.billToAddress2 !== undefined) setBillToAddress2(data.billToAddress2);
      if (data.billToCity !== undefined) setBillToCity(data.billToCity);
      if (data.billToState !== undefined) setBillToState(data.billToState);
      if (data.billToZipCode !== undefined) setBillToZipCode(data.billToZipCode);
      if (data.billToCountry !== undefined) setBillToCountry(data.billToCountry);
      if (data.billToContactName !== undefined) setBillToContactName(data.billToContactName);
      if (data.billToPhone !== undefined) setBillToPhone(data.billToPhone);
      if (data.billToEmail !== undefined) setBillToEmail(data.billToEmail);
      
      // Accessorials
      if (data.liftGateService !== undefined) setLiftGateService(data.liftGateService);
      if (data.residentialDelivery !== undefined) setResidentialDelivery(data.residentialDelivery);
      if (data.appointmentRequest !== undefined) setAppointmentRequest(data.appointmentRequest);
      if (data.selectedAccessorials !== undefined) setSelectedAccessorials(data.selectedAccessorials);
      
      // Special Handling
      if (data.specialHandlingRequests !== undefined) setSpecialHandlingRequests(data.specialHandlingRequests);
      
      // Commodities
      if (data.handlingUnits !== undefined) setHandlingUnits(data.handlingUnits);
      
      // Freight Information
      if (data.fullValueCoverage !== undefined) setFullValueCoverage(data.fullValueCoverage);
      if (data.fullValueCoverageAmount !== undefined) setFullValueCoverageAmount(data.fullValueCoverageAmount);
      
      // Service Options
      if (data.selectedService !== undefined) setSelectedService(data.selectedService);
      
      // Reference Numbers
      if (data.referenceNumbers !== undefined) setReferenceNumbers(data.referenceNumbers);
      
      // Notifications
      if (data.billOfLadingNotification !== undefined) setBillOfLadingNotification(data.billOfLadingNotification);
      if (data.shippingLabelsNotification !== undefined) setShippingLabelsNotification(data.shippingLabelsNotification);
      if (data.trackingUpdatesNotification !== undefined) setTrackingUpdatesNotification(data.trackingUpdatesNotification);
      if (data.shippingLabelFormat !== undefined) setShippingLabelFormat(data.shippingLabelFormat);
      if (data.shippingLabelQuantity !== undefined) setShippingLabelQuantity(data.shippingLabelQuantity);
      if (data.shippingLabelPosition !== undefined) setShippingLabelPosition(data.shippingLabelPosition);
      if (data.billOfLadingEmails !== undefined) setBillOfLadingEmails(data.billOfLadingEmails);
      if (data.trackingUpdatesEmails !== undefined) setTrackingUpdatesEmails(data.trackingUpdatesEmails);
      if (data.notificationSendTo !== undefined) setNotificationSendTo(data.notificationSendTo);
    }
  }, [initialFormData]);

  // Save form data to parent when it changes (debounced)
  useEffect(() => {
    if (onFormDataChange) {
      const timeoutId = setTimeout(() => {
        onFormDataChange(collectFormData());
      }, 500); // Debounce for 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    myAccount, role, payer, terms, masterBol, shipDate, quoteId, autoAssignPro,
    originAccount, originName, originAddress1, originAddress2, originCity, originState, originZipCode, originCountry,
    originContactName, originPhone, originEmail,
    destinationName, destinationAddress1, destinationAddress2, destinationCity, destinationState, destinationZipCode, destinationCountry,
    destinationContactName, destinationPhone, destinationEmail,
    billToAccount, billToName, billToAddress1, billToAddress2, billToCity, billToState, billToZipCode, billToCountry,
    billToContactName, billToPhone, billToEmail,
    liftGateService, residentialDelivery, appointmentRequest, selectedAccessorials,
    specialHandlingRequests, handlingUnits,
    fullValueCoverage, fullValueCoverageAmount,
    selectedService, referenceNumbers,
    billOfLadingNotification, shippingLabelsNotification, trackingUpdatesNotification,
    shippingLabelFormat, shippingLabelQuantity, shippingLabelPosition,
    billOfLadingEmails, trackingUpdatesEmails, notificationSendTo,
    onFormDataChange
  ]);

  // Save response data to parent when it changes
  useEffect(() => {
    if (responseData && onResponseDataChange) {
      onResponseDataChange(responseData);
    }
  }, [responseData, onResponseDataChange]);
  
  // Expose PDF URL and files to parent component
  useEffect(() => {
    // This could be passed via callback if needed
  }, [pdfUrl]);

  // Create PDF URL from Base64 when response data is available
  useEffect(() => {
    if (responseData?.data?.images?.bol) {
      try {
        const base64String = responseData.data.images.bol;
        
        // Decode Base64 to binary
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create blob from binary data
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        
        // Cleanup function
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to create PDF URL:', err);
        }
        setPdfUrl(null);
      }
    } else {
      setPdfUrl(null);
    }
  }, [responseData]);

  const handleSpecialHandlingChange = (request: string, checked: boolean) => {
    if (checked) {
      setSpecialHandlingRequests([...specialHandlingRequests, request]);
    } else {
      setSpecialHandlingRequests(specialHandlingRequests.filter((r) => r !== request));
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
      class: '',
      nmfc: '',
      sub: '',
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
    setHandlingUnits(handlingUnits.filter((unit) => unit.id !== id));
  };

  const addItemToUnit = (unitId: string) => {
    setHandlingUnits(
      handlingUnits.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              items: [...unit.items, { id: Date.now().toString(), description: '', pieces: 1, pieceType: 'CARTON' }],
            }
          : unit
      )
    );
  };

  const removeItemFromUnit = (unitId: string, itemId: string) => {
    setHandlingUnits(
      handlingUnits.map((unit) =>
        unit.id === unitId
          ? { ...unit, items: unit.items.filter((item) => item.id !== itemId) }
          : unit
      )
    );
  };

  const addReferenceNumber = () => {
    setReferenceNumbers([
      ...referenceNumbers,
      { id: Date.now().toString(), type: '', value: '' },
    ]);
  };

  const removeReferenceNumber = (id: string) => {
    setReferenceNumbers(referenceNumbers.filter((ref) => ref.id !== id));
  };

  const handleShowRates = () => {
    setSelectedService('LTL Standard');
  };

  const handleAutofill = () => {
    const data = ESTES_BOL_AUTOFILL_DATA;
    
    // Account Information
    setMyAccount(data.account.myAccount);
    setRole(data.account.role);
    
    // Billing Information
    setPayer(data.billing.payer);
    setTerms(data.billing.terms);
    
    // Shipment Information
    setMasterBol(data.shipment.masterBol);
    setShipDate(data.shipment.shipDate);
    setQuoteId(data.shipment.quoteId);
    setAutoAssignPro(data.shipment.autoAssignPro);
    
    // Origin Information
    setOriginAccount(data.origin.account);
    setOriginName(data.origin.name);
    setOriginAddress1(data.origin.address1);
    setOriginAddress2(data.origin.address2);
    setOriginCity(data.origin.city);
    setOriginState(data.origin.stateProvince);
    setOriginZipCode(data.origin.postalCode);
    setOriginCountry(data.origin.country);
    setOriginContactName(data.origin.contactName);
    setOriginPhone(data.origin.phone);
    setOriginEmail(data.origin.email);
    
    // Destination Information
    setDestinationName(data.destination.name);
    setDestinationAddress1(data.destination.address1);
    setDestinationAddress2(data.destination.address2);
    setDestinationCity(data.destination.city);
    setDestinationState(data.destination.stateProvince);
    setDestinationZipCode(data.destination.postalCode);
    setDestinationCountry(data.destination.country);
    setDestinationContactName(data.destination.contactName);
    setDestinationPhone(data.destination.phone);
    setDestinationEmail(data.destination.email);
    
    // Bill To Information
    setBillToAccount(data.billTo.account);
    setBillToName(data.billTo.name);
    setBillToAddress1(data.billTo.address1);
    setBillToAddress2(data.billTo.address2);
    setBillToCity(data.billTo.city);
    setBillToState(data.billTo.stateProvince);
    setBillToZipCode(data.billTo.postalCode);
    setBillToCountry(data.billTo.country);
    setBillToContactName(data.billTo.contactName);
    setBillToPhone(data.billTo.phone);
    setBillToEmail(data.billTo.email);
    
    // Accessorials
    setLiftGateService(data.accessorials.liftGateService);
    setResidentialDelivery(data.accessorials.residentialDelivery);
    setAppointmentRequest(data.accessorials.appointmentRequest);
    
    const accessorialsToAdd: string[] = [];
    if (data.accessorials.liftGateService) {
      accessorialsToAdd.push('Lift-Gate Service (Delivery)');
    }
    if (data.accessorials.residentialDelivery) {
      accessorialsToAdd.push('Residential Delivery');
    }
    if (data.accessorials.appointmentRequest) {
      accessorialsToAdd.push('Appointment Request');
    }
    setSelectedAccessorials(accessorialsToAdd);
    
    // Special Handling Requests
    setSpecialHandlingRequests([...data.specialHandling]);
    
    // Commodities
    const mappedUnits: HandlingUnit[] = data.commodities.handlingUnits.map((unit: any, index: number) => {
      const items: CommodityItem[] = (unit.items || []).map((item: any, itemIndex: number) => ({
        id: `${Date.now()}-${index}-${itemIndex}`,
        description: item.description || '',
        pieces: item.pieces || 1,
        pieceType: item.pieceType || 'CARTON',
      }));
      
      return {
        id: `${Date.now()}-${index}`,
        doNotStack: unit.doNotStack || false,
        handlingUnitType: unit.handlingUnitType || 'PALLET',
        quantity: unit.quantity || 1,
        length: unit.length || 0,
        width: unit.width || 0,
        height: unit.height || 0,
        weight: unit.weight || 0,
        class: unit.class || '',
        nmfc: unit.nmfc || '',
        sub: unit.sub || '',
        items,
      };
    });
    setHandlingUnits(mappedUnits);
    
    // Notifications
    setBillOfLadingNotification(data.notifications.billOfLadingNotification);
    setShippingLabelsNotification(data.notifications.shippingLabelsNotification);
    setTrackingUpdatesNotification(data.notifications.trackingUpdatesNotification);
    setShippingLabelFormat(data.notifications.shippingLabelFormat);
    setShippingLabelQuantity(data.notifications.shippingLabelQuantity);
    setShippingLabelPosition(data.notifications.shippingLabelPosition);
    setBillOfLadingEmails([...data.notifications.emails]);
    setTrackingUpdatesEmails([...data.notifications.emails]);
    setNotificationSendTo({
      billOfLading: { ...data.notifications.sendTo.billOfLading },
      shippingLabels: { ...data.notifications.sendTo.shippingLabels },
      trackingUpdates: { ...data.notifications.sendTo.trackingUpdates },
    });
  };

  const buildRequestBody = () => {
    // Map accessorials to codes (only service accessorials, not special handling)
    const accessorialCodesList = selectedAccessorials
      .map((acc) => accessorialCodes[acc])
      .filter(Boolean);
    
    // Special handling requests are sent separately in specialInstructions field
    // Do NOT add them to accessorial codes to avoid duplication
    const allAccessorialCodes = accessorialCodesList;

    // Build handling units - ensure each has at least one lineItem
    const handlingUnitsData = handlingUnits.map((unit) => {
      const typeMap: Record<string, string> = {
        'PALLET': 'PAT',
        'SKID': 'SKD',
        'CRATE': 'CRT',
        'BOX': 'BOX',
      };
      
      // Ensure we have at least one lineItem
      // Weight should be the full unit weight, not divided
      let lineItems = unit.items.map((item) => ({
        description: item.description || '',
        weight: unit.weight || 0,
        weightUnit: 'Pounds',
        pieces: item.pieces || 1,
        packagingType: item.pieceType === 'CARTON' ? 'CTN' : (item.pieceType || 'CTN'),
        classification: unit.class || '',
        nmfc: unit.nmfc || '',
        nmfcSub: unit.sub || '',
        hazardous: false,
      }));
      
      // If no items, create a default one
      if (lineItems.length === 0) {
        lineItems = [{
          description: '',
          weight: unit.weight || 0,
          weightUnit: 'Pounds',
          pieces: unit.quantity || 1,
          packagingType: 'CTN',
          classification: unit.class || '',
          nmfc: unit.nmfc || '',
          nmfcSub: unit.sub || '',
          hazardous: false,
        }];
      }
      
      return {
        count: unit.quantity || 1,
        type: typeMap[unit.handlingUnitType] || 'PAT',
        weight: unit.weight || 0,
        weightUnit: 'Pounds',
        length: unit.length || 0,
        width: unit.width || 0,
        height: unit.height || 0,
        dimensionsUnit: 'Inches',
        stackable: !unit.doNotStack,
        lineItems: lineItems,
      };
    });

    // Build special instructions - use comma separator (no newlines)
    const specialInstructions = specialHandlingRequests.length > 0 
      ? specialHandlingRequests.join(',') 
      : undefined;

    // Build notifications - combine both email lists for the API
    const billOfLadingEmailsList = billOfLadingEmails.filter((email) => email.trim() !== '');
    const trackingUpdatesEmailsList = trackingUpdatesEmails.filter((email) => email.trim() !== '');
    // Combine unique emails from both lists for the API
    const allNotificationEmails = [...new Set([...billOfLadingEmailsList, ...trackingUpdatesEmailsList])];

    // Build referenceNumbers object - only include if values exist
    const referenceNumbersObj: any = {};
    if (masterBol && masterBol.trim()) {
      referenceNumbersObj.masterBol = masterBol.trim();
    }
    if (quoteId && quoteId.trim()) {
      referenceNumbersObj.quoteID = quoteId.trim();
    }

    // Build contact objects - include if phone or email exists (name is optional)
    const originContact: any = {};
    if (originPhone && originPhone.trim()) {
      originContact.phone = originPhone.replace(/\D/g, '');
    }
    if (originEmail && originEmail.trim()) {
      originContact.email = originEmail.trim();
    }
    if (originContactName && originContactName.trim()) {
      originContact.name = originContactName.trim();
    }

    const destinationContact: any = {};
    if (destinationPhone && destinationPhone.trim()) {
      destinationContact.phone = destinationPhone.replace(/\D/g, '');
    }
    if (destinationEmail && destinationEmail.trim()) {
      destinationContact.email = destinationEmail.trim();
    }
    if (destinationContactName && destinationContactName.trim()) {
      destinationContact.name = destinationContactName.trim();
    }

    const billToContact: any = {};
    if (billToPhone && billToPhone.trim()) {
      billToContact.phone = billToPhone.replace(/\D/g, '');
    }
    if (billToEmail && billToEmail.trim()) {
      billToContact.email = billToEmail.trim();
    }
    if (billToContactName && billToContactName.trim()) {
      billToContact.name = billToContactName.trim();
    }

    // Build request body
    const body: any = {
      version: 'v2.0.1',
      bol: {
        function: 'Create',
        isTest: false,
        requestorRole: role === 'Third-Party' ? 'Third Party' : role,
      },
      payment: {
        terms: terms,
      },
      origin: {
        account: originAccount,
        name: originName || '',
        address1: originAddress1 || '',
        city: originCity || '',
        stateProvince: originState || '',
        postalCode: originZipCode || '',
        country: originCountry || 'USA',
      },
      destination: {
        name: destinationName || '',
        address1: destinationAddress1 || '',
        city: destinationCity || '',
        stateProvince: destinationState || '',
        postalCode: destinationZipCode || '',
        country: destinationCountry || 'USA',
      },
      billTo: {
        account: billToAccount,
        name: billToName || '',
        address1: billToAddress1 || '',
        city: billToCity || '',
        stateProvince: billToState || '',
        postalCode: billToZipCode || '',
        country: billToCountry || 'USA',
      },
      commodities: {
        lineItemLayout: 'Nested',
        handlingUnits: handlingUnitsData,
      },
      accessorials: {
        codes: allAccessorialCodes.length > 0 ? allAccessorialCodes : [],
      },
      images: {
        includeBol: billOfLadingNotification,
        includeShippingLabels: shippingLabelsNotification,
        email: {
          includeBol: billOfLadingNotification,
          includeLabels: shippingLabelsNotification,
          addresses: billOfLadingEmailsList.length > 0 ? billOfLadingEmailsList : [],
        },
      },
      notifications: trackingUpdatesEmailsList.length > 0 
        ? trackingUpdatesEmailsList.map((email) => ({ email })) 
        : [],
    };

    // Add optional fields only if they have values
    if (shipDate) {
      body.bol.requestedPickupDate = `${shipDate}T00:00:00.000`;
    }
    if (specialInstructions) {
      body.bol.specialInstructions = specialInstructions;
    }
    if (originAddress2 && originAddress2.trim()) {
      body.origin.address2 = originAddress2.trim();
    }
    // Always include contact if phone or email exists
    if ((originPhone && originPhone.trim()) || (originEmail && originEmail.trim())) {
      body.origin.contact = originContact;
    }
    if (destinationAddress2 && destinationAddress2.trim()) {
      body.destination.address2 = destinationAddress2.trim();
    }
    // Always include contact if phone or email exists
    if ((destinationPhone && destinationPhone.trim()) || (destinationEmail && destinationEmail.trim())) {
      body.destination.contact = destinationContact;
    }
    if (billToAddress2 && billToAddress2.trim()) {
      body.billTo.address2 = billToAddress2.trim();
    }
    // Always include contact if phone or email exists
    if ((billToPhone && billToPhone.trim()) || (billToEmail && billToEmail.trim())) {
      body.billTo.contact = billToContact;
    }
    if (Object.keys(referenceNumbersObj).length > 0) {
      body.referenceNumbers = referenceNumbersObj;
    }
    if (shippingLabelsNotification) {
      body.images.shippingLabels = {
        format: shippingLabelFormat.includes('Zebra') ? 'Zebra' : shippingLabelFormat.split(' ')[0],
        quantity: shippingLabelQuantity,
        position: shippingLabelPosition,
      };
    }

    return body;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize carrier name to match how it's stored in Zustand (lowercase)
    const normalizedCarrier = carrier.toLowerCase();
    let token = getToken(normalizedCarrier);
    
    // If no token or token expired, try to refresh if session is active
    if (!token || isTokenExpired(normalizedCarrier, 10)) {
      if (isSessionActive()) {
        // Session is active, try to refresh token automatically
        const refreshed = await refreshToken(normalizedCarrier);
        if (refreshed) {
          token = getToken(normalizedCarrier);
        }
      }
    }
    
    if (!token) {
      setError('Authentication required. Please login.');
      return;
    }

    // Validate required fields
    const validationErrors: string[] = [];
    
    if (!shipDate) {
      validationErrors.push('Ship Date is required');
    }
    if (!originName || !originName.trim()) {
      validationErrors.push('Origin Company Name is required');
    }
    if (!originAddress1 || !originAddress1.trim()) {
      validationErrors.push('Origin Address Line 1 is required');
    }
    if (!originCity || !originCity.trim()) {
      validationErrors.push('Origin City is required');
    }
    if (!originState || !originState.trim()) {
      validationErrors.push('Origin State is required');
    }
    if (!originZipCode || !originZipCode.trim()) {
      validationErrors.push('Origin ZIP Code is required');
    }
    if (!originPhone || !originPhone.trim()) {
      validationErrors.push('Origin Phone Number is required');
    }
    if (!destinationName || !destinationName.trim()) {
      validationErrors.push('Destination Company Name is required');
    }
    if (!destinationAddress1 || !destinationAddress1.trim()) {
      validationErrors.push('Destination Address Line 1 is required');
    }
    if (!destinationCity || !destinationCity.trim()) {
      validationErrors.push('Destination City is required');
    }
    if (!destinationState || !destinationState.trim()) {
      validationErrors.push('Destination State is required');
    }
    if (!destinationZipCode || !destinationZipCode.trim()) {
      validationErrors.push('Destination ZIP Code is required');
    }
    if (!destinationPhone || !destinationPhone.trim()) {
      validationErrors.push('Destination Phone Number is required');
    }
    if (!billToName || !billToName.trim()) {
      validationErrors.push('Bill To Company Name is required');
    }
    if (!billToAddress1 || !billToAddress1.trim()) {
      validationErrors.push('Bill To Address Line 1 is required');
    }
    if (!billToCity || !billToCity.trim()) {
      validationErrors.push('Bill To City is required');
    }
    if (!billToState || !billToState.trim()) {
      validationErrors.push('Bill To State is required');
    }
    if (!billToZipCode || !billToZipCode.trim()) {
      validationErrors.push('Bill To ZIP Code is required');
    }
    if (!billToPhone || !billToPhone.trim()) {
      validationErrors.push('Bill To Phone Number is required');
    }
    if (handlingUnits.length === 0) {
      validationErrors.push('At least one handling unit is required');
    }
    
    // Validate that all handling units have at least one item with a description
    handlingUnits.forEach((unit, index) => {
      if (unit.items.length === 0) {
        validationErrors.push(`Handling Unit ${index + 1}: At least one item is required`);
      } else {
        // Check if any item is missing description
        const itemsWithoutDescription = unit.items.filter(item => !item.description || !item.description.trim());
        if (itemsWithoutDescription.length > 0) {
          validationErrors.push(`Handling Unit ${index + 1}: Description is required for all items`);
        }
      }
    });
    
    if (validationErrors.length > 0) {
      setError(`Please fill in all required fields:\n${validationErrors.join('\n')}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody = buildRequestBody();
      
      // Get shippingCompany from carrier (normalize to lowercase)
      const shippingCompany = normalizedCarrier === 'estes' ? 'estes' : normalizedCarrier;
      
      // Ensure shippingCompany is at the top level - this is critical!
      const payload = {
        shippingCompany: shippingCompany,
        ...requestBody,
      };

      // Store request payload for display
      setRequestPayload(payload);

      const res = await fetch(buildApiUrl('/Logistics/create-bill-of-lading'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Try to parse error response to show specific error messages
        let errorMessage = 'Please check your form data and try again.';
        let specificErrors: string[] = [];
        
        try {
          const errorData = await res.json();
          
          // Helper function to map field names to user-friendly messages
          const mapFieldToMessage = (field: string): string => {
            const fieldLower = field.toLowerCase();
            
            // Phone number errors
            if (fieldLower.includes('phone') || fieldLower.includes('contact.phone') || fieldLower.includes('origin.phone') || fieldLower.includes('destination.phone') || fieldLower.includes('billto.phone')) {
              if (fieldLower.includes('origin')) return 'Origin Phone Number is required';
              if (fieldLower.includes('destination')) return 'Destination Phone Number is required';
              if (fieldLower.includes('billto') || fieldLower.includes('bill')) return 'Bill To Phone Number is required';
              return 'Phone Number is required';
            }
            
            // Address errors
            if (fieldLower.includes('address')) {
              if (fieldLower.includes('origin') || fieldLower.includes('shipper')) return 'Origin Address is required';
              if (fieldLower.includes('destination') || fieldLower.includes('consignee')) return 'Destination Address is required';
              if (fieldLower.includes('billto') || fieldLower.includes('bill')) return 'Bill To Address is required';
              return 'Address is required';
            }
            
            // Name errors
            if (fieldLower.includes('name')) {
              if (fieldLower.includes('origin') || fieldLower.includes('shipper')) return 'Origin Company Name is required';
              if (fieldLower.includes('destination') || fieldLower.includes('consignee')) return 'Destination Company Name is required';
              if (fieldLower.includes('billto') || fieldLower.includes('bill')) return 'Bill To Company Name is required';
              return 'Company Name is required';
            }
            
            // City errors
            if (fieldLower.includes('city')) {
              if (fieldLower.includes('origin') || fieldLower.includes('shipper')) return 'Origin City is required';
              if (fieldLower.includes('destination') || fieldLower.includes('consignee')) return 'Destination City is required';
              if (fieldLower.includes('billto') || fieldLower.includes('bill')) return 'Bill To City is required';
              return 'City is required';
            }
            
            // State errors
            if (fieldLower.includes('state') || fieldLower.includes('stateprovince')) {
              if (fieldLower.includes('origin') || fieldLower.includes('shipper')) return 'Origin State is required';
              if (fieldLower.includes('destination') || fieldLower.includes('consignee')) return 'Destination State is required';
              if (fieldLower.includes('billto') || fieldLower.includes('bill')) return 'Bill To State is required';
              return 'State is required';
            }
            
            // ZIP code errors
            if (fieldLower.includes('zip') || fieldLower.includes('postal')) {
              if (fieldLower.includes('origin') || fieldLower.includes('shipper')) return 'Origin ZIP Code is required';
              if (fieldLower.includes('destination') || fieldLower.includes('consignee')) return 'Destination ZIP Code is required';
              if (fieldLower.includes('billto') || fieldLower.includes('bill')) return 'Bill To ZIP Code is required';
              return 'ZIP Code is required';
            }
            
            // Description errors
            if (fieldLower.includes('description') || fieldLower.includes('desc')) {
              return 'Description is missing. Please fill in the description field for all items in your handling units.';
            }
            
            // Ship date errors
            if (fieldLower.includes('shipdate') || fieldLower.includes('ship_date') || fieldLower.includes('pickup')) {
              return 'Ship Date is required';
            }
            
            // Return the field name as-is if no mapping found
            return field;
          };
          
          // Check for messageStatus structure (Estes API format)
          if (errorData.messageStatus) {
            const msgStatus = errorData.messageStatus;
            
            // Check for messageList array with detailed errors
            if (errorData.messageList && Array.isArray(errorData.messageList)) {
              specificErrors = errorData.messageList.map((msg: any) => {
                const messageText = msg.message || msg.text || msg.error || String(msg);
                const field = msg.field || msg.path || msg.property || '';
                
                if (field) {
                  return mapFieldToMessage(field);
                }
                
                // Check message text for field names
                const msgLower = messageText.toLowerCase();
                if (msgLower.includes('phone')) {
                  if (msgLower.includes('origin') || msgLower.includes('shipper')) return 'Origin Phone Number is required';
                  if (msgLower.includes('destination') || msgLower.includes('consignee')) return 'Destination Phone Number is required';
                  if (msgLower.includes('bill') || msgLower.includes('billto')) return 'Bill To Phone Number is required';
                  return 'Phone Number is required';
                }
                
                return messageText;
              });
            }
            
            // Also check the main messageStatus message
            if (msgStatus.message && !msgStatus.message.toLowerCase().includes('transaction id')) {
              specificErrors.push(msgStatus.message);
            }
            
            // Check resolution field
            if (msgStatus.resolution) {
              specificErrors.push(msgStatus.resolution);
            }
          }
          
          // Check for standard error fields
          if (errorData.message) {
            const message = errorData.message.toLowerCase();
            if (!message.includes('transaction id')) {
              if (message.includes('description') || message.includes('desc')) {
                specificErrors.push('Description is missing. Please fill in the description field for all items in your handling units.');
              } else {
                specificErrors.push(errorData.message);
              }
            }
          }
          
          if (errorData.error) {
            const error = typeof errorData.error === 'string' ? errorData.error : errorData.error.message || '';
            const errorLower = error.toLowerCase();
            if (!errorLower.includes('transaction id')) {
              if (errorLower.includes('description') || errorLower.includes('desc')) {
                specificErrors.push('Description is missing. Please fill in the description field for all items in your handling units.');
              } else {
                specificErrors.push(error);
              }
            }
          }
          
          if (errorData.data?.message) {
            const message = errorData.data.message.toLowerCase();
            if (!message.includes('transaction id')) {
              if (message.includes('description') || message.includes('desc')) {
                specificErrors.push('Description is missing. Please fill in the description field for all items in your handling units.');
              } else {
                specificErrors.push(errorData.data.message);
              }
            }
          }
          
          // Check for validation errors array
          if (errorData.errors && Array.isArray(errorData.errors)) {
            errorData.errors.forEach((err: any) => {
              const errStr = typeof err === 'string' ? err : err.message || err.field || String(err);
              const errLower = errStr.toLowerCase();
              
              if (err.field) {
                specificErrors.push(mapFieldToMessage(err.field));
              } else if (errLower.includes('phone')) {
                if (errLower.includes('origin')) {
                  specificErrors.push('Origin Phone Number is required');
                } else if (errLower.includes('destination')) {
                  specificErrors.push('Destination Phone Number is required');
                } else if (errLower.includes('bill')) {
                  specificErrors.push('Bill To Phone Number is required');
                } else {
                  specificErrors.push('Phone Number is required');
                }
              } else if (!errLower.includes('description') && !errLower.includes('desc')) {
                specificErrors.push(errStr);
              }
            });
          } else if (errorData.errors && typeof errorData.errors === 'object') {
            Object.entries(errorData.errors).forEach(([field, messages]) => {
              const fieldMessage = mapFieldToMessage(field);
              const messageArray = Array.isArray(messages) ? messages : [messages];
              messageArray.forEach((msg: any) => {
                specificErrors.push(`${fieldMessage}: ${msg}`);
              });
            });
          }
          
          // Build final error message
          if (specificErrors.length > 0) {
            // Remove duplicates and filter out generic transaction messages
            const uniqueErrors = Array.from(new Set(specificErrors.filter(err => 
              !err.toLowerCase().includes('transaction id') && 
              !err.toLowerCase().includes('see message list')
            )));
            
            if (uniqueErrors.length > 0) {
              errorMessage = uniqueErrors.join('\n');
            }
          }
          
        } catch (parseError) {
          // If JSON parsing fails, use default message
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to parse error response:', parseError);
          }
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await res.json();
      // Show response preview instead of redirecting
      setResponseData(data);
      setShowResponsePreview(true);
      // Scroll to response preview section (but not all the way to bottom)
      setTimeout(() => {
        const responseSection = document.querySelector('[data-response-preview]');
        if (responseSection) {
          responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      // Extract error message from various error types
      let errorMessage = 'An error occurred. Please check your form data and try again.';
      
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('phone')) {
          errorMessage = 'Phone Number is required. Please fill in all required phone number fields.';
        } else if (errMsg.includes('description') || errMsg.includes('desc')) {
          errorMessage = 'Description is missing. Please fill in the description field for all items in your handling units.';
        } else if (errMsg.includes('address')) {
          errorMessage = 'Address is required. Please fill in all required address fields.';
        } else {
          errorMessage = err.message || errorMessage;
        }
      } else if (typeof err === 'string') {
        const errLower = err.toLowerCase();
        if (errLower.includes('phone')) {
          errorMessage = 'Phone Number is required. Please fill in all required phone number fields.';
        } else {
          errorMessage = err;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to get PDF blob from Base64 string
  const getPDFBlob = () => {
    if (!responseData?.data?.images?.bol) {
      return null;
    }

    const base64String = responseData.data.images.bol;
    
    // Decode Base64 to binary
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob from binary data
    return new Blob([bytes], { type: 'application/pdf' });
  };

  // Function to download PDF from Base64 string
  const downloadPDF = () => {
    try {
      const blob = getPDFBlob();
      if (!blob) {
        setError('PDF data not found in response');
        return;
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from reference numbers or use default
      const proNumber = responseData?.data?.referenceNumbers?.pro || 'BOL';
      const filename = `BillOfLading_${proNumber}.pdf`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  };

  // Function to print PDF
  const printPDF = () => {
    try {
      const blob = getPDFBlob();
      if (!blob) {
        setError('PDF data not found in response');
        return;
      }

      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        setError('Please allow popups to print the PDF');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print PDF');
    }
  };

  const toggleSection = (section: string) => {
    setShowSections({ ...showSections, [section]: !showSections[section] });
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalCube = 0;
    let totalWeight = 0;
    let totalHandlingUnits = handlingUnits.length;
    let totalPieces = 0;

    handlingUnits.forEach((unit) => {
      const cube = (unit.length * unit.width * unit.height) / 1728;
      totalCube += cube * unit.quantity;
      totalWeight += unit.weight * unit.quantity;
      totalPieces += unit.items.reduce((sum, item) => sum + item.pieces, 0) * unit.quantity;
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

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-4 sm:pb-8 px-3 sm:px-0">
      <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <FileText className="text-blue-600 sm:w-6 sm:h-6" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Bill of Lading</h2>
            <p className="text-xs sm:text-sm text-slate-600">Create your bill of lading</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleAutofill}
              className="hidden px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm"
            >
              <Sparkles size={14} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Autofill</span>
            </button>
            <button
              type="button"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors flex items-center gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm"
            >
              <HelpCircle size={14} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Walk Me Through</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Account Information */}
          <div className="border border-slate-200 rounded-lg overflow-visible">
            <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('accountInfo')}
                  className="text-left"
                >
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Account Information</h3>
                </button>
                <span
                  className="text-blue-600 text-sm hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle help click
                  }}
                >
                  Need Help?
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('accountInfo')}
                className="flex items-center"
              >
                {showSections.accountInfo ? (
                  <ChevronUp className="text-slate-600" size={20} />
                ) : (
                  <ChevronDown className="text-slate-600" size={20} />
                )}
              </button>
            </div>
            {showSections.accountInfo && (
              <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">Your Role:</label>
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
                </div>
              </div>
            )}
          </div>

          {/* Billing Information */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('billingInfo')}
              className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Billing Information</h3>
              {showSections.billingInfo ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.billingInfo && (
              <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">Payer:</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Shipper"
                          checked={payer === 'Shipper'}
                          onChange={(e) => setPayer(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">Shipper</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Consignee"
                          checked={payer === 'Consignee'}
                          onChange={(e) => setPayer(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">Consignee</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Third Party"
                          checked={payer === 'Third Party'}
                          onChange={(e) => setPayer(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">Third Party (add)</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">Terms:</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Prepaid"
                          checked={terms === 'Prepaid'}
                          onChange={(e) => setTerms(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">Prepaid</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="Collect"
                          checked={terms === 'Collect'}
                          onChange={(e) => setTerms(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-slate-700">Collect</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shipment Information */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('shipmentInfo')}
              className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Shipment Information</h3>
              {showSections.shipmentInfo ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.shipmentInfo && (
              <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-slate-600">
                  Optional: Enter your company's unique reference number or alphanumeric value.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Master BOL Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={masterBol}
                      onChange={(e) => setMasterBol(e.target.value)}
                      placeholder="Enter master BOL number"
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Ship Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={shipDate}
                        onChange={(e) => setShipDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoAssignPro}
                    onChange={(e) => setAutoAssignPro(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label className="text-sm text-slate-700">Auto-assign PRO Number</label>
                  <Info className="text-blue-500" size={16} />
                </div>
              </div>
            )}
          </div>

          {/* Quote Details */}
          {quoteData && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Quote Details</h3>
                <p className="text-sm text-slate-600">
                  Enter a valid, unexpired quote number to prefill your BOL and ensure accurate rating.
                </p>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Quote Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={quoteId}
                    onChange={(e) => setQuoteId(e.target.value)}
                    placeholder="Enter quote number"
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {quoteId && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                    Any updates made to the BOL that differ from the details of the quote will invalidate this quote.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Routing Information */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('routingInfo')}
              className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Routing Information</h3>
              {showSections.routingInfo ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.routingInfo && (
              <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Shipper Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-slate-900">Shipper Information</h4>
                    <SearchableDropdown
                      options={ESTES_SHIPPER_ADDRESSES.map(addr => ({
                        value: addr.value,
                        label: addr.label,
                        name: addr.name,
                        city: addr.city,
                        state: addr.state,
                        zip: addr.zip,
                      })) as SearchableDropdownOption[]}
                      value={originAddressBook}
                      onChange={handleOriginAddressBookChange}
                      label="Address Book (Optional)"
                      placeholder="Search or select address..."
                      filterKeys={['label', 'name', 'city', 'state', 'zip']}
                      onSelect={(option) => {
                        const address = ESTES_SHIPPER_ADDRESSES.find(opt => opt.value === option.value);
                        if (address) {
                          setOriginName(address.name);
                          setOriginAddress1(address.address1);
                          setOriginAddress2(address.address2 || '');
                          setOriginCity(address.city);
                          setOriginState(address.state);
                          setOriginZipCode(address.zip);
                          setOriginCountry(address.country);
                          if (address.contactName) setOriginContactName(address.contactName);
                          if (address.phone) setOriginPhone(address.phone);
                          if (address.email) setOriginEmail(address.email);
                          if (address.account) setOriginAccount(address.account);
                        }
                      }}
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Company Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={originName}
                        onChange={(e) => setOriginName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Email (Optional)</label>
                      <input
                        type="email"
                        value={originEmail}
                        onChange={(e) => setOriginEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Contact Name (Optional)</label>
                      <input
                        type="text"
                        value={originContactName}
                        onChange={(e) => setOriginContactName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Address Line 1 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={originAddress1}
                        onChange={(e) => setOriginAddress1(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={originAddress2}
                        onChange={(e) => setOriginAddress2(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                          />
                          {originLoadingZip && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            </div>
                          )}
                        </div>
                        {(originCity || originState) && (
                          <p className="text-sm text-slate-600 mt-1">
                            Auto-filled: {originCity}{originState ? `, ${originState}` : ''}{originCountry ? `, ${originCountry}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">Country <span className="text-red-500">*</span></label>
                        <select
                          value={originCountry}
                          onChange={(e) => setOriginCountry(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="USA">USA</option>
                          <option value="Canada">Canada</option>
                          <option value="Mexico">Mexico</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-900">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={originCity}
                          onChange={(e) => setOriginCity(e.target.value)}
                          placeholder="Enter city name"
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-900">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={originState}
                          onChange={(e) => setOriginState(e.target.value.toUpperCase())}
                          placeholder="Enter state code (e.g., CA, NY, TX)"
                          maxLength={2}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={originPhone}
                        onChange={(e) => setOriginPhone(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                  </div>

                  {/* Consignee Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-slate-900">Consignee Information</h4>
                    <SearchableDropdown
                      options={ESTES_ADDRESS_BOOK as SearchableDropdownOption[]}
                      value={destinationAddressBook || ''}
                      onChange={(value) => {
                        setDestinationAddressBook(value);
                        if (value) {
                          const address = ESTES_ADDRESS_BOOK.find(opt => opt.value === value);
                          if (address) {
                            setDestinationName(address.label.split(' - ')[0] || '');
                            setDestinationAddress1(address.label.split(' - ')[2] || '');
                            setDestinationCity(address.city);
                            setDestinationState(address.state);
                            setDestinationZipCode(address.zip);
                            setDestinationCountry(address.country);
                          }
                        }
                      }}
                      label="Address Book (Optional)"
                      placeholder="Search or select address..."
                      filterKeys={['label', 'city', 'state', 'zip']}
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Company Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={destinationName}
                        onChange={(e) => {
                          setDestinationName(e.target.value);
                          setConsigneeFieldsEdited(prev => new Set(prev).add('name'));
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Email (Optional)</label>
                      <input
                        type="email"
                        value={destinationEmail}
                        onChange={(e) => {
                          setDestinationEmail(e.target.value);
                          setConsigneeFieldsEdited(prev => new Set(prev).add('email'));
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Contact Name (Optional)</label>
                      <input
                        type="text"
                        value={destinationContactName}
                        onChange={(e) => {
                          setDestinationContactName(e.target.value);
                          setConsigneeFieldsEdited(prev => new Set(prev).add('contactName'));
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Address Line 1 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={destinationAddress1}
                        onChange={(e) => {
                          setDestinationAddress1(e.target.value);
                          setConsigneeFieldsEdited(prev => new Set(prev).add('address1'));
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={destinationAddress2}
                        onChange={(e) => {
                          setDestinationAddress2(e.target.value);
                          setConsigneeFieldsEdited(prev => new Set(prev).add('address2'));
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-900">
                          ZIP Code <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={destinationZipCode}
                            onChange={(e) => {
                              setDestinationZipCode(e.target.value);
                              setConsigneeFieldsEdited(prev => new Set(prev).add('zipCode'));
                            }}
                            placeholder="Enter ZIP code"
                            maxLength={10}
                            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                          />
                          {destinationLoadingZip && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            </div>
                          )}
                        </div>
                        {(destinationCity || destinationState) && (
                          <p className="text-sm text-slate-600 mt-1">
                            Auto-filled: {destinationCity}{destinationState ? `, ${destinationState}` : ''}{destinationCountry ? `, ${destinationCountry}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">Country <span className="text-red-500">*</span></label>
                        <select
                          value={destinationCountry}
                          onChange={(e) => {
                            setDestinationCountry(e.target.value);
                            setConsigneeFieldsEdited(prev => new Set(prev).add('country'));
                          }}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="USA">USA</option>
                          <option value="Canada">Canada</option>
                          <option value="Mexico">Mexico</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-900">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={destinationCity}
                          onChange={(e) => {
                            setDestinationCity(e.target.value);
                            setConsigneeFieldsEdited(prev => new Set(prev).add('city'));
                          }}
                          placeholder="Enter city name"
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-900">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={destinationState}
                          onChange={(e) => {
                            setDestinationState(e.target.value.toUpperCase());
                            setConsigneeFieldsEdited(prev => new Set(prev).add('state'));
                          }}
                          placeholder="Enter state code (e.g., CA, NY, TX)"
                          maxLength={2}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />

                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={destinationPhone}
                        onChange={(e) => {
                          setDestinationPhone(e.target.value);
                          setConsigneeFieldsEdited(prev => new Set(prev).add('phone'));
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                  </div>
                </div>

                {/* Bill To Information */}
                <div className="border-t border-slate-200 pt-6">
                  <h4 className="text-md font-semibold text-slate-900 mb-4">Bill To Information</h4>
                  <SearchableDropdown
                    options={ESTES_ADDRESS_BOOK as SearchableDropdownOption[]}
                    value={billToAddressBook || ''}
                    onChange={(value) => {
                      setBillToAddressBook(value);
                      if (value) {
                        const address = ESTES_ADDRESS_BOOK.find(opt => opt.value === value);
                        if (address) {
                          setBillToName(address.label.split(' - ')[0] || '');
                          setBillToAddress1(address.label.split(' - ')[2] || '');
                          setBillToCity(address.city);
                          setBillToState(address.state);
                          setBillToZipCode(address.zip);
                          setBillToCountry(address.country);
                        }
                      }
                    }}
                    label="Address Book (Optional)"
                    placeholder="Search or select address..."
                    filterKeys={['label', 'city', 'state', 'zip']}
                    className="mb-4"
                  />
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 border-t border-slate-300"></div>
                    <span className="text-sm text-slate-600">or</span>
                    <div className="flex-1 border-t border-slate-300"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Company Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={billToName}
                        onChange={(e) => setBillToName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Email (Optional)</label>
                      <input
                        type="email"
                        value={billToEmail}
                        onChange={(e) => setBillToEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Contact Name (Optional)</label>
                      <input
                        type="text"
                        value={billToContactName}
                        onChange={(e) => setBillToContactName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Address Line 1 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={billToAddress1}
                        onChange={(e) => setBillToAddress1(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={billToAddress2}
                        onChange={(e) => setBillToAddress2(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-900">
                        ZIP/Postal Code <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={billToZipCode}
                          onChange={(e) => setBillToZipCode(e.target.value)}
                          placeholder="Enter ZIP or postal code"
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                        />
                        {billToLoadingZip && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />
                        )}
                      </div>
                      {(billToCity || billToState) && (
                        <p className="text-sm text-slate-600 mt-1">
                          Auto-filled: {billToCity}{billToState ? `, ${billToState}` : ''}{billToCountry ? `, ${billToCountry}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-900">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={billToCity}
                        onChange={(e) => setBillToCity(e.target.value)}
                        placeholder="Enter city name"
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-900">
                        State/Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={billToState}
                        onChange={(e) => setBillToState(e.target.value.toUpperCase())}
                        placeholder="Enter state code (e.g., CA, NY, TX)"
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Country <span className="text-red-500">*</span></label>
                      <select
                        value={billToCountry}
                        onChange={(e) => setBillToCountry(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="USA">USA</option>
                        <option value="Canada">Canada</option>
                        <option value="Mexico">Mexico</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={billToPhone}
                        onChange={(e) => setBillToPhone(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold text-sm"
                    >
                      SAVE TO ADDRESS BOOK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Freight Accessorials */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('accessorials')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Freight Accessorials</h3>
                <Info className="text-blue-500" size={20} />
              </div>
              {showSections.accessorials ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.accessorials && (
              <div className="p-6 space-y-4">
                {selectedAccessorials.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedAccessorials.map((acc) => (
                      <span
                        key={acc}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                      >
                        {acc}
                        <button
                          type="button"
                          onClick={() => handleAccessorialChange(acc, false)}
                          className="hover:text-blue-900"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Service Options</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={appointmentRequest}
                        onChange={(e) => {
                          setAppointmentRequest(e.target.checked);
                          handleAccessorialChange('Appointment Request', e.target.checked);
                        }}
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
            )}
          </div>

          {/* Special Handling Requests */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Special Handling Requests</h3>
                <Info className="text-blue-500" size={20} />
              </div>
              <p className="text-sm text-slate-600">Special Instructions (Optional)</p>
              {specialHandlingRequests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {specialHandlingRequests.map((req) => (
                    <span
                      key={req}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {req}
                      <button
                        type="button"
                        onClick={() => handleSpecialHandlingChange(req, false)}
                        className="hover:text-blue-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={specialHandlingRequests.includes('Added Accessorials Require Pre Approval')}
                    onChange={(e) => handleSpecialHandlingChange('Added Accessorials Require Pre Approval', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Added Accessorials Require Pre Approval</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={specialHandlingRequests.includes('Do Not Break Down the Pallet')}
                    onChange={(e) => handleSpecialHandlingChange('Do Not Break Down the Pallet', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Do Not Break Down the Pallet</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={specialHandlingRequests.includes('Do Not Remove Shrink Wrap from Skid')}
                    onChange={(e) => handleSpecialHandlingChange('Do Not Remove Shrink Wrap from Skid', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Do Not Remove Shrink Wrap from Skid</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={specialHandlingRequests.includes('Fragile-Handle with Care')}
                    onChange={(e) => handleSpecialHandlingChange('Fragile-Handle with Care', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Fragile-Handle with Care</span>
                </label>
              </div>
            </div>
          </div>

          {/* Commodities */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('commodities')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Commodities</h3>
                <Info className="text-blue-500" size={20} />
              </div>
              {showSections.commodities ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.commodities && (
              <div className="p-6 space-y-6">
                {handlingUnits.length === 0 && (
                  <button
                    type="button"
                    onClick={addHandlingUnit}
                    className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
                  >
                    <Plus size={16} />
                    ADD HANDLING UNIT
                  </button>
                )}
                {handlingUnits.map((unit, index) => (
                  <div key={unit.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-slate-900">Handling Unit {index + 1}</h4>
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
                        <label className="block text-sm font-semibold text-slate-900">Handling Unit Type</label>
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
                        <label className="block text-sm font-semibold text-slate-900">L (in)</label>
                        <input
                          type="number"
                          value={unit.length}
                          onChange={(e) => updateHandlingUnit(unit.id, 'length', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">W (in)</label>
                        <input
                          type="number"
                          value={unit.width}
                          onChange={(e) => updateHandlingUnit(unit.id, 'width', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">H (in)</label>
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
                    </div>
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-semibold text-slate-900">Pallet Details</h5>
                      {unit.items.map((item, itemIndex) => (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-xs font-semibold text-slate-700">Item {itemIndex + 1}</h6>
                            {unit.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItemFromUnit(unit.id, item.id)}
                                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                              > 
                                Remove
                              </button>
                            )}
                          </div>
                          {/* Pieces and Piece Type on one line */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-semibold text-slate-900">Pieces</label>
                              <input
                                type="number"
                                value={item.pieces}
                                onChange={(e) => {
                                  const updatedItems = unit.items.map((i) =>
                                    i.id === item.id ? { ...i, pieces: parseInt(e.target.value) || 0 } : i
                                  );
                                  updateHandlingUnit(unit.id, 'items', updatedItems);
                                }}
                                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs font-semibold text-slate-900">Piece Type</label>
                              <select
                                value={item.pieceType}
                                onChange={(e) => {
                                  const updatedItems = unit.items.map((i) =>
                                    i.id === item.id ? { ...i, pieceType: e.target.value } : i
                                  );
                                  updateHandlingUnit(unit.id, 'items', updatedItems);
                                }}
                                className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="CARTON">CARTON</option>
                                <option value="BOX">BOX</option>
                                <option value="PALLET">PALLET</option>
                              </select>
                            </div>
                          </div>
                          {/* Description below - resizable textarea */}
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-900">Description</label>
                            <textarea
                              value={item.description}
                              onChange={(e) => {
                                const updatedItems = unit.items.map((i) =>
                                  i.id === item.id ? { ...i, description: e.target.value } : i
                                );
                                updateHandlingUnit(unit.id, 'items', updatedItems);
                              }}
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y min-h-[80px]"
                              placeholder="Enter description..."
                            />
                          </div>
                        </div>
                      ))}
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
                {handlingUnits.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={addHandlingUnit}
                      className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
                    >
                      <Plus size={16} />
                      ADD HANDLING UNIT
                    </button>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
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
                  </>
                )}
              </div>
            )}
          </div>

          {/* Freight Information */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('freightInfo')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-lg font-bold text-slate-900">Freight Information</h3>
              {showSections.freightInfo ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.freightInfo && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fullValueCoverage}
                      onChange={(e) => setFullValueCoverage(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">I would like Full Value Coverage.</span>
                  </label>
                  {fullValueCoverage && (
                    <div className="flex-1 max-w-xs">
                      <label className="block text-sm font-semibold text-slate-900 mb-1">
                        Full Value Coverage (USD)
                      </label>
                      <input
                        type="number"
                        value={fullValueCoverageAmount}
                        onChange={(e) => setFullValueCoverageAmount(e.target.value)}
                        placeholder="Enter Amount ($)"
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Service Options */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('serviceOptions')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-lg font-bold text-slate-900">Service Options</h3>
              {showSections.serviceOptions ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.serviceOptions && (
              <div className="p-6 space-y-4">
                <button
                  type="button"
                  onClick={handleShowRates}
                  className="px-6 py-3 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold"
                >
                  SHOW RATES
                </button>
                <p className="text-sm text-slate-600">
                  Please note: If you modify your shipment details, you must click Show Rates again to update your rates.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {['LTL Standard', 'LTL Guaranteed 5 PM', 'LTL Guaranteed 12 PM', 'LTL Guaranteed 10 AM', 'Estes Retail Guarantee'].map((service) => (
                    <div
                      key={service}
                      className={`p-4 border-2 rounded-lg ${
                        selectedService === service ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <h4 className="font-semibold text-slate-900 mb-2">{service}</h4>
                      <button
                        type="button"
                        onClick={() => setSelectedService(service)}
                        className={`w-full px-4 py-2 rounded-lg font-semibold text-sm ${
                          selectedService === service
                            ? 'bg-slate-300 text-slate-700'
                            : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500'
                        }`}
                      >
                        {selectedService === service ? 'SELECTED' : 'SELECT'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reference Numbers */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('referenceNumbers')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-lg font-bold text-slate-900">Reference Numbers</h3>
              {showSections.referenceNumbers ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.referenceNumbers && (
              <div className="p-6 space-y-4">
                {referenceNumbers.map((ref, index) => (
                  <div key={ref.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Ref #{index + 1} - Type (Optional)
                      </label>
                      <select
                        value={ref.type}
                        onChange={(e) => {
                          const updated = referenceNumbers.map((r) =>
                            r.id === ref.id ? { ...r, type: e.target.value } : r
                          );
                          setReferenceNumbers(updated);
                        }}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="PO">PO</option>
                        <option value="SO">SO</option>
                        <option value="Invoice">Invoice</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Reference # (Optional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ref.value}
                          onChange={(e) => {
                            const updated = referenceNumbers.map((r) =>
                              r.id === ref.id ? { ...r, value: e.target.value } : r
                            );
                            setReferenceNumbers(updated);
                          }}
                          className="flex-1 px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeReferenceNumber(ref.id)}
                          className="px-3 py-2 text-red-600 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addReferenceNumber}
                  className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold flex items-center gap-2"
                >
                  <Plus size={16} />
                  ADD REFERENCE NUMBER
                </button>
                <p className="text-xs text-slate-600">
                  Note: If you choose to schedule a pickup, all reference numbers will be visible to the driver picking up your shipment.
                </p>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('notifications')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
              {showSections.notifications ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showSections.notifications && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bill of Lading & Shipping Labels */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={billOfLadingNotification}
                          onChange={(e) => setBillOfLadingNotification(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-semibold text-slate-900">Bill of Lading</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={shippingLabelsNotification}
                          onChange={(e) => setShippingLabelsNotification(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-semibold text-slate-900">Shipping Labels</span>
                      </label>
                      {shippingLabelsNotification && (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-700">Format: {shippingLabelFormat}</span>
                            <button type="button" className="text-blue-600 hover:underline text-sm">Edit</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-700">Quantity: {shippingLabelQuantity}</span>
                            <Info className="text-blue-500" size={14} />
                          </div>
                          <div className="text-sm text-slate-700">Position: {shippingLabelPosition}</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Send to:</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={notificationSendTo.billOfLading.shipper}
                            onChange={(e) =>
                              setNotificationSendTo({
                                ...notificationSendTo,
                                billOfLading: { ...notificationSendTo.billOfLading, shipper: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">Shipper</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={notificationSendTo.billOfLading.consignee}
                            onChange={(e) =>
                              setNotificationSendTo({
                                ...notificationSendTo,
                                billOfLading: { ...notificationSendTo.billOfLading, consignee: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">Consignee</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={notificationSendTo.billOfLading.thirdParty}
                            onChange={(e) =>
                              setNotificationSendTo({
                                ...notificationSendTo,
                                billOfLading: { ...notificationSendTo.billOfLading, thirdParty: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">Third Party</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Email Addresses (One per line)
                      </label>
                      <textarea
                        value={billOfLadingEmails.join('\n')}
                        onChange={(e) => {
                          const lines = e.target.value.split('\n');
                          setBillOfLadingEmails(lines.length > 0 ? lines : ['']);
                        }}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Enter email addresses, one per line"
                      />
                    </div>
                  </div>

                  {/* Tracking Updates */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={trackingUpdatesNotification}
                          onChange={(e) => setTrackingUpdatesNotification(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-semibold text-slate-900">Tracking Updates</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Send to:</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={notificationSendTo.trackingUpdates.shipper}
                            onChange={(e) =>
                              setNotificationSendTo({
                                ...notificationSendTo,
                                trackingUpdates: { ...notificationSendTo.trackingUpdates, shipper: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">Shipper</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={notificationSendTo.trackingUpdates.consignee}
                            onChange={(e) =>
                              setNotificationSendTo({
                                ...notificationSendTo,
                                trackingUpdates: { ...notificationSendTo.trackingUpdates, consignee: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">Consignee</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={notificationSendTo.trackingUpdates.thirdParty}
                            onChange={(e) =>
                              setNotificationSendTo({
                                ...notificationSendTo,
                                trackingUpdates: { ...notificationSendTo.trackingUpdates, thirdParty: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">Third Party</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Email Addresses (One per line)
                      </label>
                      <textarea
                        value={trackingUpdatesEmails.join('\n')}
                        onChange={(e) => {
                          const lines = e.target.value.split('\n');
                          setTrackingUpdatesEmails(lines.length > 0 ? lines : ['']);
                        }}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Enter email addresses, one per line"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-4 sm:pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onPrevious}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
              Previous
            </button>
            {responseData ? (
              <button
                type="button"
                onClick={onNext}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Generate Pickup Request</span>
                <span className="sm:hidden">Next</span>
                <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? 'Submitting...' : 'SUBMIT BOL'}
                <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            )}
          </div>

          {/* Response Preview */}
          {showResponsePreview && responseData && (
            <div className="mt-6 space-y-4" data-response-preview>
              {/* PDF Preview Section */}
              {responseData?.data?.images?.bol && pdfUrl && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <h3 className="text-lg font-bold text-slate-900">BOL Created Successfully!</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadPDF}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        title="Download PDF"
                      >
                        <Download size={16} />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={printPDF}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                        title="Print PDF"
                      >
                        <Printer size={16} />
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResponsePreview(false);
                          setResponseData(null);
                          setRequestPayload(null);
                        }}
                        className="px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 text-sm"
                      >
                        <X size={16} />
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[600px] border-0 rounded-lg"
                      title="PDF Preview"
                    />
                  </div>
                </div>
              )}
              
              {/* Request Payload Preview Section */}
              {requestPayload && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Request Payload</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(requestPayload, null, 2));
                        }}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
                        title="Copy Payload"
                      >
                        <Copy size={16} />
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-auto max-h-96">
                    <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
                      {JSON.stringify(requestPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* JSON Response Preview Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">JSON Response</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(responseData, null, 2));
                      }}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
                      title="Copy JSON"
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
