/**
 * Synthetic IP Generator
 * Generates synthetic IPv4 addresses using RFC 5737 reserved documentation ranges:
 * 192.0.2.0/24 (TEST-NET-1)
 * 198.51.100.0/24 (TEST-NET-2)
 * 203.0.113.0/24 (TEST-NET-3)
 * Guarantees zero collision with real public infrastructure IPv4 addresses.
 */
class IpGenerator {
  constructor() {
    this.type = 'IP_ADDRESS';
  }

  /**
   * Generates a synthetic test IPv4 address
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "192.0.2.1"
   */
  generate(entity, index = 0) {
    const host = (index % 254) + 1;
    const netBlock = Math.floor(index / 254) % 3;

    if (netBlock === 0) {
      return `192.0.2.${host}`;
    } else if (netBlock === 1) {
      return `198.51.100.${host}`;
    } else {
      return `203.0.113.${host}`;
    }
  }
}

module.exports = new IpGenerator();
