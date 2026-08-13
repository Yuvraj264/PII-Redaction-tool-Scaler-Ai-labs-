/**
 * Organization / Company Allowlist
 * Configurable list of regulatory bodies, stock exchanges, government ministries,
 * statutory authorities, generic corporate boards, and legal acts that should NOT
 * be classified or redacted as private Company/Organization PII.
 */

const ORGANIZATION_ALLOWLIST = new Set([
  // Securities & Regulatory Bodies
  'SEBI',
  'SECURITIES AND EXCHANGE BOARD OF INDIA',
  'RBI',
  'RESERVE BANK OF INDIA',
  'IRDAI',
  'INSURANCE REGULATORY AND DEVELOPMENT AUTHORITY OF INDIA',
  'PFRDA',
  'PENSION FUND REGULATORY AND DEVELOPMENT AUTHORITY',
  'CCI',
  'COMPETITION COMMISSION OF INDIA',

  // Stock Exchanges
  'NSE',
  'NATIONAL STOCK EXCHANGE OF INDIA LIMITED',
  'NATIONAL STOCK EXCHANGE OF INDIA LTD',
  'NATIONAL STOCK EXCHANGE OF INDIA',
  'NATIONAL STOCK EXCHANGE',
  'BSE',
  'BSE LIMITED',
  'BSE LTD',
  'BOMBAY STOCK EXCHANGE',
  'MCX',
  'METROPOLITAN STOCK EXCHANGE',

  // Government & Statutory Authorities
  'GOVERNMENT OF INDIA',
  'GOVERNMENT OF MAHARASHTRA',
  'GOVERNMENT',
  'MINISTRY OF CORPORATE AFFAIRS',
  'MINISTRY OF FINANCE',
  'MINISTRY OF COMMERCE AND INDUSTRY',
  'MINISTRY',
  'INCOME TAX DEPARTMENT',
  'REGISTRAR OF COMPANIES',
  'ROC',
  'CENTRAL BOARD OF DIRECT TAXES',
  'CBDT',
  'HIGH COURT',
  'SUPREME COURT',
  'DISTRICT COURT',

  // Acts & Legal Regulations
  'COMPANIES ACT',
  'COMPANIES ACT, 2013',
  'COMPANIES ACT, 1956',
  'SEBI ICDR REGULATIONS',
  'SEBI LODR REGULATIONS',
  'INCOME TAX ACT',
  'INCOME TAX ACT, 1961',

  // Generic Governance & Committee References
  'BOARD OF DIRECTORS',
  'AUDIT COMMITTEE',
  'NOMINATION AND REMUNERATION COMMITTEE',
  'STAKEHOLDERS RELATIONSHIP COMMITTEE',
  'RISK MANAGEMENT COMMITTEE',
  'EXECUTIVE COMMITTEE',
  'CORPORATE SOCIAL RESPONSIBILITY COMMITTEE',
  'MANAGEMENT TEAM',
  'SENIOR MANAGEMENT'
]);

/**
 * Checks if a given text candidate is contained within the organization allowlist.
 * Case-insensitive comparison.
 * @param {string} text 
 * @returns {boolean} True if allowlisted (should be excluded from PII)
 */
function isAllowlistedOrganization(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = text.trim().toUpperCase();
  if (ORGANIZATION_ALLOWLIST.has(normalized)) return true;

  // Check if string starts with or matches key regulatory phrases
  for (const entry of ORGANIZATION_ALLOWLIST) {
    if (normalized === entry) return true;
  }
  return false;
}

module.exports = {
  ORGANIZATION_ALLOWLIST,
  isAllowlistedOrganization
};
