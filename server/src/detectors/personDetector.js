const nlp = require('compromise');
const { getSurroundingContext, hasPersonTitleOrRole } = require('../utils/contextUtils');
const { isAllowlistedOrganization } = require('../config/organizationAllowlist');

/**
 * Person Entity Detector
 * Detects human names (e.g. Sarthak Malvadkar, Kushal Subbayya Hegde, Sandesh Bhagwat)
 * using local NLP candidate extraction combined with strict false-positive filtering rules
 * and context signals (titles, roles, honorifics).
 */
class PersonDetector {
  constructor() {
    this.type = 'PERSON';

    // Words that indicate non-person entities (organizations, legal terms, sections, financial items)
    this.nonPersonKeywords = new Set([
      'LIMITED', 'LTD', 'PVT', 'PRIVATE', 'LLP', 'INC', 'CORP', 'CORPORATION',
      'BANK', 'TRUST', 'FOUNDATION', 'HOLDINGS', 'SECURITIES', 'CAPITAL', 'SERVICES',
      'ADVISORY', 'MANAGEMENT', 'INDUSTRIES', 'TECHNOLOGIES', 'INTERNATIONAL',
      'BOARD', 'DIRECTORS', 'COMMITTEE', 'STATEMENT', 'SECTION', 'TABLE', 'CHAPTER',
      'ACT', 'REGULATIONS', 'CLAUSE', 'SCHEDULE', 'ANNEXURE', 'EQUITY', 'SHARES',
      'RUPEES', 'RS.', 'RS', 'OFFICE', 'REGISTERED', 'CORPORATE', 'STREET', 'ROAD',
      'BUILDING', 'TOWER', 'VILLAGE', 'TALUKA', 'DISTRICT', 'CITY', 'STATE', 'INDIA',
      'MAHARASHTRA', 'PUNE', 'MUMBAI', 'SEBI', 'BSE', 'NSE', 'RBI', 'SUMMARY',
      'NOTICE', 'PROSPECTUS', 'REPORT', 'AUDIT', 'FINANCIAL', 'FISCAL', 'YEAR'
    ]);

    // Known common non-person phrases in prospectuses
    this.excludedPhrases = new Set([
      'BOARD OF DIRECTORS',
      'AUDIT COMMITTEE',
      'NOMINATION AND REMUNERATION COMMITTEE',
      'STAKEHOLDERS RELATIONSHIP COMMITTEE',
      'CHIEF EXECUTIVE OFFICER',
      'CHIEF FINANCIAL OFFICER',
      'COMPANY SECRETARY',
      'COMPLIANCE OFFICER',
      'MANAGING DIRECTOR',
      'INDEPENDENT DIRECTOR',
      'EXECUTIVE DIRECTOR',
      'WHOLE-TIME DIRECTOR',
      'PROMOTER GROUP',
      'KEY MANAGERIAL PERSONNEL',
      'REGISTERED OFFICE',
      'CORPORATE OFFICE',
      'STATUTORY AUDITOR',
      'EQUITY SHARES',
      'FACE VALUE'
    ]);

    // Common Title-case name pattern (2 to 4 capitalized words)
    this.capitalizedNameRegex = /\b([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,3})\b/g;

    // Honorifics pattern
    this.honorificRegex = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Shri|Smt\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
  }

