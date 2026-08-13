/**
 * Synthetic SSN Generator
 * Generates test-safe SSN numbers using the official US SSN documentation/test prefix 900-XX-XXXX
 * ensuring zero collision with real active Social Security Numbers.
 */
class SsnGenerator {
  constructor() {
    this.type = 'SSN';
  }

  /**
   * Generates a synthetic test SSN e.g. "900-01-0001"
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "900-01-0001"
   */
  generate(entity, index = 0) {
    const group = String(Math.floor(index / 9999) + 1).padStart(2, '0');
    const serial = String((index % 9999) + 1).padStart(4, '0');

    // Return hyphenated or unhyphenated to match original format
    if (entity && entity.text && !entity.text.includes('-')) {
      return `900${group}${serial}`;
    }
    return `900-${group}-${serial}`;
  }
}

module.exports = new SsnGenerator();
