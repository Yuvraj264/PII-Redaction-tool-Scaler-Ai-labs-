/**
 * Credit Card PII Detector
 * Detects 13–19 digit candidate credit card numbers (formatted or raw)
 * and validates candidate sequences using the Luhn Algorithm Checksum.
 */
class CreditCardDetector {
  constructor() {
    this.type = 'CREDIT_CARD';
    this.detectorName = 'creditCard';
    // Pattern for candidate 13-19 digit sequences separated by spaces or dashes
    this.pattern = /\b(?:\d[ -]*?){13,19}\b/g;
  }

  /**
   * Luhn Algorithm Checksum Validation
   * @param {string} digitStr - String containing digits only
   * @returns {boolean} True if passes Luhn checksum
   */
  isValidLuhn(digitStr) {
    const digits = digitStr.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    // Check major card brand prefixes (Visa 4, MasterCard 51-55/22-27, Amex 34/37, Discover 6011/65)
    const firstDigit = digits.charAt(0);
    if (!['3', '4', '5', '6'].includes(firstDigit)) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Detects credit card entities within a raw text string.
   * @param {string} text - Raw input text
   * @returns {Array<Object>} List of valid credit card entities
   */
  detect(text) {
    if (!text || typeof text !== 'string') return [];

    const entities = [];
    let match;
    this.pattern.lastIndex = 0;

    while ((match = this.pattern.exec(text)) !== null) {
      let rawMatch = match[0];
      let start = match.index;

      // Clean leading/trailing non-digit separators
      let cleanMatch = rawMatch.replace(/^[^\d]+/, '').replace(/[^\d]+$/, '');
      if (!cleanMatch) continue;

      let matchStart = text.indexOf(cleanMatch, start);
      if (matchStart === -1) matchStart = start;
      let matchEnd = matchStart + cleanMatch.length;

      const digitsOnly = cleanMatch.replace(/\D/g, '');

      // Apply Luhn validation
      if (this.isValidLuhn(digitsOnly)) {
        const entityText = text.substring(matchStart, matchEnd);

        entities.push({
          type: this.type,
          text: entityText,
          start: matchStart,
          end: matchEnd,
          confidence: 1.0,
          detector: this.detectorName
        });
      }
    }

    return entities;
  }
}

module.exports = new CreditCardDetector();
