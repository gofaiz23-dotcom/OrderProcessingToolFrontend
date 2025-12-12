'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText, X, Loader2, Download, Printer, Copy, Send } from 'lucide-react';
import { buildApiUrl } from '../../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { ESTES_ACCOUNTS, ESTES_BILL_TO_DEFAULTS, ESTES_SHIPPER_ADDRESSES, ESTES_ADDRESS_BOOK, MARKETPLACE_ABBREVIATIONS } from '@/Shared/constant';
import { SearchableDropdown, SearchableDropdownOption } from '@/app/components/shared/SearchableDropdown';
import { ESTESAccountInfo } from './ESTESAccountInfo';
import { ESTESBillingInfo } from './ESTESBillingInfo';
import { ESTESShipmentInfo } from './ESTESShipmentInfo';
import { ESTESRoutingInfo } from './ESTESRoutingInfo';
import { ESTESAccessorials } from './ESTESAccessorials';
import { ESTESCommodities } from './ESTESCommodities';
import { ESTESFreightInfo } from './ESTESFreightInfo';
import { ESTESServiceOptions } from './ESTESServiceOptions';
import { ESTESReferenceNumbers } from './ESTESReferenceNumbers';
import { ESTESNotifications } from './ESTESNotifications';
import { ESTESPickupRequest } from './ESTESPickupRequest';
import type { Order } from '@/app/types/order';

