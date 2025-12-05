'use client';

import { useState } from 'react';
import { Printer, Download, Edit, Calendar, Mail, X, FileText } from 'lucide-react';

type BOLSuccessPageProps = {
  bolResponseData?: any;
  bolFormData?: any;
  onEditBOL?: () => void;
  onSchedulePickup?: () => void;
  onPrintDownloadBOL?: () => void;
  onPrintDownloadLabels?: () => void;
  onEmailBOL?: () => void;
  onClose?: () => void;
  onManageBOL?: () => void;
};

export const BOLSuccessPage = ({
  bolResponseData,
  bolFormData,
  onEditBOL,
  onSchedulePickup,
  onPrintDownloadBOL,
  onPrintDownloadLabels,
  onEmailBOL,
  onClose,
  onManageBOL,
}: BOLSuccessPageProps) => {
  const [signBOLWithRequester, setSignBOLWithRequester] = useState(false);

  // Extract data from BOL response
  const proNumber = bolResponseData?.data?.referenceNumbers?.pro || bolResponseData?.data?.proNumber || 'N/A';
  const date = bolResponseData?.data?.date || bolResponseData?.data?.shipDate || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  const customerRef = bolResponseData?.data?.referenceNumbers?.customerReference || bolFormData?.references?.find((r: any) => r.type === 'Customer Reference')?.value || 'N/A';
  
  // Extract shipper data
  const shipperCompany = bolFormData?.pickupLocation?.company || 'N/A';
  const shipperStreet = bolFormData?.pickupLocation?.streetAddress || 'N/A';
  const shipperCity = bolFormData?.pickupLocation?.city || 'N/A';
  const shipperState = bolFormData?.pickupLocation?.state || 'N/A';
  const shipperZip = bolFormData?.pickupLocation?.postalCode || 'N/A';
  const shipperCountry = bolFormData?.pickupLocation?.country || 'US';
  const shipperPhone = bolFormData?.pickupLocation?.phone || '(123) 4567890';
  
  // Extract consignee data
  const consigneeCompany = bolFormData?.deliveryLocation?.company || 'N/A';
  const consigneeStreet = bolFormData?.deliveryLocation?.streetAddress || 'N/A';
  const consigneeCity = bolFormData?.deliveryLocation?.city || 'N/A';
  const consigneeState = bolFormData?.deliveryLocation?.state || 'N/A';
  const consigneeZip = bolFormData?.deliveryLocation?.postalCode || 'N/A';
  const consigneeCountry = bolFormData?.deliveryLocation?.country || 'US';
  const consigneePhone = bolFormData?.deliveryLocation?.phone || '(123) 4567890';
  
  // Extract commodity data
  const commodities = bolFormData?.commodities || [];
  const firstCommodity = commodities[0] || {};
  const commodityDesc = firstCommodity.desc || 'N/A';
  const nmfcNo = firstCommodity.nmfcNo || '079300';
  const nmfcSub = firstCommodity.nmfcSub || '3';
  const freightClass = firstCommodity.freightClass || '250';
  const weight = firstCommodity.grossWeight?.weight || 0;
  const weightUnit = firstCommodity.grossWeight?.unit || 'kg';
  // Extract packageCode - handle both string and object formats
  const packageCode = firstCommodity.packageCode || 
                      (typeof firstCommodity.packaging === 'string' ? firstCommodity.packaging : firstCommodity.packaging?.packageCd) || 
                      'PLT';
  const packageCount = firstCommodity.pieceCnt || 1;

  // Format weight
  const formattedWeight = weightUnit === 'kg' 
    ? `${weight.toFixed(1)} kg`
    : `${weight.toFixed(1)} lb`;

  // Format country code
  const formatCountry = (country: string) => {
    if (country === 'United States' || country === 'US' || country === 'USA') return 'US';
    if (country === 'Canada' || country === 'CA') return 'CA';
    if (country === 'Mexico' || country === 'MX') return 'MX';
    return country;
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Bill of Lading Has Been Created</h1>
      </div>

      {/* Pickup Request Note Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Pickup Request Note</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold">XPO LOGISTICS FREIGHT, INC.</p>
          <p>12903 LAKELAND RD, SANTA FE SPRING, CA 90670</p>
          <div className="flex flex-wrap gap-4 mt-2">
            <p>Phone: <span className="font-semibold">(562) 946-8331</span></p>
            <p>Fax: <span className="font-semibold">(562) 946-0086</span></p>
            <p>Toll-free: <span className="font-semibold">(800) 545-9680</span></p>
          </div>
        </div>
      </div>

      {/* BOL Note Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">BOL Note</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            The Bill of Lading (BOL) can be found on the{' '}
            <button
              onClick={onManageBOL}
              className="text-blue-600 hover:text-blue-700 underline font-semibold"
            >
              Manage Bill of Lading
            </button>
            {' '}page.
          </p>
          <p>
            All pages of the BOL and shipping labels should be ready for the XPO Driver/Sales Rep.
          </p>
        </div>
      </div>

      {/* BOL Preview Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">BOL Preview</h2>
        
        {/* BOL Form Preview */}
        <div className="border-2 border-slate-300 rounded-lg p-6 bg-slate-50">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-300">
            <div className="text-2xl font-bold text-blue-600">XPO</div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900">STRAIGHT BILL OF LADING</h3>
            </div>
            <div className="text-right text-xs">
              <div className="flex items-center gap-2">
                <span>DRIVER PLEASE NOTE IF SINGLE SHIPMENT CHECK BOX BELOW</span>
                <input type="checkbox" className="w-4 h-4" disabled />
              </div>
            </div>
          </div>

          {/* Freight Charges */}
          <div className="mb-4 pb-4 border-b border-slate-300">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">SHIPPER PLEASE NOTE</span>
              <span>FREIGHT CHARGES ARE PREPAID UNLESS MARKED COLLECT</span>
              <input type="checkbox" className="w-4 h-4" disabled />
              <span>COLLECT</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">Reminder: Print/Affix Pro Labels To Your Shipment.</p>
          </div>

          {/* Shipment Details */}
          <div className="mb-4 pb-4 border-b border-slate-300 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">XPO PRO#:</span> <span>{proNumber}</span>
            </div>
            <div>
              <span className="font-semibold">DATE</span> <span>{date}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold">CUSTOMER'S SPECIAL REFERENCE NUMBER</span> <span>{customerRef}</span>
            </div>
            <div className="col-span-2 text-right text-xs text-slate-600">
              ORIGINAL - NOT NEGOTIABLE Page 1 of 1
            </div>
          </div>

          {/* Shipper and Consignee */}
          <div className="mb-4 pb-4 border-b border-slate-300 grid grid-cols-2 gap-6 text-sm">
            {/* Shipper */}
            <div>
              <div className="font-semibold mb-2">SHIPPER (FROM)</div>
              <div className="space-y-1">
                <div className="font-semibold">{shipperCompany}</div>
                <div>STREET: {shipperStreet}</div>
                <div>
                  CITY, STATE/PROVINCE, ZIP/POSTAL CODE: {shipperCity}, {shipperState} {shipperZip} ({formatCountry(shipperCountry)})
                </div>
                <div>TELEPHONE: {shipperPhone}</div>
              </div>
            </div>

            {/* Consignee */}
            <div>
              <div className="font-semibold mb-2">CONSIGNEE (TO)</div>
              <div className="space-y-1">
                <div className="font-semibold">{consigneeCompany}</div>
                <div>STREET: {consigneeStreet}</div>
                <div>
                  CITY, STATE/PROVINCE, ZIP/POSTAL CODE: {consigneeCity}, {consigneeState} {consigneeZip} ({formatCountry(consigneeCountry)})
                </div>
                <div>TELEPHONE: {consigneePhone}</div>
              </div>
            </div>
          </div>

          {/* Commodity Details */}
          <div className="mb-4 text-sm">
            <div className="font-semibold mb-2">COMMODITY DETAILS</div>
            <div className="border border-slate-300 rounded p-3 bg-white">
              <div className="grid grid-cols-6 gap-2 mb-2 text-xs font-semibold border-b border-slate-200 pb-2">
                <div>NUMBER SHIPPING UNITS</div>
                <div>HM</div>
                <div className="col-span-2">KIND OF PACKAGING, DESCRIPTION</div>
                <div>NMFC NO</div>
                <div>SUB</div>
                <div>CLASS</div>
                <div>WEIGHT</div>
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div>{packageCount}</div>
                <div>-</div>
                <div className="col-span-2">{packageCode}(s) {commodityDesc}</div>
                <div>{nmfcNo}</div>
                <div>{nmfcSub}</div>
                <div>{freightClass}</div>
                <div>{formattedWeight}</div>
              </div>
            </div>
          </div>

          {/* Additional Services */}
          {bolFormData?.selectedPickupServices?.length > 0 || 
           bolFormData?.selectedDeliveryServices?.length > 0 || 
           bolFormData?.selectedPremiumServices?.length > 0 ? (
            <div className="mb-4 text-sm">
              <div className="font-semibold mb-2">ADDITIONAL SERVICES</div>
              <div className="space-y-1 text-xs">
                {bolFormData?.selectedPickupServices?.map((service: string) => (
                  <div key={service}>{service} - PREPAID</div>
                ))}
                {bolFormData?.selectedDeliveryServices?.map((service: string) => (
                  <div key={service}>{service} - PREPAID</div>
                ))}
                {bolFormData?.selectedPremiumServices?.map((service: string) => (
                  <div key={service}>{service} - PREPAID</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="space-y-4">
          {/* Sign BOL Checkbox */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="signBOL"
              checked={signBOLWithRequester}
              onChange={(e) => setSignBOLWithRequester(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="signBOL" className="text-sm text-slate-700">
              Sign BOL with Requester Name
            </label>
          </div>
          <p className="text-xs text-slate-600 ml-6">
            If you check this box, we will automatically pre-print the name of the requester in the "Authorized Signature" field of the BOL.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={onPrintDownloadBOL}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <Printer className="w-5 h-5" />
              Print/Download BOL
            </button>
            <button
              onClick={onEditBOL}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              <Edit className="w-5 h-5" />
              Edit BOL
            </button>
            <button
              onClick={onSchedulePickup}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              <Calendar className="w-5 h-5" />
              Schedule Pickup
            </button>
            <button
              onClick={onPrintDownloadLabels}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              <FileText className="w-5 h-5" />
              Print/Download Labels
            </button>
            <button
              onClick={onEmailBOL}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              <Mail className="w-5 h-5" />
              Email BOL
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              <X className="w-5 h-5" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

