const allowlistService = require('./allowlistService');

/**
 * PII Validation Service
 * Validates candidate entity schema contracts, enforces character offset invariants,
 * evaluates detector-specific validation rules, and logs diagnostic rejection reasons.
 */
class PiiValidationService {
  constructor() {
    this.validDetectors = new Set([
      'email', 'phone', 'ip', 'ssn', 'creditCard',
      'person', 'organization', 'address', 'dob'
    ]);

    this.validTypes = new Set([
      'EMAIL', 'PHONE', 'IP_ADDRESS', 'SSN', 'CREDIT_CARD',
      'PERSON', 'ORGANIZATION', 'ADDRESS', 'DOB'
    ]);
  }

  /**
   * Luhn checksum validator for credit card numbers
   * @param {string} numberStr 
   * @returns {boolean}
   */
  validateLuhnChecksum(numberStr) {
    if (!numberStr) return false;
    const cleanDigits = numberStr.replace(/\D/g, '');
    if (cleanDigits.length < 13 || cleanDigits.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleanDigits.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanDigits.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return (sum % 10) === 0;
  }

  /**
   * Validates a candidate entity against structural contracts, offset invariants,
   * allowlists, and type-specific rules.
   * @param {Object} candidate - Candidate entity object ({ type, text, start, end, detector, source })
   * @param {string} unitText - Source text string of text unit
   * @returns {Object} { isValid: boolean, reason: string | null }
   */
  validateCandidate(candidate, unitText) {
    // 1. Structural Contract Checks
    if (!candidate || typeof candidate !== 'object') {
      return { isValid: false, reason: 'NULL_OR_INVALID_CANDIDATE_OBJECT' };
    }

    if (!candidate.type || !this.validTypes.has(candidate.type)) {
      return { isValid: false, reason: 'UNKNOWN_ENTITY_TYPE' };
    }

    if (typeof candidate.text !== 'string' || candidate.text.length === 0) {
      return { isValid: false, reason: 'EMPTY_OR_MISSING_TEXT' };
    }

    if (typeof candidate.start !== 'number' || typeof candidate.end !== 'number') {
      return { isValid: false, reason: 'INVALID_OFFSET_NUMBERS' };
    }

    if (candidate.start < 0 || candidate.end <= candidate.start) {
      return { isValid: false, reason: 'INVALID_OFFSET_RANGE' };
    }

    if (!candidate.source || !candidate.source.unitId) {
      return { isValid: false, reason: 'MISSING_SOURCE_UNIT_METADATA' };
    }

    if (typeof unitText !== 'string') {
      return { isValid: false, reason: 'MISSING_SOURCE_UNIT_TEXT' };
    }

    if (candidate.end > unitText.length) {
      return { isValid: false, reason: 'OFFSET_EXCEEDS_UNIT_LENGTH' };
    }

    // 2. Character Offset Invariant Enforcement
    const extractedSub = unitText.substring(candidate.start, candidate.end);
    if (extractedSub !== candidate.text) {
      return { isValid: false, reason: 'INVALID_OFFSET_INVARIANT' };
    }

    // 3. Centralized Allowlist Check
    if (allowlistService.isAllowlisted(candidate.type, candidate.text)) {
      return { isValid: false, reason: 'ALLOWLIST_EXCLUDED' };
    }

    // 4. Detector-Specific Validation Rules
    switch (candidate.type) {
      case 'CREDIT_CARD':
        if (!this.validateLuhnChecksum(candidate.text)) {
          return { isValid: false, reason: 'FAILED_LUHN_CHECKSUM' };
        }
        break;

      case 'IP_ADDRESS':
        const octets = candidate.text.split('.').map(n => parseInt(n, 10));
        if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
          return { isValid: false, reason: 'INVALID_IP_OCTETS' };
        }
        break;

      case 'EMAIL':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.text)) {
          return { isValid: false, reason: 'MALFORMED_EMAIL_SYNTAX' };
        }
        break;

      case 'PHONE':
        const cleanPhoneDigits = candidate.text.replace(/\D/g, '');
        if (cleanPhoneDigits.length < 10 || cleanPhoneDigits.length > 13) {
          return { isValid: false, reason: 'PHONE_FALSE_POSITIVE' };
        }
        break;

      case 'ADDRESS':
        const lowerAddr = candidate.text.toLowerCase().trim();
        if (lowerAddr === 'mumbai' || lowerAddr === 'pune' || lowerAddr === 'maharashtra' || lowerAddr === 'india') {
          return { isValid: false, reason: 'ISOLATED_CITY_NAME' };
        }
        break;

      case 'PERSON':
        if (candidate.text.length < 3 || /[0-9]/.test(candidate.text)) {
          return { isValid: false, reason: 'NO_ROLE_OR_NAME_STRUCTURE' };
        }
        break;

      case 'ORGANIZATION':
        if (candidate.text.length < 3) {
          return { isValid: false, reason: 'ORGANIZATION_REJECTED' };
        }
        break;

      case 'DOB':
        const yearMatch = candidate.text.match(/\b(19\d{2}|20[0-2]\d)\b/);
        if (!yearMatch) {
          return { isValid: false, reason: 'MISSING_DOB_CONTEXT' };
        }
        break;
    }

    return { isValid: true, reason: null };
  }
}

module.exports = new PiiValidationService();
