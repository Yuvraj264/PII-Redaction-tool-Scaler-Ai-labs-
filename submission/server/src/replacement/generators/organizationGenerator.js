/**
 * Synthetic Organization / Company Generator
 * Generates synthetic company names from a candidate pool while preserving legal structure
 * (Private Limited, Limited, LLP, Inc., Bank, Securities). Does NOT reuse real company names from the source document.
 */
class OrganizationGenerator {
  constructor() {
    this.type = 'ORGANIZATION';

    this.companyBases = [
      'Apex Meridian Technologies',
      'Bluecrest Industrial Systems',
      'Northstar Engineering Solutions',
      'Vanguard Capital Holdings',
      'Horizon Global Advisory Services',
      'Zenith Strategic Consulting',
      'Beacon Enterprise Solutions',
      'Crestview Financial Analytics',
      'Silverline Management Systems',
      'Optima Securities and Investments'
    ];
  }

  /**
   * Generates a synthetic company candidate preserving original legal suffix structure
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "Apex Meridian Technologies Private Limited"
   */
  generate(entity, index = 0) {
    const baseIndex = index % this.companyBases.length;
    const baseName = this.companyBases[baseIndex];

    // Detect legal suffix in original entity text
    let suffix = 'Limited';
    if (entity && typeof entity.text === 'string') {
      const upper = entity.text.toUpperCase();
      if (upper.includes('PRIVATE LIMITED') || upper.includes('PVT. LTD.') || upper.includes('PVT LTD')) {
        suffix = 'Private Limited';
      } else if (upper.includes('LLP')) {
        suffix = 'LLP';
      } else if (upper.includes('CORPORATION') || upper.includes('INC.')) {
        suffix = 'Corporation';
      } else if (upper.includes('BANK')) {
        suffix = 'Bank Limited';
      } else if (upper.includes('LIMITED') || upper.includes('LTD.')) {
        suffix = 'Limited';
      }
    }

    const iterSuffix = Math.floor(index / this.companyBases.length);
    const extraTag = iterSuffix > 0 ? ` ${iterSuffix + 1}` : '';

    return `${baseName}${extraTag} ${suffix}`;
  }
}

module.exports = new OrganizationGenerator();
