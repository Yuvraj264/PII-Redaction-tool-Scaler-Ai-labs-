/**
 * Phone PII Detector
 * Detects Indian and international telephone numbers (+91 formats, 10-digit mobile, spaced/hyphenated landlines)
 * with strict false-positive rules to reject postal codes, financial figures, dates, and legal CINs.
 */
class PhoneDetector {
  constructor() {
    this.type = 'PHONE';
    this.detectorName = 'phone';
    
    // Pattern 1: International / Indian prefix numbers with +91 or +<country_code>
    this.intlPattern = /(?:\+91[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}\b/g;
    
    // Context keywords that strongly indicate telephone numbers
    this.contextKeywords = ['tel', 'telephone', 'mobile', 'phone', 'contact', 'fax', 'call', '+91'];
  }

  /**
   * Helper to check if a numeric match string is a postal code or non-phone number
   */
  isFalsePositive(matchText, fullText, startIdx) {
    const cleanDigits = matchText.replace(/\D/g, '');

    // Phone numbers generally require between 10 and 13 digits (including country code 91)
    if (cleanDigits.length < 10 || cleanDigits.length > 13) {
      return true;
    }

    // Rejects common 6-digit Indian postal codes formatted as numbers (e.g. 410 501 or Pune - 410 501)
    if (cleanDigits.length === 6 || /PIN|Postal|Code|Pune\s*[–-]?\s*\d{6}/i.test(fullText.substring(Math.max(0, startIdx - 30), startIdx + matchText.length + 10))) {
      return true;
    }

    // Rejects Corporate Identity Numbers (CIN e.g. U28129PN1979PLC141032) or SEBI registration numbers
    const surroundingSnippet = fullText.substring(Math.max(0, startIdx - 40), Math.min(fullText.length, startIdx + matchText.length + 40)).toLowerCase();
    if (surroundingSnippet.includes('cin') || surroundingSnippet.includes('corporate identity number') || surroundingSnippet.includes('sebi') || surroundingSnippet.includes('registration no')) {
      return true;
    }

    // Rejects financial quantities / share counts (e.g., "10,000,000 equity shares")
    if (/\b(?:shares?|equity|rs\.?|rupees|amount|lakhs?|crores?|dated?|march|april|january)\b/i.test(surroundingSnippet)) {
      if (!matchText.startsWith('+91') && !/\b(?:tel|phone|contact|mobile)\b/i.test(surroundingSnippet)) {
        return true;
      }
    }

    // If 10-digit number does not start with +91 and lacks phone context, check standard Indian mobile prefix (starts with 6,7,8,9)
    if (cleanDigits.length === 10 && !matchText.startsWith('+91')) {
      const firstDigit = cleanDigits.charAt(0);
      const hasPhoneContext = this.contextKeywords.some(kw => surroundingSnippet.includes(kw));
      if (!['6', '7', '8', '9'].includes(firstDigit) && !hasPhoneContext) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detects phone entities within a raw text string.
   * @param {string} text - Raw input text
   * @returns {Array<Object>} List of phone entities
   */
  detect(text) {
    if (!text || typeof text !== 'string') return [];

    const entities = [];
    let match;
    this.intlPattern.lastIndex = 0;

    while ((match = this.intlPattern.exec(text)) !== null) {
      let rawMatch = match[0];
      let start = match.index;
      
      // Clean leading/trailing punctuation or whitespace
      let cleanMatch = rawMatch.replace(/^[^+\d]+/, '').replace(/[^0-9]+$/, '');
      if (!cleanMatch) continue;

      let matchStart = text.indexOf(cleanMatch, start);
      if (matchStart === -1) matchStart = start;
      let matchEnd = matchStart + cleanMatch.length;

      const entityText = text.substring(matchStart, matchEnd);

      if (!this.isFalsePositive(entityText, text, matchStart)) {
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

module.exports = new PhoneDetector();
