'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
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

  // ZIP Code Lookup
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
          const country = data.country || 'US';

          if (type === 'pickup') {
            setPickupLocation(prev => ({ ...prev, city, state, country }));
          } else {
            setDeliveryLocation(prev => ({ ...prev, city, state, country }));
          }
        }
      }
    } catch (error) {
      console.error('ZIP code lookup failed:', error);
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
    }
  }, [initialResponseData, onResponseDataChange]);

  const buildRequestBody = (): XPOBillOfLadingFields => {
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
              emailAddr: deliveryLocation.email || '',
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
              emailAddr: pickupLocation.email || '',
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
              emailAddr: pickupLocation.email || '',
            },
            phone: {
              phoneNbr: pickupLocation.phone || '',
            },
          },
        },
        commodityLine: commodities,
        chargeToCd: paymentTerms,
        ...(comments && { remarks: comments }),
        ...(emergencyContactName && { emergencyContactName }),
        ...(emergencyContactPhone && { emergencyContactPhone: { phoneNbr: emergencyContactPhone } }),
        ...(selectedPickupServices.length > 0 || selectedDeliveryServices.length > 0 ? {
          additionalService: [...selectedPickupServices, ...selectedDeliveryServices, ...selectedPremiumServices]
        } : {}),
        ...(references.length > 0 && references.some(r => r.reference) ? {
          suppRef: {
            otherRefs: references.filter(r => r.reference)
          }
        } : {}),
        ...(totalDeclaredValue && { declaredValueAmt: { amt: parseFloat(totalDeclaredValue) || 0 } }),
        ...(excessiveLiabilityAuth && { excessLiabilityChargeInit: excessiveLiabilityAuth }),
      },
      autoAssignPro: proNumberOption === 'auto',
    };
  };

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
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `BOL creation failed: ${res.statusText}`);
      }

      const data = await res.json();
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
      setError(err instanceof Error ? err : new Error(String(err)));
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

        {error ? (
          <div className="mb-4">
            <ErrorDisplay error={error} />
          </div>
        ) : null}

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
              showEmail={false}
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
            <BOLFooterActions
              loading={loading}
              onCreateBOL={() => handleSubmit()}
              onCreateBOLTemplate={() => {
                setSaveAsTemplate(true);
                handleSubmit();
              }}
              saveAsTemplate={saveAsTemplate}
              onSaveAsTemplateChange={setSaveAsTemplate}
              signBOLWithRequester={signBOLWithRequester}
              onSignBOLWithRequesterChange={setSignBOLWithRequester}
              agreeToTerms={agreeToTerms}
              onAgreeToTermsChange={setAgreeToTerms}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

