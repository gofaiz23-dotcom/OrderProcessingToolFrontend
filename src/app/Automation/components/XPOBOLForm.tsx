'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, Download, Printer, Copy, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildXPOBillOfLadingRequestBody, buildXPOPickupRequestRequestBody } from '@/app/logistics/xpo/utils/requestBuilder';
import type { XPOPickupRequestFields } from '@/app/api/ShippingUtil/xpo/PickupRequestField';
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
} from '@/app/logistics/xpo/components/BOL';
import { PICKUP_SERVICES, DELIVERY_SERVICES, PREMIUM_SERVICES } from '@/app/logistics/xpo/components/BOL/constants';
import { XPO_SHIPPER_ADDRESS_BOOK, XPO_BOL_DEFAULTS, ESTES_RATE_QUOTE_FORM_DEFAULTS } from '@/Shared/constant';
import type { XPOBillOfLadingCommodity, XPOBillOfLadingReference, XPOBillOfLadingFields } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import { XPO_BOL_COMMODITY_DEFAULTS } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import type { Order } from '@/app/types/order';
import { createShippedOrder, updateShippedOrder, getAllShippedOrders } from '@/app/ProcessedOrders/utils/shippedOrdersApi';

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

type XPOBOLFormProps = {
  order: Order;
  quoteData?: Record<string, unknown>;
  subSKUs?: string[];
  shippingType?: 'LTL' | 'Parcel' | string;
  onBack?: () => void;
  onSuccess?: (response: Record<string, unknown>) => void;
};

