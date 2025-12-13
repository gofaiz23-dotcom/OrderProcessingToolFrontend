import * as XLSX from 'xlsx';
import type { Order } from '@/app/types/order';

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
