'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Calendar, Info, X, Plus, Save, HelpCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';
import { buildEstesRequestBody } from './utils/requestBuilder';
import { EstesQuoteCard } from './components/EstesQuoteCard';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';
import { ESTES_AUTOFILL_DATA } from '@/Shared/constant';
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
    const tokenFromStore = getToken(carrier) || token || '';
    setStoredToken(tokenFromStore);
  }, [carrier, token, getToken]);

  // Update token when it changes in store
  useEffect(() => {
    const tokenFromStore = getToken(carrier) || token || '';
    setStoredToken(tokenFromStore);
  }, [carrier, getToken]);

  // Account Information
  const [myAccount, setMyAccount] = useState('');
  const [role, setRole] = useState('');
  const [term, setTerm] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [shipTime, setShipTime] = useState('14:30');
  
  // Requestor Information
  const [requestorName, setRequestorName] = useState('');
  const [requestorPhone, setRequestorPhone] = useState('');
  const [requestorEmail, setRequestorEmail] = useState('');

  // Routing Information - Origin
  const [originAddress1, setOriginAddress1] = useState('');
  const [originAddress2, setOriginAddress2] = useState('');
  const [originZipCode, setOriginZipCode] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originCountry, setOriginCountry] = useState('');

  // Routing Information - Destination
  const [destinationAddress1, setDestinationAddress1] = useState('');
  const [destinationAddress2, setDestinationAddress2] = useState('');
  const [destinationZipCode, setDestinationZipCode] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');

  // Freight Accessorials
  const [selectedAccessorials, setSelectedAccessorials] = useState<string[]>([]);
  const [appointmentRequest, setAppointmentRequest] = useState(false);
  const [liftGateService, setLiftGateService] = useState(false);
  const [residentialDelivery, setResidentialDelivery] = useState(false);

  // Commodities
  const [handlingUnits, setHandlingUnits] = useState<HandlingUnit[]>([]);
  const [linearFeet, setLinearFeet] = useState('');

  // Freight Information
  const [fullValueCoverage, setFullValueCoverage] = useState(false);
  const [fullValueCoverageAmount, setFullValueCoverageAmount] = useState('');
  const [warehouseDistributionCenter, setWarehouseDistributionCenter] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [response, setResponse] = useState<any>(null);
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
  
  // Update order data when prop changes
  useEffect(() => {
    if (initialOrderData) {
      setOrderData(initialOrderData);
    }
  }, [initialOrderData]);

  // Get orderId from URL params or sessionStorage
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
        } catch (e) {
          console.error('Failed to parse stored order:', e);
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
          
          if (orderIdParam) {
            // Fetch specific order by ID
            const orderId = parseInt(orderIdParam, 10);
            if (!isNaN(orderId)) {
              setCurrentOrderId(orderId);
              const response = await getLogisticsShippedOrderById(orderId);
              if (response.data) {
                setOrderData({
                  sku: response.data.sku,
                  orderOnMarketPlace: response.data.orderOnMarketPlace,
                  ordersJsonb: response.data.ordersJsonb as Record<string, unknown>,
                });
              }
            }
          } else {
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
                  setLoadingOrderData(false);
                  return;
                }
              } catch (e) {
                console.error('Failed to parse stored order:', e);
              }
            }
            
            // Fallback: Fetch the most recent order
            const response = await getAllLogisticsShippedOrders();
            if (response.data && response.data.length > 0) {
              const mostRecentOrder = response.data[0]; // Orders are sorted by createdAt desc
              setOrderData({
                sku: mostRecentOrder.sku,
                orderOnMarketPlace: mostRecentOrder.orderOnMarketPlace,
                ordersJsonb: mostRecentOrder.ordersJsonb as Record<string, unknown>,
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch order data:', error);
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
      console.log(`Database save confirmed for Order ID: ${orderId}, SKU: ${sku}`);
      
      // Step 2: Now delete the order (after DB save is confirmed)
      if (orderId) {
        try {
          await deleteOrder(orderId);
          console.log(`Order (ID: ${orderId}) deleted successfully after database save`);
        } catch (deleteError) {
          // Order might not exist or already deleted - that's okay
          console.warn(`Order (ID: ${orderId}) could not be deleted:`, deleteError);
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
      console.log(`Order data saved successfully. Order deleted. Cache cleared.`);
    } catch (error) {
      console.error('Error during cleanup:', error);
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
      originZipCode,
      originCountry,
      destinationCity,
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
      class: '',
      nmfc: '',
      sub: '',
      hazardous: false,
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
    const currentToken = getToken(carrier) || storedToken;
    if (!currentToken) {
      // No token, show login modal
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const requestBody = buildRequestBody();

      const res = await fetch(buildApiUrl('/Logistics/create-rate-quote'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        // Check if token is expired (401 Unauthorized)
        if (res.status === 401) {
          // Token expired, show login modal
          setIsAuthModalOpen(true);
          setError(new Error('Your session has expired. Please login again.'));
          return;
        }
        
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `Rate quote creation failed: ${res.statusText}`);
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
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
          originZipCode,
          originCountry,
          destinationCity,
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
    }
  };

  const handleBillOfLandingNext = () => {
    handleStepComplete(2);
    setCurrentStep(3);
  };

  const handlePickupRequestComplete = (pickupResponse?: any) => {
    handleStepComplete(3);
    if (pickupResponse) {
      setPickupResponseData(pickupResponse);
    }
    // Move to step 4 (Response Summary)
    setCurrentStep(4);
    handleStepComplete(4);
  };
  
  // Extract BOL PDF URL and create File when BOL response is available
  useEffect(() => {
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
        setBolPdfUrl(url);
        
        // Create File object from blob and add to bolFiles
        const proNumber = bolResponseData?.data?.referenceNumbers?.pro || 'BOL';
        const fileName = `BillOfLading_${proNumber}.pdf`;
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
        setBolFiles([pdfFile]);
      } catch (err) {
        console.error('Failed to create PDF URL:', err);
        setBolPdfUrl(null);
        setBolFiles([]);
      }
    } else {
      // Clear files if no BOL response
      setBolFiles([]);
      setBolPdfUrl(null);
    }
  }, [bolResponseData]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-8">
      {/* Step Indicator */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Estes Rate Quote Service</h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAutofill}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 font-semibold"
              >
                <Sparkles size={18} />
                Autofill
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors flex items-center gap-2 font-semibold"
              >
                <HelpCircle size={18} />
                Walk Me Through
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
        {/* Account Information - Main Accordion */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAccountInfo(!showAccountInfo)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-xl font-bold text-slate-900">Account Information</h2>
            {showAccountInfo ? (
              <ChevronUp className="text-slate-600" size={20} />
            ) : (
              <ChevronDown className="text-slate-600" size={20} />
            )}
          </button>
          {showAccountInfo && (
          <div className="p-6 space-y-8">
            {/* Account Information Section */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                My Accounts
              </label>
              <select
                value={myAccount}
                onChange={(e) => setMyAccount(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
              </select>
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
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
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
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Requestor Information</h3>
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
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Routing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Origin</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={originZipCode}
                  onChange={(e) => setOriginZipCode(e.target.value)}
                  placeholder="ZIP Code"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Country</option>
                  <option value="USA">USA</option>
                  <option value="Canada">Canada</option>
                  <option value="Mexico">Mexico</option>
                </select>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Destination</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={destinationZipCode}
                  onChange={(e) => setDestinationZipCode(e.target.value)}
                  placeholder="ZIP Code"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Country</option>
                  <option value="USA">USA</option>
                  <option value="Canada">Canada</option>
                  <option value="Mexico">Mexico</option>
                </select>
              </div>
            </div>
              </div>
            </section>

            {/* Freight Accessorials */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Freight Accessorials</h3>
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
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Commodities</h3>
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
                <p className="font-semibold text-blue-600">{totals.totalDensity} lb/ft³</p>
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
            className="px-8 py-3 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold text-lg disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
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

      {error && (
        <div className="mt-6">
          <ErrorDisplay error={error} />
        </div>
      )}

      {/* Logistics Authentication Modal */}
      <LogisticsAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          // Refresh token from store after modal closes (in case user logged in)
          const updatedToken = getToken(carrier);
          if (updatedToken) {
            setStoredToken(updatedToken);
            setError(null);
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
          initialFormData={bolFormData}
          initialResponseData={bolResponseData}
          onFormDataChange={setBolFormData}
          onResponseDataChange={setBolResponseData}
        />
      )}

      {/* Step 3: Pickup Request */}
      {currentStep === 3 && (
        <PickupRequest
          onPrevious={handlePreviousStep}
          onComplete={(pickupResponse) => handlePickupRequestComplete(pickupResponse)}
          quoteData={selectedQuote}
          bolFormData={bolFormData}
          bolResponseData={bolResponseData}
        />
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

