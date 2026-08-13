/**
 * Synthetic Physical Address Generator
 * Generates synthetic physical/mailing addresses that resemble real addresses structurally
 * but do not copy exact localities or real premises from source documents.
 */
class AddressGenerator {
  constructor() {
    this.type = 'ADDRESS';

    this.streetAddresses = [
      '42 Industrial Estate Road, Sector 18, Navi Nagar, Pune - 411999, Maharashtra, India',
      '105, Building 4, Cyber Park Center, MIDC Phase 2, Chakan, Pune - 410999, Maharashtra, India',
      '302, Northstar Commercial Complex, Link Road, Andheri East, Mumbai - 400999, Maharashtra, India',
      'Plot No 15, Tech Zone Park, Hinjewadi Phase 3, Pune - 411998, Maharashtra, India',
      '88 Business Bay Tower, Off MG Road, Sector 12, Bengaluru - 560999, Karnataka, India'
    ];
  }

  /**
   * Generates a synthetic address candidate guaranteed unique for index N
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "42 Industrial Estate Road, Sector 18, Navi Nagar, Pune - 411999, Maharashtra, India"
   */
  generate(entity, index = 0) {
    const addrIndex = index % this.streetAddresses.length;
    const baseAddr = this.streetAddresses[addrIndex];
    const suiteNum = Math.floor(index / this.streetAddresses.length);

    if (suiteNum > 0) {
      return baseAddr.replace(/,\s*(Maharashtra|Karnataka|Tamil Nadu)/, `, Suite ${suiteNum + 1}, $1`);
    }
    return baseAddr;
  }
}

module.exports = new AddressGenerator();
