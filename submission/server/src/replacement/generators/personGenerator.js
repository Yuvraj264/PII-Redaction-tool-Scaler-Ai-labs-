/**
 * Synthetic Person Generator
 * Generates realistic synthetic human names from a deterministic candidate pool.
 * Does NOT use real names from source documents.
 */
class PersonGenerator {
  constructor() {
    this.type = 'PERSON';

    this.firstNames = [
      'Arjun', 'Riya', 'Vikram', 'Neha', 'Ananya', 'Rohan', 'Aditya', 'Pooja',
      'Siddharth', 'Kavya', 'Varun', 'Meera', 'Karan', 'Ishita', 'Dev', 'Tanvi',
      'Manish', 'Shreya', 'Tarun', 'Deepa', 'Alok', 'Swati', 'Rajesh', 'Priya'
    ];

    this.lastNames = [
      'Mehta', 'Sharma', 'Kapoor', 'Verma', 'Iyer', 'Deshmukh', 'Joshi', 'Nair',
      'Singhania', 'Bhat', 'Patel', 'Rao', 'Gupta', 'Reddy', 'Chawla', 'Sen',
      'Kulkarni', 'Menon', 'Trivedi', 'Aggarwal', 'Saxena', 'Pandey', 'Mukherjee'
    ];
  }

  /**
   * Generates a synthetic person name candidate based on index or random hash
   * @param {Object} entity 
   * @param {number} index 
   * @returns {string} Synthetic Person Name e.g. "Arjun Mehta"
   */
  generate(entity, index = 0) {
    // Preserve honorific prefix if original text started with one (e.g. "Mr.", "Mrs.", "Dr.")
    let prefix = '';
    if (entity && typeof entity.text === 'string') {
      const match = entity.text.match(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Shri|Smt\.)\s+/i);
      if (match) {
        prefix = `${match[1]} `;
      }
    }

    const firstIndex = index % this.firstNames.length;
    const lastIndex = Math.floor(index / this.firstNames.length) % this.lastNames.length;

    const firstName = this.firstNames[firstIndex];
    const lastName = this.lastNames[lastIndex];

    return `${prefix}${firstName} ${lastName}`;
  }
}

module.exports = new PersonGenerator();
