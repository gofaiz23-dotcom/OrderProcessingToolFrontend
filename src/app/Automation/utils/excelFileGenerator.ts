import * as XLSX from 'xlsx';
import type { Order } from '@/app/types/order';

// Validation helper functions for Excel column constraints

/**
 * Check if value contains POBOX patterns (not allowed)
 */
const containsPOBOX = (value: string): boolean => {
  const upperValue = value.toUpperCase();
  const poBoxPatterns = ['POBOX', 'P.O.BOX', 'POSTBOX', 'POSTOFFICEBOX'];
  return poBoxPatterns.some(pattern => upperValue.includes(pattern));
};

/**
 * Check if value contains APO/FPO patterns (not allowed for Address2)
 */
const containsAPOFPO = (value: string): boolean => {
  const upperValue = value.toUpperCase();
  const apoFpoPatterns = ['APO', 'FPO', 'ARMYPOSTOFFICE', 'FLEETPOSTOFFICE'];
  return apoFpoPatterns.some(pattern => upperValue.includes(pattern));
};

/**
 * Truncate string to max length
 */
const truncateToMaxLength = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength);
};

/**
 * Validate and format postal code (5 or 9 digits, extract first 5)
 */
const formatPostalCode = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  // Must be 5 or 9 digits
  if (digits.length === 5 || digits.length === 9) {
    // Return first 5 digits as per requirement
    return digits.substring(0, 5);
  }
  // If invalid, return empty (will fail required validation)
  return '';
};

/**
 * Validate state - must not be in unsupported list
 */
const isValidState = (value: string): boolean => {
  const upperValue = value.toUpperCase().trim();
  const unsupportedStates = ['AA', 'AE', 'AP', 'PR', 'AK', 'HI', 'GU', 'AS', 'MP', 'VI'];
  return !unsupportedStates.includes(upperValue);
};

/**
 * Format phone number according to EXT rules
 * If EXT exists: remove country code, 10-15 digits before EXT, up to 6 digits after EXT
 * Example: "987654321012345EXT123"
 */
const formatPhoneNumber = (value: string): string => {
  if (!value || value.trim() === '') return '';
  
  const upperValue = value.toUpperCase();
  const extIndex = upperValue.indexOf('EXT');
  
  if (extIndex !== -1) {
    // Has EXT
    const beforeExt = value.substring(0, extIndex).replace(/\D/g, ''); // Remove non-digits
    const afterExt = value.substring(extIndex + 3).replace(/\D/g, ''); // Remove non-digits after EXT
    
    // Remove country code (assume +1 or 1 at start)
    let cleanedBefore = beforeExt;
    if (cleanedBefore.startsWith('1') && cleanedBefore.length > 10) {
      cleanedBefore = cleanedBefore.substring(1);
    }
    
    // Validate: 10-15 digits before EXT, up to 6 digits after EXT
    if (cleanedBefore.length >= 10 && cleanedBefore.length <= 15 && afterExt.length <= 6) {
      return `${cleanedBefore}EXT${afterExt}`;
    }
    // If validation fails, return cleaned version anyway (might still work)
    return cleanedBefore.length >= 10 ? `${cleanedBefore}EXT${afterExt.substring(0, 6)}` : '';
  } else {
    // No EXT - just clean phone number (remove country code if present)
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length > 10) {
      return digits.substring(1);
    }
    // Ensure at least 10 digits for US phone number
    return digits.length >= 10 ? digits : '';
  }
};

/**
 * Validate number with max value and decimal places
 */
const formatNumber = (value: string, maxValue: number, maxDecimals: number = 2): string => {
  if (!value || value.trim() === '') return '';
  
  // Try to parse as number
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  
  // Check max value
  if (num > maxValue) return '';
  
  // Format to max decimal places
  return num.toFixed(maxDecimals).replace(/\.?0+$/, ''); // Remove trailing zeros
};