  /**
   * Helper to check if a string contains any non-person keywords
   * @param {string} text 
   * @returns {boolean}
   */
  isNonPerson(text) {
    if (!text) return true;
    const upper = text.toUpperCase().trim();

    if (this.excludedPhrases.has(upper)) return true;
    if (isAllowlistedOrganization(upper)) return true;

    const words = upper.split(/[\s,.-]+/);
    for (const w of words) {
      if (this.nonPersonKeywords.has(w)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validates if tokens resemble a valid human name structure.
   * @param {string} candidate 
   * @returns {boolean}
   */
  isValidNameStructure(candidate) {
    if (!candidate || candidate.length < 3) return false;

    // Must not contain digits or special characters
    if (/[0-9@#$%^&*()_+={}\[\]\\|:;"'<>?/]/.test(candidate)) {
      return false;
    }

    const words = candidate.trim().split(/\s+/);

    if (words.length === 1) {
      const word = words[0];
      return /^[A-Z][a-z]{2,}$/.test(word) && !this.isNonPerson(word);
    }

    for (const w of words) {
      const cleanW = w.replace(/\.$/, '');
      if (!cleanW) continue;
      if (!/^[A-Z][A-Za-z\-]*$/.test(cleanW)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Resolves internal overlapping matches
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
   * Detects PERSON entities in a text unit string.
   * @param {string} text - Plain text string of structured unit
   * @returns {Array<Object>} List of candidate entity matches
   */
  detect(text) {
    if (!text || typeof text !== 'string' || text.length < 3) {
      return [];
    }

    const rawMatches = [];

    // Strategy 1: NLP named entity extraction via compromise
    try {
      const doc = nlp(text);
      const people = doc.people().out('array');

      for (const nameStr of people) {
        if (!nameStr || nameStr.length < 3) continue;
        const cleanName = nameStr.trim();

        if (this.isNonPerson(cleanName) || !this.isValidNameStructure(cleanName)) {
          continue;
        }

        let searchIndex = 0;
        while (searchIndex < text.length) {
          const idx = text.indexOf(cleanName, searchIndex);
          if (idx === -1) break;

          const start = idx;
          const end = idx + cleanName.length;

          const charBefore = start > 0 ? text[start - 1] : ' ';
          const charAfter = end < text.length ? text[end] : ' ';

          if (!/[A-Za-z0-9]/.test(charBefore) && !/[A-Za-z0-9]/.test(charAfter)) {
            const context = getSurroundingContext(text, start, end, 50);
            const hasRoleOrTitle = hasPersonTitleOrRole(context.beforeText);
            const confidence = hasRoleOrTitle ? 0.95 : 0.85;

            rawMatches.push({
              type: this.type,
              text: cleanName,
              start,
              end,
              confidence,
              detector: 'person'
            });
          }

          searchIndex = idx + Math.max(1, cleanName.length);
        }
      }
    } catch (err) {
      // Fallback
    }

    // Strategy 2: Honorific Match (e.g. Mr. Kushal Subbayya Hegde)
    let honMatch;
    this.honorificRegex.lastIndex = 0;

    while ((honMatch = this.honorificRegex.exec(text)) !== null) {
      const fullName = honMatch[0].trim();
      const start = honMatch.index;
      const end = start + fullName.length;

      if (!this.isNonPerson(honMatch[1])) {
        if (text.substring(start, end) === fullName) {
          rawMatches.push({
            type: this.type,
            text: fullName,
            start,
            end,
            confidence: 0.95,
            detector: 'person'
          });
        }
      }
    }

    // Strategy 3: Capitalized Full Name candidate matching with contextual role checks
    let capMatch;
    this.capitalizedNameRegex.lastIndex = 0;

    while ((capMatch = this.capitalizedNameRegex.exec(text)) !== null) {
      const candName = capMatch[1].trim();
      const start = capMatch.index;
      const end = start + candName.length;

      if (this.isValidNameStructure(candName) && !this.isNonPerson(candName)) {
        const context = getSurroundingContext(text, start, end, 50);
        const hasRole = hasPersonTitleOrRole(context.beforeText) || hasPersonTitleOrRole(context.afterText);

        // If context has a title/role OR candidate has 2+ words (first & last name)
        const wordCount = candName.split(/\s+/).length;
        if (hasRole || wordCount >= 2) {
          const confidence = hasRole ? 0.95 : 0.85;
          if (text.substring(start, end) === candName) {
            rawMatches.push({
              type: this.type,
              text: candName,
              start,
              end,
              confidence,
              detector: 'person'
            });
          }
        }
      }
    }

    return this.resolveInternalOverlaps(rawMatches);
  }
}

module.exports = new PersonDetector();
