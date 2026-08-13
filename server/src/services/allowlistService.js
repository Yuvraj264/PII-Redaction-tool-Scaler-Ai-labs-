const { isAllowlistedOrganization } = require('../config/organizationAllowlist');

/**
 * Allowlist Service
 * Centralized service for querying configurable allowlists across entity types
 * to prevent generic statutory, regulatory, or legal terms from being classified as PII.
 */
class AllowlistService {
  constructor() {
    // Additional generic non-PII terms by entity type
    this.genericAllowlist = {
      PERSON: new Set([
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
        'PROMOTER GROUP',
        'KEY MANAGERIAL PERSONNEL'
      ]),
      ORGANIZATION: new Set([
        'BOARD OF DIRECTORS',
        'AUDIT COMMITTEE',
        'NOMINATION AND REMUNERATION COMMITTEE',
        'STAKEHOLDERS RELATIONSHIP COMMITTEE',
        'EXECUTIVE COMMITTEE',
        'MANAGEMENT TEAM'
      ]),
      ADDRESS: new Set([
        'MUMBAI',
        'PUNE',
        'MAHARASHTRA',
        'INDIA',
        'DELHI',
        'BENGALURU'
      ]),
      DOB: new Set([
        'FY 2024-25',
        'FY 2023-24',
        '2024-25',
        '2023-24'
      ])
    };
  }

  /**
   * Checks if a candidate text is allowlisted for a specific entity type
   * @param {string} type - Entity type (PERSON, ORGANIZATION, ADDRESS, DOB, etc.)
   * @param {string} text - Entity candidate text
   * @returns {boolean} True if candidate is allowlisted (and should be excluded/rejected)
   */
  isAllowlisted(type, text) {
    if (!text || typeof text !== 'string') return true;

    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();

    // Check organization allowlist config (SEBI, BSE, RBI, Government, Companies Act, etc.)
    if (type === 'ORGANIZATION' || type === 'PERSON') {
      if (isAllowlistedOrganization(trimmed)) {
        return true;
      }
    }

    // Check entity type specific generic set
    const typeSet = this.genericAllowlist[type];
    if (typeSet && typeSet.has(upper)) {
      return true;
    }

    return false;
  }
}

module.exports = new AllowlistService();
