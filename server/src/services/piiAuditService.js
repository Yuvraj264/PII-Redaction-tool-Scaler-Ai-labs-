const piiNormalizationService = require('./piiNormalizationService');

/**
 * PII Detection Audit Service
 * Generates development-only diagnostic reports tracking processing statistics,
 * raw candidates generated, rejected candidates by reason, canonical duplicate occurrences,
 * and overlap resolution counts without exposing raw PII text.
 */
class PiiAuditService {
  /**
   * Generates a comprehensive detection audit report for a processed document scan
   * @param {Object} params
   * @param {string} params.documentId
   * @param {number} params.processedUnits
   * @param {Array<Object>} params.rawCandidates
   * @param {Array<Object>} params.rejectedCandidates
   * @param {Array<Object>} params.finalEntities
   * @param {number} params.overlapsResolvedCount
   * @returns {Object} Audit Report Object
   */
  generateAuditReport({
    documentId,
    processedUnits = 0,
    rawCandidates = [],
    rejectedCandidates = [],
    finalEntities = [],
    overlapsResolvedCount = 0
  }) {
    const byType = {
      EMAIL: 0,
      PHONE: 0,
      IP_ADDRESS: 0,
      SSN: 0,
      CREDIT_CARD: 0,
      PERSON: 0,
      ORGANIZATION: 0,
      ADDRESS: 0,
      DOB: 0
    };

    const byDetector = {};
    const rejectedByReason = {};
    const canonicalMap = new Map();

    // 1. Process Final Entities by Type, Detector, and Canonical Key
    let duplicateOccurrences = 0;

    finalEntities.forEach(entity => {
      // Breakdown by type
      if (byType[entity.type] !== undefined) {
        byType[entity.type]++;
      } else {
        byType[entity.type] = 1;
      }

      // Breakdown by detector
      const detectorName = entity.detector || 'unknown';
      byDetector[detectorName] = (byDetector[detectorName] || 0) + 1;

      // Canonical key grouping
      const canonicalKey = piiNormalizationService.getCanonicalKey(entity.type, entity.text);
      if (!canonicalMap.has(canonicalKey)) {
        canonicalMap.set(canonicalKey, {
          canonicalKey,
          type: entity.type,
          normalizedValue: entity.normalizedValue || piiNormalizationService.normalize(entity.type, entity.text),
          occurrenceCount: 1
        });
      } else {
        const canonicalObj = canonicalMap.get(canonicalKey);
        canonicalObj.occurrenceCount++;
        duplicateOccurrences++; // Increment repeated occurrence count
      }
    });

    // 2. Process Rejected Candidates Breakdown
    rejectedCandidates.forEach(rejected => {
      const reason = rejected.reason || 'UNKNOWN_REJECTION';
      rejectedByReason[reason] = (rejectedByReason[reason] || 0) + 1;
    });

    // Convert canonical map to sorted summary list
    const canonicalEntitiesList = Array.from(canonicalMap.values())
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 50); // Top 50 canonical entities preview

    return {
      documentId,
      processedUnits,
      candidatesGenerated: rawCandidates.length,
      rejectedCandidatesCount: rejectedCandidates.length,
      finalEntitiesCount: finalEntities.length,
      duplicateOccurrences,
      overlapsResolvedCount,
      canonicalEntitiesCount: canonicalMap.size,
      byType,
      byDetector,
      rejectedByReason,
      canonicalEntitiesSampleCount: canonicalEntitiesList.length,
      canonicalEntitiesSample: canonicalEntitiesList
    };
  }
}

module.exports = new PiiAuditService();