// Helper function to extract value from JSONB with flexible key matching
const getJsonbValue = (jsonb: Order['jsonb'], key: string): string => {
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

/**
 * Preview data structure for Excel generation
 */
export interface ExcelPreviewData {
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
  lockedRows?: Array<Record<string, string>>; // Template rows 1-3 (locked headers)
}

/**
 * Generate Excel file from JSON template and orders (for Parcel with SubSKUs)
 * Uses JSON template with 3 header rows, fills data starting from row 4
 * @param templatePath - Path to the JSON template file (public path, defaults to /3PL_TEMPLATE.json)
 * @param orders - Array of orders to add to the Excel
 * @param subSKUsMap - Map of order IDs to their SubSKU arrays
 * @returns Object containing blob and preview data
 */
export const generateExcelFromTemplateForParcel = async (
  templatePath: string = '/3PL_TEMPLATE.json',
  orders: Order[],
  subSKUsMap: Record<number, string[]>
): Promise<{ blob: Blob; preview: ExcelPreviewData }> => {
  try {
    // Fetch the JSON template file
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }

    const templateData: string[][] = await response.json();
    
    if (!Array.isArray(templateData) || templateData.length < 3) {
      throw new Error('Invalid template format: Expected array with at least 3 rows');
    }

    // Extract headers from row 2 (index 1) - column headers
    const headers: string[] = templateData[1] || [];
    
    if (headers.length === 0) {
      throw new Error('Template has no column headers');
    }

    // Constants
    const SHIPPING_WAREHOUSE = 'G108-CA-91789'; // Required - must be filled
    const COUNTRY = 'US'; // Required - only supports "US"

    // Debug: Log headers to help diagnose mapping issues (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Using JSON Template Headers:', headers);
    }

    // Map orders to rows - one row per SubSKU
    // Each SubSKU creates a separate row/item with the same order data
    const dataRows: string[][] = [];
    const previewRows: Array<Record<string, string>> = [];

    orders.forEach((order) => {
      const subSKUs = subSKUsMap[order.id] || [];
      
      // Debug: Log order data to help diagnose mapping issues (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Order data for mapping:', {
          orderId: order.id,
          orderOnMarketPlace: order.orderOnMarketPlace,
          jsonbKeys: order.jsonb ? Object.keys(order.jsonb as Record<string, unknown>) : [],
          subSKUs,
        });
      }
      
      // If no SubSKUs, create one row with empty SubSKU
      const subSKUsToProcess = subSKUs.length > 0 ? subSKUs : [''];

      // Create one row per SubSKU - each row has the same order data but different SubSKU
      subSKUsToProcess.forEach((subSKU) => {
        const row: string[] = [];
        const previewRow: Record<string, string> = {};
        
        // Extract order fields
        const customerName = getJsonbValue(order.jsonb, 'Customer Name') || '';
        const shippingAddress = getJsonbValue(order.jsonb, 'Customer Shipping Address') ||
                              getJsonbValue(order.jsonb, 'Shipping Address') ||
                              getJsonbValue(order.jsonb, 'Ship to Address 1') ||
                              getJsonbValue(order.jsonb, 'Address') || '';
        const address2 = getJsonbValue(order.jsonb, 'Address Line 2') || 
                        getJsonbValue(order.jsonb, 'Address2') || 
                        getJsonbValue(order.jsonb, 'Address Line2') || '';
        const zip = getJsonbValue(order.jsonb, 'Zip') || '';
        const city = getJsonbValue(order.jsonb, 'City') || '';
        const state = getJsonbValue(order.jsonb, 'State') || '';
        const customerPhone = getJsonbValue(order.jsonb, 'Customer Phone Number') ||
                            getJsonbValue(order.jsonb, 'Customer Phone') ||
                            getJsonbValue(order.jsonb, 'Phone') || '';
        const weight = getJsonbValue(order.jsonb, 'Weight') || 
                      getJsonbValue(order.jsonb, 'Item Weight') || '';
        const length = getJsonbValue(order.jsonb, 'Length') || 
                      getJsonbValue(order.jsonb, 'Item Length') || '';
        const width = getJsonbValue(order.jsonb, 'Width') || 
                     getJsonbValue(order.jsonb, 'Item Width') || '';
        const height = getJsonbValue(order.jsonb, 'Height') || 
                      getJsonbValue(order.jsonb, 'Item Height') || '';
        const poNumber = getJsonbValue(order.jsonb, 'PO#') || '';
        const invoiceNo = getJsonbValue(order.jsonb, 'Invoice No') || 
                         getJsonbValue(order.jsonb, 'Invoice Number') || '';
        const departmentNo = getJsonbValue(order.jsonb, 'Department') || 
                            getJsonbValue(order.jsonb, 'Department No.') || '';
        
        // Process each column based on header
        headers.forEach((header, colIndex) => {
          const headerLower = header.toLowerCase().trim();
          let value = '';

          // Map based on header name and column index
          switch (colIndex) {
            case 0: // Shipping Warehouse
              value = SHIPPING_WAREHOUSE;
              break;
            case 1: // Company
              value = '';
              break;
            case 2: // Contact Name
              value = customerName || '';
              if (containsPOBOX(value)) {
                value = value.replace(/POBOX|P\.O\.BOX|POSTBOX|POSTOFFICEBOX/gi, '').trim();
              }
              value = truncateToMaxLength(value, 35);
              break;
            case 3: // Address 1
              value = shippingAddress || '';
              if (containsPOBOX(value)) {
                value = value.replace(/POBOX|P\.O\.BOX|POSTBOX|POSTOFFICEBOX/gi, '').trim();
              }
              value = truncateToMaxLength(value, 35);
              break;
            case 4: // Address 2
              value = address2 || '';
              if (containsPOBOX(value) || containsAPOFPO(value)) {
                value = value.replace(/POBOX|P\.O\.BOX|POSTBOX|POSTOFFICEBOX|APO|FPO|ARMYPOSTOFFICE|FLEETPOSTOFFICE/gi, '').trim();
              }
              value = truncateToMaxLength(value, 35);
              break;
            case 5: // ZIP
              value = formatPostalCode(zip);
              break;
            case 6: // City
              value = city || '';
              if (containsPOBOX(value) || containsAPOFPO(value)) {
                value = value.replace(/POBOX|P\.O\.BOX|POSTBOX|POSTOFFICEBOX|APO|FPO|ARMYPOSTOFFICE|FLEETPOSTOFFICE/gi, '').trim();
              }
              value = truncateToMaxLength(value, 35);
              break;
            case 7: // State
              value = state || '';
              if (!isValidState(value)) {
                value = '';
              }
              break;
            case 8: // Country/Territory
              value = COUNTRY;
              break;
            case 9: // Phone No.
              value = formatPhoneNumber(customerPhone);
              break;
            case 10: // Weight(lb)
              value = formatNumber(weight, 149, 2);
              break;
            case 11: // Length(in)
              value = formatNumber(length, 107, 2);
              break;
            case 12: // Width(in)
              value = formatNumber(width, 107, 2);
              break;
            case 13: // Height(in)
              value = formatNumber(height, 107, 2);
              break;
            case 14: // Your Reference
              value = subSKU || '';
              value = truncateToMaxLength(value, 35);
              break;
            case 15: // P.O. No.
              value = poNumber || '';
              value = truncateToMaxLength(value, 30);
              break;
            case 16: // Invoice No.
              value = invoiceNo || '';
              value = truncateToMaxLength(value, 30);
              break;
            case 17: // Department No.
              value = departmentNo || '';
              value = truncateToMaxLength(value, 30);
              break;
            case 18: // Declared Value(USD)
              value = '';
              break;
            case 19: // Signature
              value = '';
              break;
            case 20: // Service Type
              value = '';
              break;
            case 21: // Default Return Address
              value = '';
              break;
            default:
              value = '';
          }

          row.push(value);
          previewRow[header] = value;
        });

        dataRows.push(row);
        previewRows.push(previewRow);
      });
    });

    // Combine template rows (1-3) with data rows (4+)
    const allData: string[][] = [
      ...templateData, // Rows 1-3: Section headers, Column headers, Requirements
      ...dataRows,     // Rows 4+: Data rows
    ];

    // Create worksheet from all data
    const worksheet = XLSX.utils.aoa_to_sheet(allData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Generate Excel file as blob
    const excelBuffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx',
    });

    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    // Prepare preview data with locked rows
    const lockedRowsPreview: Array<Record<string, string>> = [];
    templateData.forEach((templateRow, rowIndex) => {
      const previewRow: Record<string, string> = {};
      headers.forEach((header, colIndex) => {
        previewRow[header] = templateRow[colIndex] || '';
      });
      lockedRowsPreview.push(previewRow);
    });

    return {
      blob,
      preview: {
        headers,
        rows: previewRows,
        totalRows: previewRows.length,
        lockedRows: lockedRowsPreview,
      },
    };
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error(`Failed to generate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate Excel file from template and orders
 * @param templatePath - Path to the template Excel file (public path)
 * @param orders - Array of orders to add to the Excel
 * @returns Blob of the generated Excel file
 */
export const generateExcelFromTemplate = async (
  templatePath: string,
  orders: Order[]
): Promise<Blob> => {
  try {
    // Fetch the template file
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get the first sheet (or the active sheet)
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Template file has no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON to understand the structure
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];

    // Find header row (first non-empty row)
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row && row.length > 0 && row.some(cell => cell !== '')) {
        headerRowIndex = i;
        headers = row.map(cell => String(cell || ''));
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in template');
    }

    // Map orders to rows based on header columns
    const newRows: unknown[][] = [];

    orders.forEach((order) => {
      const row: unknown[] = [];
      
      headers.forEach((header) => {
        const headerLower = header.toLowerCase().trim();
        let value = '';

        // Map common fields based on header names
        if (headerLower.includes('sku') || headerLower === 'sku') {
          value = getJsonbValue(order.jsonb, 'SKU');
        } else if (headerLower.includes('order id') || headerLower.includes('orderid') || headerLower === 'order id') {
          value = getJsonbValue(order.jsonb, 'Order ID') || String(order.id);
        } else if (headerLower.includes('order#') || headerLower.includes('order #')) {
          value = getJsonbValue(order.jsonb, 'Order#');
        } else if (headerLower.includes('po#') || headerLower.includes('po number')) {
          value = getJsonbValue(order.jsonb, 'PO#');
        } else if (headerLower.includes('marketplace') || headerLower.includes('market place')) {
          value = order.orderOnMarketPlace;
        } else if (headerLower.includes('product name') || headerLower.includes('product')) {
          value = getJsonbValue(order.jsonb, 'Product Name') || 
                 getJsonbValue(order.jsonb, 'Product') ||
                 getJsonbValue(order.jsonb, 'Item Name') ||
                 getJsonbValue(order.jsonb, 'Item Description') || '';
        } else if (headerLower.includes('quantity') || headerLower.includes('qty')) {
          value = getJsonbValue(order.jsonb, 'Quantity') || getJsonbValue(order.jsonb, 'Qty') || '1';
        } else if (headerLower.includes('price') || headerLower.includes('cost')) {
          value = getJsonbValue(order.jsonb, 'Price') ||
                 getJsonbValue(order.jsonb, 'Item Cost') ||
                 getJsonbValue(order.jsonb, 'Cost') ||
                 getJsonbValue(order.jsonb, 'ItemCost') || '';
        } else if (headerLower.includes('customer name') || headerLower.includes('name')) {
          value = getJsonbValue(order.jsonb, 'Customer Name') || '';
        } else if (headerLower.includes('customer email') || headerLower.includes('email')) {
          value = getJsonbValue(order.jsonb, 'Customer Email') || getJsonbValue(order.jsonb, 'Email') || '';
        } else if (headerLower.includes('customer phone') || headerLower.includes('phone')) {
          value = getJsonbValue(order.jsonb, 'Customer Phone Number') ||
                 getJsonbValue(order.jsonb, 'Customer Phone') ||
                 getJsonbValue(order.jsonb, 'Phone') || '';
        } else if (headerLower.includes('address') || headerLower.includes('shipping address')) {
          value = getJsonbValue(order.jsonb, 'Customer Shipping Address') ||
                 getJsonbValue(order.jsonb, 'Shipping Address') ||
                 getJsonbValue(order.jsonb, 'Ship to Address 1') ||
                 getJsonbValue(order.jsonb, 'Address') || '';
        } else if (headerLower === 'city') {
          value = getJsonbValue(order.jsonb, 'City') || '';
        } else if (headerLower === 'state') {
          value = getJsonbValue(order.jsonb, 'State') || '';
        } else if (headerLower === 'zip' || headerLower.includes('zip code')) {
          value = getJsonbValue(order.jsonb, 'Zip') || '';
        } else if (headerLower.includes('country')) {
          value = getJsonbValue(order.jsonb, 'Ship to Country') || '';
        } else if (headerLower.includes('status')) {
          value = getJsonbValue(order.jsonb, 'Status') || '';
        } else if (headerLower.includes('carrier')) {
          value = getJsonbValue(order.jsonb, 'Carrier') || '';
        } else if (headerLower.includes('tracking')) {
          value = getJsonbValue(order.jsonb, 'Tracking Number') || '';
        } else {
          // Try to find the value directly from JSONB using the header name
          value = getJsonbValue(order.jsonb, header);
        }

        row.push(value);
      });

      newRows.push(row);
    });

    // Replace data rows (keep header and any rows before it, then add new data)
    const rowsBeforeData = jsonData.slice(0, headerRowIndex + 1);
    const updatedData = [...rowsBeforeData, ...newRows];

    // Create new worksheet from updated data
    const newWorksheet = XLSX.utils.aoa_to_sheet(updatedData);

    // Copy cell styles and formatting from original worksheet if possible
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      // Copy column widths
      if (worksheet['!cols']) {
        newWorksheet['!cols'] = worksheet['!cols'];
      }

      // Copy row heights for header row
      if (worksheet['!rows']) {
        newWorksheet['!rows'] = [];
        for (let i = 0; i <= headerRowIndex; i++) {
          if (worksheet['!rows'][i]) {
            newWorksheet['!rows'][i] = worksheet['!rows'][i];
          }
        }
      }

      // Set the range for the new worksheet
      const newRange = XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: headers.length - 1, r: updatedData.length - 1 },
      });
      newWorksheet['!ref'] = newRange;
    }

    // Replace the worksheet in workbook
    workbook.Sheets[sheetName] = newWorksheet;

    // Generate Excel file as blob
    const excelBuffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx',
      cellStyles: true,
    });

    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error(`Failed to generate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Download Excel file
 * @param blob - Blob of the Excel file
 * @param filename - Name of the file to download
 */
export const downloadExcelFile = (blob: Blob, filename: string = 'orders.xlsx') => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Convert Blob to File
 * @param blob - Blob to convert
 * @param filename - Name of the file
 * @returns File object
 */
export const blobToFile = (blob: Blob, filename: string): File => {
  return new File([blob], filename, { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
};
