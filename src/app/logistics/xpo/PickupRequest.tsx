'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, X, ChevronDown, ChevronUp, Info, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildXPOPickupRequestRequestBody } from './utils/requestBuilder';
import type { XPOPickupRequestFields, XPOPickupRequestItem } from '@/app/api/ShippingUtil/xpo/PickupRequestField';
import { 
  XPO_PICKUP_REQUEST_FIELD_DEFAULTS,
  XPO_PICKUP_REQUEST_ITEM_DEFAULTS,
  XPO_PICKUP_REQUEST_ROLE_OPTIONS,
  XPO_PICKUP_REQUEST_SPECIAL_EQUIPMENT_OPTIONS,
  XPO_PICKUP_REQUEST_COUNTRY_OPTIONS
} from '@/app/api/ShippingUtil/xpo/PickupRequestField';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import type { XPOBillOfLadingAddress, XPOBillOfLadingCommodity } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';

type BOLFormData = {
  // Old structure (from BillOfLading.tsx)
  shipper?: XPOBillOfLadingAddress;
  consignee?: XPOBillOfLadingAddress;
  shipDate?: string;
  commodityLine?: XPOBillOfLadingCommodity[];
  // New structure (from BOLForm.tsx)
  pickupLocation?: {
    company?: string;
    streetAddress?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  deliveryLocation?: {
    company?: string;
    streetAddress?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  commodities?: XPOBillOfLadingCommodity[];
  pickupDate?: string;
  pickupReadyTime?: string;
  dockCloseTime?: string;
  contactCompanyName?: string;
  contactName?: string;
  contactPhone?: string;
  contactExtension?: string;
  requesterRole?: string;
};

type PickupRequestProps = {
  onPrevious: () => void;
  onComplete: (pickupResponse?: unknown) => void;
  quoteData?: unknown;
  bolFormData?: BOLFormData;
  bolResponseData?: unknown;
};

export const XPOPickupRequest = ({
  onPrevious,
  onComplete,
  quoteData,
  bolFormData,
  bolResponseData,
}: PickupRequestProps) => {
  const { getToken } = useLogisticsStore();
  const carrier = 'xpo';

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get default time in ISO 8601 format (2000-01-01T09:00:00)
  const getDefaultTime = (hours: number = 9, minutes: number = 0) => {
    return `2000-01-01T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  };

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    pickupDetails: true,
    shipper: true,
    requestor: true,
    contact: true,
    pickupItems: true,
    optional: false,
  });

  // Pickup Details
  const [pkupDate, setPkupDate] = useState<string>(getTodayDate());
  const [readyTime, setReadyTime] = useState<string>(getDefaultTime(11, 0)); // Default: 11 AM
  const [closeTime, setCloseTime] = useState<string>(getDefaultTime(16, 0)); // Default: 4 PM
  const [specialEquipmentCd, setSpecialEquipmentCd] = useState<string>('');
  const [insidePkupInd, setInsidePkupInd] = useState<boolean>(false);

  // Shipper
  const [shipperName, setShipperName] = useState<string>('');
  const [shipperAddressLine1, setShipperAddressLine1] = useState<string>('');
  const [shipperAddressLine2, setShipperAddressLine2] = useState<string>('');
  const [shipperCity, setShipperCity] = useState<string>('');
  const [shipperState, setShipperState] = useState<string>('');
  const [shipperCountry, setShipperCountry] = useState<string>('US');
  const [shipperPostalCd, setShipperPostalCd] = useState<string>('');

  // Requestor
  const [requestorCompanyName, setRequestorCompanyName] = useState<string>('');
  const [requestorFullName, setRequestorFullName] = useState<string>('');
  const [requestorEmail, setRequestorEmail] = useState<string>('');
  const [requestorPhone, setRequestorPhone] = useState<string>('');
  const [requestorRoleCd, setRequestorRoleCd] = useState<string>('S');

  // Contact
  const [contactCompanyName, setContactCompanyName] = useState<string>('');
  const [contactFullName, setContactFullName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');

  // Pickup Items
  const [pkupItems, setPkupItems] = useState<XPOPickupRequestItem[]>([
    { ...XPO_PICKUP_REQUEST_ITEM_DEFAULTS }
  ]);

  // Optional
  const [remarks, setRemarks] = useState<string>('');

  // Auto-populate from BOL data, BOL response, rate quote, and order data
  useEffect(() => {
    // Helper to get consignee postal code for destZip6
    const getConsigneePostalCode = (): string => {
      // Try from BOL form data (new structure)
      if (bolFormData?.deliveryLocation?.postalCode) {
        return bolFormData.deliveryLocation.postalCode.substring(0, 6);
      }
      // Try from BOL form data (old structure)
      if (bolFormData?.consignee?.address?.postalCd) {
        return bolFormData.consignee.address.postalCd.substring(0, 6);
      }
      // Try from BOL response
      if (bolResponseData && typeof bolResponseData === 'object' && 'data' in bolResponseData) {
        const response = bolResponseData as any;
        if (response.data?.bol?.consignee?.address?.postalCd) {
          return response.data.bol.consignee.address.postalCd.substring(0, 6);
        }
      }
      // Try from rate quote
      if (quoteData && typeof quoteData === 'object' && 'consignee' in quoteData) {
        const quote = quoteData as any;
        if (quote.consignee?.address?.postalCd) {
          return quote.consignee.address.postalCd.substring(0, 6);
        }
      }
      return '';
    };

    // Populate Shipper information
    if (bolFormData) {
      // New structure (from BOLForm.tsx)
      if (bolFormData.pickupLocation) {
        setShipperName(bolFormData.pickupLocation.company || '');
        setShipperAddressLine1(bolFormData.pickupLocation.streetAddress || '');
        setShipperAddressLine2(bolFormData.pickupLocation.addressLine2 || '');
        setShipperCity(bolFormData.pickupLocation.city || '');
        setShipperState(bolFormData.pickupLocation.state || '');
        setShipperCountry(bolFormData.pickupLocation.country || 'US');
        setShipperPostalCd(bolFormData.pickupLocation.postalCode || '');
      }
      // Old structure (from BillOfLading.tsx)
      else if (bolFormData.shipper) {
        setShipperName(bolFormData.shipper.contactInfo?.companyName || '');
        setShipperAddressLine1(bolFormData.shipper.address?.addressLine1 || '');
        setShipperCity(bolFormData.shipper.address?.cityName || '');
        setShipperState(bolFormData.shipper.address?.stateCd || '');
        setShipperCountry(bolFormData.shipper.address?.countryCd || 'US');
        setShipperPostalCd(bolFormData.shipper.address?.postalCd || '');
      }

      // Populate Requestor information
      // New structure
      if (bolFormData.pickupLocation) {
        setRequestorCompanyName(bolFormData.pickupLocation.company || '');
        setRequestorFullName(bolFormData.pickupLocation.company || '');
        setRequestorEmail(bolFormData.pickupLocation.email || '');
        setRequestorPhone(bolFormData.pickupLocation.phone || '');
        setRequestorRoleCd(bolFormData.requesterRole || 'S');
      }
      // Old structure
      else if (bolFormData.shipper?.contactInfo) {
        setRequestorCompanyName(bolFormData.shipper.contactInfo.companyName || '');
        setRequestorFullName(bolFormData.shipper.contactInfo.companyName || '');
        setRequestorEmail(bolFormData.shipper.contactInfo.email?.emailAddr || '');
        setRequestorPhone(bolFormData.shipper.contactInfo.phone?.phoneNbr || '');
      }

      // Populate Contact information
      // New structure (from pickup request section in BOL)
      if (bolFormData.contactCompanyName || bolFormData.contactName || bolFormData.contactPhone) {
        setContactCompanyName(bolFormData.contactCompanyName || bolFormData.pickupLocation?.company || '');
        setContactFullName(bolFormData.contactName || bolFormData.pickupLocation?.company || '');
        setContactEmail(bolFormData.pickupLocation?.email || '');
        setContactPhone(bolFormData.contactPhone || bolFormData.pickupLocation?.phone || '');
      }
      // Fallback to requestor info
      else if (bolFormData.pickupLocation) {
        setContactCompanyName(bolFormData.pickupLocation.company || '');
        setContactFullName(bolFormData.pickupLocation.company || '');
        setContactEmail(bolFormData.pickupLocation.email || '');
        setContactPhone(bolFormData.pickupLocation.phone || '');
      }
      // Old structure
      else if (bolFormData.shipper?.contactInfo) {
        setContactCompanyName(bolFormData.shipper.contactInfo.companyName || '');
        setContactFullName(bolFormData.shipper.contactInfo.companyName || '');
        setContactEmail(bolFormData.shipper.contactInfo.email?.emailAddr || '');
        setContactPhone(bolFormData.shipper.contactInfo.phone?.phoneNbr || '');
      }

      // Pickup date - try multiple sources
      if (bolFormData.pickupDate) {
        setPkupDate(bolFormData.pickupDate);
      } else if (bolFormData.shipDate) {
        setPkupDate(bolFormData.shipDate);
      } else if (quoteData && typeof quoteData === 'object' && 'shipmentDate' in quoteData) {
        const quote = quoteData as any;
        if (quote.shipmentDate) {
          // Extract date part if it's a full datetime
          const dateStr = String(quote.shipmentDate).split('T')[0];
          setPkupDate(dateStr);
        }
      }

      // Pickup times - from BOL form data
      if (bolFormData.pickupReadyTime) {
        // Convert HH:mm format to ISO format
        const timeStr = bolFormData.pickupReadyTime;
        if (timeStr.includes('T')) {
          setReadyTime(timeStr);
        } else {
          // Assume it's HH:mm format, convert to ISO
          const [hours, minutes] = timeStr.split(':');
          setReadyTime(getDefaultTime(parseInt(hours || '11'), parseInt(minutes || '0')));
        }
      }
      if (bolFormData.dockCloseTime) {
        const timeStr = bolFormData.dockCloseTime;
        if (timeStr.includes('T')) {
          setCloseTime(timeStr);
        } else {
          // Assume it's HH:mm format, convert to ISO
          const [hours, minutes] = timeStr.split(':');
          setCloseTime(getDefaultTime(parseInt(hours || '16'), parseInt(minutes || '0')));
        }
      }

      // Pickup items from commodities
      const commodities = bolFormData.commodities || bolFormData.commodityLine;
      if (commodities && commodities.length > 0) {
        const destZip6 = getConsigneePostalCode();
        const items: XPOPickupRequestItem[] = commodities.map((commodity: any) => ({
          destZip6,
          totWeight: {
            weight: commodity.grossWeight?.weight || 0,
          },
          loosePiecesCnt: commodity.packaging?.packageCd === 'PLT' ? 0 : (commodity.pieceCnt || 0),
          palletCnt: commodity.packaging?.packageCd === 'PLT' ? (commodity.pieceCnt || 0) : 0,
          garntInd: false,
          hazmatInd: commodity.hazmatInd || false,
          frzbleInd: false,
          holDlvrInd: false,
          foodInd: false,
          ...(commodity.desc && { remarks: commodity.desc }),
        }));
        setPkupItems(items.length > 0 ? items : [{ ...XPO_PICKUP_REQUEST_ITEM_DEFAULTS }]);
      }
    }

    // Also try to populate from BOL response data if form data is incomplete
    if (bolResponseData && typeof bolResponseData === 'object' && 'data' in bolResponseData) {
      const response = bolResponseData as any;
      const bol = response.data?.bol;
      if (!bol) return;
      
      // Fill in missing shipper info from BOL response
      if (!shipperName && bol.shipper?.contactInfo?.companyName) {
        setShipperName(bol.shipper.contactInfo.companyName);
      }
      if (!shipperAddressLine1 && bol.shipper?.address?.addressLine1) {
        setShipperAddressLine1(bol.shipper.address.addressLine1);
      }
      if (!shipperCity && bol.shipper?.address?.cityName) {
        setShipperCity(bol.shipper.address.cityName);
      }
      if (!shipperState && bol.shipper?.address?.stateCd) {
        setShipperState(bol.shipper.address.stateCd);
      }
      if (!shipperPostalCd && bol.shipper?.address?.postalCd) {
        setShipperPostalCd(bol.shipper.address.postalCd);
      }
      if (!shipperCountry && bol.shipper?.address?.countryCd) {
        setShipperCountry(bol.shipper.address.countryCd || 'US');
      }

      // Fill in missing requestor info from BOL response
      if (!requestorCompanyName && bol.shipper?.contactInfo?.companyName) {
        setRequestorCompanyName(bol.shipper.contactInfo.companyName);
      }
      if (!requestorEmail && bol.shipper?.contactInfo?.email?.emailAddr) {
        setRequestorEmail(bol.shipper.contactInfo.email.emailAddr);
      }
      if (!requestorPhone && bol.shipper?.contactInfo?.phone?.phoneNbr) {
        setRequestorPhone(bol.shipper.contactInfo.phone.phoneNbr);
      }

      // Fill in missing contact info from BOL response
      if (!contactCompanyName && bol.shipper?.contactInfo?.companyName) {
        setContactCompanyName(bol.shipper.contactInfo.companyName);
      }
      if (!contactEmail && bol.shipper?.contactInfo?.email?.emailAddr) {
        setContactEmail(bol.shipper.contactInfo.email.emailAddr);
      }
      if (!contactPhone && bol.shipper?.contactInfo?.phone?.phoneNbr) {
        setContactPhone(bol.shipper.contactInfo.phone.phoneNbr);
      }

      // Fill in missing pickup items from BOL response
      if (pkupItems.length === 0 || (pkupItems.length === 1 && pkupItems[0].destZip6 === '')) {
        if (bol.commodityLine && bol.commodityLine.length > 0) {
          const destZip6 = bol.consignee?.address?.postalCd?.substring(0, 6) || '';
          const items: XPOPickupRequestItem[] = bol.commodityLine.map((commodity: any) => ({
            destZip6,
            totWeight: {
              weight: commodity.grossWeight?.weight || 0,
            },
            loosePiecesCnt: commodity.packaging?.packageCd === 'PLT' ? 0 : (commodity.pieceCnt || 0),
            palletCnt: commodity.packaging?.packageCd === 'PLT' ? (commodity.pieceCnt || 0) : 0,
            garntInd: false,
            hazmatInd: commodity.hazmatInd || false,
            frzbleInd: false,
            holDlvrInd: false,
            foodInd: false,
            ...(commodity.desc && { remarks: commodity.desc }),
          }));
          setPkupItems(items.length > 0 ? items : [{ ...XPO_PICKUP_REQUEST_ITEM_DEFAULTS }]);
        }
      }
    }

    // Populate from rate quote data if available
    if (quoteData && typeof quoteData === 'object') {
      const quote = quoteData as any;
      
      // Fill in missing shipper info from quote
      if (!shipperName && quote.shipper?.contactInfo?.companyName) {
        setShipperName(quote.shipper.contactInfo.companyName);
      }
      if (!shipperAddressLine1 && quote.shipper?.address?.addressLine1) {
        setShipperAddressLine1(quote.shipper.address.addressLine1);
      }
      if (!shipperCity && quote.shipper?.address?.cityName) {
        setShipperCity(quote.shipper.address.cityName);
      }
      if (!shipperState && quote.shipper?.address?.stateCd) {
        setShipperState(quote.shipper.address.stateCd);
      }
      if (!shipperPostalCd && quote.shipper?.address?.postalCd) {
        setShipperPostalCd(quote.shipper.address.postalCd);
      }
      if (!shipperCountry && quote.shipper?.address?.countryCd) {
        setShipperCountry(quote.shipper.address.countryCd || 'US');
      }

      // Fill in missing requestor info from quote
      if (!requestorCompanyName && quote.shipper?.contactInfo?.companyName) {
        setRequestorCompanyName(quote.shipper.contactInfo.companyName);
      }
      if (!requestorEmail && quote.shipper?.contactInfo?.email?.emailAddr) {
        setRequestorEmail(quote.shipper.contactInfo.email.emailAddr);
      }
      if (!requestorPhone && quote.shipper?.contactInfo?.phone?.phoneNbr) {
        setRequestorPhone(quote.shipper.contactInfo.phone.phoneNbr);
      }

      // Fill in missing contact info from quote
      if (!contactCompanyName && quote.shipper?.contactInfo?.companyName) {
        setContactCompanyName(quote.shipper.contactInfo.companyName);
      }
      if (!contactEmail && quote.shipper?.contactInfo?.email?.emailAddr) {
        setContactEmail(quote.shipper.contactInfo.email.emailAddr);
      }
      if (!contactPhone && quote.shipper?.contactInfo?.phone?.phoneNbr) {
        setContactPhone(quote.shipper.contactInfo.phone.phoneNbr);
      }

      // Fill in missing pickup date from quote
      if (!pkupDate && quote.shipmentDate) {
        const dateStr = String(quote.shipmentDate).split('T')[0];
        setPkupDate(dateStr);
      }
    }
  }, [bolFormData, bolResponseData, quoteData]);

  const addPickupItem = () => {
    setPkupItems([...pkupItems, { ...XPO_PICKUP_REQUEST_ITEM_DEFAULTS }]);
  };

  const removePickupItem = (index: number) => {
    if (pkupItems.length > 1) {
      setPkupItems(pkupItems.filter((_, i) => i !== index));
    }
  };

  const updatePickupItem = (index: number, field: keyof XPOPickupRequestItem, value: any) => {
    const updated = [...pkupItems];
    updated[index] = { ...updated[index], [field]: value };
    setPkupItems(updated);
  };

  const updatePickupItemNested = (index: number, path: string[], value: any) => {
    const updated = [...pkupItems];
    const item = { ...updated[index] };
    let current: any = item;
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    updated[index] = item;
    setPkupItems(updated);
  };

  // Convert date and time to ISO 8601 format
  const convertToISO8601 = (date: string, time: string): string => {
    if (!date) return '';
    const timeOnly = time.split('T')[1] || time.split(' ')[1] || '00:00:00';
    return `${date}T${timeOnly}`;
  };

  const buildRequestBody = (): XPOPickupRequestFields => {
    return {
      pickupRqstInfo: {
        pkupDate: convertToISO8601(pkupDate, pkupDate),
        readyTime: convertToISO8601(pkupDate, readyTime),
        closeTime: convertToISO8601(pkupDate, closeTime),
        ...(specialEquipmentCd && { specialEquipmentCd }),
        ...(insidePkupInd !== undefined && { insidePkupInd }),
        shipper: {
          name: shipperName,
          addressLine1: shipperAddressLine1,
          ...(shipperAddressLine2 && { addressLine2: shipperAddressLine2 }),
          cityName: shipperCity,
          stateCd: shipperState,
          countryCd: shipperCountry,
          postalCd: shipperPostalCd,
        },
        requestor: {
          contact: {
            companyName: requestorCompanyName,
            email: {
              emailAddr: requestorEmail,
            },
            fullName: requestorFullName,
            phone: {
              phoneNbr: requestorPhone,
            },
          },
          roleCd: requestorRoleCd,
        },
        contact: {
          companyName: contactCompanyName,
          email: {
            emailAddr: contactEmail,
          },
          fullName: contactFullName,
          phone: {
            phoneNbr: contactPhone,
          },
        },
        ...(remarks && { remarks }),
        pkupItem: pkupItems,
      },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!pkupDate || !readyTime || !closeTime) {
      setError(new Error('Please fill in pickup date and times'));
      setLoading(false);
      return;
    }
    if (!shipperName || !shipperAddressLine1 || !shipperCity || !shipperState || !shipperPostalCd) {
      setError(new Error('Please fill in all required Shipper fields'));
      setLoading(false);
      return;
    }
    if (!requestorCompanyName || !requestorFullName || !requestorPhone) {
      setError(new Error('Please fill in all required Requestor fields'));
      setLoading(false);
      return;
    }
    if (!contactCompanyName || !contactFullName || !contactPhone) {
      setError(new Error('Please fill in all required Contact fields'));
      setLoading(false);
      return;
    }
    if (pkupItems.length === 0 || pkupItems.some(item => item.totWeight.weight <= 0)) {
      setError(new Error('Please add at least one pickup item with weight'));
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
      const payload = buildXPOPickupRequestRequestBody(requestBody);
      
      // Add shippingCompany to payload
      const finalPayload = {
        shippingCompany: normalizedCarrier,
        ...payload,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('XPO Pickup Request:', JSON.stringify(finalPayload, null, 2));
      }

      const res = await fetch(buildApiUrl('/Logistics/create-pickup-request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `Pickup request creation failed: ${res.statusText}`);
      }

      const data = await res.json();
      onComplete(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setShowSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-4 sm:pb-6 lg:pb-8 px-3 sm:px-4 lg:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">XPO Pickup Request</h1>
        <p className="text-slate-600 mt-1">Create a pickup request for XPO shipping</p>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorDisplay error={error} />
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Pickup Details */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('pickupDetails')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Pickup Details</h2>
            {showSections.pickupDetails ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.pickupDetails && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Pickup Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={pkupDate}
                      onChange={(e) => setPkupDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Pickup Ready Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={readyTime.split('T')[1]?.substring(0, 5) || ''}
                      onChange={(e) => setReadyTime(getDefaultTime(
                        parseInt(e.target.value.split(':')[0]) || 11,
                        parseInt(e.target.value.split(':')[1]) || 0
                      ))}
                      className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Dock Close Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={closeTime.split('T')[1]?.substring(0, 5) || ''}
                      onChange={(e) => setCloseTime(getDefaultTime(
                        parseInt(e.target.value.split(':')[0]) || 16,
                        parseInt(e.target.value.split(':')[1]) || 0
                      ))}
                      className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Special Equipment Code</label>
                  <select
                    value={specialEquipmentCd}
                    onChange={(e) => setSpecialEquipmentCd(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {XPO_PICKUP_REQUEST_SPECIAL_EQUIPMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={insidePkupInd}
                      onChange={(e) => setInsidePkupInd(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Inside Pickup</span>
                  </label>
                </div>
              </div>
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
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipperName}
                    onChange={(e) => setShipperName(e.target.value)}
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
                    value={shipperAddressLine1}
                    onChange={(e) => setShipperAddressLine1(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Address Line 2</label>
                  <input
                    type="text"
                    value={shipperAddressLine2}
                    onChange={(e) => setShipperAddressLine2(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipperCity}
                    onChange={(e) => setShipperCity(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipperState}
                    onChange={(e) => setShipperState(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipperPostalCd}
                    onChange={(e) => setShipperPostalCd(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={shipperCountry}
                    onChange={(e) => setShipperCountry(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {XPO_PICKUP_REQUEST_COUNTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Requestor */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('requestor')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Requestor Information</h2>
            {showSections.requestor ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.requestor && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={requestorCompanyName}
                    onChange={(e) => setRequestorCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={requestorFullName}
                    onChange={(e) => setRequestorFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Email</label>
                  <input
                    type="email"
                    value={requestorEmail}
                    onChange={(e) => setRequestorEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={requestorPhone}
                    onChange={(e) => setRequestorPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Role Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={requestorRoleCd}
                    onChange={(e) => setRequestorRoleCd(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {XPO_PICKUP_REQUEST_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('contact')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Contact Information</h2>
            {showSections.contact ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.contact && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactCompanyName}
                    onChange={(e) => setContactCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactFullName}
                    onChange={(e) => setContactFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pickup Items */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('pickupItems')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Pickup Items</h2>
              <Info className="text-blue-500" size={20} />
            </div>
            {showSections.pickupItems ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.pickupItems && (
            <div className="p-4 sm:p-6 space-y-4">
              {pkupItems.map((item, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Pickup Item {index + 1}</h3>
                    {pkupItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePickupItem(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Destination ZIP Code</label>
                      <input
                        type="text"
                        value={item.destZip6 || ''}
                        onChange={(e) => updatePickupItem(index, 'destZip6', e.target.value)}
                        maxLength={6}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Total Weight (lbs) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.totWeight?.weight || 0}
                        onChange={(e) => updatePickupItemNested(index, ['totWeight', 'weight'], parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Loose Pieces Count</label>
                      <input
                        type="number"
                        value={item.loosePiecesCnt || 0}
                        onChange={(e) => updatePickupItem(index, 'loosePiecesCnt', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">Pallet Count</label>
                      <input
                        type="number"
                        value={item.palletCnt || 0}
                        onChange={(e) => updatePickupItem(index, 'palletCnt', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.garntInd || false}
                          onChange={(e) => updatePickupItem(index, 'garntInd', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700">Garment</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.hazmatInd || false}
                          onChange={(e) => updatePickupItem(index, 'hazmatInd', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700">Hazmat</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.frzbleInd || false}
                          onChange={(e) => updatePickupItem(index, 'frzbleInd', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700">Freezable</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.holDlvrInd || false}
                          onChange={(e) => updatePickupItem(index, 'holDlvrInd', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700">Hold Delivery</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.foodInd || false}
                          onChange={(e) => updatePickupItem(index, 'foodInd', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700">Food</span>
                      </label>
                    </div>

                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-semibold text-slate-900">Remarks</label>
                      <textarea
                        value={item.remarks || ''}
                        onChange={(e) => updatePickupItem(index, 'remarks', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addPickupItem}
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
              >
                <Plus size={16} />
                Add Pickup Item
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
                <label className="block text-sm font-semibold text-slate-900">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-between gap-4">
          <button
            type="button"
            onClick={onPrevious}
            className="px-3 sm:px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow"
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Pickup Request...
              </>
            ) : (
              'Create Pickup Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
