/**
 * Gold-Standard Annotation Policy & Guidelines
 * Establishes strict rules for annotating ground-truth PII across all 9 supported entity categories.
 */

const ANNOTATION_POLICY = {
  policyVersion: '1.0',
  matchingMode: 'exact-span-and-type',
  supportedTypes: [
    'PERSON',
    'EMAIL',
    'PHONE',
    'ORGANIZATION',
    'ADDRESS',
    'DOB',
    'SSN',
    'CREDIT_CARD',
    'IP_ADDRESS'
  ],
  guidelines: {
    PERSON: {
      description: 'Annotate the complete person name. Exclude honorifics, titles, and job roles unless part of name.',
      examples: ['Sarthak Malvadkar', 'Arjun Mehta'],
      antiExamples: ['Mr. Sarthak Malvadkar', 'Chief Financial Officer', 'Board of Directors']
    },
    EMAIL: {
      description: 'Annotate complete email address including domain.',
      examples: ['cs.connect@kshinternational.com', 'john@example.com'],
      antiExamples: ['cs.connect@', 'kshinternational.com']
    },
    PHONE: {
      description: 'Annotate complete phone number including country code and area codes if present.',
      examples: ['+91 20 4505 3237', '+91 9876543210'],
      antiExamples: ['+91', '20 4505']
    },
    ORGANIZATION: {
      description: 'Annotate complete company/legal entity name. Exclude statutory/regulatory bodies per evaluation policy.',
      examples: ['KSH International Limited', 'Nuvama Wealth Management Limited'],
      antiExamples: ['SEBI', 'BSE', 'Reserve Bank of India', 'Companies Act']
    },
    ADDRESS: {
      description: 'Annotate smallest complete physical/mailing address span. Exclude context labels.',
      examples: ['11/3, Village Birdewadi, Chakan, Pune - 410501'],
      antiExamples: ['Registered Office: 11/3, Village Birdewadi', 'Corporate Office:']
    },
    DOB: {
      description: 'Annotate the actual birth date value establishing DOB context.',
      examples: ['12/05/1979', '1985-04-12'],
      antiExamples: ['Date of Birth: 12/05/1979', 'FY 2024-25']
    },
    SSN: {
      description: 'Annotate complete 9-digit Social Security Number.',
      examples: ['900-01-0001', '123-45-6789'],
      antiExamples: ['900-01']
    },
    CREDIT_CARD: {
      description: 'Annotate complete 13 to 19-digit credit card number.',
      examples: ['4111-1111-1111-1111'],
      antiExamples: ['4111']
    },
    IP_ADDRESS: {
      description: 'Annotate complete IPv4 address.',
      examples: ['192.0.2.1', '192.168.1.10'],
      antiExamples: ['192.0']
    }
  }
};

/**
 * Validates if an entity type is supported by the annotation policy
 * @param {string} type 
 * @returns {boolean}
 */
function isSupportedType(type) {
  return ANNOTATION_POLICY.supportedTypes.includes(type);
}

module.exports = {
  ANNOTATION_POLICY,
  isSupportedType
};
