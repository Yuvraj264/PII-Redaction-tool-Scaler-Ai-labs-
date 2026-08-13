const piiDetectionService = require('../services/piiDetectionService');
const piiNormalizationService = require('../services/piiNormalizationService');
const ReplacementRegistry = require('./replacementRegistry');

/**
 * Replacement Service
 * Builds a structured, read-only Replacement Plan mapping detected PII entities to synthetic replacements.
 * Orders replacements within text units by descending start offset to prepare for safe downstream in-place text substitution.
 */
class ReplacementService {
  /**
   * Generates a deterministic Replacement Plan for an ingested document
   * @param {string} documentId - Document identifier
   * @returns {Object} Structured Replacement Plan
   */
  async generateReplacementPlan(documentId) {
    // 1. Run detection pipeline to retrieve validated PII entities
    const detectionResult = await piiDetectionService.detectPiiInDocument(documentId);
    const entities = detectionResult.entities || [];

    // 2. Instantiate isolated registry for this document run
    const registry = new ReplacementRegistry();

    // Group replacement items by text unit ID
    const unitPlansMap = new Map();

    entities.forEach(entity => {
      // Derive canonical key
      const canonicalKey = piiNormalizationService.getCanonicalKey(entity.type, entity.text);

      // Obtain synthetic replacement from registry
      const regResult = registry.getOrCreateReplacement(canonicalKey, entity);

      const unitId = entity.source.unitId;
      if (!unitPlansMap.has(unitId)) {
        unitPlansMap.set(unitId, {
          unitId,
          unitType: entity.source.unitType,
          location: entity.source.location,
          replacements: []
        });
      }

      const unitPlan = unitPlansMap.get(unitId);

      const originalLength = entity.end - entity.start;
      const replacementLength = regResult.replacement.length;
      const lengthDelta = replacementLength - originalLength;

      unitPlan.replacements.push({
        entityId: entity.id,
        type: entity.type,
        canonicalKey,
        original: entity.text,
        replacement: regResult.replacement,
        start: entity.start,
        end: entity.end,
        originalLength,
        replacementLength,
        lengthDelta,
        confidence: entity.confidence,
        detector: entity.detector
      });
    });

    // 3. Sort replacements within each unit plan by START DESCENDING
    // Order from end-of-string to beginning ensures downstream in-place substitution maintains earlier offsets
    const sortedUnitPlans = [];

    unitPlansMap.forEach(plan => {
      plan.replacements.sort((a, b) => b.start - a.start);
      sortedUnitPlans.push(plan);
    });

    const registryStats = registry.getStats();

    return {
      documentId,
      sourceFile: detectionResult.sourceFile,
      summary: {
        totalEntitiesCount: entities.length,
        canonicalEntitiesCount: registryStats.canonicalCount,
        replacementCount: registryStats.replacementCount,
        unitPlansCount: sortedUnitPlans.length
      },
      unitPlans: sortedUnitPlans
    };
  }
}

module.exports = new ReplacementService();
