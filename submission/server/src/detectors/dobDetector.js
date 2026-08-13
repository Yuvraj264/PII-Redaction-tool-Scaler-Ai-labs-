/**
 * Contextual Date of Birth (DOB) Entity Detector
 * Detects dates of birth (e.g. 12/05/1979, December 16, 1985) ONLY when accompanied by explicit DOB context
 * keywords (Date of Birth, DOB, Birth Date, Born). Returns ONLY the date string span as the entity.
 */
class DobDetector {
  constructor() {
    this.type = 'DOB';

    // Strict DOB context prefix regex
    this.dobPrefixRegex = /\b(?:Date\s+of\s+Birth|DOB|Birth\s+Date|Born|d\.o\.b\.)\b[\s\w,:-]{0,30}?\b/gi;

    // Date formats regexes
    // 1) DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD (e.g. 12/05/1979, 12-05-1979, 1979-05-12)
    this.numericDateRegex = /\b(?:(?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:0?[1-9]|1[012])[\/\-](?:19|20)\d{2}|(?:19|20)\d{2}[\/\-](?:0?[1-9]|1[012])[\/\-](?:0?[1-9]|[12][0-9]|3[01]))\b/g;

    // 2) Month DD, YYYY or DD Month YYYY (e.g. December 16, 1979 or 16 December 1979)
    this.namedDateRegex = /\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}|(?:0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+(?:19|20)\d{2})\b/gi;
  }

  /**
   * Validates if a date object or string represents a valid calendar DOB date (year between 1900 and current year)
   * @param {string} dateStr 
   * @returns {boolean}
   */
  isValidDobYear(dateStr) {
    if (!dateStr) return false;

    // Extract 4-digit year
    const yearMatch = dateStr.match(/\b(19\d{2}|20[0-2]\d)\b/);
    if (!yearMatch) return false;

    const year = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();
    return year >= 1920 && year <= currentYear;
  }

  /**
   * Detects DOB entities in a text unit string.
   * @param {string} text - Plain text string of structured unit
   * @returns {Array<Object>} List of candidate entity matches
   */
  detect(text) {
    if (!text || typeof text !== 'string' || text.length < 8) {
      return [];
    }

    const matches = [];
    const seenSpans = new Set();

    // Scan for all explicit DOB context keywords in text
    let prefixMatch;
    this.dobPrefixRegex.lastIndex = 0;

    while ((prefixMatch = this.dobPrefixRegex.exec(text)) !== null) {
      const prefixEndIndex = prefixMatch.index + prefixMatch[0].length;

      // Look in immediate 30-char window after DOB label for date candidate
      const searchWindow = text.substring(prefixEndIndex, prefixEndIndex + 35);

      // Try numeric date regex match in window
      let dateMatch = searchWindow.match(/(?:(?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:0?[1-9]|1[012])[\/\-](?:19|20)\d{2}|(?:19|20)\d{2}[\/\-](?:0?[1-9]|1[012])[\/\-](?:0?[1-9]|[12][0-9]|3[01]))/);

      // If not numeric date, try named month date regex match in window
      if (!dateMatch) {
        dateMatch = searchWindow.match(/(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}|(?:0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+(?:19|20)\d{2})/i);
      }

      if (dateMatch) {
        const dateStr = dateMatch[0].trim();
        const relativeOffset = searchWindow.indexOf(dateStr);
        const start = prefixEndIndex + relativeOffset;
        const end = start + dateStr.length;
        const spanKey = `${start}-${end}`;

        if (this.isValidDobYear(dateStr) && !seenSpans.has(spanKey)) {
          // Verify invariant: unitText.substring(start, end) === dateStr
          if (text.substring(start, end) === dateStr) {
            seenSpans.add(spanKey);
            matches.push({
              type: this.type,
              text: dateStr,
              start,
              end,
              confidence: 0.95,
              detector: 'dob'
            });
          }
        }
      }
    }

    return matches;
  }
}

module.exports = new DobDetector();
