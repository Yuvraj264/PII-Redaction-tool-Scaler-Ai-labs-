const nlp = require('compromise');
const { isAllowlistedOrganization } = require('../config/organizationAllowlist');

/**
 * Organization / Company Entity Detector
 * Detects private company and corporate organization names (e.g. KSH International Limited,
 * Nuvama Wealth Management Limited, ICICI Securities Limited) using corporate suffix pattern matchers,
 * NLP named entity extraction, and strict allowlist filtering against regulatory and generic bodies.
 */
class OrganizationDetector {
  constructor() {
    this.type = 'ORGANIZATION';

    // Corporate suffix pattern matching capitalized company name tokens
    this.suffixRegex = /\b((?:[A-Z0-9][A-Za-z0-9&',.\-]*|and|of|&)(?:\s+(?:[A-Z0-9][A-Za-z0-9&',.\-]*|and|of|&)){0,7}\s+(?:Private\s+Limited|Pvt\.\s*Ltd\.|Pvt\s+Ltd|Limited|Ltd\.|LLP|Corporation|Corp\.|Inc\.|Industries|Technologies|Bank|Trust|Holdings|Securities|Capital|Services|Advisory|Management))\b/g;

    // Words to reject if candidate is just a leading preposition or article
    this.rejectLeadingWords = new Set([
      'BY', 'FOR', 'WITH', 'IN', 'ON', 'AT', 'TO', 'OF', 'AND', 'OR', 'THE', 'A', 'AN',
      'SECTION', 'TABLE', 'CHAPTER', 'ANNEXURE', 'SCHEDULE', 'ACT'
    ]);
  }

  /**
   * Validates if candidate is a legitimate company name
   * @param {string} candidate 
   * @returns {boolean}
   */
  isValidCompanyCandidate(candidate) {
    if (!candidate || candidate.length < 3) return false;

    const trimmed = candidate.trim();
    if (isAllowlistedOrganization(trimmed)) {
      return false;
    }

    // Must not be pure numbers or punctuation
    if (!/[A-Za-z]/.test(trimmed)) return false;

    // Check words count
    const words = trimmed.split(/\s+/);
    if (words.length < 1) return false;

    return true;
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
   * Detects ORGANIZATION entities in a text unit string.
   * @param {string} text - Plain text string of structured unit
   * @returns {Array<Object>} List of candidate entity matches
   */
  detect(text) {
    if (!text || typeof text !== 'string' || text.length < 3) {
      return [];
    }

    const rawMatches = [];

    // Strategy 1: Corporate Suffix Matching
    let suffixMatch;
    this.suffixRegex.lastIndex = 0; // Reset regex state

    while ((suffixMatch = this.suffixRegex.exec(text)) !== null) {
      let candText = suffixMatch[1].trim();
      let start = suffixMatch.index + suffixMatch[0].indexOf(candText);

      // Clean leading articles/prepositions if unnecessary (e.g. "for KSH International Limited" -> "KSH International Limited")
      const words = candText.split(/\s+/);
      if (words.length > 2 && this.rejectLeadingWords.has(words[0].toUpperCase())) {
        const dropWord = words[0];
        const dropLen = dropWord.length + 1;
        candText = candText.substring(dropLen).trim();
        start += dropLen;
      }

      let end = start + candText.length;

      // Strip trailing sentence punctuation (e.g. "KSH International Limited." -> "KSH International Limited")
      if (/[\s,.;:-]+$/.test(candText)) {
        candText = candText.replace(/[\s,.;:-]+$/, '');
        end = start + candText.length;
      }

      // Trim surrounding quotation marks (e.g. “KSH International Limited” -> KSH International Limited)
      while (/^[“"‘'«„\s]/.test(candText)) {
        candText = candText.substring(1);
        start++;
      }
      while (/[”"’'»\s]$/.test(candText)) {
        candText = candText.substring(0, candText.length - 1);
      }
      end = start + candText.length;

      if (this.isValidCompanyCandidate(candText)) {
        // Verify invariant
        if (text.substring(start, end) === candText) {
          rawMatches.push({
            type: this.type,
            text: candText,
            start,
            end,
            confidence: 0.95,
            detector: 'organization'
          });
        }
      }
    }

    // Strategy 2: NLP extraction via compromise
    try {
      const doc = nlp(text);
      const orgs = doc.organizations().out('array');

      for (const orgStr of orgs) {
        if (!orgStr || orgStr.length < 3) continue;
        let cleanOrg = orgStr.replace(/[\s,.;:-]+$/, '').trim();
        cleanOrg = cleanOrg.replace(/^[“"‘'«„\s]+|[”"’'»\s]+$/g, '');

        if (!this.isValidCompanyCandidate(cleanOrg)) {
          continue;
        }

        let searchIndex = 0;
        while (searchIndex < text.length) {
          const idx = text.indexOf(cleanOrg, searchIndex);
          if (idx === -1) break;

          const start = idx;
          const end = idx + cleanOrg.length;

          // Word boundary check
          const charBefore = start > 0 ? text[start - 1] : ' ';
          const charAfter = end < text.length ? text[end] : ' ';

          if (!/[A-Za-z0-9]/.test(charBefore) && !/[A-Za-z0-9]/.test(charAfter)) {
            if (text.substring(start, end) === cleanOrg) {
              rawMatches.push({
                type: this.type,
                text: cleanOrg,
                start,
                end,
                confidence: 0.85,
                detector: 'organization'
              });
            }
          }

          searchIndex = idx + Math.max(1, cleanOrg.length);
        }
      }
    } catch (err) {
      // NLP error fallback
    }

    return this.resolveInternalOverlaps(rawMatches);
  }
}

module.exports = new OrganizationDetector();
