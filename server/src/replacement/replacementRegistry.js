const personGenerator = require('./generators/personGenerator');
const emailGenerator = require('./generators/emailGenerator');
const phoneGenerator = require('./generators/phoneGenerator');
const organizationGenerator = require('./generators/organizationGenerator');
const addressGenerator = require('./generators/addressGenerator');
const dobGenerator = require('./generators/dobGenerator');
const ssnGenerator = require('./generators/ssnGenerator');
const creditCardGenerator = require('./generators/creditCardGenerator');
const ipGenerator = require('./generators/ipGenerator');

/**
 * Synthetic Replacement Registry
 * Manages bidirectional mappings between canonical entity identities (canonicalKey) and synthetic replacements.
 * Enforces strict 1-to-1 consistency (same entity receives identical replacement across all occurrences)
 * and collision prevention (different canonical entities receive distinct synthetic replacements).
 */
class ReplacementRegistry {
  constructor() {
    this.canonicalMap = new Map(); // canonicalKey -> replacement
    this.reverseMap = new Map();   // replacement -> canonicalKey
    this.generatorCounters = {};   // type -> counter integer

    this.generators = {
      PERSON: personGenerator,
      EMAIL: emailGenerator,
      PHONE: phoneGenerator,
      ORGANIZATION: organizationGenerator,
      ADDRESS: addressGenerator,
      DOB: dobGenerator,
      SSN: ssnGenerator,
      CREDIT_CARD: creditCardGenerator,
      IP_ADDRESS: ipGenerator
    };
  }

  /**
   * Resets registry state for a new document processing run
   */
  reset() {
    this.canonicalMap.clear();
    this.reverseMap.clear();
    this.generatorCounters = {};
  }

  /**
   * Retrieves an existing synthetic replacement or generates a new non-colliding replacement
   * @param {string} canonicalKey - e.g. "organization:ksh international limited"
   * @param {Object} entity - PII Entity object ({ type, text, start, end })
   * @returns {Object} { canonicalKey, replacement, isReused }
   */
  getOrCreateReplacement(canonicalKey, entity) {
    if (!canonicalKey || !entity || !entity.type) {
      throw new Error('[ReplacementRegistry Error] Invalid canonicalKey or entity object');
    }

    // 1. Mandatory Consistency: Reuse existing replacement if canonicalKey exists
    if (this.canonicalMap.has(canonicalKey)) {
      return {
        canonicalKey,
        replacement: this.canonicalMap.get(canonicalKey),
        isReused: true
      };
    }

    // 2. Retrieve type-specific synthetic generator
    const generator = this.generators[entity.type];
    if (!generator) {
      throw new Error(`[ReplacementRegistry Error] No generator registered for type '${entity.type}'`);
    }

    // Initialize generator index counter for this type if missing
    if (this.generatorCounters[entity.type] === undefined) {
      this.generatorCounters[entity.type] = 0;
    }

    let candidateReplacement = '';
    let attempts = 0;
    const maxAttempts = 100;

    // 3. Collision Prevention Loop: Generate until candidate is not in reverseMap
    while (attempts < maxAttempts) {
      const currentIndex = this.generatorCounters[entity.type]++;
      candidateReplacement = generator.generate(entity, currentIndex);

      // Verify that candidate replacement does not collide with another canonical entity
      // AND does not equal original text
      if (!this.reverseMap.has(candidateReplacement) && candidateReplacement !== entity.text) {
        break;
      }
      attempts++;
    }

    // 4. Store bidirectional mappings in Registry
    this.canonicalMap.set(canonicalKey, candidateReplacement);
    this.reverseMap.set(candidateReplacement, canonicalKey);

    return {
      canonicalKey,
      replacement: candidateReplacement,
      isReused: false
    };
  }

  /**
   * Returns current registry statistics
   * @returns {Object} { canonicalCount, replacementCount }
   */
  getStats() {
    return {
      canonicalCount: this.canonicalMap.size,
      replacementCount: this.reverseMap.size
    };
  }
}

module.exports = ReplacementRegistry;