// Helper function to extract value from JSONB
const getJsonbValue = (jsonb: Order['jsonb'], key: string): string => {
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

export const XPOBOLForm = ({
  order,
  quoteData,
  subSKUs = [],
  shippingType,
  onBack,
  onSuccess,
}: XPOBOLFormProps) => {
  const { getToken } = useLogisticsStore();
  const carrier = 'xpo';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [responseJson, setResponseJson] = useState<Record<string, unknown> | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [bolPdfUrl, setBolPdfUrl] = useState<string | null>(null);
  const [showResponsePreview, setShowResponsePreview] = useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<Record<string, unknown> | null>(null);
  
  // Helper function to format description with subSKUs
  const formatDescriptionWithSubSKUs = (baseDescription: string, subSKUsArray: string[]): string => {
    if (subSKUsArray.length === 0) {
      return baseDescription;
    }
    const subSKUsString = subSKUsArray.join(', ');
    return `${baseDescription} ${subSKUsString}`;
  };
  
  // Get initial commodity description with subSKUs
  const getInitialCommodityDesc = (): string => {
    const baseDescription = ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription;
    return formatDescriptionWithSubSKUs(baseDescription, subSKUs);
  };
  
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

  // Bill To (string, not LocationData)
  const [billTo, setBillTo] = useState<string>(typeof XPO_BOL_DEFAULTS.billTo === 'string' ? XPO_BOL_DEFAULTS.billTo : '');

  // Commodities - Initialize with formatted description if subSKUs are provided
  const [commodities, setCommodities] = useState<XPOBillOfLadingCommodity[]>([
    {
      ...XPO_BOL_COMMODITY_DEFAULTS,
      desc: getInitialCommodityDesc(),
      grossWeight: XPO_BOL_DEFAULTS.commodity.grossWeight,
      nmfcClass: XPO_BOL_DEFAULTS.commodity.nmfcClass,
      pieceCnt: XPO_BOL_DEFAULTS.commodity.pieceCnt,
      packaging: XPO_BOL_DEFAULTS.commodity.packaging,
      nmfcItemCd: XPO_BOL_DEFAULTS.commodity.nmfcItemCd,
      sub: XPO_BOL_DEFAULTS.commodity.sub,
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

  // XPO Pro Number
  const [proNumberOption, setProNumberOption] = useState<'none' | 'auto' | 'preassigned'>(XPO_BOL_DEFAULTS.proNumberOption);
  const [preAssignedProNumber, setPreAssignedProNumber] = useState(XPO_BOL_DEFAULTS.preAssignedProNumber);

  // Reference Numbers
  const [references, setReferences] = useState<XPOBillOfLadingReference[]>([...XPO_BOL_DEFAULTS.referenceNumbers]);

  // Additional Comments - with default value
  const [additionalComments, setAdditionalComments] = useState(XPO_BOL_DEFAULTS.comments || '');

  // Footer Actions
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [signBOLWithRequester, setSignBOLWithRequester] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(XPO_BOL_DEFAULTS.agreeToTerms ?? true);

  // Section visibility
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    basic: true,
    pickup: true,
    delivery: true,
    billTo: true,
    commodities: true,
    additionalCommodity: false,
    cy: true,
    declaredValue: true,
    services: true,
    pickupRequest: true,
    proNumber: true,
    references: true,
    comments: false,
  });

  // Auto-populate from order data
  useEffect(() => {
    if (order?.jsonb) {
      // Populate delivery location (consignee) from order - check all possible field name variations
      const deliveryAddress = getJsonbValue(order.jsonb, 'Ship to Address 1') ||
                             getJsonbValue(order.jsonb, 'Shipping Address') ||
                             getJsonbValue(order.jsonb, 'Customer Address') ||
                             getJsonbValue(order.jsonb, 'Customer Address 1') ||
                             getJsonbValue(order.jsonb, 'Address') ||
                             getJsonbValue(order.jsonb, 'Address 1') ||
                             getJsonbValue(order.jsonb, 'Ship to Address');
      
      const deliveryAddress2 = getJsonbValue(order.jsonb, 'Ship to Address 2') ||
                              getJsonbValue(order.jsonb, 'Customer Address 2') ||
                              getJsonbValue(order.jsonb, 'Address 2');
      
      const deliveryCity = getJsonbValue(order.jsonb, 'Ship to City') ||
                          getJsonbValue(order.jsonb, 'Shipping City') ||
                          getJsonbValue(order.jsonb, 'Customer City') ||
                          getJsonbValue(order.jsonb, 'City');
      
      const deliveryState = getJsonbValue(order.jsonb, 'Ship to State') ||
                           getJsonbValue(order.jsonb, 'Shipping State') ||
                           getJsonbValue(order.jsonb, 'Customer State') ||
                           getJsonbValue(order.jsonb, 'Ship to State/Province') ||
                           getJsonbValue(order.jsonb, 'State');
      
      const deliveryZip = getJsonbValue(order.jsonb, 'Ship to Zip Code') ||
                         getJsonbValue(order.jsonb, 'Shipping Zip Code') ||
                         getJsonbValue(order.jsonb, 'Customer Zip Code') ||
                         getJsonbValue(order.jsonb, 'Zip') ||
                         getJsonbValue(order.jsonb, 'Postal Code') ||
                         getJsonbValue(order.jsonb, 'Ship to Postal Code') ||
                         getJsonbValue(order.jsonb, 'ZIP Code');
      
      const deliveryCountry = getJsonbValue(order.jsonb, 'Ship to Country') ||
                              getJsonbValue(order.jsonb, 'Shipping Country') ||
                              getJsonbValue(order.jsonb, 'Customer Country') ||
                              getJsonbValue(order.jsonb, 'Country') ||
                              'US'; // Default to US if not found
      
      const deliveryCompany = getJsonbValue(order.jsonb, 'Ship to Name') ||
                             getJsonbValue(order.jsonb, 'Customer Name') ||
                             getJsonbValue(order.jsonb, 'Company Name') ||
                             getJsonbValue(order.jsonb, 'Shipping Name');
      
      const deliveryPhone = getJsonbValue(order.jsonb, 'Ship to Phone') ||
                           getJsonbValue(order.jsonb, 'Customer Phone') ||
                           getJsonbValue(order.jsonb, 'Customer Phone Number') ||
                           getJsonbValue(order.jsonb, 'Phone') ||
                           getJsonbValue(order.jsonb, 'Phone Number') ||
                           getJsonbValue(order.jsonb, 'Shipping Phone');
      
      const deliveryEmail = getJsonbValue(order.jsonb, 'Ship to Email') ||
                           getJsonbValue(order.jsonb, 'Customer Email') ||
                           getJsonbValue(order.jsonb, 'Customer Email Address') ||
                           getJsonbValue(order.jsonb, 'Email') ||
                           getJsonbValue(order.jsonb, 'Shipping Email');

      // Only update if we have at least some address data
      if (deliveryAddress || deliveryCity || deliveryState || deliveryZip) {
        setDeliveryLocation(prev => ({
          ...prev,
          company: deliveryCompany || prev.company,
          streetAddress: deliveryAddress || prev.streetAddress,
          addressLine2: deliveryAddress2 || prev.addressLine2,
          city: deliveryCity || prev.city,
          state: deliveryState || prev.state,
          postalCode: deliveryZip || prev.postalCode,
          country: deliveryCountry || prev.country,
          phone: deliveryPhone || prev.phone,
          email: deliveryEmail || prev.email,
        }));
      }

      // Populate commodity weight
      const weight = getJsonbValue(order.jsonb, 'Weight') || 
                    getJsonbValue(order.jsonb, 'Total Weight');
      if (weight) {
        const weightNum = parseFloat(weight);
        if (!isNaN(weightNum) && weightNum > 0) {
          setCommodities(prev => {
            if (prev.length > 0) {
              return [{
                ...prev[0],
                grossWeight: {
                  ...prev[0].grossWeight,
                  weight: weightNum,
                },
              }];
            }
            return prev;
          });
        }
      }
    }
  }, [order]);

  // Populate from quoteData
  useEffect(() => {
    if (quoteData) {
      // Extract confirmationNbr from quoteData
      let confirmationNbr: string | undefined;
      
      if ((quoteData as any)?.quote?.confirmationNbr) {
        confirmationNbr = (quoteData as any).quote.confirmationNbr;
      } else if ((quoteData as any)?.data?.data?.rateQuote?.confirmationNbr) {
        confirmationNbr = (quoteData as any).data.data.rateQuote.confirmationNbr;
      } else if ((quoteData as any)?.confirmationNbr) {
        confirmationNbr = (quoteData as any).confirmationNbr;
      }
      
      if (confirmationNbr && confirmationNbr.trim() !== '') {
        setReferences([
          {
            referenceTypeCd: 'Other',
            reference: confirmationNbr.trim(),
            referenceCode: 'RQ#',
            referenceDescr: 'Rate Quote Number',
          },
        ]);
      }

      // Populate pickup location and commodities from quoteData
      let rateQuote: any = null;
      
      if ((quoteData as any)?.data?.data?.rateQuote) {
        rateQuote = (quoteData as any).data.data.rateQuote;
      } else if ((quoteData as any)?.quote?.shipmentInfo) {
        rateQuote = (quoteData as any).quote;
      } else if ((quoteData as any)?.shipmentInfo) {
        rateQuote = quoteData;
      }

      if (rateQuote?.shipmentInfo) {
        const shipmentInfo = rateQuote.shipmentInfo;

        // Populate shipper/pickup location
        if (shipmentInfo.shipper) {
          const shipper = shipmentInfo.shipper;
          
          if (shipper.address) {
            // Preserve existing phone number when populating from quoteData
            setPickupLocation((prev) => ({
              searchValue: shipper.address.name || '',
              company: shipper.address.name || '',
              careOf: '',
              streetAddress: shipper.address.addressLine1 || '',
              addressLine2: shipper.address.addressLine2 || '',
              city: shipper.address.cityName || '',
              state: shipper.address.stateCd || '',
              postalCode: shipper.address.postalCd || '',
              country: shipper.address.countryCd || 'US',
              phone: prev.phone || '', // Preserve existing phone number
              extension: prev.extension || '', // Preserve existing extension
              email: prev.email || '', // Preserve existing email
            }));
          }
        }

        // Populate commodity information
        if (shipmentInfo.commodity && Array.isArray(shipmentInfo.commodity) && shipmentInfo.commodity.length > 0) {
          const firstCommodity = shipmentInfo.commodity[0];
          const baseDescription = ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription;
          const formattedDescription = formatDescriptionWithSubSKUs(baseDescription, subSKUs);
          
          setCommodities(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[0] = {
                ...updated[0],
                desc: formattedDescription,
                ...(firstCommodity.grossWeight?.weight !== undefined && {
                  grossWeight: {
                    ...updated[0].grossWeight,
                    weight: firstCommodity.grossWeight.weight,
                  }
                }),
                ...(firstCommodity.nmfcClass && {
                  nmfcClass: String(firstCommodity.nmfcClass).replace(/\.0+$/, ''),
                }),
                nmfcItemCd: '079300',
                sub: '03',
              };
            }
            return updated;
          });
        }
      }
    }
  }, [quoteData, subSKUs]);

  // Update commodity descriptions when subSKUs change
  useEffect(() => {
    if (subSKUs.length > 0) {
      const baseDescription = ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription;
      const formattedDescription = formatDescriptionWithSubSKUs(baseDescription, subSKUs);
      
      setCommodities(prev => {
        const hasChanges = prev.some(commodity => {
          const currentDesc = commodity.desc || '';
          const baseDesc = ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription;
          // Only update if description is empty, just the base, or starts with base but doesn't include subSKUs
          const shouldUpdate = 
            !currentDesc || 
            currentDesc === '' ||
            currentDesc === baseDesc ||
            (currentDesc.startsWith(baseDesc) && !currentDesc.includes(subSKUs.join(', ')));
          
          return shouldUpdate;
        });

        if (!hasChanges) {
          return prev; // No changes needed
        }

        // Update all commodities that need updating
        return prev.map(commodity => {
          const currentDesc = commodity.desc || '';
          const baseDesc = ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription;
          const shouldUpdate = 
            !currentDesc || 
            currentDesc === '' ||
            currentDesc === baseDesc ||
            (currentDesc.startsWith(baseDesc) && !currentDesc.includes(subSKUs.join(', ')));
          
          return {
            ...commodity,
            desc: shouldUpdate ? formattedDescription : commodity.desc,
          };
        });
      });
    }
  }, [subSKUs]);

  // ZIP code lookup
  const lookupZipCode = async (zipCode: string, type: 'pickup' | 'delivery') => {
    if (!zipCode || zipCode.length < 5) return;

    const cleanedZip = zipCode.replace(/\D/g, '').substring(0, 5);
    if (cleanedZip.length !== 5) return;

    if (type === 'pickup') {
      setPickupLoadingZip(true);
    } else {
      setDeliveryLoadingZip(true);
    }

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${cleanedZip}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place['place name'];
          const state = place['state abbreviation'];

          if (type === 'pickup') {
            setPickupLocation(prev => ({ ...prev, city, state }));
          } else {
            setDeliveryLocation(prev => ({ ...prev, city, state }));
          }
        }
      }
    } catch (error) {
      // Silently fail
    } finally {
      if (type === 'pickup') {
        setPickupLoadingZip(false);
      } else {
        setDeliveryLoadingZip(false);
      }
    }
  };

  // Debounced ZIP code lookup
  useEffect(() => {
    if (pickupLocation.postalCode && pickupLocation.postalCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(pickupLocation.postalCode, 'pickup');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [pickupLocation.postalCode]);

  useEffect(() => {
    if (deliveryLocation.postalCode && deliveryLocation.postalCode.length >= 5) {
      const timeoutId = setTimeout(() => {
        lookupZipCode(deliveryLocation.postalCode, 'delivery');
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [deliveryLocation.postalCode]);

  // Auto-populate contact info from pickup location
  // Only populate when useMyContactInfo is toggled ON, not on every render
  const prevUseMyContactInfoRef = useRef(useMyContactInfo);
  const pickupLocationRef = useRef(pickupLocation);
  
  // Keep ref updated with current pickupLocation
  useEffect(() => {
    pickupLocationRef.current = pickupLocation;
  }, [pickupLocation]);
  
  useEffect(() => {
    // Only auto-populate when useMyContactInfo changes from false to true
    if (useMyContactInfo && !prevUseMyContactInfoRef.current && pickupLocationRef.current.company) {
      const location = pickupLocationRef.current;
      setContactCompanyName(location.company);
      // Only set fields if they're currently empty, otherwise preserve user input
      setContactName((prev) => (!prev || prev.trim() === '' ? (location.careOf || '') : prev));
      setContactPhone((prev) => (!prev || prev.trim() === '' ? (location.phone || '') : prev));
      setContactExtension((prev) => (!prev || prev.trim() === '' ? (location.extension || '') : prev));
    }
    // Update ref to track previous value
    prevUseMyContactInfoRef.current = useMyContactInfo;
  }, [useMyContactInfo]);

  // Cleanup PDF URL when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      if (bolPdfUrl) {
        URL.revokeObjectURL(bolPdfUrl);
      }
    };
  }, [bolPdfUrl]);

  // Helper function to format date and time to ISO 8601 with timezone
  const formatDateTimeWithTimezone = (dateStr: string, timeStr: string): string => {
    if (!dateStr || !timeStr) return '';
    
    const date = new Date(dateStr + 'T' + timeStr + ':00');
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes > 0 ? '-' : '+';
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetStr}`;
  };

  // Build request body
  const buildRequestBody = (): XPOBillOfLadingFields => {
    // Build pickupInfo if schedulePickup is enabled
    let pickupInfo: {
      pkupDate: string;
      pkupTime: string;
      dockCloseTime: string;
      contact: {
        companyName: string;
        fullName: string;
        phone: {
          phoneNbr: string;
        };
      };
    } | undefined = undefined;
    
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
              emailAddr: deliveryLocation.email ? String(deliveryLocation.email) : '',
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
              emailAddr: pickupLocation.email ? String(pickupLocation.email) : '',
            },
            phone: {
              phoneNbr: pickupLocation.phone || '',
            },
          },
        },
        billToCust: {
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
              emailAddr: pickupLocation.email ? String(pickupLocation.email) : '',
            },
            phone: {
              phoneNbr: pickupLocation.phone || '',
            },
          },
        },
        commodityLine: commodities,
        chargeToCd: paymentTerms,
        ...(additionalComments && additionalComments.trim() !== '' && { remarks: additionalComments.trim() }),
        emergencyContactName: emergencyContactName !== undefined && emergencyContactName !== null 
          ? emergencyContactName 
          : '',
        emergencyContactPhone: {
          phoneNbr: emergencyContactPhone !== undefined && emergencyContactPhone !== null 
            ? emergencyContactPhone 
            : '',
        },
        // Combine all selected services into a single array of service codes (strings)
        additionalService: (() => {
          const allSelectedServices = [
            ...selectedPickupServices,
            ...selectedDeliveryServices,
            ...selectedPremiumServices,
          ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
          
          // Return as array of strings (service codes)
          // The requestBuilder will transform these into the proper object format
          return allSelectedServices;
        })(),
        ...(references.length > 0 && references.some(r => r.reference) ? {
          suppRef: {
            otherRefs: references.filter(r => r.reference)
          }
        } : {}),
        // Always include declaredValueAmt (default to 0.01 if not provided)
        declaredValueAmt: {
          amt: totalDeclaredValue && parseFloat(totalDeclaredValue) > 0 
            ? parseFloat(totalDeclaredValue) 
            : 0.01,
        },
        // Always include declaredValueAmtPerLb (default to 0.01 if not provided)
        declaredValueAmtPerLb: {
          amt: 0.01, // Default value as per working payload
        },
        // Always include excessLiabilityChargeInit (empty string if not provided)
        excessLiabilityChargeInit: excessiveLiabilityAuth !== undefined && excessiveLiabilityAuth !== null
          ? excessiveLiabilityAuth
          : '',
        ...(pickupInfo && { pickupInfo }),
      },
      autoAssignPro: proNumberOption === 'auto',
    };
  };

  // Handle clear form
  const handleClearForm = () => {
    setRequesterRole(XPO_BOL_DEFAULTS.requesterRole);
    setPaymentTerms(XPO_BOL_DEFAULTS.paymentTerms);
    // Preserve phone number when resetting (only reset if user explicitly wants to reset)
    setPickupLocation((prev) => ({
      searchValue: XPO_BOL_DEFAULTS.pickupLocation.searchValue,
      company: XPO_BOL_DEFAULTS.pickupLocation.company,
      careOf: XPO_BOL_DEFAULTS.pickupLocation.careOf,
      streetAddress: XPO_BOL_DEFAULTS.pickupLocation.streetAddress,
      addressLine2: XPO_BOL_DEFAULTS.pickupLocation.addressLine2,
      city: XPO_BOL_DEFAULTS.pickupLocation.city,
      state: XPO_BOL_DEFAULTS.pickupLocation.state,
      postalCode: XPO_BOL_DEFAULTS.pickupLocation.postalCode,
      country: XPO_BOL_DEFAULTS.pickupLocation.country,
      phone: prev.phone || XPO_BOL_DEFAULTS.pickupLocation.phone, // Preserve existing phone
      extension: prev.extension || XPO_BOL_DEFAULTS.pickupLocation.extension, // Preserve existing extension
      email: prev.email || XPO_BOL_DEFAULTS.pickupLocation.email, // Preserve existing email
    }));
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
    setBillTo(typeof XPO_BOL_DEFAULTS.billTo === 'string' ? XPO_BOL_DEFAULTS.billTo : '');
    setCommodities([{
      ...XPO_BOL_COMMODITY_DEFAULTS,
      desc: XPO_BOL_DEFAULTS.commodity.desc,
      grossWeight: XPO_BOL_DEFAULTS.commodity.grossWeight,
      nmfcClass: XPO_BOL_DEFAULTS.commodity.nmfcClass,
      pieceCnt: XPO_BOL_DEFAULTS.commodity.pieceCnt,
      packaging: XPO_BOL_DEFAULTS.commodity.packaging,
      nmfcItemCd: XPO_BOL_DEFAULTS.commodity.nmfcItemCd,
      sub: XPO_BOL_DEFAULTS.commodity.sub,
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
    setAdditionalComments(XPO_BOL_DEFAULTS.comments || '');
    setSaveAsTemplate(false);
    setSignBOLWithRequester(false);
    setAgreeToTerms(XPO_BOL_DEFAULTS.agreeToTerms ?? true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!agreeToTerms) {
      setError(new Error('Please agree to Terms of Service'));
      setLoading(false);
      return;
    }

    // Validate pickup request fields if schedulePickup is enabled
    if (schedulePickup) {
      if (!pickupDate || !pickupReadyTime || !dockCloseTime) {
        setError(new Error('Please fill in all required Pickup Request fields (Date, Ready Time, Dock Close Time)'));
        setLoading(false);
        return;
      }
      
      // Helper function to get today's date in YYYY-MM-DD format
      const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Validate that pickup date is not in the past
      const today = getTodayDate();
      if (pickupDate < today) {
        setError(new Error('Pickup date cannot be in the past. Please select today or a future date.'));
        setLoading(false);
        return;
      }
      
      // Validate that ready time is before dock close time
      const [readyHours, readyMinutes] = pickupReadyTime.split(':').map(Number);
      const [closeHours, closeMinutes] = dockCloseTime.split(':').map(Number);
      const readyTimeMinutes = readyHours * 60 + readyMinutes;
      const closeTimeMinutes = closeHours * 60 + closeMinutes;
      
      if (readyTimeMinutes >= closeTimeMinutes) {
        setError(new Error('Pickup Ready Time must be before Dock Close Time'));
        setLoading(false);
        return;
      }
      
      if (!contactCompanyName || !contactName || !contactPhone) {
        setError(new Error('Please fill in all required Pickup Contact fields (Company Name, Contact Name, Phone Number)'));
        setLoading(false);
        return;
      }
      
      // Validate phone number is not empty
      if (!contactPhone || contactPhone.trim() === '') {
        setError(new Error('Pickup Contact Phone Number is required'));
        setLoading(false);
        return;
      }
    }

    try {
      const requestBody = buildRequestBody();
      setPayloadPreview(requestBody as unknown as Record<string, unknown>); // Set payload for preview
      const payload = buildXPOBillOfLadingRequestBody(requestBody);
      
      const finalPayload = {
        shippingCompany: carrier,
        ...payload,
      };

      const token = getToken(carrier);
      if (!token) {
        throw new Error('Authentication required. Please login.');
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
        const errorText = await res.text();
        let errorMessage = `BOL creation failed: ${res.status} ${res.statusText}`;
        
        try {
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error?.message || errorMessage;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResponseJson(data);
      
      // If schedulePickup is true, also create a pickup request
      if (schedulePickup && pickupDate && pickupReadyTime && dockCloseTime && contactCompanyName && contactName && contactPhone) {
        try {
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

          // Build pickup request payload from BOL form data
          const pickupRequestPayload: XPOPickupRequestFields = {
            pickupRqstInfo: {
              pkupDate: convertToISO8601(pickupDate, '00:00:00'), // Use date with 00:00:00 time
              readyTime: convertToISO8601(pickupDate, pickupReadyTime),
              closeTime: convertToISO8601(pickupDate, dockCloseTime),
              shipper: {
                name: pickupLocation.company || '',
                addressLine1: pickupLocation.streetAddress || '',
                cityName: pickupLocation.city || '',
                stateCd: pickupLocation.state || '',
                countryCd: pickupLocation.country || 'US',
                postalCd: pickupLocation.postalCode || '',
              },
              requestor: {
                contact: {
                  companyName: pickupLocation.company || '',
                  email: {
                    emailAddr: pickupLocation.email ? String(pickupLocation.email) : '',
                  },
                  fullName: pickupLocation.company || '',
                  phone: {
                    phoneNbr: pickupLocation.phone || '',
                  },
                },
                roleCd: requesterRole,
              },
              contact: {
                companyName: contactCompanyName || pickupLocation.company || '',
                email: {
                  emailAddr: pickupLocation.email ? String(pickupLocation.email) : '',
                },
                fullName: contactName || pickupLocation.company || '',
                phone: {
                  phoneNbr: contactPhone || pickupLocation.phone || '',
                },
              },
              ...(additionalComments && additionalComments.trim() !== '' && { remarks: additionalComments.trim() }),
              pkupItem: commodities.map((commodity) => ({
                destZip6: deliveryLocation.postalCode?.substring(0, 6) || '',
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
            shippingCompany: carrier,
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
            
            // Update order with pickup response - find by SKU and marketplace
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
                      pickupRequestPayload: finalPickupPayload,
                      pickupData,
                      response: pickupData,
                    },
                  });
                  console.log('✅ Updated existing order with pickup response');
                } else {
                  console.warn('⚠️ Could not find order to update with pickup response');
                }
              }
            } catch (saveError) {
              console.error('⚠️ Failed to save pickup response to database:', saveError);
              // Don't throw error - pickup request was successful, just log the save error
            }
          }
        } catch (pickupErr) {
          // Log the error but don't fail the entire flow - BOL was created successfully
          console.error('Pickup Request Creation Error:', pickupErr);
          // You might want to show a warning to the user here
        }
      }
      
      // After successful BOL creation, fetch PDF using the PDF URI from response
      try {
        // Extract PDF URI from BOL response - look for link with rel="self" and uri containing "/pdf"
        const bolInfo = (data as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        const dataBolInfo = bolInfo?.data as Record<string, unknown> | undefined;
        const finalBolInfo = dataBolInfo?.bolInfo || bolInfo?.bolInfo;
        const links = ((finalBolInfo as Record<string, unknown>)?.link || bolInfo?.link || []) as Array<Record<string, unknown>>;
        
        // Find the link with rel="self" and uri containing "/pdf"
        const pdfLinkObj = links.find((link) => 
          (link.uri as string)?.includes('/pdf') && ((link.rel as string) === 'self' || !link.rel)
        );
        
        // If not found with rel="self", try any link with "/pdf"
        const pdfUri = (pdfLinkObj?.uri as string) || (links.find((link) => (link.uri as string)?.includes('/pdf'))?.uri as string);

        if (pdfUri && token) {
          // Prepare request body for download-bol-pdf API
          const pdfRequestBody = {
            shippingCompanyName: carrier,
            pdfUri: pdfUri,
            token: token,
          };

          // Call download-bol-pdf API
          const pdfRes = await fetch(buildApiUrl('/Logistics/download-bol-pdf'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(pdfRequestBody),
          });

          const pdfData = await pdfRes.json();
          
          // Convert base64 PDF to File
          // XPO response has contentType field
          if (pdfData.code === '200' && pdfData.data?.bolpdf?.contentType) {
            try {
              const base64Content = pdfData.data.bolpdf.contentType;
              const fileName = pdfData.data.bolpdf.fileName || 'BillOfLading.pdf';
              
              // Convert base64 to binary
              const binaryString = atob(base64Content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: 'application/pdf' });
              
              // Create PDF URL for viewing
              const pdfUrl = URL.createObjectURL(blob);
              setBolPdfUrl(pdfUrl);
              
              // Create File object
              const pdfFileObj = new File([blob], fileName, { type: 'application/pdf' });
              setPdfFile(pdfFileObj);
            } catch (convertError) {
              console.error('Error converting PDF base64 to File:', convertError);
            }
          } else {
            console.warn('PDF data not found in expected format:', pdfData);
          }
        } else {
          console.warn('PDF URI or token not available. PDF URI:', pdfUri, 'Token:', !!token);
        }
      } catch (pdfError) {
        console.error('Error calling download-bol-pdf API:', pdfError);
        // Don't throw error - BOL creation was successful, just log the PDF download error
      }

      // Save BOL response with Shipping Type, SubSKU, and PDF file to database
      try {
        const sku = getJsonbValue(order.jsonb, 'SKU') || '';
        const marketplace = order.orderOnMarketPlace || '';
        const finalShippingType = shippingType || 'LTL'; // Use provided shipping type or default to LTL
        
        if (sku && marketplace) {
          // Prepare BOL PDF file if available
          const bolFiles: File[] = [];
          if (pdfFile) {
            bolFiles.push(pdfFile);
          }
          
          // Check if order already exists
          const existingOrders = await getAllShippedOrders({ page: 1, limit: 100 });
          const existingOrder = existingOrders.orders.find(
            (o) => o.sku === sku && o.orderOnMarketPlace === marketplace
          );

          if (existingOrder) {
            // Update existing order with BOL response, shipping type, subSKUs, and PDF file
            await updateShippedOrder(existingOrder.id, {
              bolResponseJsonb: data,
              shippingType: finalShippingType,
              subSKUs: subSKUs.length > 0 ? subSKUs : undefined,
              files: bolFiles.length > 0 ? bolFiles : undefined,
            });
            console.log('✅ Updated existing order with BOL response');
          } else {
            // Create new order with BOL response, shipping type, subSKUs, and PDF file
            await createShippedOrder({
              sku,
              orderOnMarketPlace: marketplace,
              ordersJsonb: order.jsonb as Record<string, unknown>,
              bolResponseJsonb: data,
              shippingType: finalShippingType,
              subSKUs: subSKUs.length > 0 ? subSKUs : undefined,
              files: bolFiles.length > 0 ? bolFiles : undefined,
            });
            console.log('✅ Created new order with BOL response');
          }
        }
      } catch (saveError) {
        console.error('⚠️ Failed to save BOL to database:', saveError);
        // Don't throw error - BOL creation was successful, just log the save error
      }

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setShowSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-4 sm:pb-6 lg:pb-8 px-3 sm:px-4 lg:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">XPO Bill of Lading</h1>
          <p className="text-slate-600 mt-1">Create a bill of lading for XPO shipping</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorDisplay error={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('basic')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Basic Information</h2>
            {showSections.basic ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.basic && (
            <div className="p-4 sm:p-6">
              <BasicInformationSection
                requesterRole={requesterRole}
                onRequesterRoleChange={setRequesterRole}
                paymentTerms={paymentTerms}
                onPaymentTermsChange={setPaymentTerms}
                onClearForm={handleClearForm}
              />
            </div>
          )}
        </div>

        {/* Pickup Location */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('pickup')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Pickup Location</h2>
            {showSections.pickup ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.pickup && (
            <div className="p-4 sm:p-6">
              <LocationSection
                title="Pickup Location"
                data={pickupLocation}
                onDataChange={(updatedData) => {
                  // Properly merge the update to preserve all fields
                  setPickupLocation((prev) => {
                    // If phone is explicitly in updatedData (even if empty), use it
                    // Otherwise, preserve the previous phone value
                    const phoneValue = 'phone' in updatedData 
                      ? (updatedData.phone || '') 
                      : (prev.phone || '');
                    
                    return {
                      ...prev,
                      ...updatedData,
                      phone: phoneValue,
                    };
                  });
                }}
                onZipLookup={(zip) => lookupZipCode(zip, 'pickup')}
                loadingZip={pickupLoadingZip}
                addressBookOptions={XPO_SHIPPER_ADDRESS_BOOK.map(addr => ({
                  value: `ammana-${addr.id}`,
                  label: `${addr.name} - ${addr.state || ''} - ${addr.address || ''}`,
                  company: addr.name,
                  streetAddress: addr.address || '',
                  city: addr.city || '',
                  state: addr.state || '',
                  zip: addr.zip || '',
                  country: 'US',
                  phone: addr.phone || '',
                }))}
              />
            </div>
          )}
        </div>

        {/* Delivery Location */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('delivery')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Delivery Location</h2>
            {showSections.delivery ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.delivery && (
            <div className="p-4 sm:p-6">
              <LocationSection
                title="Delivery Location"
                data={deliveryLocation}
                onDataChange={(updatedData) => {
                  // Properly merge the update to preserve all fields
                  setDeliveryLocation((prev) => {
                    // If phone is explicitly in updatedData (even if empty), use it
                    // Otherwise, preserve the previous phone value
                    const phoneValue = 'phone' in updatedData 
                      ? (updatedData.phone || '') 
                      : (prev.phone || '');
                    
                    return {
                      ...prev,
                      ...updatedData,
                      phone: phoneValue,
                    };
                  });
                }}
                onZipLookup={(zip) => lookupZipCode(zip, 'delivery')}
                loadingZip={deliveryLoadingZip}
                required={false}
              />
            </div>
          )}
        </div>

        {/* Bill To */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('billTo')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Bill To Customer</h2>
            {showSections.billTo ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.billTo && (
            <div className="p-4 sm:p-6">
              <BillToSection
                billTo={billTo}
                onBillToChange={setBillTo}
              />
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
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Commodities</h2>
            {showSections.commodities ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.commodities && (
            <div className="p-4 sm:p-6 space-y-4">
              {commodities.map((commodity, index) => (
                <CommodityDetailsSection
                  key={index}
                  commodity={commodity}
                  index={index}
                  onUpdate={(index, field, value) => {
                    const updated = [...commodities];
                    updated[index] = { ...updated[index], [field]: value };
                    setCommodities(updated);
                  }}
                  onUpdateNested={(index, path, value) => {
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
                    
                    // Weight field: Always convert to integer (whole numbers only) - only in Automation
                    let finalValue = value;
                    if (path.length === 2 && path[0] === 'grossWeight' && path[1] === 'weight') {
                      if (typeof value === 'number') {
                        // Always round to nearest integer (no decimals allowed)
                        finalValue = Math.round(value);
                      } else if (typeof value === 'string') {
                        if (value === '' || value === '-') {
                          finalValue = '';
                        } else {
                          // Parse and round to nearest integer
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            finalValue = Math.round(numValue);
                          } else {
                            finalValue = 0;
                          }
                        }
                      }
                    }
                    
                    current[path[path.length - 1]] = finalValue;
                    updated[index] = commodity;
                    setCommodities(updated);
                  }}
                  onRemove={(index) => {
                    if (commodities.length > 1) {
                      setCommodities(commodities.filter((_, i) => i !== index));
                    }
                  }}
                  canRemove={commodities.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const baseDescription = ESTES_RATE_QUOTE_FORM_DEFAULTS.defaultDescription;
                  const formattedDescription = formatDescriptionWithSubSKUs(baseDescription, subSKUs);
                  setCommodities([...commodities, {
                    ...XPO_BOL_COMMODITY_DEFAULTS,
                    desc: formattedDescription,
                    nmfcItemCd: '079300',
                    sub: '03',
                  }]);
                }}
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
              >
                <Plus size={16} />
                Add Commodity
              </button>
            </div>
          )}
        </div>

        {/* Additional Commodity */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('additionalCommodity')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Additional Commodity</h2>
            {showSections.additionalCommodity ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.additionalCommodity && (
            <div className="p-4 sm:p-6">
              <AdditionalCommoditySection />
            </div>
          )}
        </div>

        {/* Additional Sections - Collapsed by default */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('emergency')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Emergency Contact</h2>
            {showSections.emergency ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.emergency && (
            <div className="p-4 sm:p-6">
              <EmergencyContactSection
                name={emergencyContactName}
                onNameChange={setEmergencyContactName}
                phone={emergencyContactPhone}
                onPhoneChange={setEmergencyContactPhone}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('declaredValue')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Declared Value</h2>
            {showSections.declaredValue ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.declaredValue && (
            <div className="p-4 sm:p-6">
              <DeclaredValueSection
                totalDeclaredValue={totalDeclaredValue}
                onTotalDeclaredValueChange={setTotalDeclaredValue}
                excessiveLiabilityAuth={excessiveLiabilityAuth}
                onExcessiveLiabilityAuthChange={setExcessiveLiabilityAuth}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('services')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Services</h2>
            {showSections.services ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.services && (
            <div className="p-4 sm:p-6 space-y-6">
              <ServicesSection
                title="Pickup Services"
                services={PICKUP_SERVICES}
                selectedServices={selectedPickupServices}
                onServiceToggle={(service) => {
                  setSelectedPickupServices(prev =>
                    prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
                  );
                }}
              />
              <ServicesSection
                title="Delivery Services"
                services={DELIVERY_SERVICES}
                selectedServices={selectedDeliveryServices}
                onServiceToggle={(service) => {
                  setSelectedDeliveryServices(prev =>
                    prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
                  );
                }}
              />
              <ServicesSection
                title="Premium Services"
                services={PREMIUM_SERVICES}
                selectedServices={selectedPremiumServices}
                onServiceToggle={(service) => {
                  setSelectedPremiumServices(prev =>
                    prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
                  );
                }}
              />
            </div>
          )}
        </div>

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
            <div className="p-4 sm:p-6">
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
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('proNumber')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">XPO Pro Number</h2>
            {showSections.proNumber ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.proNumber && (
            <div className="p-4 sm:p-6">
              <XPOProNumberSection
                proNumberOption={proNumberOption}
                onProNumberOptionChange={setProNumberOption}
                preAssignedProNumber={preAssignedProNumber}
                onPreAssignedProNumberChange={setPreAssignedProNumber}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('references')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Reference Numbers</h2>
            {showSections.references ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.references && (
            <div className="p-4 sm:p-6">
              <ReferenceNumbersSection
                references={references}
                onReferencesChange={setReferences}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('comments')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Additional Comments</h2>
            {showSections.comments ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showSections.comments && (
            <div className="p-4 sm:p-6">
              <AdditionalCommentsSection
                comments={additionalComments}
                onCommentsChange={setAdditionalComments}
              />
            </div>
          )}
        </div>

        {/* Request Payload Preview */}
        {payloadPreview && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPayloadPreview(!showPayloadPreview)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Request Payload Preview</h2>
              {showPayloadPreview ? (
                <ChevronUp className="text-slate-600" size={20} />
              ) : (
                <ChevronDown className="text-slate-600" size={20} />
              )}
            </button>
            {showPayloadPreview && (
              <div className="p-4 sm:p-6">
                <pre className="text-xs text-slate-700 overflow-auto max-h-96 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-200">
                  {JSON.stringify(payloadPreview, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 sm:px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow"
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </button>
            )}
            <div className="flex items-center gap-4 ml-auto">
              <button
                type="submit"
                disabled={loading || !agreeToTerms}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
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
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  setSaveAsTemplate(true);
                  const syntheticEvent = {
                    preventDefault: () => {},
                  } as React.FormEvent;
                  await handleSubmit(syntheticEvent);
                }}
                className="px-6 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
              >
                Create BOL Template
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* PDF Preview Section - Similar to original BOLForm */}
      {bolPdfUrl && pdfFile && (
        <div className="mt-6 space-y-4">
          {/* PDF Preview Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-slate-900">BOL Created Successfully!</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (pdfFile) {
                        const url = URL.createObjectURL(pdfFile);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = pdfFile.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      } else if (bolPdfUrl) {
                        const link = document.createElement('a');
                        link.href = bolPdfUrl;
                        const fileName = 'BillOfLading.pdf';
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err : new Error('Failed to download PDF'));
                    }
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                  title="Download PDF"
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (!bolPdfUrl) {
                        setError(new Error('PDF data not found in response'));
                        return;
                      }
                      const printWindow = window.open(bolPdfUrl, '_blank');
                      if (printWindow) {
                        printWindow.onload = () => {
                          setTimeout(() => {
                            printWindow.print();
                          }, 250);
                        };
                      } else {
                        setError(new Error('Popup blocked. Please allow popups to print.'));
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err : new Error('Failed to print PDF'));
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  title="Print PDF"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (bolPdfUrl) {
                      URL.revokeObjectURL(bolPdfUrl);
                    }
                    setBolPdfUrl(null);
                    setPdfFile(null);
                    setResponseJson(null);
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
                src={bolPdfUrl}
                className="w-full h-[600px] border-0 rounded-lg"
                title="PDF Preview"
              />
            </div>
          </div>
          
          {/* JSON Response Preview Section */}
          {responseJson && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">JSON Response</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
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
                  {JSON.stringify(responseJson, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

