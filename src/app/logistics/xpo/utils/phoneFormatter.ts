/**
 * Formats phone number input to +1 (XXX) XXX-XXXX format
 * Handles user input and maintains the format as they type
 */
export const formatPhoneInput = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // If empty, return +1 as default
  if (digits.length === 0) {
    return '+1';
  }
  
  // Remove leading 1 if it's the country code (for US numbers)
  let phoneDigits = digits;
  if (digits.length > 10 && digits.startsWith('1')) {
    phoneDigits = digits.substring(1);
  }
  
  // Limit to 10 digits (US phone number)
  if (phoneDigits.length > 10) {
    phoneDigits = phoneDigits.substring(0, 10);
  }
  
  // Format based on length
  if (phoneDigits.length === 0) {
    return '+1';
  } else if (phoneDigits.length <= 3) {
    return `+1 (${phoneDigits}`;
  } else if (phoneDigits.length <= 6) {
    return `+1 (${phoneDigits.substring(0, 3)}) ${phoneDigits.substring(3)}`;
  } else {
    return `+1 (${phoneDigits.substring(0, 3)}) ${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}`;
  }
};

/**
 * Handles phone input change event
 * Formats the value and updates cursor position
 */
export const handlePhoneInputChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  currentValue: string,
  onChange: (value: string) => void
) => {
  const input = e.target;
  const cursorPosition = input.selectionStart || 0;
  const oldValue = currentValue || '+1';
  
  // Get the new value
  let newValue = e.target.value;
  
  // If user is deleting and we're at the start, prevent deletion of +1
  if (newValue.length < 3 && cursorPosition <= 2) {
    newValue = '+1';
  } else {
    // Format the new value
    newValue = formatPhoneInput(newValue);
  }
  
  // Calculate new cursor position
  const oldLength = oldValue.length;
  const newLength = newValue.length;
  const lengthDiff = newLength - oldLength;
  
  // Adjust cursor position
  let newCursorPosition = cursorPosition + lengthDiff;
  
  // Ensure cursor doesn't go before +1
  if (newCursorPosition < 2) {
    newCursorPosition = 2;
  }
  
  // Update the value
  onChange(newValue);
  
  // Set cursor position after React updates
  setTimeout(() => {
    input.setSelectionRange(newCursorPosition, newCursorPosition);
  }, 0);
};

/**
 * Handles phone input focus event
 * Sets default value to +1 if empty
 */
export const handlePhoneInputFocus = (
  e: React.FocusEvent<HTMLInputElement>,
  currentValue: string,
  onChange: (value: string) => void
) => {
  if (!currentValue || currentValue.trim() === '') {
    onChange('+1');
    setTimeout(() => {
      e.target.setSelectionRange(2, 2); // Position cursor after +1
    }, 0);
  }
};

/**
 * Handles phone input blur event
 * Ensures format is maintained
 */
export const handlePhoneInputBlur = (
  currentValue: string,
  onChange: (value: string) => void
) => {
  if (currentValue && currentValue.trim() !== '' && currentValue !== '+1') {
    const formatted = formatPhoneInput(currentValue);
    if (formatted !== currentValue) {
      onChange(formatted);
    }
  }
};

