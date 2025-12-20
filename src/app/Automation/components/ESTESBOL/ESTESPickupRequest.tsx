'use client';

import { useState, useEffect, useMemo } from 'react';
import { Send, Loader2, CheckCircle2, XCircle, Plus, Trash2, ChevronUp, ChevronDown, TrendingUp } from 'lucide-react';
import { createEstesPickupRequest, getAllEstesPickupStatus, type EstesPickupData, type EstesPickupStatusItem } from '@/app/api/3plGigaFedexApi/estesPickupApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { createShippedOrder, updateShippedOrder, getAllShippedOrders } from '@/app/ProcessedOrders/utils/shippedOrdersApi';
import type { Order } from '@/app/types/order';
import { dispatchPickupData } from '../../utils/ltlOrderCache';
import { logger } from '@/utils/logger';
import { useLogisticsStore } from '@/store/logisticsStore';
import { ESTES_ACCOUNTS, ESTES_SHIPPER_DEFAULTS, ESTES_SHIPPER_ADDRESSES } from '@/Shared/constant';
import { Toast } from '@/app/components/shared/Toast';

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

// Types matching API payload structure
type AddressItem = {
  id: string;
  addressType: string; // "C", "PICKUP", "DOCK"
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  postalCode4: string;
  countryAbbrev: string;
};

type ContactItem = {
  id: string;
  contactType: string; // "S", "REQUESTER", "DOCK"
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneAreaCode: string;
  phoneNumber: string;
  phoneExtension: string;
  faxAreaCode: string;
  faxNumber: string;
  receiveNotifications: string; // "Y", "N"
  notificationMethod: string; // "E", "EMAIL"
};

type CommodityItem = {
  id: string;
  code: string; // "MISC"
  packageCode: string; // "BX", "PAT"
  description: string;
  pieces: string;
  weight: string;
  nmfcNumber: string;
  nmfcSubNumber: string;
};

type NotificationItem = {
  id: string;
  type: string; // "RCV", "REJECTED", "ACCEPTED", "COMPLETED"
};

type FormSectionProps = {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string; // Allow passing extra classes if needed
};

