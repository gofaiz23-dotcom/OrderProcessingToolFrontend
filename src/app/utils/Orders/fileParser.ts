'use client';

// Lazy load xlsx - only imported when Excel files need to be parsed
// This function is only called at runtime when a user uploads an Excel file
const loadXLSX = async () => {
  try {
    // Dynamic import - loaded only when needed (client-side only)
    const xlsxLib = await import('xlsx');
    // Handle both default and named exports
    return xlsxLib.default || xlsxLib;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load xlsx library for Excel file parsing. ` +
      `Please ensure the xlsx package is installed by running: npm install xlsx\n` +
      `Original error: ${errorMessage}`
    );
  }
};

/**
 * Parse CSV file and convert to orders
 */
export const parseCSVFile = async (file: File): Promise<Array<{ orderOnMarketPlace: string; jsonb: Record<string, unknown> }>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        
        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        // Parse header row
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);
        
        // Find orderOnMarketPlace column (case-insensitive)
        // Try various common names
        let marketplaceIndex = headers.findIndex(
          (h) => h.toLowerCase() === 'orderonmarketplace' ||
                  h.toLowerCase() === 'order_on_market_place' ||
                  h.toLowerCase() === 'order on marketplace' ||
                  h.toLowerCase().includes('marketplace')
        );

        // If not found, try simpler names
        if (marketplaceIndex === -1) {
          marketplaceIndex = headers.findIndex(
            (h) => h.toLowerCase().includes('market') ||
                    h.toLowerCase().includes('platform') ||
                    h.toLowerCase() === 'marketplace'
          );
        }

        // If still not found, use first column as marketplace
        if (marketplaceIndex === -1) {
          marketplaceIndex = 0;
        }

        const orders: Array<{ orderOnMarketPlace: string; jsonb: Record<string, unknown> }> = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          
          if (values.length === 0 || !values[marketplaceIndex]?.trim()) {
            continue; // Skip empty rows
          }

          const orderOnMarketPlace = values[marketplaceIndex].trim();
          
          // Build JSONB object from all other columns
          const jsonb: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            if (index !== marketplaceIndex && values[index] !== undefined) {
              const value = values[index].trim();
              if (value !== '') {
                // Try to parse as number, boolean, or keep as string
                jsonb[header] = parseValue(value);
              }
            }
          });

          orders.push({
            orderOnMarketPlace,
            jsonb,
          });
        }

        if (orders.length === 0) {
          reject(new Error('No valid orders found in CSV file'));
          return;
        }

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

/**
 * Parse a CSV line handling quoted values
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
      // Use first delimiter found (comma, semicolon, or tab)
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

/**
 * Parse a value to appropriate type (number, boolean, or string)
 */
const parseValue = (value: string): unknown => {
  // Try boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // Try number
  const num = parseFloat(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }

  // Try null
  if (value.toLowerCase() === 'null' || value === '') {
    return null;
  }

  // Return as string
  return value;
};

/**
 * Parse Excel file (XLSX, XLS, ODS)
 */
export const parseExcelFile = async (file: File): Promise<Array<{ orderOnMarketPlace: string; jsonb: Record<string, unknown> }>> => {
  // Load xlsx library dynamically
  const XLSX = await loadXLSX();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        // Read workbook
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Excel file has no sheets'));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON (array of objects)
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        
        if (jsonData.length === 0) {
          reject(new Error('Excel sheet is empty'));
          return;
        }

        // First row is headers
        const headers = (jsonData[0] as string[]).map((h) => String(h || '').trim());
        
        // Find marketplace column (case-insensitive)
        // Try various common names
        let marketplaceIndex = headers.findIndex(
          (h) => h.toLowerCase() === 'orderonmarketplace' ||
                  h.toLowerCase() === 'order_on_market_place' ||
                  h.toLowerCase() === 'order on marketplace' ||
                  h.toLowerCase().includes('marketplace')
        );

        // If not found, try simpler names
        if (marketplaceIndex === -1) {
          marketplaceIndex = headers.findIndex(
            (h) => h.toLowerCase().includes('market') ||
                    h.toLowerCase().includes('platform') ||
                    h.toLowerCase() === 'marketplace'
          );
        }

        // If still not found, use first column as marketplace
        if (marketplaceIndex === -1) {
          marketplaceIndex = 0;
        }

        const orders: Array<{ orderOnMarketPlace: string; jsonb: Record<string, unknown> }> = [];

        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          
          if (!row || row.length === 0) continue;
          
          const marketplaceValue = String(row[marketplaceIndex] || '').trim();
          if (!marketplaceValue) continue; // Skip rows without marketplace value

          // Build JSONB object from other columns
          const jsonb: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            if (index !== marketplaceIndex && row[index] !== undefined && row[index] !== null) {
              const value = row[index];
              // Preserve original value type
              jsonb[header] = value === '' ? null : value;
            }
          });

          orders.push({
            orderOnMarketPlace: marketplaceValue,
            jsonb,
          });
        }

        if (orders.length === 0) {
          reject(new Error('No valid orders found in Excel file'));
          return;
        }

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read as binary for Excel files
    reader.readAsBinaryString(file);
  });
};

