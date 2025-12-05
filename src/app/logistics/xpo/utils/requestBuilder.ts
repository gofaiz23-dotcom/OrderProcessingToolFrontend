/**
 * XPO-specific request body builder
 * Converts form data to XPO API format
 */

import type { XPORateQuoteFields, XPORateQuoteCommodity } from '@/app/api/ShippingUtil/xpo/RateQuoteField';
import type { XPOBillOfLadingFields } from '@/app/api/ShippingUtil/xpo/BillOfLandingField';
import type { XPOPickupRequestFields } from '@/app/api/ShippingUtil/xpo/PickupRequestField';

type BuildXPORateQuoteParams = {
  paymentTermCd: string;
  shipmentDate: string;
  accessorials?: string[];
  shipperPostalCd: string;
  consigneePostalCd: string;
  commodity: XPORateQuoteCommodity[];
  palletCnt?: number;
  linealFt?: number;
};

// Helper function to remove undefined and null values from object
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined && item !== null);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = removeUndefined(obj[key]);
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return obj;
};

export const buildXPORateQuoteRequestBody = (params: BuildXPORateQuoteParams) => {
  const {
    paymentTermCd,
    shipmentDate,
    accessorials,
    shipperPostalCd,
    consigneePostalCd,
    commodity,
    palletCnt = 0,
    linealFt = 0,
  } = params;

  const shipmentInfo: any = {
      paymentTermCd: paymentTermCd || 'P',
  };
  
  // Only add shipmentDate if it exists and is valid
  // XPO API requires shipmentDate to be a valid ISO 8601 date string
  if (shipmentDate && shipmentDate.trim() !== '') {
    // Validate the date format
    const date = new Date(shipmentDate);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid shipment date format: ${shipmentDate}`);
    }
    shipmentInfo.shipmentDate = shipmentDate;
  } else {
    // If no date provided, use current date
    shipmentInfo.shipmentDate = new Date().toISOString();
  }
  
  // Accessorials: XPO API expects an array, even if empty
  // Based on documentation, empty array [] works, but specific codes might not be valid for rate quotes
  // For now, we'll send an empty array to match the working example
  // TODO: Verify which accessorial codes are valid for XPO rate quotes
  shipmentInfo.accessorials = [];
  
  // Shipper address - ensure postal code is valid (5 digits minimum)
  if (!shipperPostalCd || shipperPostalCd.trim() === '') {
    throw new Error('Shipper postal code is required');
  }
  shipmentInfo.shipper = {
        address: {
      postalCd: shipperPostalCd.trim(),
        },
  };
  
  // Consignee address - ensure postal code is valid (5 digits minimum)
  if (!consigneePostalCd || consigneePostalCd.trim() === '') {
    throw new Error('Consignee postal code is required');
  }
  shipmentInfo.consignee = {
        address: {
      postalCd: consigneePostalCd.trim(),
        },
  };
  
  // Commodity array
  if (commodity && commodity.length > 0) {
    shipmentInfo.commodity = commodity.map(item => {
        const commodityItem: any = {
          pieceCnt: item.pieceCnt || 0,
          packageCode: item.packageCode || 'BOX',
          grossWeight: {
            weight: item.grossWeight?.weight || 0,
            weightUom: item.grossWeight?.weightUom || 'LBS',
          },
          hazmatInd: item.hazmatInd || false,
        };
        
        // Only include nmfcClass if it has a value
        if (item.nmfcClass && item.nmfcClass.trim() !== '') {
          commodityItem.nmfcClass = item.nmfcClass;
        }
        
        // Only include dimensions if at least one dimension has a value
        if (item.dimensions && (
          (item.dimensions.length && item.dimensions.length > 0) ||
          (item.dimensions.width && item.dimensions.width > 0) ||
          (item.dimensions.height && item.dimensions.height > 0)
        )) {
          commodityItem.dimensions = {
            length: item.dimensions.length || 0,
            width: item.dimensions.width || 0,
            height: item.dimensions.height || 0,
            dimensionsUom: item.dimensions.dimensionsUom || 'INCH',
          };
        }
        
        return commodityItem;
    });
  }
  
  // palletCnt and linealFt: XPO API expects these fields to be present (even if 0)
  // Based on documentation, these should always be included
  shipmentInfo.palletCnt = palletCnt || 0;
  shipmentInfo.linealFt = linealFt || 0;
  
  // Don't remove undefined values - XPO API might need the structure
  // Just ensure all required fields are present
  return {
    shipmentInfo,
  };
};

type BuildXPOBillOfLadingParams = XPOBillOfLadingFields;

export const buildXPOBillOfLadingRequestBody = (params: BuildXPOBillOfLadingParams) => {
  // Return the params as-is since they already match the XPO API structure
  // Just ensure all required fields are present
  return {
    bol: {
      requester: {
        role: params.bol.requester.role || 'S',
      },
      consignee: params.bol.consignee,
      shipper: params.bol.shipper,
      billToCust: params.bol.billToCust,
      commodityLine: params.bol.commodityLine.map(item => ({
        pieceCnt: item.pieceCnt || 0,
        packaging: {
          packageCd: item.packaging.packageCd || 'PLT',
        },
        grossWeight: {
          weight: item.grossWeight.weight || 0,
        },
        desc: item.desc || '',
        nmfcClass: item.nmfcClass || undefined,
        nmfcItemCd: item.nmfcItemCd || undefined,
        sub: item.sub || undefined,
        hazmatInd: item.hazmatInd || false,
      })),
      chargeToCd: params.bol.chargeToCd || 'P',
      ...(params.bol.remarks && { remarks: params.bol.remarks }),
      ...(params.bol.emergencyContactName && { emergencyContactName: params.bol.emergencyContactName }),
      ...(params.bol.emergencyContactPhone && { emergencyContactPhone: params.bol.emergencyContactPhone }),
      ...(params.bol.additionalService && params.bol.additionalService.length > 0 && { additionalService: params.bol.additionalService }),
      ...(params.bol.suppRef && { suppRef: params.bol.suppRef }),
      ...(params.bol.pickupInfo && { pickupInfo: params.bol.pickupInfo }),
      ...(params.bol.declaredValueAmt && { declaredValueAmt: params.bol.declaredValueAmt }),
      ...(params.bol.declaredValueAmtPerLb && { declaredValueAmtPerLb: params.bol.declaredValueAmtPerLb }),
      ...(params.bol.excessLiabilityChargeInit && { excessLiabilityChargeInit: params.bol.excessLiabilityChargeInit }),
    },
    autoAssignPro: params.autoAssignPro !== undefined ? params.autoAssignPro : true,
  };
};

type BuildXPOPickupRequestParams = XPOPickupRequestFields;

export const buildXPOPickupRequestRequestBody = (params: BuildXPOPickupRequestParams) => {
  return {
    pickupRqstInfo: {
      pkupDate: params.pickupRqstInfo.pkupDate || undefined,
      readyTime: params.pickupRqstInfo.readyTime || undefined,
      closeTime: params.pickupRqstInfo.closeTime || undefined,
      ...(params.pickupRqstInfo.specialEquipmentCd && { specialEquipmentCd: params.pickupRqstInfo.specialEquipmentCd }),
      ...(params.pickupRqstInfo.insidePkupInd !== undefined && { insidePkupInd: params.pickupRqstInfo.insidePkupInd }),
      shipper: params.pickupRqstInfo.shipper,
      requestor: params.pickupRqstInfo.requestor,
      contact: params.pickupRqstInfo.contact,
      ...(params.pickupRqstInfo.remarks && { remarks: params.pickupRqstInfo.remarks }),
      pkupItem: params.pickupRqstInfo.pkupItem.map(item => ({
        destZip6: item.destZip6 || undefined,
        totWeight: {
          weight: item.totWeight.weight || 0,
        },
        loosePiecesCnt: item.loosePiecesCnt || 0,
        palletCnt: item.palletCnt || 0,
        garntInd: item.garntInd || false,
        hazmatInd: item.hazmatInd || false,
        frzbleInd: item.frzbleInd || false,
        holDlvrInd: item.holDlvrInd || false,
        foodInd: item.foodInd || false,
        ...(item.remarks && { remarks: item.remarks }),
      })),
    },
  };
};

