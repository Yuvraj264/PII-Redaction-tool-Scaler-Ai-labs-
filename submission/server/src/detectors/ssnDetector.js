/**
 * SSN PII Detector
 * Detects US Social Security Numbers formatted as XXX-XX-XXXX with valid area, group,
 * and serial range rules, plus context-validated 9-digit unhyphenated candidates.
 */
class SsnDetector {
  constructor() {
    this.type = 'SSN';
    this.detectorName = 'ssn';
    
    // Pattern for formatted SSNs (XXX-XX-XXXX)
    this.hyphenatedPattern = /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g;
    
    // Pattern for raw 9-digit unhyphenated SSN candidates
    this.unhyphenatedPattern = /\b(?!000|666|9\d{2})\d{3}(?!00)\d{2}(?!0000)\d{4}\b/g;
  }

  /**
   * Detects SSN entities within a raw text string.
   * @param {string} text - Raw input text
   * @returns {Array<Object>} List of SSN entities
   */
  detect(text) {
    if (!text || typeof text !== 'string') return [];

    const entities = [];
    let match;

    // Detect formatted SSNs (XXX-XX-XXXX)
    this.hyphenatedPattern.lastIndex = 0;
    while ((match = this.hyphenatedPattern.exec(text)) !== null) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;
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

    // Detect unhyphenated SSNs only when explicit SSN context keyword is present
    this.unhyphenatedPattern.lastIndex = 0;
    while ((match = this.unhyphenatedPattern.exec(text)) !== null) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;
      
      const snippet = text.substring(Math.max(0, start - 30), Math.min(text.length, end + 30)).toLowerCase();
      const hasSsnContext = /\b(?:ssn|social\s*security|social\s*security\s*no|social\s*security\s*number)\b/i.test(snippet);

      if (hasSsnContext) {
        // Ensure not already captured by hyphenated pattern
        const alreadyCaptured = entities.some(e => e.start === start && e.end === end);
        if (!alreadyCaptured) {
          const entityText = text.substring(start, end);
          entities.push({
            type: this.type,
            text: entityText,
            start: start,
            end: end,
            confidence: 0.9,
            detector: this.detectorName
          });
        }
      }
    }

    return entities;
  }
}

module.exports = new SsnDetector();
