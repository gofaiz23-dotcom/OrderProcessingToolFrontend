/**
 * Automatically detect the type of a value from a string input
 */
export const detectValueType = (value: string): 'string' | 'number' | 'boolean' | 'null' => {
  const trimmed = value.trim();
  
  // Check for null
  if (trimmed === '' || trimmed.toLowerCase() === 'null') {
    return 'null';
  }
  
  // Check for boolean
  const lowerValue = trimmed.toLowerCase();
  if (lowerValue === 'true' || lowerValue === 'false') {
    return 'boolean';
  }
  
  // Check for number
  // Allow integers, decimals, negative numbers, scientific notation
  const numberPattern = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
  if (numberPattern.test(trimmed)) {
    const num = parseFloat(trimmed);
    if (!isNaN(num) && isFinite(num)) {
      return 'number';
    }
  }
  
  // Default to string
  return 'string';
};

/**
 * Parse a value based on its detected type
 */
export const parseValueByType = (value: string, valueType: 'string' | 'number' | 'boolean' | 'null'): unknown => {
  switch (valueType) {
    case 'null':
      return null;
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    case 'string':
    default:
      return value;
  }
};

