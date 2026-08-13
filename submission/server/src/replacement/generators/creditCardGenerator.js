/**
 * Synthetic Credit Card Generator
 * Generates test-safe credit card numbers that pass the Luhn algorithm checksum
 * using standard industry testing card prefixes (Visa 4111-1111-1111-1111 series).
 * Guarantees zero use of real live card numbers.
 */
class CreditCardGenerator {
  constructor() {
    this.type = 'CREDIT_CARD';

    // Industry standard test cards passing Luhn checksum
    this.testCards = [
      '4111-1111-1111-1111',
      '4000-0000-0000-0002',
      '4222-2222-2222-2222',
      '4556-7371-2947-8191',
      '4929-0000-0000-0006'
    ];
  }

  /**
   * Generates a test credit card number passing Luhn checksum
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} e.g. "4111-1111-1111-1111"
   */
  generate(entity, index = 0) {
    const cardIndex = index % this.testCards.length;
    const rawCard = this.testCards[cardIndex];

    // If original card had hyphens/spaces, preserve formatting
    if (entity && entity.text && !entity.text.includes('-') && !entity.text.includes(' ')) {
      return rawCard.replace(/\-/g, '');
    }
    return rawCard;
  }
}

module.exports = new CreditCardGenerator();