type ESTESBOLFormProps = {
  order: Order;
  subSKUs?: string[];
  quoteData?: {
    quote?: any;
    formData?: any;
  };
  onBack?: () => void;
  onSuccess?: (response: any) => void;
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

// Function to generate Master BOL Number
const generateMasterBolNumber = (orderData: Order): string => {
  if (!orderData?.jsonb) return '';
  
  const orderJsonb = orderData.jsonb as Record<string, unknown>;
  const orderOnMarketPlace = getJsonbValue(orderJsonb, 'Order on Marketplace') || 
                             getJsonbValue(orderJsonb, 'Marketplace') ||
                             getJsonbValue(orderJsonb, 'Market Place');
  
  if (!orderOnMarketPlace) return '';
  
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const currentMonth = new Date().getMonth();
  const monthLetter = months[currentMonth];
  
  const marketplace = orderOnMarketPlace;
  const marketplaceFirstLetter = marketplace.charAt(0).toUpperCase();
  const marketplaceAbbrev = MARKETPLACE_ABBREVIATIONS[marketplace] || marketplace.substring(0, 2).toUpperCase();
  
  const customerName = getJsonbValue(orderJsonb, 'Customer Name');
  if (!customerName) return '';
  
  return `${monthLetter}${marketplaceFirstLetter}-${customerName} ${marketplaceAbbrev}`;
};

export const ESTESBOLForm = ({ order, subSKUs = [], quoteData, onBack, onSuccess }: ESTESBOLFormProps) => {
  const { getToken, isTokenExpired, refreshToken, isSessionActive } = useLogisticsStore();
  const carrier = 'estes';

  // Account Information
  const [myAccount, setMyAccount] = useState(ESTES_ACCOUNTS[0]?.accountNumber || '');
  const [role, setRole] = useState('Third-Party');
  
  // Billing Information
  const [payer, setPayer] = useState('Third Party');
  const [terms, setTerms] = useState('Prepaid');
  
  // Shipment Information
  const [masterBol, setMasterBol] = useState('');
  const [shipDate, setShipDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [quoteId, setQuoteId] = useState('');
  const [autoAssignPro, setAutoAssignPro] = useState(true);
  
  // Origin Information (Shipper)
  const [originAddressBook, setOriginAddressBook] = useState('');
  const [originAccount, setOriginAccount] = useState('');
  const [originName, setOriginName] = useState('');
  const [originAddress1, setOriginAddress1] = useState('');
  const [originAddress2, setOriginAddress2] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originZipCode, setOriginZipCode] = useState('');
  const [originCountry, setOriginCountry] = useState('USA');
  const [originContactName, setOriginContactName] = useState('');
  const [originPhone, setOriginPhone] = useState('');
  const [originEmail, setOriginEmail] = useState('');
  const [originLoadingZip, setOriginLoadingZip] = useState(false);
  
  // Destination Information (Consignee)
  const [destinationAddressBook, setDestinationAddressBook] = useState('');
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
  
  // Bill To Information
  const [billToAddressBook, setBillToAddressBook] = useState('');
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
  
  // Accessorials
  const [selectedAccessorials, setSelectedAccessorials] = useState<string[]>([]);
  const [appointmentRequest, setAppointmentRequest] = useState(false);
  const [liftGateService, setLiftGateService] = useState(false);
  const [residentialDelivery, setResidentialDelivery] = useState(false);
  
  // Special Handling Requests - Auto-select all by default
  const [specialHandlingRequests, setSpecialHandlingRequests] = useState<string[]>([
    'Added Accessorials Require Pre Approval',
    'Do Not Break Down the Pallet',
    'Do Not Remove Shrink Wrap from Skid',
    'Fragile-Handle with Care',
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
  const [billOfLadingEmails, setBillOfLadingEmails] = useState<string[]>(['gofaiz23@gmail.com']);
  const [trackingUpdatesEmails, setTrackingUpdatesEmails] = useState<string[]>(['gofaiz23@gmail.com']);
  const [notificationSendTo, setNotificationSendTo] = useState({
    billOfLading: { shipper: true, consignee: true, thirdParty: false },
    shippingLabels: { shipper: true, consignee: true, thirdParty: false },
    trackingUpdates: { shipper: true, consignee: true, thirdParty: false },
  });
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [showResponsePreview, setShowResponsePreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [requestPayload, setRequestPayload] = useState<any>(null);
  const [showPickupRequest, setShowPickupRequest] = useState(false);
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

  // Helper function to format description with subSKUs
  const formatDescriptionWithSubSKUs = useCallback((description: string): string => {
    if (subSKUs.length === 0) {
      return description;
    }
    const baseDescription = 'KD Furniture Items -';
    const subSKUsString = subSKUs.join(', ');
    const formattedDescription = `${baseDescription} ${subSKUsString}`;
    
    const itemDescLower = description.toLowerCase();
    const baseDescLower = baseDescription.toLowerCase();
    const shouldUpdate = 
      !description || 
      description === '' || 
      description.trim() === '' ||
      description === baseDescription ||
      itemDescLower === baseDescLower ||
      (description.startsWith(baseDescription) && !description.includes(subSKUsString)) ||
      (itemDescLower.startsWith(baseDescLower) && !description.includes(subSKUsString));
    
    return shouldUpdate ? formattedDescription : description;
  }, [subSKUs]);

  // Auto-fill Master BOL Number
  useEffect(() => {
    if (order && !masterBol) {
      const generatedBol = generateMasterBolNumber(order);
      if (generatedBol) {
        setMasterBol(generatedBol);
      }
    }
  }, [order, masterBol]);

  // Prefill from quote data
  useEffect(() => {
    if (quoteData?.formData) {
      const data = quoteData.formData;
      
      if (data.myAccount) setMyAccount(data.myAccount);
      if (data.role) setRole(data.role);
      if (data.term) setTerms(data.term);
      // Ship Date always defaults to today's date, user can change it manually
      if (data.destinationCity) setDestinationCity(data.destinationCity);
      if (data.destinationState) setDestinationState(data.destinationState);
      if (data.destinationZipCode) setDestinationZipCode(data.destinationZipCode);
      if (data.destinationCountry) setDestinationCountry(data.destinationCountry);
      if (data.handlingUnits) {
        // Apply subSKUs to descriptions if available using the helper function
        const updatedUnits = data.handlingUnits.map((unit: any) => {
          // Handle both unit-level description (from EstesRateQuote) and item-level descriptions
          const unitDescription = (unit as any).description || '';
          const formattedUnitDescription = formatDescriptionWithSubSKUs(unitDescription);
          
          // If items exist, update their descriptions
          // If no items exist but there's a unit description, create an item with that description
          let items = unit.items || [];
          if (items.length === 0 && formattedUnitDescription) {
            // Create a default item with the formatted description
            items = [{
              id: Date.now().toString(),
              description: formattedUnitDescription,
              pieces: 1,
              pieceType: 'CARTON'
            }];
          } else {
            // Update existing items' descriptions
            items = items.map((item: any) => ({
              ...item,
              description: formatDescriptionWithSubSKUs(item.description || unitDescription || ''),
            }));
          }
          
          // Remove unit-level description if it exists (ESTESBOLForm doesn't use it)
          const { description: _, ...unitWithoutDescription } = unit;
          
          return {
            ...unitWithoutDescription,
            items,
          } as HandlingUnit;
        });
        setHandlingUnits(updatedUnits);
      }
      if (data.liftGateService) setLiftGateService(true);
      if (data.residentialDelivery) setResidentialDelivery(true);
      if (data.appointmentRequest) setAppointmentRequest(true);
    }
    
    if (quoteData?.quote?.quoteId) {
      setQuoteId(quoteData.quote.quoteId);
    }
  }, [quoteData, subSKUs, formatDescriptionWithSubSKUs]);

  // Auto-populate destination from order data
  useEffect(() => {
    if (!order?.jsonb) return;
    const orderJsonb = order.jsonb as Record<string, unknown>;
    
    const customerName = getJsonbValue(orderJsonb, 'Customer Name');
    if (customerName && !destinationName) setDestinationName(customerName);
    
    const shipToAddress = getJsonbValue(orderJsonb, 'Ship to Address 1') ||
                         getJsonbValue(orderJsonb, 'Shipping Address');
    if (shipToAddress && !destinationAddress1) setDestinationAddress1(shipToAddress);
    
    const shipToCity = getJsonbValue(orderJsonb, 'Ship to City') ||
                      getJsonbValue(orderJsonb, 'Shipping City');
    if (shipToCity && !destinationCity) setDestinationCity(shipToCity);
    
    const shipToState = getJsonbValue(orderJsonb, 'Ship to State') ||
                       getJsonbValue(orderJsonb, 'Shipping State');
    if (shipToState && !destinationState) setDestinationState(shipToState);
    
    const shipToZip = getJsonbValue(orderJsonb, 'Ship to Zip Code') ||
                     getJsonbValue(orderJsonb, 'Shipping Zip Code');
    if (shipToZip && !destinationZipCode) setDestinationZipCode(shipToZip);
    
    const customerPhone = getJsonbValue(orderJsonb, 'Customer Phone Number') ||
                         getJsonbValue(orderJsonb, 'Phone');
    if (customerPhone && !destinationPhone) setDestinationPhone(customerPhone);
  }, [order]);

  // ZIP code lookup functions
  const lookupZipCode = async (zipCode: string, type: 'origin' | 'destination' | 'billTo') => {
    if (!zipCode || zipCode.length < 5) return;
    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    if (type === 'origin') setOriginLoadingZip(true);
    else if (type === 'destination') setDestinationLoadingZip(true);
    else setBillToLoadingZip(true);

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${cleanedZip}`);
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place['place name'];
          const state = place['state abbreviation'];
          
          if (type === 'origin') {
            setOriginCity(city);
            setOriginState(state);
            setOriginCountry('USA');
          } else if (type === 'destination') {
            setDestinationCity(city);
            setDestinationState(state);
            setDestinationCountry('USA');
          } else {
            setBillToCity(city);
            setBillToState(state);
            setBillToCountry('USA');
          }
        }
      }
    } catch (error) {
      // Silently fail
    } finally {
      if (type === 'origin') setOriginLoadingZip(false);
      else if (type === 'destination') setDestinationLoadingZip(false);
      else setBillToLoadingZip(false);
    }
  };

  useEffect(() => {
    if (originZipCode && originZipCode.length >= 5) {
      const timeoutId = setTimeout(() => lookupZipCode(originZipCode, 'origin'), 800);
      return () => clearTimeout(timeoutId);
    }
  }, [originZipCode]);

  useEffect(() => {
    if (destinationZipCode && destinationZipCode.length >= 5) {
      const timeoutId = setTimeout(() => lookupZipCode(destinationZipCode, 'destination'), 800);
      return () => clearTimeout(timeoutId);
    }
  }, [destinationZipCode]);

  useEffect(() => {
    if (billToZipCode && billToZipCode.length >= 5) {
      const timeoutId = setTimeout(() => lookupZipCode(billToZipCode, 'billTo'), 800);
      return () => clearTimeout(timeoutId);
    }
  }, [billToZipCode]);

  // Update item descriptions with subSKUs whenever subSKUs or handlingUnits change
  useEffect(() => {
    if (subSKUs.length > 0) {
      setHandlingUnits((prevUnits) => {
        // If no units exist and we have subSKUs, don't auto-create - let user add manually
        if (prevUnits.length === 0) {
          return prevUnits;
        }
        
        const hasChanges = prevUnits.some(unit => 
          unit.items.some(item => {
            const formatted = formatDescriptionWithSubSKUs(item.description);
            return formatted !== item.description;
          })
        );
        
        if (!hasChanges) {
          return prevUnits; // No changes needed
        }
        
        // Update existing units' item descriptions
        return prevUnits.map((unit) => ({
          ...unit,
          items: unit.items.length > 0 
            ? unit.items.map((item) => ({
                ...item,
                description: formatDescriptionWithSubSKUs(item.description),
              }))
            : [{
                id: Date.now().toString(),
                description: formatDescriptionWithSubSKUs(''),
                pieces: 1,
                pieceType: 'CARTON'
              }],
        }));
      });
    }
  }, [subSKUs, handlingUnits.length, formatDescriptionWithSubSKUs]);

  const toggleSection = (section: string) => {
    setShowSections({ ...showSections, [section]: !showSections[section] });
  };

  const handleAccessorialChange = (accessorial: string, checked: boolean) => {
    if (checked) {
      setSelectedAccessorials([...selectedAccessorials, accessorial]);
    } else {
      setSelectedAccessorials(selectedAccessorials.filter((a) => a !== accessorial));
    }
    // Sync with individual state variables
    if (accessorial === 'Appointment Request') {
      setAppointmentRequest(checked);
    } else if (accessorial === 'Lift-Gate Service (Delivery)') {
      setLiftGateService(checked);
    } else if (accessorial === 'Residential Delivery') {
      setResidentialDelivery(checked);
    }
  };

  const addHandlingUnit = () => {
    const defaultDescription = formatDescriptionWithSubSKUs('');
    
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
      items: [{ 
        id: Date.now().toString(), 
        description: defaultDescription, 
        pieces: 1, 
        pieceType: 'CARTON' 
      }],
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
    const defaultDescription = formatDescriptionWithSubSKUs('');
    
    setHandlingUnits(
      handlingUnits.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              items: [...unit.items, { id: Date.now().toString(), description: defaultDescription, pieces: 1, pieceType: 'CARTON' }],
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

  const buildRequestBody = () => {
    const accessorialCodes: Record<string, string> = {
      'Appointment Request': 'APPT',
      'Lift-Gate Service (Delivery)': 'LFTD',
      'Residential Delivery': 'RES',
    };

    const accessorialCodesList = selectedAccessorials
      .map((acc) => accessorialCodes[acc])
      .filter(Boolean);

    const handlingUnitsData = handlingUnits.map((unit) => {
      const typeMap: Record<string, string> = {
        'PALLET': 'PAT',
        'SKID': 'SKD',
        'CRATE': 'CRT',
        'BOX': 'BOX',
      };
      
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

    const specialInstructions = specialHandlingRequests.length > 0 
      ? specialHandlingRequests.join(',') 
      : undefined;

    const billOfLadingEmailsList = billOfLadingEmails.filter((email) => email.trim() !== '');
    const trackingUpdatesEmailsList = trackingUpdatesEmails.filter((email) => email.trim() !== '');
    const allNotificationEmails = [...new Set([...billOfLadingEmailsList, ...trackingUpdatesEmailsList])];

    const referenceNumbersObj: any = {};
    if (masterBol && masterBol.trim()) {
      referenceNumbersObj.masterBol = masterBol.trim();
    }
    if (quoteId && quoteId.trim()) {
      referenceNumbersObj.quoteID = quoteId.trim();
    }

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
        codes: accessorialCodesList.length > 0 ? accessorialCodesList : [],
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

    if (shipDate) {
      body.bol.requestedPickupDate = `${shipDate}T00:00:00.000`;
    }
    if (specialInstructions) {
      body.bol.specialInstructions = specialInstructions;
    }
    if (originAddress2 && originAddress2.trim()) {
      body.origin.address2 = originAddress2.trim();
    }
    if ((originPhone && originPhone.trim()) || (originEmail && originEmail.trim())) {
      body.origin.contact = originContact;
    }
    if (destinationAddress2 && destinationAddress2.trim()) {
      body.destination.address2 = destinationAddress2.trim();
    }
    if ((destinationPhone && destinationPhone.trim()) || (destinationEmail && destinationEmail.trim())) {
      body.destination.contact = destinationContact;
    }
    if (billToAddress2 && billToAddress2.trim()) {
      body.billTo.address2 = billToAddress2.trim();
    }
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
    
    const normalizedCarrier = carrier.toLowerCase();
    let token = getToken(normalizedCarrier);
    
    if (!token || isTokenExpired(normalizedCarrier, 10)) {
      if (isSessionActive()) {
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

    // Validation
    const validationErrors: string[] = [];
    if (!shipDate) validationErrors.push('Ship Date is required');
    if (!originName || !originName.trim()) validationErrors.push('Origin Company Name is required');
    if (!originAddress1 || !originAddress1.trim()) validationErrors.push('Origin Address Line 1 is required');
    if (!originCity || !originCity.trim()) validationErrors.push('Origin City is required');
    if (!originState || !originState.trim()) validationErrors.push('Origin State is required');
    if (!originZipCode || !originZipCode.trim()) validationErrors.push('Origin ZIP Code is required');
    if (!originPhone || !originPhone.trim()) validationErrors.push('Origin Phone Number is required');
    if (!destinationName || !destinationName.trim()) validationErrors.push('Destination Company Name is required');
    if (!destinationAddress1 || !destinationAddress1.trim()) validationErrors.push('Destination Address Line 1 is required');
    if (!destinationCity || !destinationCity.trim()) validationErrors.push('Destination City is required');
    if (!destinationState || !destinationState.trim()) validationErrors.push('Destination State is required');
    if (!destinationZipCode || !destinationZipCode.trim()) validationErrors.push('Destination ZIP Code is required');
    if (!destinationPhone || !destinationPhone.trim()) validationErrors.push('Destination Phone Number is required');
    if (!billToName || !billToName.trim()) validationErrors.push('Bill To Company Name is required');
    if (!billToAddress1 || !billToAddress1.trim()) validationErrors.push('Bill To Address Line 1 is required');
    if (!billToCity || !billToCity.trim()) validationErrors.push('Bill To City is required');
    if (!billToState || !billToState.trim()) validationErrors.push('Bill To State is required');
    if (!billToZipCode || !billToZipCode.trim()) validationErrors.push('Bill To ZIP Code is required');
    if (!billToPhone || !billToPhone.trim()) validationErrors.push('Bill To Phone Number is required');
    if (handlingUnits.length === 0) validationErrors.push('At least one handling unit is required');
    
    handlingUnits.forEach((unit, index) => {
      if (unit.items.length === 0) {
        validationErrors.push(`Handling Unit ${index + 1}: At least one item is required`);
      } else {
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
      const shippingCompany = normalizedCarrier === 'estes' ? 'estes' : normalizedCarrier;
      const payload = {
        shippingCompany: shippingCompany,
        ...requestBody,
      };

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
        let errorMessage = 'Please check your form data and try again.';
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
          // Use default message
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResponseData(data);
      setShowResponsePreview(true);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please check your form data and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create PDF URL from Base64
  useEffect(() => {
    if (responseData?.data?.images?.bol) {
      try {
        const base64String = responseData.data.images.bol;
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        setPdfUrl(null);
      }
    } else {
      setPdfUrl(null);
    }
  }, [responseData]);

  const downloadPDF = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    const proNumber = responseData?.data?.referenceNumbers?.pro || 'BOL';
    link.download = `BillOfLading_${proNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Bill of Lading</h3>
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Quotes
          </button>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Information */}
            <ESTESAccountInfo
              myAccount={myAccount}
              role={role}
              onAccountChange={setMyAccount}
              onRoleChange={setRole}
              isExpanded={showSections.accountInfo}
              onToggle={() => toggleSection('accountInfo')}
            />

            {/* Billing Information */}
            <ESTESBillingInfo
              payer={payer}
              terms={terms}
              onPayerChange={setPayer}
              onTermsChange={setTerms}
              isExpanded={showSections.billingInfo}
              onToggle={() => toggleSection('billingInfo')}
            />

            {/* Shipment Information */}
            <ESTESShipmentInfo
              masterBol={masterBol}
              shipDate={shipDate}
              quoteId={quoteId}
              autoAssignPro={autoAssignPro}
              onMasterBolChange={setMasterBol}
              onShipDateChange={setShipDate}
              onQuoteIdChange={setQuoteId}
              onAutoAssignProChange={setAutoAssignPro}
              isExpanded={showSections.shipmentInfo}
              onToggle={() => toggleSection('shipmentInfo')}
              showQuoteSection={!!quoteId}
            />

            {/* Routing Information */}
            <ESTESRoutingInfo
              originAddressBook={originAddressBook}
              originAccount={originAccount}
              originName={originName}
              originAddress1={originAddress1}
              originAddress2={originAddress2}
              originCity={originCity}
              originState={originState}
              originZipCode={originZipCode}
              originCountry={originCountry}
              originContactName={originContactName}
              originPhone={originPhone}
              originEmail={originEmail}
              originLoadingZip={originLoadingZip}
              onOriginChange={(field, value) => {
                const fieldMap: Record<string, () => void> = {
                  name: () => setOriginName(value),
                  address1: () => setOriginAddress1(value),
                  address2: () => setOriginAddress2(value),
                  city: () => setOriginCity(value),
                  state: () => setOriginState(value),
                  zipCode: () => setOriginZipCode(value),
                  country: () => setOriginCountry(value),
                  contactName: () => setOriginContactName(value),
                  phone: () => setOriginPhone(value),
                  email: () => setOriginEmail(value),
                  account: () => setOriginAccount(value),
                };
                fieldMap[field]?.();
              }}
              onOriginAddressBookChange={setOriginAddressBook}
              destinationAddressBook={destinationAddressBook}
              destinationName={destinationName}
              destinationAddress1={destinationAddress1}
              destinationAddress2={destinationAddress2}
              destinationCity={destinationCity}
              destinationState={destinationState}
              destinationZipCode={destinationZipCode}
              destinationCountry={destinationCountry}
              destinationContactName={destinationContactName}
              destinationPhone={destinationPhone}
              destinationEmail={destinationEmail}
              destinationLoadingZip={destinationLoadingZip}
              onDestinationChange={(field, value) => {
                const fieldMap: Record<string, () => void> = {
                  name: () => setDestinationName(value),
                  address1: () => setDestinationAddress1(value),
                  address2: () => setDestinationAddress2(value),
                  city: () => setDestinationCity(value),
                  state: () => setDestinationState(value),
                  zipCode: () => setDestinationZipCode(value),
                  country: () => setDestinationCountry(value),
                  contactName: () => setDestinationContactName(value),
                  phone: () => setDestinationPhone(value),
                  email: () => setDestinationEmail(value),
                };
                fieldMap[field]?.();
              }}
              onDestinationAddressBookChange={(value) => {
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
              billToAddressBook={billToAddressBook}
              billToAccount={billToAccount}
              billToName={billToName}
              billToAddress1={billToAddress1}
              billToAddress2={billToAddress2}
              billToCity={billToCity}
              billToState={billToState}
              billToZipCode={billToZipCode}
              billToCountry={billToCountry}
              billToContactName={billToContactName}
              billToPhone={billToPhone}
              billToEmail={billToEmail}
              billToLoadingZip={billToLoadingZip}
              onBillToChange={(field, value) => {
                const fieldMap: Record<string, () => void> = {
                  name: () => setBillToName(value),
                  address1: () => setBillToAddress1(value),
                  address2: () => setBillToAddress2(value),
                  city: () => setBillToCity(value),
                  state: () => setBillToState(value),
                  zipCode: () => setBillToZipCode(value),
                  country: () => setBillToCountry(value),
                  contactName: () => setBillToContactName(value),
                  phone: () => setBillToPhone(value),
                  email: () => setBillToEmail(value),
                };
                fieldMap[field]?.();
              }}
              onBillToAddressBookChange={(value) => {
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
              isExpanded={showSections.routingInfo}
              onToggle={() => toggleSection('routingInfo')}
            />

            {/* Accessorials */}
            <ESTESAccessorials
              selectedAccessorials={selectedAccessorials}
              appointmentRequest={appointmentRequest}
              liftGateService={liftGateService}
              residentialDelivery={residentialDelivery}
              specialHandlingRequests={specialHandlingRequests}
              onAccessorialChange={handleAccessorialChange}
              onSpecialHandlingChange={(request, checked) => {
                if (checked) {
                  setSpecialHandlingRequests([...specialHandlingRequests, request]);
                } else {
                  setSpecialHandlingRequests(specialHandlingRequests.filter((r) => r !== request));
                }
              }}
              isExpanded={showSections.accessorials}
              onToggle={() => toggleSection('accessorials')}
            />

            {/* Commodities */}
            <ESTESCommodities
              handlingUnits={handlingUnits}
              onAddHandlingUnit={addHandlingUnit}
              onUpdateHandlingUnit={updateHandlingUnit}
              onRemoveHandlingUnit={removeHandlingUnit}
              onAddItemToUnit={addItemToUnit}
              onRemoveItemFromUnit={removeItemFromUnit}
              isExpanded={showSections.commodities}
              onToggle={() => toggleSection('commodities')}
            />

            {/* Freight Information */}
            <ESTESFreightInfo
              fullValueCoverage={fullValueCoverage}
              fullValueCoverageAmount={fullValueCoverageAmount}
              onFullValueCoverageChange={setFullValueCoverage}
              onFullValueCoverageAmountChange={setFullValueCoverageAmount}
              isExpanded={showSections.freightInfo}
              onToggle={() => toggleSection('freightInfo')}
            />

            {/* Service Options */}
            <ESTESServiceOptions
              selectedService={selectedService}
              onServiceChange={setSelectedService}
              onShowRates={() => setSelectedService('LTL Standard')}
              isExpanded={showSections.serviceOptions}
              onToggle={() => toggleSection('serviceOptions')}
            />

            {/* Reference Numbers */}
            <ESTESReferenceNumbers
              referenceNumbers={referenceNumbers}
              onAddReferenceNumber={() => {
                setReferenceNumbers([
                  ...referenceNumbers,
                  { id: Date.now().toString(), type: '', value: '' },
                ]);
              }}
              onRemoveReferenceNumber={(id) => {
                setReferenceNumbers(referenceNumbers.filter((ref) => ref.id !== id));
              }}
              onUpdateReferenceNumber={(id, field, value) => {
                setReferenceNumbers(
                  referenceNumbers.map((ref) => (ref.id === id ? { ...ref, [field]: value } : ref))
                );
              }}
              isExpanded={showSections.referenceNumbers}
              onToggle={() => toggleSection('referenceNumbers')}
            />

            {/* Notifications */}
            <ESTESNotifications
              billOfLadingNotification={billOfLadingNotification}
              shippingLabelsNotification={shippingLabelsNotification}
              trackingUpdatesNotification={trackingUpdatesNotification}
              shippingLabelFormat={shippingLabelFormat}
              shippingLabelQuantity={shippingLabelQuantity}
              shippingLabelPosition={shippingLabelPosition}
              billOfLadingEmails={billOfLadingEmails}
              trackingUpdatesEmails={trackingUpdatesEmails}
              notificationSendTo={notificationSendTo}
              onBillOfLadingNotificationChange={setBillOfLadingNotification}
              onShippingLabelsNotificationChange={setShippingLabelsNotification}
              onTrackingUpdatesNotificationChange={setTrackingUpdatesNotification}
              onShippingLabelFormatChange={setShippingLabelFormat}
              onShippingLabelQuantityChange={setShippingLabelQuantity}
              onShippingLabelPositionChange={setShippingLabelPosition}
              onBillOfLadingEmailsChange={setBillOfLadingEmails}
              onTrackingUpdatesEmailsChange={setTrackingUpdatesEmails}
              onNotificationSendToChange={setNotificationSendTo}
              isExpanded={showSections.notifications}
              onToggle={() => toggleSection('notifications')}
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold text-sm disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'SUBMIT BOL'
                )}
              </button>
            </div>
          </form>

          {/* Response Preview */}
          {showResponsePreview && responseData && (
            <div className="mt-6 space-y-4">
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
                      >
                        <Download size={16} />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={printPDF}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Printer size={16} />
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResponsePreview(false);
                          setResponseData(null);
                          setShowPickupRequest(false);
                        }}
                        className="px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 text-sm"
                      >
                        <X size={16} />
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPickupRequest(true)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Send size={16} />
                        Schedule Pickup
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
            </div>
          )}

          {/* Pickup Request Form - Show after BOL is created */}
          {showPickupRequest && (
            <div className="mt-8 pt-8 border-t-2 border-slate-300">
              <ESTESPickupRequest
                bolData={{
                  originName,
                  originAddress1,
                  originAddress2,
                  originZipCode,
                  originCountry,
                  originContactName,
                  originPhone,
                  originEmail,
                  handlingUnits: handlingUnits.map(unit => ({
                    quantity: unit.quantity,
                    weight: unit.weight,
                    handlingUnitType: unit.handlingUnitType,
                  })),
                  destinationZipCode,
                  hazmat: handlingUnits.some(unit => unit.items.some(item => item.description.toLowerCase().includes('hazmat'))),
                  protectFromFreezing: specialHandlingRequests.some(req => req.toLowerCase().includes('freez')),
                  food: false,
                  poison: false,
                  overlength: false,
                  liftgate: liftGateService,
                  doNotStack: handlingUnits.some(unit => unit.doNotStack),
                }}
                onSuccess={(automationId) => {
                  console.log('Pickup request created:', automationId);
                }}
                onCancel={() => setShowPickupRequest(false)}
              />
            </div>
          )}
        </div>
      </div>
  );
};

