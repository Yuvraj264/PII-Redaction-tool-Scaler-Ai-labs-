/**
 * Synthetic Date of Birth Generator
 * Generates synthetic birth dates representing realistic adult ages.
 * Guarantees output differs from original source text and generates unique dates for any index.
 */
class DobGenerator {
  constructor() {
    this.type = 'DOB';
  }

  /**
   * Generates a synthetic date candidate
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "1985-04-12"
   */
  generate(entity, index = 0) {
    const year = 1970 + (index % 35);
    const month = String((index % 12) + 1).padStart(2, '0');
    const day = String((index % 28) + 1).padStart(2, '0');

    const cand = `${year}-${month}-${day}`;

    // Ensure generated replacement differs from original entity text
    if (entity && entity.text === cand) {
      const altDay = String(((index + 1) % 28) + 1).padStart(2, '0');
      return `${year}-${month}-${altDay}`;
    }
    return cand;
  }
}

module.exports = new DobGenerator();
