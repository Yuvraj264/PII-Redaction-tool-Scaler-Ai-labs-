/**
 * Physical Address Entity Detector
 * Detects multi-component physical and mailing addresses (e.g. Registered Office, Corporate Office,
 * village/building/street + city + state + PIN code) using contextual indicator rules, multi-component
 * structural signals, and strict confidence thresholding.
 */
class AddressDetector {
  constructor() {
    this.type = 'ADDRESS';

    // Address prefix/label keywords
    this.addressLabelsRegex = /\b(?:Registered\s+Office|Corporate\s+Office|Head\s+Office|Branch\s+Office|Factory\s+Address|Address)\s*[:\-–]?\s*/gi;

    // Location & structural keywords
    this.locationKeywords = [
      'village', 'taluka', 'district', 'dist', 'road', 'street', 'marg', 'lane',
      'tower', 'building', 'centre', 'center', 'floor', 'plot', 'survey', 'gate',
      'chakan', 'baner', 'bkc', 'nariman point', 'khed', 'hadapsar', 'hinjewadi',
      'pune', 'mumbai', 'delhi', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
      'maharashtra', 'karnataka', 'tamil nadu', 'gujarat', 'india'
    ];

    // Postal / PIN code regex (6-digit Indian PIN, e.g., 410 501, 411045, 400051)
    this.pinCodeRegex = /\b\d{3}\s?\d{3}\b/g;
  }

  /**
   * Calculates structural location evidence score of a text snippet
   * @param {string} snippet 
   * @returns {Object} { score, locationCount, hasPin }
   */
  evaluateLocationEvidence(snippet) {
    if (!snippet) return { score: 0, locationCount: 0, hasPin: false };

    const lower = snippet.toLowerCase();
    let locationCount = 0;

    for (const kw of this.locationKeywords) {
      if (lower.includes(kw)) {
        locationCount++;
      }
    }

    const pinMatches = snippet.match(this.pinCodeRegex);
    const hasPin = Array.isArray(pinMatches) && pinMatches.length > 0;

    // Has street/building/plot structural numbers (e.g., "11/3", "201, Tower 2", "Plot No")
    const hasBuildingNumber = /\b(?:\d+[\/\-]\d+|\d+,\s*(?:Tower|Building|Floor|Plot)|Plot\s+No|Tower\s+\d+|Floor\s+\d+)\b/i.test(snippet);

    let score = locationCount;
    if (hasPin) score += 2;
    if (hasBuildingNumber) score += 2;

    return { score, locationCount, hasPin, hasBuildingNumber };
  }

  /**
   * Resolves internal overlapping matches favoring longer or higher confidence candidates
   * @param {Array<Object>} matches 
   * @returns {Array<Object>}
   */
  resolveInternalOverlaps(matches) {
    if (matches.length <= 1) return matches;

    const sorted = [...matches].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end - b.start) - (a.end - a.start);
    });

    const res = [];
    for (const m of sorted) {
      let overlap = false;
      for (let i = 0; i < res.length; i++) {
        const ex = res[i];
        if (m.start < ex.end && ex.start < m.end) {
          overlap = true;
          const mLen = m.end - m.start;
          const exLen = ex.end - ex.start;
          if (mLen > exLen || (mLen === exLen && m.confidence > ex.confidence)) {
            res[i] = m;
          }
          break;
        }
      }
      if (!overlap) res.push(m);
    }
    return res;
  }

  /**
   * Detects ADDRESS entities in a text unit string.
   * @param {string} text - Plain text string of structured unit
   * @returns {Array<Object>} List of candidate entity matches
   */
  detect(text) {
    if (!text || typeof text !== 'string' || text.length < 15) {
      return [];
    }

    const rawMatches = [];

    // Strategy 1: Explicit Address Label Preceded Patterns (e.g., "Registered Office: 11/3, 11/4 ... Pune – 410 501, Maharashtra, India")
    let labelMatch;
    this.addressLabelsRegex.lastIndex = 0;

    while ((labelMatch = this.addressLabelsRegex.exec(text)) !== null) {
      const labelEndIndex = labelMatch.index + labelMatch[0].length;

      // Extract following text (up to end of unit or ~220 chars)
      const maxAddrLen = 220;
      const candidateSub = text.substring(labelEndIndex, labelEndIndex + maxAddrLen);

      // Truncate candidate address at logical structural boundaries
      let cleanAddr = candidateSub.split(/(?:\n\n|Tel:|Telephone:|Email:|Email\s+Address:|CIN:|Contact\s+Person:|\bFax:)/i)[0].trim();

      // Clean trailing punctuation
      cleanAddr = cleanAddr.replace(/[\s,.;:-]+$/, '');

      if (cleanAddr.length >= 15) {
        const evidence = this.evaluateLocationEvidence(cleanAddr);

        if (evidence.score >= 2 || evidence.hasPin) {
          const start = labelEndIndex;
          const end = start + cleanAddr.length;

          if (text.substring(start, end) === cleanAddr) {
            rawMatches.push({
              type: this.type,
              text: cleanAddr,
              start,
              end,
              confidence: 0.95,
              detector: 'address'
            });
          }
        }
      }
    }

    // Strategy 2: Multi-component Unlabelled Address Detection
    const addressPattern = /\b(?:\d+[\/\-]\d+|\d+,\s*(?:Tower|Building|Floor|Plot)|Village|Plot\s+No)[A-Za-z0-9\s,.\-–\/()]{15,150}?\b\d{3}\s?\d{3}\b(?:,\s*(?:Maharashtra|India))?/gi;
    let addrMatch;

    while ((addrMatch = addressPattern.exec(text)) !== null) {
      const fullAddrText = addrMatch[0].trim();
      const start = addrMatch.index;
      const end = start + fullAddrText.length;

      const lower = fullAddrText.toLowerCase();
      if (lower === 'mumbai' || lower === 'pune' || lower === 'maharashtra' || lower === 'india') {
        continue;
      }

      const evidence = this.evaluateLocationEvidence(fullAddrText);
      if (evidence.score >= 3) {
        if (text.substring(start, end) === fullAddrText) {
          rawMatches.push({
            type: this.type,
            text: fullAddrText,
            start,
            end,
            confidence: 0.90,
            detector: 'address'
          });
        }
      }
    }

    return this.resolveInternalOverlaps(rawMatches);
  }
}

module.exports = new AddressDetector();
