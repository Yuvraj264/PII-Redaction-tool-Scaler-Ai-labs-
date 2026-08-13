/**
 * Email PII Detector
 * Detects email address candidates using standard RFC-compliant pattern rules
 * and strips trailing punctuation (periods, commas, semicolons, colons).
 */
class EmailDetector {
  constructor() {
    this.type = 'EMAIL';
    this.detectorName = 'email';
    // Practical email regex pattern matching standard email formats
    this.pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  }

  /**
   * Detects email entities within a raw text string.
   * @param {string} text - Raw input text
   * @returns {Array<Object>} List of email entities
   */
  detect(text) {
    if (!text || typeof text !== 'string') return [];

    const entities = [];
    let match;

    // Reset regex state
    this.pattern.lastIndex = 0;

    while ((match = this.pattern.exec(text)) !== null) {
      let rawMatch = match[0];
      let rawStart = match.index;
      let rawEnd = rawStart + rawMatch.length;

      // Strip trailing punctuation if accidentally captured
      let cleanMatch = rawMatch.replace(/[.,;:!?]+$/, '');
      let cleanEnd = rawStart + cleanMatch.length;

      if (cleanMatch.length > 0) {
        const entityText = text.substring(rawStart, cleanEnd);

        entities.push({
          type: this.type,
          text: entityText,
          start: rawStart,
          end: cleanEnd,
          confidence: 1.0,
          detector: this.detectorName
        });
      }
    }

    return entities;
  }
}

module.exports = new EmailDetector();
