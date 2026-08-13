/**
 * Context Utility Helpers
 * Provides reusable functions for extracting context windows around candidate entities,
 * analyzing preceding/following text signals, and checking role/title indicators.
 */

/**
 * Extracts preceding and following context windows around a target character span.
 * @param {string} text - Full text string
 * @param {number} start - Match start offset
 * @param {number} end - Match end offset
 * @param {number} windowSize - Number of characters to inspect before and after (default 40)
 * @returns {Object} { beforeText, afterText, fullContext }
 */
function getSurroundingContext(text, start, end, windowSize = 40) {
  if (typeof text !== 'string') {
    return { beforeText: '', afterText: '', fullContext: '' };
  }

  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(text.length, end);

  const beforeStart = Math.max(0, safeStart - windowSize);
  const afterEnd = Math.min(text.length, safeEnd + windowSize);

  const beforeText = text.substring(beforeStart, safeStart);
  const afterText = text.substring(safeEnd, afterEnd);
  const targetText = text.substring(safeStart, safeEnd);

  return {
    beforeText,
    afterText,
    targetText,
    fullContext: `${beforeText}${targetText}${afterText}`
  };
}

/**
 * Checks if a context string contains any of the target keywords (case-insensitive)
 * @param {string} contextText 
 * @param {Array<string>} keywords 
 * @returns {boolean}
 */
function hasMatchingContextKeyword(contextText, keywords) {
  if (!contextText || !Array.isArray(keywords) || keywords.length === 0) return false;
  const lowerContext = contextText.toLowerCase();
  return keywords.some(kw => lowerContext.includes(kw.toLowerCase()));
}

/**
 * Honorifics and Person Titles
 */
const PERSON_TITLES = [
  'mr.', 'mr', 'mrs.', 'mrs', 'ms.', 'ms', 'dr.', 'dr', 'prof.', 'prof',
  'shri', 'smt.', 'smt', 'kumari'
];

/**
 * Professional Roles and Executive Context Keywords
 */
const PERSON_ROLES = [
  'contact person', 'promoter', 'director', 'chairman', 'chairperson',
  'chief executive officer', 'ceo', 'chief financial officer', 'cfo',
  'company secretary', 'compliance officer', 'managing director',
  'joint managing director', 'independent director', 'whole-time director',
  'executive director', 'non-executive director', 'key managerial personnel',
  'manager', 'auditor', 'partner', 'designated partner', 'advocate', 'solicitor',
  'signatory', 'authorised signatory', 'authorized signatory', 'trustee',
  'being', 'named', 'appointed as', 'person'
];

/**
 * Checks if preceding context contains a person title or professional role keyword
 * @param {string} beforeText 
 * @returns {boolean}
 */
function hasPersonTitleOrRole(beforeText) {
  if (!beforeText) return false;
  const lower = beforeText.toLowerCase();
  
  // Check honorifics (e.g., "Mr.", "Smt.", "Dr.")
  for (const title of PERSON_TITLES) {
    if (lower.endsWith(title) || lower.includes(`${title} `)) {
      return true;
    }
  }

  // Check roles (e.g., "Company Secretary", "Director")
  for (const role of PERSON_ROLES) {
    if (lower.includes(role)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  getSurroundingContext,
  hasMatchingContextKeyword,
  PERSON_TITLES,
  PERSON_ROLES,
  hasPersonTitleOrRole
};