const FormSection = ({ title, isExpanded, onToggle, children, className = '' }: FormSectionProps) => {
  return (
    <div className={`border border-slate-200 rounded-lg overflow-visible bg-white ${className}`}>
      <div
        className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer rounded-t-lg"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 flex-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center p-1 hover:bg-slate-200 rounded-full transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="text-slate-600" size={20} />
          ) : (
            <ChevronDown className="text-slate-600" size={20} />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
};

type ESTESPickupRequestProps = {
  order?: Order;
  bolData?: {
    originAccount?: string;
    originName?: string;
    originAddress1?: string;
    originAddress2?: string;
    originCity?: string;
    originState?: string;
    originZipCode?: string;
    originCountry?: string;
    originContactName?: string;
    originPhone?: string;
    originEmail?: string;
    handlingUnits?: Array<{
      quantity: number;
      weight: number;
      handlingUnitType: string;
    }>;
    destinationZipCode?: string;
    hazmat?: boolean;
    protectFromFreezing?: boolean;
    food?: boolean;
    poison?: boolean;
    overlength?: boolean;
    liftgate?: boolean;
    doNotStack?: boolean;
  };
  onSuccess?: (automationId: string) => void;
  onCancel?: () => void;
};

export const ESTESPickupRequest = ({ order, bolData, onSuccess, onCancel }: ESTESPickupRequestProps) => {
  const { getToken } = useLogisticsStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);
  const [automationId, setAutomationId] = useState<string | null>(null);
  const [requestPayload, setRequestPayload] = useState<EstesPickupData | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Shipper Information - Initialize with defaults from constants
  const [shipperName, setShipperName] = useState(ESTES_SHIPPER_DEFAULTS.companyName || '');
  const [accountCode, setAccountCode] = useState(ESTES_ACCOUNTS[0]?.accountNumber || '');
  const [shipperAddressLine1, setShipperAddressLine1] = useState(ESTES_SHIPPER_DEFAULTS.address1 || '');
  const [shipperAddressLine2, setShipperAddressLine2] = useState(ESTES_SHIPPER_DEFAULTS.address2 || '');
  const [shipperCity, setShipperCity] = useState(ESTES_SHIPPER_DEFAULTS.city || '');
  const [shipperStateProvince, setShipperStateProvince] = useState(ESTES_SHIPPER_DEFAULTS.state || '');
  const [shipperPostalCode, setShipperPostalCode] = useState(ESTES_SHIPPER_DEFAULTS.zipCode || '');
  const [shipperPostalCode4, setShipperPostalCode4] = useState('0000');
  const [shipperCountryAbbrev, setShipperCountryAbbrev] = useState(ESTES_SHIPPER_DEFAULTS.country === 'USA' ? 'US' : 'US');

  // Request Details
  const [requestAction, setRequestAction] = useState('LL'); // "LL", "CREATE"
  const [paymentTerms, setPaymentTerms] = useState('PPD'); // "PPD", "PREPAID"
  const [pickupDate, setPickupDate] = useState('');
  const [pickupStartTime, setPickupStartTime] = useState('0800'); // HHMM format
  const [pickupEndTime, setPickupEndTime] = useState('1600'); // HHMM format (4 PM)
  const [totalPieces, setTotalPieces] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [totalHandlingUnits, setTotalHandlingUnits] = useState('');
  const [hazmatFlag, setHazmatFlag] = useState('N'); // "Y", "N"
  const [expeditedCode, setExpeditedCode] = useState('G');
  // whoRequested is derived from role: S = Shipper, C = Consignee, 3 = Third Party, 4 = Other
  // Estes API accepts: S, C, 3, or 4

  // Addresses array
  const [addresses, setAddresses] = useState<AddressItem[]>([
    {
      id: '1',
      addressType: 'C',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateProvince: '',
      postalCode: '',
      postalCode4: '0000',
      countryAbbrev: 'US',
    },
  ]);

  // Contacts array - Initialize with defaults from constants
  const parseContactName = (name: string) => {
    const parts = name.split('/');
    if (parts.length > 1) {
      return { firstName: parts[0]?.trim() || '', lastName: parts[1]?.trim() || '' };
    }
    const nameParts = name.trim().split(' ');
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
    };
  };

  const parsePhone = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return {
        areaCode: digits.substring(0, 3),
        number: digits.substring(3, 10),
      };
    }
    return { areaCode: '', number: '' };
  };

  const defaultContactName = parseContactName(ESTES_SHIPPER_DEFAULTS.contactName || '');
  const defaultPhone = parsePhone(ESTES_SHIPPER_DEFAULTS.phone || '');

  const [contacts, setContacts] = useState<ContactItem[]>([
    {
      id: '1',
      contactType: 'S',
      firstName: defaultContactName.firstName,
      middleName: '',
      lastName: defaultContactName.lastName,
      email: ESTES_SHIPPER_DEFAULTS.email || '',
      phoneAreaCode: defaultPhone.areaCode,
      phoneNumber: defaultPhone.number,
      phoneExtension: '',
      faxAreaCode: '',
      faxNumber: '',
      receiveNotifications: 'Y',
      notificationMethod: 'E',
    },
  ]);

  // Commodities array - Initialize with defaults from constants
  const [commodities, setCommodities] = useState<CommodityItem[]>([
    {
      id: '1',
      code: 'MISC',
      packageCode: 'BX',
      description: 'KD furniture', // Default from constants
      pieces: '1',
      weight: '',
      nmfcNumber: '079300', // Default from constants
      nmfcSubNumber: '03', // Default from constants
    },
  ]);

  // Notifications array
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: '1', type: 'RCV' },
  ]);

  // Account Information
  const [selectedAccount, setSelectedAccount] = useState('');
  const [role, setRole] = useState('T'); // S = Shipper, C = Consignee, T = Third-Party, O = Other

  // Requester Details - Initialize with defaults from constants
  const [requesterAddressBook, setRequesterAddressBook] = useState('');
  const [requesterContactName, setRequesterContactName] = useState(ESTES_SHIPPER_DEFAULTS.contactName || '');
  const [requesterEmail, setRequesterEmail] = useState(ESTES_SHIPPER_DEFAULTS.email || '');
  const [requesterPhone, setRequesterPhone] = useState(ESTES_SHIPPER_DEFAULTS.phone || '');
  const [requesterExtension, setRequesterExtension] = useState('');

  // Pickup Location
  const [pickupAddressBook, setPickupAddressBook] = useState('');
  const [pickupCompanyName, setPickupCompanyName] = useState('');
  const [pickupAddressLine1, setPickupAddressLine1] = useState('');
  const [pickupAddressLine2, setPickupAddressLine2] = useState('');
  const [pickupZipCode, setPickupZipCode] = useState('');
  const [pickupCountry, setPickupCountry] = useState('USA');

  // Dock Contact
  const [useRequesterInfo, setUseRequesterInfo] = useState(false);
  const [dockAddressBook, setDockAddressBook] = useState('');
  const [dockContactName, setDockContactName] = useState('');
  const [dockEmail, setDockEmail] = useState('');
  const [dockPhone, setDockPhone] = useState('');
  const [dockExtension, setDockExtension] = useState('');

  // Pickup Type
  const [pickupType, setPickupType] = useState('LL'); // LL = Live Load, HL = Hook Loaded

  // Shipment Information (for Live Load)
  type ShipmentItem = {
    id: string;
    type: string;
    handlingUnits: string;
    weight: string;
    destinationZip: string;
  };
  const [shipments, setShipments] = useState<ShipmentItem[]>([
    { id: '1', type: 'PALLET', handlingUnits: '', weight: '', destinationZip: '' },
  ]);

  // Freight Characteristics
  const [hazmat, setHazmat] = useState(false);
  const [protectFromFreezing, setProtectFromFreezing] = useState(false);
  const [food, setFood] = useState(false);
  const [poison, setPoison] = useState(false);
  const [overlength, setOverlength] = useState(false);
  const [liftgate, setLiftgate] = useState(false);
  const [doNotStack, setDoNotStack] = useState(false);

  // Time Critical
  const [guaranteed, setGuaranteed] = useState(false);
  const [pickupInstructions, setPickupInstructions] = useState('');

  // Pickup Notifications
  const [emailForRejected, setEmailForRejected] = useState(true);
  const [emailForAccepted, setEmailForAccepted] = useState(true);
  const [emailForCompleted, setEmailForCompleted] = useState(false);
  type AdditionalContact = {
    id: string;
    name: string;
    email: string;
  };
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([
    { id: '1', name: '', email: '' },
  ]);

  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    accountInfo: true,
    requesterPickup: true,
    dockContact: true,
    pickupDetails: true,
    shipmentInfo: true,
    freightCharacteristics: true,
    timeCritical: true,
    pickupNotifications: true,
    requestPayload: false,
    apiResponse: false,
    livePayload: false,
  });

  // Automation Status Tracking
  const [pickupStatus, setPickupStatus] = useState<EstesPickupStatusItem | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (automationId) {
      // Immediately fetch status
      const fetchStatus = async () => {
        try {
          const response = await getAllEstesPickupStatus();
          const currentOp = response.automation_operations.find(op => op.automation_id === automationId);

          if (currentOp) {
            setPickupStatus(currentOp);

            // Stop polling if completed or failed
            if (currentOp.status === 'success' || currentOp.status === 'completed' || currentOp.status === 'error' || currentOp.status === 'failed') {
              if (intervalId) clearInterval(intervalId);
            }
          }
        } catch (err) {
          logger.error('Error fetching automation status:', err);
        }
      };

      fetchStatus();
      intervalId = setInterval(fetchStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [automationId]);

  const toggleSection = (section: string) => {
    setShowSections({ ...showSections, [section]: !showSections[section] });
  };

  // Auto-populate from BOL data and order.jsonb (rate quote data)
  useEffect(() => {
    if (bolData) {
      // Try to get commodity description from order.jsonb rate quote data
      let commodityDescription = 'KD furniture'; // Default
      let commodityNMFC = '079300'; // Default
      let commoditySub = '03'; // Default
      
      if (order?.jsonb) {
        try {
          const rateQuoteResponse = getJsonbValue(order.jsonb, 'rateQuotesResponseJsonb');
          if (rateQuoteResponse) {
            const parsed = typeof rateQuoteResponse === 'string' ? JSON.parse(rateQuoteResponse) : rateQuoteResponse;
            // Try to extract description from rate quote
            if (parsed?.commodity?.description) {
              commodityDescription = parsed.commodity.description;
            } else if (parsed?.commodity?.handlingUnits?.[0]?.lineItems?.[0]?.description) {
              commodityDescription = parsed.commodity.handlingUnits[0].lineItems[0].description;
            }
            // Try to extract NMFC from rate quote
            if (parsed?.commodity?.handlingUnits?.[0]?.lineItems?.[0]?.nmfc) {
              commodityNMFC = String(parsed.commodity.handlingUnits[0].lineItems[0].nmfc);
            }
            if (parsed?.commodity?.handlingUnits?.[0]?.lineItems?.[0]?.nmfcSub) {
              commoditySub = String(parsed.commodity.handlingUnits[0].lineItems[0].nmfcSub);
            }
          }
        } catch (e) {
          // Keep defaults if parsing fails
        }
      }
      
      if (bolData.originAccount) {
        setAccountCode(bolData.originAccount);
      }
      if (bolData.originName) {
        setShipperName(bolData.originName);
        setPickupCompanyName(bolData.originName);
        setAddresses([{
          ...addresses[0],
          addressLine1: bolData.originAddress1 || '',
          addressLine2: bolData.originAddress2 || '',
          city: bolData.originCity || '',
          stateProvince: bolData.originState || '',
          postalCode: bolData.originZipCode || '',
          countryAbbrev: bolData.originCountry === 'USA' ? 'US' : (bolData.originCountry || 'US'),
        }]);
      }
      if (bolData.originAddress1) {
        setShipperAddressLine1(bolData.originAddress1);
        setPickupAddressLine1(bolData.originAddress1);
      }
      if (bolData.originAddress2) {
        setShipperAddressLine2(bolData.originAddress2 || 'NA');
        setPickupAddressLine2(bolData.originAddress2 || '');
      }
      if (bolData.originCity) {
        setShipperCity(bolData.originCity);
      }
      if (bolData.originState) {
        setShipperStateProvince(bolData.originState);
      }
      if (bolData.originZipCode) {
        const zipParts = bolData.originZipCode.split('-');
        setShipperPostalCode(zipParts[0] || bolData.originZipCode);
        setShipperPostalCode4(zipParts[1] || '0000');
        setPickupZipCode(bolData.originZipCode);
      }
      if (bolData.originContactName) {
        const nameParts = bolData.originContactName.split(' ');
        setRequesterContactName(bolData.originContactName);
        setContacts([{
          ...contacts[0],
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
        }]);
      }
      if (bolData.originPhone) {
        setRequesterPhone(bolData.originPhone);
        const phoneMatch = bolData.originPhone.match(/(\d{3})[\s\-]?(\d{3})[\s\-]?(\d{4})/);
        if (phoneMatch) {
          setContacts([{
            ...contacts[0],
            phoneAreaCode: phoneMatch[1],
            phoneNumber: phoneMatch[2] + phoneMatch[3],
          }]);
        }
      }
      if (bolData.originEmail) {
        setRequesterEmail(bolData.originEmail);
        setContacts([{
          ...contacts[0],
          email: bolData.originEmail,
        }]);
      }
      if (bolData.handlingUnits && bolData.handlingUnits.length > 0) {
        const totalPieces = bolData.handlingUnits.reduce((sum, unit) => sum + (unit.quantity || 0), 0);
        const totalWeight = bolData.handlingUnits.reduce((sum, unit) => sum + (unit.weight || 0), 0);
        setTotalPieces(String(totalPieces));
        setTotalWeight(String(totalWeight));
        setTotalHandlingUnits(String(totalPieces));
        // Populate shipments
        setShipments(bolData.handlingUnits.map((unit, index) => ({
          id: String(index + 1),
          type: unit.handlingUnitType || 'PALLET',
          handlingUnits: String(unit.quantity || ''),
          weight: String(unit.weight || ''),
          destinationZip: bolData.destinationZipCode || '',
        })));
        
        // Populate commodities from handlingUnits
        const newCommodities = bolData.handlingUnits.map((unit, index) => {
          // Get package code from handling unit type
          // Estes API valid codes: "BX" (Box), "CR" (Crate), "DR" (Drum), "PL" (Pallet), "SK" (Skid), etc.
          // Based on requestBuilder.ts and Estes API documentation
          const packageCodeMap: Record<string, string> = {
            'PALLET': 'PL', // Estes uses "PL" for pallets, not "PLT"
            'PAL': 'PL',
            'PLT': 'PL',
            'CARTON': 'BX',
            'BOX': 'BX',
            'BX': 'BX',
            'CRATE': 'CR',
            'SKID': 'SK',
            'DRUM': 'DR',
          };
          const packageCode = packageCodeMap[unit.handlingUnitType?.toUpperCase() || ''] || 'BX';
          
          return {
            id: String(index + 1),
            code: 'MISC',
            packageCode: packageCode,
            description: commodityDescription, // Use description from rate quote or default
            pieces: String(unit.quantity || 1),
            weight: String(unit.weight || 0),
            nmfcNumber: commodityNMFC, // Use NMFC from rate quote or default
            nmfcSubNumber: commoditySub, // Use sub from rate quote or default
          };
        });
        setCommodities(newCommodities);
      }
      if (bolData.hazmat !== undefined) {
        setHazmatFlag(bolData.hazmat ? 'Y' : 'N');
        setHazmat(bolData.hazmat);
      }
    }
  }, [bolData]);

  // Auto-select account when accountCode and shipperName are available
  useEffect(() => {
    if (accountCode && shipperName && shipperAddressLine1 && shipperCity && shipperStateProvince && shipperPostalCode) {
      const accountValue = `${accountCode} - ${shipperName} - ${shipperAddressLine1}, ${shipperCity}, ${shipperStateProvince} ${shipperPostalCode}`;
      setSelectedAccount(accountValue);
    }
  }, [accountCode, shipperName, shipperAddressLine1, shipperCity, shipperStateProvince, shipperPostalCode]);

  // Set default pickup date to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setPickupDate(`${year}-${month}-${day}`);
  }, []);

  // Helper function to convert time input (HH:MM) to HHMM format
  const convertTimeToHHMM = (time: string): string => {
    if (!time) return '';
    const match = time.match(/(\d{2}):(\d{2})/);
    if (match) {
      return match[1] + match[2];
    }
    return time.replace(/:/g, '');
  };

  // Helper function to convert HHMM format to time input (HH:MM)
  const convertHHMMToTime = (hhmm: string): string => {
    if (!hhmm || hhmm.length !== 4) return '';
    return `${hhmm.substring(0, 2)}:${hhmm.substring(2, 4)}`;
  };

  const addAddress = () => {
    setAddresses([...addresses, {
      id: Date.now().toString(),
      addressType: 'C',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateProvince: '',
      postalCode: '',
      postalCode4: '0000',
      countryAbbrev: 'US',
    }]);
  };

  const removeAddress = (id: string) => {
    if (addresses.length > 1) {
      setAddresses(addresses.filter(a => a.id !== id));
    }
  };

  const updateAddress = (id: string, field: keyof AddressItem, value: string) => {
    setAddresses(addresses.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const addContact = () => {
    setContacts([...contacts, {
      id: Date.now().toString(),
      contactType: 'S',
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phoneAreaCode: '',
      phoneNumber: '',
      phoneExtension: '',
      faxAreaCode: '',
      faxNumber: '',
      receiveNotifications: 'Y',
      notificationMethod: 'E',
    }]);
  };

  const removeContact = (id: string) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const updateContact = (id: string, field: keyof ContactItem, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCommodity = () => {
    setCommodities([...commodities, {
      id: Date.now().toString(),
      code: 'MISC',
      packageCode: 'BX',
      description: '',
      pieces: '',
      weight: '',
      nmfcNumber: '',
      nmfcSubNumber: '',
    }]);
  };

  const removeCommodity = (id: string) => {
    if (commodities.length > 1) {
      setCommodities(commodities.filter(c => c.id !== id));
    }
  };

  const updateCommodity = (id: string, field: keyof CommodityItem, value: string) => {
    setCommodities(commodities.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addNotification = () => {
    setNotifications([...notifications, { id: Date.now().toString(), type: 'RCV' }]);
  };

  const removeNotification = (id: string) => {
    if (notifications.length > 1) {
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  const updateNotification = (id: string, field: keyof NotificationItem, value: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  // Shipment helpers
  const addShipment = () => {
    setShipments([...shipments, { id: Date.now().toString(), type: 'PALLET', handlingUnits: '', weight: '', destinationZip: '' }]);
  };

  const removeShipment = (id: string) => {
    if (shipments.length > 1) {
      setShipments(shipments.filter(s => s.id !== id));
    }
  };

  const updateShipment = (id: string, field: keyof ShipmentItem, value: string) => {
    setShipments(shipments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Additional contact helpers
  const addAdditionalContact = () => {
    setAdditionalContacts([...additionalContacts, { id: Date.now().toString(), name: '', email: '' }]);
  };

  const removeAdditionalContact = (id: string) => {
    if (additionalContacts.length > 1) {
      setAdditionalContacts(additionalContacts.filter(c => c.id !== id));
    }
  };

  const updateAdditionalContact = (id: string, field: keyof AdditionalContact, value: string) => {
    setAdditionalContacts(additionalContacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Sync dock contact with requester when checkbox is checked
  useEffect(() => {
    if (useRequesterInfo) {
      setDockContactName(requesterContactName);
      setDockEmail(requesterEmail);
      setDockPhone(requesterPhone);
      setDockExtension(requesterExtension);
    }
  }, [useRequesterInfo, requesterContactName, requesterEmail, requesterPhone, requesterExtension]);

  // Build live payload for display
  const livePayload = useMemo((): EstesPickupData => {
    return {
      shippingCompany: 'estes',
      shipper: {
        shipperName: shipperName || null,
        accountCode: accountCode || null,
        shipperAddress: {
          addressInfo: {
            addressLine1: shipperAddressLine1 || null,
            addressLine2: shipperAddressLine2 || null,
            city: shipperCity || null,
            stateProvince: shipperStateProvince || null,
            postalCode: shipperPostalCode || null,
            postalCode4: shipperPostalCode4 || null,
            countryAbbrev: shipperCountryAbbrev || null,
          },
        },
      },
      requestAction: requestAction || null,
      paymentTerms: paymentTerms || null,
      pickupDate: pickupDate || null,
      pickupStartTime: pickupStartTime || null,
      pickupEndTime: pickupEndTime || null,
      totalPieces: totalPieces || null,
      totalWeight: totalWeight || null,
      totalHandlingUnits: totalHandlingUnits || null,
      hazmatFlag: hazmatFlag || null,
      expeditedCode: expeditedCode || null,
      // Map role to whoRequested: S = Shipper, C = Consignee, 3 = Third Party, 4 = Other
      // Estes API accepts: S, C, 3, or 4
      whoRequested: (role === 'S' ? 'S' : role === 'C' ? 'C' : role === 'O' ? '4' : '3') || null,
      addresses: {
        address: addresses.map(a => ({
          addressInfo: {
            addressType: a.addressType || null,
            addressLine1: a.addressLine1 || null,
            addressLine2: a.addressLine2 || null,
            city: a.city || null,
            stateProvince: a.stateProvince || null,
            postalCode: a.postalCode || null,
            postalCode4: a.postalCode4 || null,
            countryAbbrev: a.countryAbbrev || null,
          },
        })),
      },
      contacts: {
        contact: contacts.map(c => ({
          contactInfo: {
            contactType: c.contactType || null,
            name: {
              firstName: c.firstName || null,
              middleName: c.middleName || null,
              lastName: c.lastName || null,
            },
            email: c.email || null,
            phone: {
              areaCode: c.phoneAreaCode || null,
              number: c.phoneNumber || null,
              extension: c.phoneExtension || null,
            },
            fax: {
              areaCode: c.faxAreaCode ? Number(c.faxAreaCode) : null,
              number: c.faxNumber ? Number(c.faxNumber) : null,
            },
            receiveNotifications: c.receiveNotifications || null,
            notificationMethod: c.notificationMethod || null,
          },
        })),
      },
      commodities: {
        commodity: commodities.map(c => ({
          commodityInfo: {
            code: c.code || null,
            packageCode: c.packageCode || null,
            description: c.description || null,
            pieces: c.pieces || null,
            weight: c.weight || null,
            nmfcNumber: c.nmfcNumber || null,
            nmfcSubNumber: c.nmfcSubNumber || null,
          },
        })),
      },
      notifications: {
        notification: notifications.map(n => ({
          notificationInfo: {
            type: n.type || null,
          },
        })),
      },
    };
  }, [
    shipperName, accountCode, shipperAddressLine1, shipperAddressLine2, shipperCity, shipperStateProvince,
    shipperPostalCode, shipperPostalCode4, shipperCountryAbbrev, requestAction, paymentTerms, pickupDate,
    pickupStartTime, pickupEndTime, totalPieces, totalWeight, totalHandlingUnits, hazmatFlag, expeditedCode,
    role, addresses, contacts, commodities, notifications
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validate required fields before submission
    if (!accountCode || !shipperName) {
      setError(new Error('Account Code and Shipper Name are required'));
      setLoading(false);
      return;
    }

    if (!shipperCity || !shipperStateProvince) {
      setError(new Error('Shipper City and State/Province are required'));
      setLoading(false);
      return;
    }

    // Validate at least one contact has required fields
    const hasValidContact = contacts.some(c => 
      c.firstName && c.lastName && c.email && c.phoneAreaCode && c.phoneNumber
    );
    if (!hasValidContact) {
      setError(new Error('At least one contact must have First Name, Last Name, Email, and Phone'));
      setLoading(false);
      return;
    }

    // Validate at least one commodity has required fields
    const hasValidCommodity = commodities.some(c => 
      c.code && c.packageCode && c.description && c.pieces && c.weight
    );
    if (!hasValidCommodity) {
      setError(new Error('At least one commodity must have Code, Package Code, Description, Pieces, and Weight'));
      setLoading(false);
      return;
    }

    try {
      const pickupData: EstesPickupData = {
        shippingCompany: 'estes',
        shipper: {
          shipperName: shipperName || null,
          accountCode: accountCode || null,
          shipperAddress: {
            addressInfo: {
              addressLine1: shipperAddressLine1 || null,
              addressLine2: shipperAddressLine2 || 'NA',
              city: shipperCity || null,
              stateProvince: shipperStateProvince || null,
              postalCode: shipperPostalCode || null,
              postalCode4: shipperPostalCode4 || '0000',
              countryAbbrev: shipperCountryAbbrev || 'US',
            },
          },
        },
        requestAction: requestAction || null,
        paymentTerms: paymentTerms || null,
          pickupDate: pickupDate || null,
        pickupStartTime: pickupStartTime || null,
        pickupEndTime: pickupEndTime || null,
        totalPieces: totalPieces || null,
        totalWeight: totalWeight || null,
        totalHandlingUnits: totalHandlingUnits || null,
        hazmatFlag: hazmatFlag || null,
        expeditedCode: expeditedCode || null,
        // Map role to whoRequested: S = Shipper, C = Consignee, 3 = Third Party, 4 = Other
        // Estes API accepts: S, C, 3, or 4
        whoRequested: role === 'S' ? 'S' : role === 'C' ? 'C' : role === 'O' ? '4' : '3', // S, C, 3, or 4
        addresses: {
          address: addresses.map(a => ({
            addressInfo: {
              addressType: a.addressType || null,
              addressLine1: a.addressLine1 || null,
              addressLine2: a.addressLine2 || 'NA',
              // Use shipper address values if address city/state are empty (Estes API requires these)
              city: a.city || shipperCity || null,
              stateProvince: a.stateProvince || shipperStateProvince || null,
              postalCode: a.postalCode || null,
              postalCode4: a.postalCode4 || '0000',
              countryAbbrev: a.countryAbbrev || 'US',
            },
          })),
        },
        contacts: {
          contact: contacts.filter(c => c.firstName || c.lastName || c.email || c.phoneAreaCode || c.phoneNumber).map(c => ({
            contactInfo: {
              contactType: c.contactType || null,
              name: {
                firstName: c.firstName || null,
                middleName: c.middleName || 'NA',
                lastName: c.lastName || null,
              },
            email: c.email || null,
              phone: {
                areaCode: c.phoneAreaCode || null,
                number: c.phoneNumber || null,
                extension: c.phoneExtension || '0',
              },
              fax: {
                areaCode: c.faxAreaCode ? Number(c.faxAreaCode) : (c.phoneAreaCode ? Number(c.phoneAreaCode) : null),
                number: c.faxNumber ? Number(c.faxNumber) : (c.phoneNumber ? Number(c.phoneNumber) : null),
              },
              receiveNotifications: c.receiveNotifications || null,
              notificationMethod: c.notificationMethod || null,
            },
          })),
        },
        commodities: {
          commodity: commodities.filter(c => c.code && c.packageCode && c.description && c.pieces && c.weight).map(c => ({
            commodityInfo: {
              code: c.code || null,
              packageCode: c.packageCode || null,
              description: c.description || null,
              pieces: c.pieces || null,
              weight: c.weight || null,
              nmfcNumber: c.nmfcNumber || null,
              nmfcSubNumber: c.nmfcSubNumber || null,
            },
          })),
        },
        notifications: {
          notification: notifications.map(n => ({
            notificationInfo: {
              type: n.type || null,
            },
          })),
        },
      };

      // Get Estes token
      const token = getToken('estes');
      if (!token) {
        throw new Error('No authentication token found. Please log in to Estes first.');
      }

      logger.log('Submitting Estes pickup request with payload:', pickupData);
      const response = await createEstesPickupRequest(pickupData, token);
      logger.log('Estes pickup request response:', response);
      setRequestPayload(pickupData);
      setApiResponse(response);
      
      // Handle different response structures
      const responseId = response.pickupRequestNumber || response.data?.pickupRequestNumber || response.automation_id || response.id || null;
      setAutomationId(responseId);
      setSuccess(true);
      setShowSuccessToast(true); // Show success toast

      // Dispatch event for cache update (for LTL orders)
      // This will trigger final DB save in AutomateLogisticModal
      if (order?.id) {
        dispatchPickupData(order.id, {
                  automationId: responseId,
          pickupData,
          response,
          carrier: 'estes', // Explicitly set carrier
        });
      }

      // Update order with pickup response - find by SKU and marketplace
      if (order) {
        try {
          const sku = getJsonbValue(order.jsonb, 'SKU') || '';
          const marketplace = order.orderOnMarketPlace || '';
          
          if (sku && marketplace) {
            // Find the order that matches this rate quote
            const existingOrders = await getAllShippedOrders({ page: 1, limit: 100 });
            const existingOrder = existingOrders.orders.find(
              (o) => o.sku === sku && o.orderOnMarketPlace === marketplace
            );

            if (existingOrder) {
              // Update existing order with pickup response
              await updateShippedOrder(existingOrder.id, {
                pickupResponseJsonb: {
                  automationId: responseId,
                  pickupData,
                  response,
                },
              });
              logger.log('Updated existing order with pickup response');
            } else {
              // Create new order with pickup response
              await createShippedOrder({
                sku,
                orderOnMarketPlace: marketplace,
                ordersJsonb: order.jsonb as Record<string, unknown>,
                pickupResponseJsonb: {
                  automationId: responseId,
                  pickupData,
                  response,
                },
              });
              logger.log('Created new order with pickup response');
            }
          }
        } catch (saveError) {
          logger.error('Failed to save pickup response to database:', saveError);
          // Don't throw error - pickup request was successful, just log the save error
        }
        // Dispatch pickup data to cache - this will trigger final DB save in AutomateLogisticModal
        dispatchPickupData(order.id, {
                  automationId: responseId,
          pickupData,
          response,
          carrier: 'estes', // Explicitly set carrier
        });
        logger.log('Pickup data cached and will trigger final DB save with all cached data');
      }

      if (onSuccess) {
        onSuccess(response.automation_id);
      }
    } catch (err: any) {
      logger.error('Error creating Estes pickup request:', err);
      
      // Extract detailed error message
      let errorMessage = 'Failed to create pickup request';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check if there's additional error data
        if ((err as any).errorData) {
          const errorData = (err as any).errorData;
          if (errorData.data?.message) {
            errorMessage = errorData.data.message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        }
        // Check if there's error text with more details
        if ((err as any).errorText) {
          try {
            const parsed = JSON.parse((err as any).errorText);
            if (parsed.message) {
              errorMessage = parsed.message;
            } else if (parsed.error?.message) {
              errorMessage = parsed.error.message;
            } else if (parsed.data?.message) {
              errorMessage = parsed.data.message;
            }
          } catch {
            // If parsing fails, use the error text if it's short enough
            if ((err as any).errorText && (err as any).errorText.length < 200) {
              errorMessage = (err as any).errorText;
            }
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      const detailedError = new Error(errorMessage);
      if (err instanceof Error && (err as any).status) {
        (detailedError as any).status = (err as any).status;
      }
      if (err instanceof Error && (err as any).errorData) {
        (detailedError as any).errorData = (err as any).errorData;
      }
      if (err instanceof Error && (err as any).errorText) {
        (detailedError as any).errorText = (err as any).errorText;
      }
      
      setError(detailedError);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">






          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <ErrorDisplay error={error} />
            </div>
          )}

          {/* Account Information */}
          <FormSection
            title="Account Information"
            isExpanded={showSections.accountInfo}
            onToggle={() => toggleSection('accountInfo')}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">My Accounts *</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Account</option>
                  <option value={`${accountCode} - ${shipperName} - ${shipperAddressLine1}, ${shipperCity}, ${shipperStateProvince} ${shipperPostalCode}`}>
                    {accountCode} - {shipperName} - {shipperAddressLine1}, {shipperCity}, {shipperStateProvince} {shipperPostalCode}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="S"
                      checked={role === 'S'}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      required
                    />
                    <span className="text-sm font-medium text-slate-700">Shipper</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="C"
                      checked={role === 'C'}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Consignee</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="T"
                      checked={role === 'T'}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Third-Party</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="O"
                      checked={role === 'O'}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Other</span>
                  </label>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Requester Details and Pickup Location - Side by Side */}
          <FormSection
            title=""
            isExpanded={showSections.requesterPickup}
            onToggle={() => toggleSection('requesterPickup')}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Requester Details - Left Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Requester Details</h3>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Book (Optional)</label>
                  <select
                    value={requesterAddressBook}
                    onChange={(e) => setRequesterAddressBook(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Address</option>
                  </select>
                </div>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">or</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
                >
                  Manage My Address Book
                </button>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Name *</label>
                <input
                  type="text"
                    value={requesterContactName}
                    onChange={(e) => setRequesterContactName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="(888) 888-8888"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Extension (Optional)</label>
                <input
                  type="text"
                    value={requesterExtension}
                    onChange={(e) => setRequesterExtension(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

              {/* Pickup Location - Right Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Pickup Location</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Book (Optional)</label>
                  <select
                    value={pickupAddressBook}
                    onChange={(e) => setPickupAddressBook(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Address</option>
                  </select>
                </div>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">or</span>
                  </div>
                </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Name *</label>
                <input
                  type="text"
                    value={pickupCompanyName}
                    onChange={(e) => setPickupCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 1 *</label>
                <input
                    type="text"
                    value={pickupAddressLine1}
                    onChange={(e) => setPickupAddressLine1(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 2 (Optional)</label>
                <input
                    type="text"
                    value={pickupAddressLine2}
                    onChange={(e) => setPickupAddressLine2(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code *</label>
                <input
                  type="text"
                    value={pickupZipCode}
                    onChange={(e) => setPickupZipCode(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Country *</label>
                  <select
                    value={pickupCountry}
                    onChange={(e) => setPickupCountry(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="USA">USA</option>
                    <option value="CAN">Canada</option>
                  </select>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Dock Contact Details */}
          <FormSection
            title="Dock Contact Details"
            isExpanded={showSections.dockContact}
            onToggle={() => toggleSection('dockContact')}
          >
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRequesterInfo}
                  onChange={(e) => setUseRequesterInfo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Use Requester Information</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address Book (Optional)</label>
                <select
                  value={dockAddressBook}
                  onChange={(e) => setDockAddressBook(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Address</option>
                </select>
              </div>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">or</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Name *</label>
                <input
                  type="text"
                    value={dockContactName}
                    onChange={(e) => setDockContactName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
              </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                    type="email"
                    value={dockEmail}
                    onChange={(e) => setDockEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                <input
                    type="tel"
                    value={dockPhone}
                    onChange={(e) => setDockPhone(e.target.value)}
                    placeholder="(888) 888-8888"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Extension (Optional)</label>
                <input
                  type="text"
                    value={dockExtension}
                    onChange={(e) => setDockExtension(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
              </div>
            </div>
          </FormSection>

          {/* Pickup Details */}
          <FormSection
            title="Pickup Details"
            isExpanded={showSections.pickupDetails}
            onToggle={() => toggleSection('pickupDetails')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Date *</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Start Time *</label>
                <input
                    type="text"
                    value={convertHHMMToTime(pickupStartTime)}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      setPickupStartTime(convertTimeToHHMM(timeValue) || timeValue);
                    }}
                    placeholder="08:00 AM"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup End Time *</label>
                <input
                    type="text"
                    value={convertHHMMToTime(pickupEndTime)}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      setPickupEndTime(convertTimeToHHMM(timeValue) || timeValue);
                    }}
                    placeholder="05:00 PM"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Type *</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pickupType"
                      value="LL"
                      checked={pickupType === 'LL'}
                  onChange={(e) => setPickupType(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  required
                    />
                    <span className="text-sm font-medium text-slate-700">Live Load</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pickupType"
                      value="HL"
                      checked={pickupType === 'HL'}
                      onChange={(e) => setPickupType(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Hook Loaded (Pick up trailer at location)</span>
                  </label>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Shipment Information - Only if Live Load */}
          {pickupType === 'LL' && (
            <FormSection
              title="Shipment Information"
              isExpanded={showSections.shipmentInfo}
              onToggle={() => toggleSection('shipmentInfo')}
            >
              <div className="space-y-4">
                {shipments.map((shipment, index) => (
                  <div key={shipment.id} className="border-2 border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-700">Shipment {index + 1}</h3>
                      {shipments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeShipment(shipment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                        <select
                          value={shipment.type}
                          onChange={(e) => updateShipment(shipment.id, 'type', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="PALLET">PALLET</option>
                          <option value="SKID">SKID</option>
                          <option value="PIECE">PIECE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Handling Units *</label>
                        <input
                          type="text"
                          value={shipment.handlingUnits}
                          onChange={(e) => updateShipment(shipment.id, 'handlingUnits', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Weight (lbs) *</label>
                        <input
                          type="text"
                          value={shipment.weight}
                          onChange={(e) => updateShipment(shipment.id, 'weight', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Destination *</label>
                        <input
                          type="text"
                          value={shipment.destinationZip}
                          onChange={(e) => updateShipment(shipment.id, 'destinationZip', e.target.value)}
                          placeholder="ZIP or Postal Code"
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addShipment}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors font-medium"
                >
                  <Plus size={18} />
                    ADD SHIPMENT
                </button>
                </div>
                <div className="flex justify-end gap-6 mt-4">
                  <div className="text-right">
                    <div className="text-sm text-slate-600">Total Handling Units</div>
                    <div className="text-lg font-bold text-slate-900">
                      {shipments.reduce((sum, s) => sum + (Number(s.handlingUnits) || 0), 0)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600">Total Weight</div>
                    <div className="text-lg font-bold text-slate-900">
                      {shipments.reduce((sum, s) => sum + (Number(s.weight) || 0), 0)} lbs
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {/* Freight Characteristics, Time Critical, and Pickup Notifications - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Freight Characteristics */}
          <FormSection
            title="Freight Characteristics"
            isExpanded={showSections.freightCharacteristics}
            onToggle={() => toggleSection('freightCharacteristics')}
          >
              <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hazmat}
                  onChange={(e) => setHazmat(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Hazmat</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={protectFromFreezing}
                  onChange={(e) => setProtectFromFreezing(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Protect from Freezing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={food}
                  onChange={(e) => setFood(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Food</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={poison}
                  onChange={(e) => setPoison(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Poison</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overlength}
                  onChange={(e) => setOverlength(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Overlength</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={liftgate}
                  onChange={(e) => setLiftgate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Liftgate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doNotStack}
                  onChange={(e) => setDoNotStack(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Do Not Stack</span>
              </label>
            </div>
          </FormSection>

            {/* Time Critical Guaranteed */}
          <FormSection
            title="Time Critical Guaranteed"
            isExpanded={showSections.timeCritical}
            onToggle={() => toggleSection('timeCritical')}
          >
              <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={guaranteed}
                onChange={(e) => setGuaranteed(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Guaranteed Shipment</span>
            </label>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Instructions (Optional)</label>
            <textarea
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter any special instructions for the pickup..."
            />
                </div>
              </div>
          </FormSection>

          {/* Pickup Notifications */}
          <FormSection
            title="Pickup Notifications"
            isExpanded={showSections.pickupNotifications}
            onToggle={() => toggleSection('pickupNotifications')}
          >
            <div className="space-y-4">
                <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                      checked={emailForRejected}
                      onChange={(e) => setEmailForRejected(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Email for Rejected Request</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                      checked={emailForAccepted}
                      onChange={(e) => setEmailForAccepted(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Email for Accepted Request</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                      checked={emailForCompleted}
                      onChange={(e) => setEmailForCompleted(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Email for Completed Pickup</span>
                </label>
              </div>
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  {additionalContacts.map((contact, index) => (
                    <div key={contact.id} className="space-y-2">
                        <input
                          type="text"
                          value={contact.name}
                        onChange={(e) => updateAdditionalContact(contact.id, 'name', e.target.value)}
                        placeholder="Name (Optional)"
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                          <input
                            type="email"
                            value={contact.email}
                        onChange={(e) => updateAdditionalContact(contact.id, 'email', e.target.value)}
                        placeholder="Email (Optional)"
                            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                      {additionalContacts.length > 1 && (
                          <button
                            type="button"
                          onClick={() => removeAdditionalContact(contact.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAdditionalContact}
                    className="w-full px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors font-medium text-sm"
                  >
                    + ADD ADDITIONAL CONTACT
                  </button>
              </div>
            </div>
          </FormSection>
              </div>

          {/* Status Display */}
          {success && automationId && (
            <div className="space-y-4">
              {pickupStatus?.status === 'success' || pickupStatus?.status === 'completed' ? (
                <>
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle2 size={32} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-green-800">Pickup request submitted successfully!</h3>
                      <p className="text-sm text-green-700 mt-1">Automation ID: {automationId}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 size={16} />
                        <span>Process completed successfully</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {/* Request Payload and Response */}
              {(requestPayload || apiResponse) && (
                <div className="space-y-4">
                  {requestPayload && (
                    <FormSection
                      title="Request Payload"
                      isExpanded={showSections.requestPayload || false}
                      onToggle={() => toggleSection('requestPayload')}
                    >
                      <div className="bg-slate-50 rounded-lg p-4 overflow-auto max-h-96">
                        <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                          {JSON.stringify(requestPayload, null, 2)}
                        </pre>
            </div>
                    </FormSection>
                  )}

                  {apiResponse && (
                    <FormSection
                      title="Response"
                      isExpanded={showSections.apiResponse || false}
                      onToggle={() => toggleSection('apiResponse')}
                    >
                      <div className="bg-slate-50 rounded-lg p-4 overflow-auto max-h-96">
                        <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                          {JSON.stringify(apiResponse, null, 2)}
                        </pre>
        </div>
                    </FormSection>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Request Payload Display */}
          {!success && (
            <div className="border-t-2 border-slate-300 bg-slate-50 mt-4">
              <FormSection
                title="Live Request Payload"
                isExpanded={showSections.livePayload || false}
                onToggle={() => toggleSection('livePayload')}
              >
                <div className="bg-white rounded-lg p-4 overflow-auto max-h-96 border border-slate-200">
                  <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify(livePayload, null, 2)}
                  </pre>
                </div>
              </FormSection>
            </div>
          )}

          {/* Error Display - Below Payload Sections */}
          {error && (
            <div className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 shadow-lg mt-4">
              <div className="flex items-start gap-3">
                <XCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-red-800 mb-2">Error</h3>
                  <div className="bg-white border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 font-medium mb-2">{error.message}</p>
                    {error.stack && process.env.NODE_ENV === 'development' && (
                      <details className="mt-2">
                        <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                          Show error details
                        </summary>
                        <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-40">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                    {(error as any).errorData && (
                      <details className="mt-2">
                        <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                          Show error data
                        </summary>
                        <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify((error as any).errorData, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800 flex-shrink-0"
                  aria-label="Dismiss error"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      {!success && (
        <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-start gap-4 z-10">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>REQUEST PICKUP</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Bar at Bottom */}
      {automationId && (
        <div className="border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-lg z-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {pickupStatus?.status === 'success' || pickupStatus?.status === 'completed' ? (
                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                  ) : pickupStatus?.status === 'error' || pickupStatus?.status === 'failed' ? (
                    <XCircle size={20} className="text-red-600 flex-shrink-0" />
                  ) : (
                    <Loader2 size={20} className="text-blue-600 animate-spin flex-shrink-0" />
                  )}
                  <div className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs font-bold text-blue-700 shadow-sm">
                    {pickupStatus?.status?.toUpperCase() || 'INITIALIZING'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Progress</span>
                    <span className="font-bold text-blue-700">{pickupStatus?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 overflow-hidden shadow-inner border border-blue-100">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                      style={{ width: `${pickupStatus?.progress || 0}%` }}
                    >
                      <div className="w-full h-full bg-white/20 animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 font-mono flex-shrink-0">
                  ID: {automationId}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast - Bottom Right */}
      {showSuccessToast && (
        <Toast
          message="Order scheduled successfully"
          type="success"
          duration={5000}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </form>
  );
};

