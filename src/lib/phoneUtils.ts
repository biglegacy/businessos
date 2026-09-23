/**
 * Phone Number Utilities for Ghana and International Formats
 * Supports all Ghanaian mobile networks:
 * - MTN: 024, 054, 055, 059, 053, 025
 * - Telecel (formerly Vodafone): 020, 050
 * - AirtelTigo: 027, 057, 026, 056
 * - Glo: 023
 * - Landlines / Fixed: 030 - 039
 * - International normalized format for Arkesel: 233XXXXXXXXX or +233XXXXXXXXX
 */

export type GhanaCarrier = 'MTN' | 'Telecel' | 'AirtelTigo' | 'Glo' | 'Other';

export interface NetworkDetectionResult {
  network: GhanaCarrier;
  isGhana: boolean;
  prefix: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  displayFormatted: string;
  error?: string;
  isGhanaian: boolean;
  network?: GhanaCarrier;
}

/**
 * Robust, universal normalization for Ghanaian phone numbers.
 * Converts any local or international representation into the standard Arkesel format: 233XXXXXXXXX.
 * Safely handles:
 * - Local 10-digit (020..., 024..., 025..., 026..., 027..., 050..., 054..., 055..., 059..., 053..., 056..., 057...)
 * - Local 9-digit (20..., 24..., 27..., 50..., etc.)
 * - Accidental redundant zero: +233020XXXXXXX or 233020XXXXXXX -> 23320XXXXXXX
 * - Accidental duplicate country code: 233233XXXXXXXXX -> 233XXXXXXXXX
 * - International prefixes: +233..., 00233..., 00...
 */
export function normalizeGhanaPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith('00233')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // Strip duplicate 233 prefix (e.g. 233233XXXXXXXXX -> 233XXXXXXXXX)
  while (cleaned.startsWith('233233') && cleaned.length >= 15) {
    cleaned = '233' + cleaned.slice(6);
  }

  // Strip accidental redundant 0 after 233 (e.g. 233020123456 -> 23320123456)
  if (/^2330[235]\d{8}$/.test(cleaned)) {
    cleaned = '233' + cleaned.slice(4);
  }

  // Ghana local 10-digit format starting with 0 (e.g. 024XXXXXXX, 020XXXXXXX, 050XXXXXXX, etc.)
  if (/^0[235]\d{8}$/.test(cleaned)) {
    cleaned = '233' + cleaned.slice(1);
  }

  // Ghana local 9-digit format without leading 0 (e.g. 20XXXXXXX, 24XXXXXXX, 27XXXXXXX, 50XXXXXXX, etc.)
  if (/^[235]\d{8}$/.test(cleaned)) {
    cleaned = '233' + cleaned;
  }

  return cleaned;
}

/**
 * Detects Ghanaian mobile network from phone number for display badges & diagnostics.
 * NOTE: This is NEVER used to filter or reject messages; all valid Ghanaian recipients are delivered.
 */
export function detectGhanaNetwork(phone: string): NetworkDetectionResult {
  const norm = normalizeGhanaPhoneNumber(phone);
  if (norm.startsWith('233') && norm.length === 12) {
    const prefix2 = norm.substring(3, 5); // 2-digit carrier prefix after 233
    // MTN: 024, 054, 055, 059, 053, 025
    if (['24', '54', '55', '59', '53', '25'].includes(prefix2)) {
      return { network: 'MTN', isGhana: true, prefix: '0' + prefix2 };
    }
    // Telecel: 020, 050
    if (['20', '50'].includes(prefix2)) {
      return { network: 'Telecel', isGhana: true, prefix: '0' + prefix2 };
    }
    // AirtelTigo: 027, 057, 026, 056
    if (['27', '57', '26', '56'].includes(prefix2)) {
      return { network: 'AirtelTigo', isGhana: true, prefix: '0' + prefix2 };
    }
    // Glo: 023
    if (prefix2 === '23') {
      return { network: 'Glo', isGhana: true, prefix: '0' + prefix2 };
    }
    return { network: 'Other', isGhana: true, prefix: '0' + prefix2 };
  }
  return { network: 'Other', isGhana: false, prefix: '' };
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

  const normalized = normalizeGhanaPhoneNumber(rawPhone);
  const detected = detectGhanaNetwork(normalized);

  // Valid Ghanaian mobile/fixed number normalized to 233XXXXXXXXX (12 digits)
  if (normalized.startsWith('233') && /^\d{12}$/.test(normalized)) {
    const local9 = normalized.slice(3);
    const displayFormatted = `0${local9.slice(0, 2)} ${local9.slice(2, 5)} ${local9.slice(5)}`;
    return {
      isValid: true,
      normalized,
      displayFormatted,
      isGhanaian: true,
      network: detected.network
    };
  }

  // General international format (10 to 15 digits)
  if (/^\d{10,15}$/.test(normalized)) {
    return {
      isValid: true,
      normalized,
      displayFormatted: `+${normalized}`,
      isGhanaian: normalized.startsWith('233'),
      network: detected.network
    };
  }

  return {
    isValid: false,
    normalized,
    displayFormatted: rawPhone,
    error: 'Invalid phone format. Please enter a valid Ghanaian number (e.g. 024 XXX XXXX, 020 XXX XXXX, 027 XXX XXXX).',
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
