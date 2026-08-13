/**
 * Masking Utilities
 * Provides safe string masking for sensitive PII text values in reports and logs.
 */

/**
 * Masks a person name (e.g. "Sarthak Malvadkar" -> "S****** M********")
 * @param {string} name 
 * @returns {string} Masked name
 */
function maskPerson(name) {
  if (!name || typeof name !== 'string') return '***';
  return name.split(' ').map(part => {
    if (part.length <= 1) return part;
    return part[0] + '*'.repeat(part.length - 1);
  }).join(' ');
}

/**
 * Masks an email address (e.g. "cs.connect@kshinternational.com" -> "c*********@k****************.com")
 * @param {string} email 
 * @returns {string} Masked email
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***@***.com';
  const [user, domain] = email.split('@');
  const maskedUser = user.length <= 1 ? user : user[0] + '*'.repeat(user.length - 1);
  const parts = domain.split('.');
  const maskedDomain = parts.map((p, i) => i === parts.length - 1 ? p : p[0] + '*'.repeat(p.length - 1)).join('.');
  return `${maskedUser}@${maskedDomain}`;
}

/**
 * Masks a phone number (e.g. "+91 20 4505 3237" -> "+91 **********3237")
 * @param {string} phone 
 * @returns {string} Masked phone
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '***-***-****';
  const clean = phone.trim();
  if (clean.length <= 6) return '*'.repeat(clean.length);
  return clean.slice(0, 3) + ' ' + '*'.repeat(clean.length - 7) + clean.slice(-4);
}

/**
 * General PII text masking helper
 * @param {string} text 
 * @param {string} [type] 
 * @returns {string} Masked string
 */
function maskPiiText(text, type) {
  if (!text || typeof text !== 'string') return '[MASKED]';
  if (type === 'PERSON') return maskPerson(text);
  if (type === 'EMAIL') return maskEmail(text);
  if (type === 'PHONE') return maskPhone(text);
  if (text.length <= 4) return '*'.repeat(text.length);
  return text[0] + '*'.repeat(text.length - 2) + text[text.length - 1];
}

module.exports = {
  maskPerson,
  maskEmail,
  maskPhone,
  maskPiiText
};
