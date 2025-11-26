'use client';

import type { Order } from '@/app/types/order';

/**
 * Helper function to get value from JSONB with flexible key matching
 */
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
 * Convert a value to CSV-safe string (handles commas, quotes, newlines)
 */
const escapeCSVValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Export orders to CSV format
 */
export const exportOrdersToCSV = (orders: Order[]): void => {
  if (orders.length === 0) {
    alert('No orders to export');
    return;
  }

  // Define columns
  const columns = [
    'Order ID',
    'Marketplace',
    'PO#',
    'SKU',
    'Order#',
    'Customer Name',
    'Tracking Number',
  ];

  // Collect all unique JSONB keys from all orders for additional columns
  const additionalKeys = new Set<string>();
  orders.forEach((order) => {
    if (order.jsonb && typeof order.jsonb === 'object' && !Array.isArray(order.jsonb)) {
      const obj = order.jsonb as Record<string, unknown>;
      Object.keys(obj).forEach((key) => {
        // Skip keys that are already in main columns
        const normalizedKey = key.toLowerCase();
        if (
          normalizedKey !== 'order id' &&
          normalizedKey !== 'marketplace' &&
          normalizedKey !== 'po#' &&
          normalizedKey !== 'sku' &&
          normalizedKey !== 'order#' &&
          normalizedKey !== 'customer name' &&
          normalizedKey !== 'tracking number'
        ) {
          additionalKeys.add(key);
        }
      });
    }
  });

  // Combine main columns with additional JSONB keys
  const allColumns = [...columns, ...Array.from(additionalKeys).sort()];

  // Create CSV header row
  const headerRow = allColumns.map(escapeCSVValue).join(',');

  // Create CSV data rows
  const dataRows = orders.map((order) => {
    const row: string[] = [];
    
    // Order ID
    row.push(escapeCSVValue(order.id));
    
    // Marketplace
    row.push(escapeCSVValue(order.orderOnMarketPlace));
    
    // Standard JSONB fields
    row.push(escapeCSVValue(getJsonbValue(order.jsonb, 'PO#')));
    row.push(escapeCSVValue(getJsonbValue(order.jsonb, 'SKU')));
    row.push(escapeCSVValue(getJsonbValue(order.jsonb, 'Order#')));
    row.push(escapeCSVValue(getJsonbValue(order.jsonb, 'Customer Name')));
    row.push(escapeCSVValue(getJsonbValue(order.jsonb, 'Tracking Number')));
    
    // Additional JSONB fields
    const jsonbObj = order.jsonb && typeof order.jsonb === 'object' && !Array.isArray(order.jsonb)
      ? (order.jsonb as Record<string, unknown>)
      : {};
    
    Array.from(additionalKeys).sort().forEach((key) => {
      const value = jsonbObj[key];
      row.push(escapeCSVValue(value));
    });
    
    return row.join(',');
  });

  // Combine header and data rows
  const csvContent = [headerRow, ...dataRows].join('\n');

  // Add BOM for Excel compatibility (UTF-8 BOM)
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `orders_${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
};

