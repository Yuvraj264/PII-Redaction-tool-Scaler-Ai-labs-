/**
 * Synthetic Phone Generator
 * Generates synthetic phone numbers in reserved test ranges (+91 98765 01001 series)
 * ensuring zero collision with real active phone numbers.
 */
class PhoneGenerator {
  constructor() {
    this.type = 'PHONE';
  }

  /**
   * Generates a synthetic phone number candidate
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "+91 98765 01001" or "+91 20 4505 0001"
   */
  generate(entity, index = 0) {
    const isLandline = entity && entity.text && /\b(?:020|022|080|011|044)\b/.test(entity.text);

    if (isLandline) {
      const seq = String(1001 + index).padStart(4, '0');
      return `+91 20 4505 ${seq}`;
    }

    const seq = String(1001 + index).padStart(5, '0');
    return `+91 98765 ${seq}`;
  }
}

module.exports = new PhoneGenerator();
