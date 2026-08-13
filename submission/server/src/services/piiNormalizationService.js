/**
 * PII Normalization Service
 * Provides type-specific canonical comparison values for detected entities without modifying
 * the original entity text, start offset, or end offset. Used for canonical grouping and duplicate resolution.
 */
class PiiNormalizationService {
  /**
   * Normalizes an entity text value based on its entity type
   * @param {string} type - Entity category (EMAIL, PHONE, CREDIT_CARD, etc.)
   * @param {string} text - Raw entity text from document source
   * @returns {string} Canonical comparison string
   */
  normalize(type, text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const trimmed = text.trim();

    switch (type) {
      case 'EMAIL':
        // Lowercase and trimmed comparison key
        return trimmed.toLowerCase();

      case 'PHONE':
        // Strip spaces, hyphens, parentheses, and dots, preserving leading + if present
        const hasPlus = trimmed.startsWith('+');
        const digitsOnly = trimmed.replace(/[^\d]/g, '');
        return hasPlus ? `+${digitsOnly}` : digitsOnly;

      case 'CREDIT_CARD':
      case 'SSN':
        // Strip hyphens and spaces
        return trimmed.replace(/[\s\-]/g, '');

      case 'IP_ADDRESS':
        return trimmed;

      case 'PERSON':
      case 'ORGANIZATION':
        // Collapse multiple whitespace tokens, trim, and convert to lowercase
        return trimmed.replace(/\s+/g, ' ').toLowerCase();

      case 'ADDRESS':
        // Collapse line breaks and multiple spaces, trim, and convert to lowercase
        return trimmed.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();

      case 'DOB':
        // Try parsing unambiguous date into ISO YYYY-MM-DD
        const isoDate = this.parseCanonicalIsoDate(trimmed);
        return isoDate || trimmed.toLowerCase();

      default:
        return trimmed.replace(/\s+/g, ' ').toLowerCase();
    }
  }

  /**
   * Parses unambiguous dates into canonical ISO format YYYY-MM-DD
   * Preserves original string if ambiguous to prevent silent reinterpretation errors.
   * @param {string} dateStr 
   * @returns {string|null} ISO date string YYYY-MM-DD or null
   */
  parseCanonicalIsoDate(dateStr) {
    if (!dateStr) return null;

    // Format: YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Named month dates e.g. "December 16, 1979" or "16 December 1979"
    const parsedTime = Date.parse(dateStr);
    if (!isNaN(parsedTime)) {
      const d = new Date(parsedTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (year >= 1900 && year <= new Date().getFullYear()) {
        return `${year}-${month}-${day}`;
      }
    }

    return null;
  }

  /**
   * Generates a canonical grouping key for an entity
   * @param {string} type 
   * @param {string} text 
   * @returns {string} Canonical key e.g. "organization:ksh international limited"
   */
  getCanonicalKey(type, text) {
    const norm = this.normalize(type, text);
    return `${type.toLowerCase()}:${norm}`;
  }
}

module.exports = new PiiNormalizationService();
