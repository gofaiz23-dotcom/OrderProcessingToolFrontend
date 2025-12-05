'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Clock, CheckCircle2, Plus, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { Toast } from '@/app/orders/_components/Toast';
import { deleteOrder } from '@/app/api/OrderApi';
import { useRouter } from 'next/navigation';

type PickupRequestProps = {
  onPrevious: () => void;
  onComplete: (response?: any) => void;
  quoteData?: any;
  bolFormData?: any;
  bolResponseData?: any;
  orderId?: number;
};

type Shipment = {
  id: string;
  type: string;
  handlingUnits: string;
  weight: string;
  destinationZip: string;
  referenceNumbers: string[];
};

type Contact = {
  id: string;
  name: string;
  email: string;
};

export const PickupRequest = ({ onPrevious, onComplete, quoteData, bolFormData, bolResponseData, orderId }: PickupRequestProps) => {
  const { getToken } = useLogisticsStore();
  const router = useRouter();
  const carrier = 'estes';

  // Account Information
  const [myAccount, setMyAccount] = useState('0216496');
  const [role, setRole] = useState('Third-Party');

  // Requester Details
  const [requesterAddressBook, setRequesterAddressBook] = useState('');
  const [requesterContactName, setRequesterContactName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('(888) 888-8888');
  const [requesterExtension, setRequesterExtension] = useState('');

  // Pickup Location
  const [pickupAddressBook, setPickupAddressBook] = useState('');
  const [pickupCompanyName, setPickupCompanyName] = useState('');
  const [pickupAddress1, setPickupAddress1] = useState('');
  const [pickupAddress2, setPickupAddress2] = useState('');
  const [pickupZipCode, setPickupZipCode] = useState('');
  const [pickupCountry, setPickupCountry] = useState('USA');

  // Dock Contact Details
  const [useRequesterInfo, setUseRequesterInfo] = useState(false);
  const [dockAddressBook, setDockAddressBook] = useState('');
  const [dockContactName, setDockContactName] = useState('');
  const [dockEmail, setDockEmail] = useState('');
  const [dockPhone, setDockPhone] = useState('(888) 888-8888');
  const [dockExtension, setDockExtension] = useState('');

  // Pickup Details
  const [pickupDate, setPickupDate] = useState('');
  const [pickupStartTime, setPickupStartTime] = useState('08:00');
  const [pickupEndTime, setPickupEndTime] = useState('17:00');
  const [loadType, setLoadType] = useState('Live Load');

  // Shipment Information
  const [shipments, setShipments] = useState<Shipment[]>([
    {
      id: '1',
      type: 'PALLET',
      handlingUnits: '',
      weight: '',
      destinationZip: '',
      referenceNumbers: [],
    },
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
  const [guaranteedShipment, setGuaranteedShipment] = useState(false);
  const [pickupInstructions, setPickupInstructions] = useState('');

  // Notifications
  const [emailRejected, setEmailRejected] = useState(true);
  const [emailAccepted, setEmailAccepted] = useState(false);
  const [emailCompleted, setEmailCompleted] = useState(false);
  const [additionalContacts, setAdditionalContacts] = useState<Contact[]>([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    accountInfo: true,
    requesterInfo: true,
    pickupLocation: true,
    dockContact: true,
    pickupDetails: true,
    shipmentInfo: true,
    freightCharacteristics: true,
    timeCritical: true,
    notifications: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const preserveScrollRef = useRef<number | null>(null);
  const isInitialMountRef = useRef(true);

  // Prefill data from BOL form and response
  useEffect(() => {
    if (bolFormData) {
      // Account Information
      if (bolFormData.myAccount) setMyAccount(bolFormData.myAccount);
      if (bolFormData.role) setRole(bolFormData.role);

      // Requester Details (from origin)
      if (bolFormData.originContactName) setRequesterContactName(bolFormData.originContactName);
      if (bolFormData.originEmail) setRequesterEmail(bolFormData.originEmail);
      if (bolFormData.originPhone) setRequesterPhone(bolFormData.originPhone);

      // Pickup Location (from origin)
      if (bolFormData.originName) setPickupCompanyName(bolFormData.originName);
      if (bolFormData.originAddress1) setPickupAddress1(bolFormData.originAddress1);
      if (bolFormData.originAddress2) setPickupAddress2(bolFormData.originAddress2);
      if (bolFormData.originZipCode) setPickupZipCode(bolFormData.originZipCode);
      if (bolFormData.originCountry) setPickupCountry(bolFormData.originCountry);

      // Dock Contact (from origin)
      if (bolFormData.originContactName) setDockContactName(bolFormData.originContactName);
      if (bolFormData.originEmail) setDockEmail(bolFormData.originEmail);
      if (bolFormData.originPhone) setDockPhone(bolFormData.originPhone);

      // Pickup Date
      if (bolFormData.shipDate) setPickupDate(bolFormData.shipDate);

      // Shipment Information
      if (bolFormData.handlingUnits && bolFormData.handlingUnits.length > 0) {
        const firstUnit = bolFormData.handlingUnits[0];
        setShipments([
          {
            id: '1',
            type: firstUnit.handlingUnitType === 'PALLET' ? 'PALLET' : 'PALLET',
            handlingUnits: String(firstUnit.quantity || ''),
            weight: String(firstUnit.weight || ''),
            destinationZip: bolFormData.destinationZipCode || '',
            referenceNumbers: [],
          },
        ]);
      }

      // Freight Characteristics
      if (bolFormData.liftGateService) setLiftgate(true);
      if (bolFormData.specialHandlingRequests?.includes('Do Not Stack')) setDoNotStack(true);
      if (bolFormData.specialHandlingRequests?.includes('Protect from Freezing')) setProtectFromFreezing(true);

      // Pickup Instructions
      const instructions: string[] = [];
      if (bolFormData.specialHandlingRequests) {
        instructions.push(...bolFormData.specialHandlingRequests);
      }
      if (bolFormData.liftGateService) {
        instructions.push('Liftgate Required');
      }
      if (instructions.length > 0) {
        setPickupInstructions(instructions.join('. '));
      }
    }

    // Prefill PRO number from BOL response
    if (bolResponseData?.data?.referenceNumbers?.pro) {
      const proNumber = bolResponseData.data.referenceNumbers.pro;
      setShipments((prev) => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0].referenceNumbers = [proNumber];
        }
        return updated;
      });
    }
  }, [bolFormData, bolResponseData]);

  // Preserve scroll position after state updates (for add/remove operations)
  // Only preserve scroll if it was explicitly set (not on initial mount)
  useEffect(() => {
    // Skip on initial mount - let scroll-to-top effect handle it
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    if (preserveScrollRef.current !== null && preserveScrollRef.current !== 0) {
      // Restore scroll position after DOM updates
      const scrollY = preserveScrollRef.current;
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        preserveScrollRef.current = null;
      });
    }
  }, [shipments, additionalContacts]);

  // Update dock contact when "Use Requester Information" is checked
  useEffect(() => {
    if (useRequesterInfo) {
      setDockContactName(requesterContactName);
      setDockEmail(requesterEmail);
      setDockPhone(requesterPhone);
      setDockExtension(requesterExtension);
    }
  }, [useRequesterInfo, requesterContactName, requesterEmail, requesterPhone, requesterExtension]);

  // Scroll to top when component mounts (only once)
  useEffect(() => {
    // Prevent any scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Clear any preserved scroll position on mount and mark as initial mount
    preserveScrollRef.current = null;
    isInitialMountRef.current = true;
    
    // Enhanced scroll to top function
    const scrollToTop = () => {
      // Try all scroll methods to ensure it works
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo(0, 0);
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
      // Scroll to the container if it exists
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Also try scrolling to pickup request section wrapper
      const pickupSection = document.querySelector('[data-pickup-request-section]');
      if (pickupSection) {
        pickupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    
    // Immediate scroll
    scrollToTop();
    
    // Multiple attempts with delays to ensure it works after DOM is ready
    const timeoutIds: NodeJS.Timeout[] = [];
    const rafId = requestAnimationFrame(() => {
      scrollToTop();
      // Multiple attempts with increasing delays to catch all render cycles
      timeoutIds.push(
        setTimeout(scrollToTop, 0),
        setTimeout(scrollToTop, 50),
        setTimeout(scrollToTop, 100),
        setTimeout(scrollToTop, 200),
        setTimeout(scrollToTop, 300),
        setTimeout(scrollToTop, 500),
        setTimeout(scrollToTop, 800),
        setTimeout(scrollToTop, 1000)
      );
    });
    
    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, []);

  const toggleSection = (section: string) => {
    setShowSections({ ...showSections, [section]: !showSections[section] });
  };

  const addShipment = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    // Save current scroll position
    preserveScrollRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    setShipments([
      ...shipments,
      {
        id: Date.now().toString(),
        type: 'PALLET',
        handlingUnits: '',
        weight: '',
        destinationZip: '',
        referenceNumbers: [],
      },
    ]);
  };

  const removeShipment = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    // Save current scroll position
    preserveScrollRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    if (shipments.length > 1) {
      setShipments(shipments.filter((s) => s.id !== id));
    }
  };

  const updateShipment = (id: string, field: keyof Shipment, value: any) => {
    setShipments(shipments.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const addReferenceNumber = (shipmentId: string) => {
    const refNumber = prompt('Enter reference number:');
    if (refNumber) {
      updateShipment(shipmentId, 'referenceNumbers', [
        ...shipments.find((s) => s.id === shipmentId)?.referenceNumbers || [],
        refNumber,
      ]);
    }
  };

  const removeReferenceNumber = (shipmentId: string, index: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (shipment) {
      const updated = shipment.referenceNumbers.filter((_, i) => i !== index);
      updateShipment(shipmentId, 'referenceNumbers', updated);
    }
  };

  const addAdditionalContact = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    // Save current scroll position
    preserveScrollRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    setAdditionalContacts([
      ...additionalContacts,
      {
        id: Date.now().toString(),
        name: '',
        email: '',
      },
    ]);
  };

  const removeAdditionalContact = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    // Save current scroll position
    preserveScrollRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    setAdditionalContacts(additionalContacts.filter((c) => c.id !== id));
  };

  const updateAdditionalContact = (id: string, field: keyof Contact, value: string) => {
    setAdditionalContacts(additionalContacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Parse phone number into area code and number
  const parsePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return {
        areaCode: cleaned.substring(0, 3),
        number: cleaned.substring(3, 10),
      };
    }
    return { areaCode: '000', number: '0000000' };
  };

  // Parse name into first, middle, last
  const parseName = (name: string) => {
    const parts = name.trim().split(' ');
    return {
      firstName: parts[0] || '',
      middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
      lastName: parts.length > 1 ? parts[parts.length - 1] : '',
    };
  };

  const buildRequestBody = () => {
    const requesterPhoneParsed = parsePhone(requesterPhone);
    const dockPhoneParsed = parsePhone(dockPhone);
    const requesterNameParsed = parseName(requesterContactName);
    const dockNameParsed = parseName(dockContactName);

    // Calculate totals
    const totalPieces = shipments.reduce((sum, s) => sum + parseInt(s.handlingUnits || '0'), 0);
    const totalWeight = shipments.reduce((sum, s) => sum + parseInt(s.weight || '0'), 0);
    const totalHandlingUnits = shipments.length;

    // Build commodities from shipments
    const commodities = shipments.map((shipment) => {
      // Get commodity details from BOL if available
      const bolUnit = bolFormData?.handlingUnits?.[0];
      return {
        commodityInfo: {
          code: '',
          packageCode: shipment.type === 'PALLET' ? 'PAT' : 'CTN',
          description: bolUnit?.items?.[0]?.description || 'Freight',
          hazmat: {
            hazmatCode: '',
            hazmatFlag: hazmat ? 'Y' : 'N',
          },
          pieces: shipment.handlingUnits || '0',
          weight: shipment.weight || '0',
          nmfcNumber: bolUnit?.nmfc || '',
          nmfcSubNumber: bolUnit?.sub || '',
        },
      };
    });

    // Build comments from pickup instructions and freight characteristics
    const commentParts: string[] = [];
    if (loadType) commentParts.push(loadType);
    if (pickupInstructions) commentParts.push(pickupInstructions);
    if (doNotStack) commentParts.push('Do Not Stack');
    if (protectFromFreezing) commentParts.push('Protect from Freezing');
    if (liftgate) commentParts.push('Liftgate Required');

    const comments = commentParts.length > 0
      ? [
          {
            commentInfo: {
              type: 'PICKUP_INSTRUCTIONS',
              commentText: commentParts.join('. '),
            },
          },
        ]
      : [];

    // Build notifications
    const notifications = [];
    if (emailRejected) notifications.push({ notificationInfo: { type: 'REJECTED' } });
    if (emailAccepted) notifications.push({ notificationInfo: { type: 'ACCEPTED' } });
    if (emailCompleted) notifications.push({ notificationInfo: { type: 'COMPLETED' } });

    // Build reference numbers
    const referenceNumbers = [
      { referenceInfo: { type: 'PRO', value: '', required: 'N', totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: 'PON', value: '', required: 'N', totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: 'BOL', value: '', required: 'N', totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: 'EUI', value: '', required: 'N', totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: 'LDN', value: '', required: 'N', totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: 'SNO', value: '', required: 'N', totalPieces: 0, totalWeight: 0 } },
    ];

    // Add PRO number from BOL response if available
    if (bolResponseData?.data?.referenceNumbers?.pro) {
      referenceNumbers[0].referenceInfo.value = bolResponseData.data.referenceNumbers.pro;
    }

    // Add shipment reference numbers
    shipments.forEach((shipment) => {
      shipment.referenceNumbers.forEach((refNum) => {
        // Try to match to existing reference number types
        const existingRef = referenceNumbers.find((r) => r.referenceInfo.value === '');
        if (existingRef) {
          existingRef.referenceInfo.value = refNum;
        }
      });
    });

    const roleMap: Record<string, string> = {
      'Shipper': 'SHIPPER',
      'Consignee': 'CONSIGNEE',
      'Third-Party': 'THIRD_PARTY',
    };

    const body = {
      shipper: {
        shipperName: pickupCompanyName || bolFormData?.originName || '',
        accountCode: myAccount,
        shipperAddress: {
          addressInfo: {
            addressLine1: pickupAddress1 || bolFormData?.originAddress1 || '',
            addressLine2: pickupAddress2 || bolFormData?.originAddress2 || '',
            city: bolFormData?.originCity || '',
            stateProvince: bolFormData?.originState || '',
            postalCode: pickupZipCode || bolFormData?.originZipCode || '',
            postalCode4: '',
            countryAbbrev: pickupCountry || 'USA',
          },
        },
        shipperContacts: {
          shipperContact: [
            {
              contactInfo: {
                name: requesterNameParsed,
                email: requesterEmail || '',
                phone: {
                  areaCode: parseInt(requesterPhoneParsed.areaCode) || 0,
                  number: parseInt(requesterPhoneParsed.number) || 0,
                  extension: parseInt(requesterExtension) || 0,
                },
                fax: {
                  areaCode: 0,
                  number: 0,
                },
                receiveNotifications: 'Y',
                notificationMethod: 'EMAIL',
              },
            },
          ],
        },
      },
      requestAction: 'CREATE',
      paymentTerms: bolFormData?.terms === 'Prepaid' ? 'PREPAID' : 'COLLECT',
      pickupDate: pickupDate || bolFormData?.shipDate || '',
      pickupStartTime: pickupStartTime.replace(':', ''),
      pickupEndTime: pickupEndTime.replace(':', ''),
      totalPieces: String(totalPieces),
      totalWeight: String(totalWeight),
      totalHandlingUnits: String(totalHandlingUnits),
      hazmatFlag: hazmat ? 'Y' : 'N',
      expeditedCode: '',
      whoRequested: roleMap[role] || 'THIRD_PARTY',
      trailer: [],
      referenceNumbers: {
        referenceNumber: referenceNumbers,
      },
      commodities: {
        commodity: commodities,
      },
      comments: {
        comment: comments,
      },
      consignee: {
        accountCode: '',
        accountName: '',
      },
      thirdParty: {
        accountCode: myAccount,
        accountName: bolFormData?.billToName || '',
      },
      addresses: {
        address: [
          {
            addressInfo: {
              addressType: 'PICKUP',
              addressLine1: pickupAddress1 || bolFormData?.originAddress1 || '',
              addressLine2: pickupAddress2 || bolFormData?.originAddress2 || '',
              city: bolFormData?.originCity || '',
              stateProvince: bolFormData?.originState || '',
              postalCode: pickupZipCode || bolFormData?.originZipCode || '',
              postalCode4: '',
              countryAbbrev: pickupCountry || 'USA',
            },
          },
          {
            addressInfo: {
              addressType: 'DOCK',
              addressLine1: pickupAddress1 || bolFormData?.originAddress1 || '',
              addressLine2: pickupAddress2 || bolFormData?.originAddress2 || '',
              city: bolFormData?.originCity || '',
              stateProvince: bolFormData?.originState || '',
              postalCode: pickupZipCode || bolFormData?.originZipCode || '',
              postalCode4: '',
              countryAbbrev: pickupCountry || 'USA',
            },
          },
        ],
      },
      contacts: {
        contact: [
          {
            contactInfo: {
              contactType: 'REQUESTER',
              name: requesterNameParsed,
              email: requesterEmail || '',
              phone: {
                areaCode: requesterPhoneParsed.areaCode,
                number: requesterPhoneParsed.number,
                extension: requesterExtension || '',
              },
              fax: {
                areaCode: 0,
                number: 0,
              },
              receiveNotifications: 'Y',
              notificationMethod: 'EMAIL',
            },
          },
          {
            contactInfo: {
              contactType: 'DOCK',
              name: dockNameParsed,
              email: dockEmail || requesterEmail || '',
              phone: {
                areaCode: dockPhoneParsed.areaCode,
                number: dockPhoneParsed.number,
                extension: dockExtension || '',
              },
              fax: {
                areaCode: 0,
                number: 0,
              },
              receiveNotifications: 'Y',
              notificationMethod: 'EMAIL',
            },
          },
        ],
      },
      notifications: {
        notification: notifications,
      },
    };

    return body;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Normalize carrier name to match how it's stored in Zustand (lowercase)
    const normalizedCarrier = carrier.toLowerCase();
    const token = getToken(normalizedCarrier);
    if (!token) {
      setError('Authentication required. Please login.');
      setLoading(false);
      return;
    }

    // Validate required fields
    const validationErrors: string[] = [];
    if (!pickupDate) validationErrors.push('Pickup Date is required');
    if (!pickupCompanyName && !bolFormData?.originName) validationErrors.push('Company Name is required');
    if (!pickupAddress1 && !bolFormData?.originAddress1) validationErrors.push('Address Line 1 is required');
    if (!pickupZipCode && !bolFormData?.originZipCode) validationErrors.push('ZIP Code is required');
    if (!requesterContactName) validationErrors.push('Requester Contact Name is required');
    if (!requesterEmail) validationErrors.push('Requester Email is required');
    if (!requesterPhone) validationErrors.push('Requester Phone is required');

    shipments.forEach((shipment, index) => {
      if (!shipment.handlingUnits) validationErrors.push(`Shipment ${index + 1}: Handling Units is required`);
      if (!shipment.weight) validationErrors.push(`Shipment ${index + 1}: Weight is required`);
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setLoading(false);
      return;
    }

    try {
      const requestBody = buildRequestBody();
      // Removed console.log for production

      // Get shippingCompany from carrier (normalize to lowercase)
      const shippingCompany = normalizedCarrier === 'estes' ? 'estes' : normalizedCarrier;
      
      // Ensure shippingCompany is at the top level - this is critical!
      const payload = {
        shippingCompany: shippingCompany,
        ...requestBody,
      };
      
      const apiUrl = buildApiUrl(`/Logistics/create-pickup-request`);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        // Log error only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('API Error Response:', errorData);
        }
        throw new Error(errorData.message || errorData.error?.message || `Pickup request failed: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Create JSON response
      const responseData = {
        success: true,
        message: 'Pickup request created successfully',
        data: data,
        timestamp: new Date().toISOString(),
      };

      // Delete order if orderId is provided
      if (orderId) {
        try {
          await deleteOrder(orderId);
        } catch (deleteErr) {
          // Log error only in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to delete order:', deleteErr);
          }
          // Continue even if order deletion fails
        }
      }

      // Clear cache - using Next.js router refresh to revalidate cache
      try {
        router.refresh();
        // Also clear browser cache for orders
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => {
              if (name.includes('order') || name.includes('api')) {
                caches.delete(name);
              }
            });
          });
        }
      } catch (cacheErr) {
        // Log error only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to clear cache:', cacheErr);
        }
        // Continue even if cache clearing fails
      }

      // Show toast notification
      setToastMessage('Successfully order and delete cache');
      setShowToast(true);

      // Call onComplete with response data after a short delay to allow toast to be visible
      setTimeout(() => {
        onComplete(responseData);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pickup request');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalHandlingUnits = shipments.reduce((sum, s) => sum + parseInt(s.handlingUnits || '0'), 0);
  const totalWeight = shipments.reduce((sum, s) => sum + parseInt(s.weight || '0'), 0);

  return (
    <div id="pickup-request-top" ref={containerRef} className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-4 sm:pb-8 px-3 sm:px-0">
      <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
            <Calendar className="text-green-600 sm:w-6 sm:h-6" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Pickup Request</h2>
            <p className="text-xs sm:text-sm text-slate-600">Schedule your shipment pickup</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Account Information */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('accountInfo')}
                  className="text-left"
                >
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Account Information</h3>
                </button>
                <span className="text-blue-600 text-sm hover:underline cursor-pointer">
                  Need Help?
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('accountInfo')}
                className="text-slate-500 hover:text-slate-700"
              >
                {showSections.accountInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showSections.accountInfo && (
              <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    My Accounts <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={myAccount}
                    onChange={(e) => setMyAccount(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0216496">0216496 - Regular - Decora2z - 19150 Summit Ridge, Walnut, CA 91789</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Role</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Shipper"
                        checked={role === 'Shipper'}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-900">Shipper</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Consignee"
                        checked={role === 'Consignee'}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-900">Consignee</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Third-Party"
                        checked={role === 'Third-Party'}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-900">Third-Party</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Other"
                        checked={role === 'Other'}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-900">Other</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Requester Details and Pickup Location */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Requester Details */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleSection('requesterInfo')}
                    className="text-left"
                  >
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Requester Details</h3>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSection('requesterInfo')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {showSections.requesterInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
              {showSections.requesterInfo && (
                <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Address Book (Optional)
                    </label>
                    <select
                      value={requesterAddressBook}
                      onChange={(e) => setRequesterAddressBook(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Address</option>
                    </select>
                    <a href="#" className="text-blue-600 text-sm hover:underline">
                      Manage My Address Book
                    </a>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={requesterContactName}
                      onChange={(e) => setRequesterContactName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">Email</label>
                    <input
                      type="email"
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={requesterPhone}
                        onChange={(e) => setRequesterPhone(e.target.value)}
                        placeholder="(888) 888-8888"
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Extension (Optional)
                      </label>
                      <input
                        type="text"
                        value={requesterExtension}
                        onChange={(e) => setRequesterExtension(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pickup Location */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleSection('pickupLocation')}
                    className="text-left"
                  >
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Pickup Location</h3>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSection('pickupLocation')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {showSections.pickupLocation ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
              {showSections.pickupLocation && (
                <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Address Book (Optional)
                    </label>
                    <select
                      value={pickupAddressBook}
                      onChange={(e) => setPickupAddressBook(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Address</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={pickupCompanyName}
                      onChange={(e) => setPickupCompanyName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Address Line 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupAddress1}
                      onChange={(e) => setPickupAddress1(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Address Line 2 (Optional)
                    </label>
                    <input
                      type="text"
                      value={pickupAddress2}
                      onChange={(e) => setPickupAddress2(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={pickupZipCode}
                        onChange={(e) => setPickupZipCode(e.target.value)}
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
                        <option value="USA">USA</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dock Contact Details */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('dockContact')}
                  className="text-left"
                >
                  <h3 className="text-lg font-bold text-slate-900">Dock Contact Details</h3>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('dockContact')}
                className="text-slate-500 hover:text-slate-700"
              >
                {showSections.dockContact ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showSections.dockContact && (
              <div className="p-6 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRequesterInfo}
                    onChange={(e) => setUseRequesterInfo(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-slate-900">Use Requester Information</span>
                </label>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Address Book (Optional)
                  </label>
                  <select
                    value={dockAddressBook}
                    onChange={(e) => setDockAddressBook(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Address</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Contact Name</label>
                  <input
                    type="text"
                    value={dockContactName}
                    onChange={(e) => setDockContactName(e.target.value)}
                    disabled={useRequesterInfo}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Email</label>
                  <input
                    type="email"
                    value={dockEmail}
                    onChange={(e) => setDockEmail(e.target.value)}
                    disabled={useRequesterInfo}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={dockPhone}
                      onChange={(e) => setDockPhone(e.target.value)}
                      placeholder="(888) 888-8888"
                      disabled={useRequesterInfo}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Extension (Optional)
                    </label>
                    <input
                      type="text"
                      value={dockExtension}
                      onChange={(e) => setDockExtension(e.target.value)}
                      disabled={useRequesterInfo}
                      className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pickup Details */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('pickupDetails')}
                  className="text-left"
                >
                  <h3 className="text-lg font-bold text-slate-900">Pickup Details</h3>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('pickupDetails')}
                className="text-slate-500 hover:text-slate-700"
              >
                {showSections.pickupDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showSections.pickupDetails && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Pickup Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Pickup Start Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={pickupStartTime}
                        onChange={(e) => setPickupStartTime(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Pickup End Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={pickupEndTime}
                        onChange={(e) => setPickupEndTime(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Load Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="loadType"
                        value="Live Load"
                        checked={loadType === 'Live Load'}
                        onChange={(e) => setLoadType(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-900">Live Load</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="loadType"
                        value="Hook Loaded"
                        checked={loadType === 'Hook Loaded'}
                        onChange={(e) => setLoadType(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-900">Hook Loaded (Pick up trailer at location)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shipment Information */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('shipmentInfo')}
                  className="text-left"
                >
                  <h3 className="text-lg font-bold text-slate-900">Shipment Information</h3>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('shipmentInfo')}
                className="text-slate-500 hover:text-slate-700"
              >
                {showSections.shipmentInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showSections.shipmentInfo && (
              <div className="p-6 space-y-4">
                {shipments.map((shipment, index) => (
                  <div key={shipment.id} className="border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900">Shipment {index + 1}</h4>
                      {shipments.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeShipment(shipment.id, e);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={shipment.type}
                          onChange={(e) => updateShipment(shipment.id, 'type', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PALLET">PALLET</option>
                          <option value="CARTON">CARTON</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Handling Units <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={shipment.handlingUnits}
                          onChange={(e) => updateShipment(shipment.id, 'handlingUnits', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Weight (lbs) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={shipment.weight}
                          onChange={(e) => updateShipment(shipment.id, 'weight', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Destination
                        </label>
                        <input
                          type="text"
                          value={shipment.destinationZip}
                          onChange={(e) => updateShipment(shipment.id, 'destinationZip', e.target.value)}
                          placeholder="ZIP or Postal Code"
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => addReferenceNumber(shipment.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Add Reference #(s)
                      </button>
                      {shipment.referenceNumbers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {shipment.referenceNumbers.map((refNum, refIndex) => (
                            <span
                              key={refIndex}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center gap-2"
                            >
                              {refNum}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeReferenceNumber(shipment.id, refIndex, e);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-slate-600 mt-1">
                        Note: All reference numbers will be visible to the driver picking up your shipment.
                      </p>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addShipment(e);
                  }}
                  className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold flex items-center gap-2"
                >
                  <Plus size={18} />
                  ADD SHIPMENT
                </button>
                <div className="pt-4 border-t border-slate-200 text-right">
                  <p className="text-sm text-slate-700">
                    Total Handling Units <span className="font-semibold">{totalHandlingUnits}</span> Total Weight <span className="font-semibold">{totalWeight} lbs</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Freight Characteristics */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('freightCharacteristics')}
                  className="text-left"
                >
                  <h3 className="text-lg font-bold text-slate-900">Freight Characteristics</h3>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('freightCharacteristics')}
                className="text-slate-500 hover:text-slate-700"
              >
                {showSections.freightCharacteristics ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showSections.freightCharacteristics && (
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hazmat}
                      onChange={(e) => setHazmat(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Hazmat</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={protectFromFreezing}
                      onChange={(e) => setProtectFromFreezing(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Protect from Freezing</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={food}
                      onChange={(e) => setFood(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Food</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={poison}
                      onChange={(e) => setPoison(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Poison</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overlength}
                      onChange={(e) => setOverlength(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Overlength</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liftgate}
                      onChange={(e) => setLiftgate(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Liftgate</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doNotStack}
                      onChange={(e) => setDoNotStack(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Do Not Stack</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Time Critical Guaranteed */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('timeCritical')}
                  className="text-left"
                >
                  <h3 className="text-lg font-bold text-slate-900">Time Critical Guaranteed</h3>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('timeCritical')}
                className="text-slate-500 hover:text-slate-700"
              >
                {showSections.timeCritical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showSections.timeCritical && (
              <div className="p-6 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guaranteedShipment}
                    onChange={(e) => setGuaranteedShipment(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-slate-900">Guaranteed Shipment</span>
                </label>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Pickup Instructions (Optional)
                  </label>
                  <textarea
                    value={pickupInstructions}
                    onChange={(e) => setPickupInstructions(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter pickup instructions..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pickup Notifications */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => toggleSection('notifications')}
                  className="text-left"
                >
                  <h3 className="text-lg font-bold text-slate-900">Pickup Notifications</h3>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('notifications')}
                className="text-slate-500 hover:text-slate-700"
              >
                {showSections.notifications ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showSections.notifications && (
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailRejected}
                      onChange={(e) => setEmailRejected(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Email for Rejected Request</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAccepted}
                      onChange={(e) => setEmailAccepted(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Email for Accepted Request</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailCompleted}
                      onChange={(e) => setEmailCompleted(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-slate-900">Email for Completed Pickup</span>
                  </label>
                </div>
                <div className="space-y-4">
                  {additionalContacts.map((contact) => (
                    <div key={contact.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-200 rounded-lg">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => updateAdditionalContact(contact.id, 'name', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-900">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateAdditionalContact(contact.id, 'email', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeAdditionalContact(contact.id, e);
                          }}
                          className="px-4 py-2 text-red-600 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addAdditionalContact(e);
                    }}
                    className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold flex items-center gap-2"
                  >
                    <Plus size={18} />
                    ADD ADDITIONAL CONTACT
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onPrevious}
              className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Previous
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'REQUEST PICKUP'}
              <CheckCircle2 size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          isVisible={showToast}
          onClose={() => {
            setShowToast(false);
            setTimeout(() => setToastMessage(null), 300);
          }}
          duration={3000}
        />
      )}
    </div>
  );
};
