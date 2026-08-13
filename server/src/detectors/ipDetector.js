/**
 * IP Address PII Detector
 * Detects valid IPv4 addresses and validates octet ranges (0–255),
 * while rejecting software version numbers (e.g. 1.0.0, 1.4.5).
 */
class IpDetector {
  constructor() {
    this.type = 'IP_ADDRESS';
    this.detectorName = 'ip';
    // IPv4 pattern matching 4 dot-separated octet candidates
    this.pattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  }

  /**
   * Validates if 4 octets represent a valid IPv4 address
   * @param {string} ipStr 
   * @returns {boolean}
   */
  isValidIPv4(ipStr) {
    const octets = ipStr.split('.');
    if (octets.length !== 4) return false;

    for (const octet of octets) {
      const num = Number(octet);
      if (isNaN(num) || num < 0 || num > 255) return false;
      // Reject octets with leading zeros like "01" unless it is single "0"
      if (octet.length > 1 && octet.startsWith('0')) return false;
    }

    return true;
  }

  /**
   * Detects IP entities within a raw text string.
   * @param {string} text - Raw input text
   * @returns {Array<Object>} List of IP entities
   */
  detect(text) {
    if (!text || typeof text !== 'string') return [];

    const entities = [];
    let match;
    this.pattern.lastIndex = 0;

    while ((match = this.pattern.exec(text)) !== null) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;

      // Filter out software version strings like "1.0.0" or "v1.4.5"
      const surroundingSnippet = text.substring(Math.max(0, start - 15), Math.min(text.length, end + 15)).toLowerCase();
      if (/\b(?:v|ver|version|v\.)\s*$/i.test(text.substring(Math.max(0, start - 10), start))) {
        continue;
      }

      if (this.isValidIPv4(matchText)) {
        const entityText = text.substring(start, end);
        entities.push({
          type: this.type,
          text: entityText,
          start: start,
          end: end,
          confidence: 1.0,
          detector: this.detectorName
        });
      }
    }

    return entities;
  }
}

module.exports = new IpDetector();
