/**
 * Phone Number Utilities for Ghana and International Formats
 * Supports:
 * - Local Ghanaian numbers: 024XXXXXXX, 020XXXXXXX, 050XXXXXXX, 054XXXXXXX, 055XXXXXXX, 059XXXXXXX, 027XXXXXXX, 057XXXXXXX, etc.
 * - International normalized format for Arkesel: 233XXXXXXXXX or +233XXXXXXXXX
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  displayFormatted: string;
  error?: string;
  isGhanaian: boolean;
}

/**
 * Normalizes and validates a phone number specifically for Arkesel SMS delivery.
 * If empty or whitespace, returns isValid: false with 'empty' error unless allowEmpty is true.
 */
export function validateAndNormalizeGhanaPhone(rawPhone: string, allowEmpty = false): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    if (allowEmpty) {
      return {
        isValid: true,
        normalized: '',
        displayFormatted: '',
        isGhanaian: false
      };
    }
    return {
      isValid: false,
      normalized: '',
      displayFormatted: '',
      error: 'Please provide a recipient phone number.',
      isGhanaian: false
    };
  }

  // Strip all whitespace, hyphens, parentheses, and dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  let hasPlus = false;
  if (cleaned.startsWith('+')) {
    hasPlus = true;
    cleaned = cleaned.slice(1);
  }

  // Reject non-numeric
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      displayFormatted: rawPhone,
      error: 'Phone number must contain digits only.',
      isGhanaian: false
    };
  }

  // Check 1: 10-digit Ghana local format starting with 0
  // e.g. 024XXXXXXX, 020XXXXXXX, 050XXXXXXX, 054XXXXXXX, 055XXXXXXX, 059XXXXXXX, 027XXXXXXX, 057XXXXXXX, etc.
  if (/^0[235]\d{8}$/.test(cleaned)) {
    const normalized = '233' + cleaned.slice(1);
    const displayFormatted = `0${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return {
      isValid: true,
      normalized,
      displayFormatted,
      isGhanaian: true
    };
  }

  // Check 2: 12-digit Ghana international format starting with 233
  // e.g. 23324XXXXXXX, 23355XXXXXXX
  if (/^233[235]\d{8}$/.test(cleaned)) {
    const displayFormatted = `+233 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    return {
      isValid: true,
      normalized: cleaned,
      displayFormatted,
      isGhanaian: true
    };
  }

  // Check 3: 9-digit Ghana number without leading 0 or country code
  // e.g. 241234567
  if (/^[235]\d{8}$/.test(cleaned)) {
    const normalized = '233' + cleaned;
    const displayFormatted = `0${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
    return {
      isValid: true,
      normalized,
      displayFormatted,
      isGhanaian: true
    };
  }

  // Check 4: General international format (10 to 15 digits)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return {
      isValid: true,
      normalized: cleaned,
      displayFormatted: hasPlus ? `+${cleaned}` : cleaned,
      isGhanaian: cleaned.startsWith('233')
    };
  }

  return {
    isValid: false,
    normalized: cleaned,
    displayFormatted: rawPhone,
    error: 'Invalid phone format. Please enter a valid Ghanaian number (e.g. 024 XXX XXXX or +233XXXXXXXXX).',
    isGhanaian: false
  };
}

/**
 * Quick format helper for display in inputs
 */
export function formatGhanaPhoneForInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length <= 10) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
  return raw;
}
