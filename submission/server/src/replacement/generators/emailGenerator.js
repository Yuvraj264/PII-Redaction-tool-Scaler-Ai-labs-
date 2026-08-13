/**
 * Synthetic Email Generator
 * Generates safe synthetic email addresses using the RFC 2606 reserved @example.com domain.
 * Guarantees zero leakage of real public domain addresses or personal emails.
 */
class EmailGenerator {
  constructor() {
    this.type = 'EMAIL';

    this.emailPrefixes = [
      'arjun.mehta', 'riya.sharma', 'vikram.kapoor', 'neha.verma', 'ananya.iyer',
      'rohan.deshmukh', 'aditya.joshi', 'pooja.nair', 'siddharth.patel', 'kavya.rao',
      'varun.gupta', 'meera.reddy', 'cs.connect', 'contact.officer', 'info.department',
      'compliance.official', 'secretarial.desk', 'investor.relations'
    ];
  }

  /**
   * Generates a safe synthetic email using @example.com domain
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "arjun.mehta@example.com"
   */
  generate(entity, index = 0) {
    const prefixIndex = index % this.emailPrefixes.length;
    const prefix = this.emailPrefixes[prefixIndex];
    const suffix = index >= this.emailPrefixes.length ? `${Math.floor(index / this.emailPrefixes.length)}` : '';

    return `${prefix}${suffix}@example.com`;
  }
}

module.exports = new EmailGenerator();
