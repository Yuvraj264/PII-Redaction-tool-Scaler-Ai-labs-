const emailDetector = require('../detectors/emailDetector');
const phoneDetector = require('../detectors/phoneDetector');
const ipDetector = require('../detectors/ipDetector');
const ssnDetector = require('../detectors/ssnDetector');
const creditCardDetector = require('../detectors/creditCardDetector');
const personDetector = require('../detectors/personDetector');
const organizationDetector = require('../detectors/organizationDetector');
const addressDetector = require('../detectors/addressDetector');
const dobDetector = require('../detectors/dobDetector');
const documentService = require('./documentService');
const piiValidationService = require('./piiValidationService');
const piiNormalizationService = require('./piiNormalizationService');
const piiAuditService = require('./piiAuditService');

/**
 * PII Detection Service
 * Aggregates all 9 deterministic & contextual detectors, runs validation and offset invariant checks,
 * applies type-specific normalization, resolves candidate overlaps, and generates diagnostic detection audit reports.
 */
class PiiDetectionService {
  constructor() {
    this.detectors = [
      emailDetector,
      phoneDetector,
      ipDetector,
      ssnDetector,
      creditCardDetector,
      personDetector,
      organizationDetector,
      addressDetector,
      dobDetector
    ];

    // Specificity rank hierarchy for resolving overlapping entity spans (higher = preferred)
    this.typePriority = {
      EMAIL: 5,
      PHONE: 5,
      CREDIT_CARD: 5,
      SSN: 5,
      IP_ADDRESS: 5,
      DOB: 4,
      ADDRESS: 3,
      PERSON: 2,
      ORGANIZATION: 1
    };
  }

  /**
   * Returns numeric priority for an entity type
   * @param {string} type 
   * @returns {number}
   */
  getPriority(type) {
    return this.typePriority[type] || 1;
  }

  /**
   * Resolves overlapping entity spans deterministically.
   * Collapses exact duplicate spans, resolves nested overlaps using priority rank > confidence > length,
   * and preserves adjacent non-overlapping entities.
   * @param {Array<Object>} entities 
   * @returns {Object} { resolvedEntities, overlapsResolvedCount }
   */
  resolveOverlaps(entities) {
    if (entities.length <= 1) {
      return { resolvedEntities: entities, overlapsResolvedCount: 0 };
    }

    // Sort candidates by start ascending, then length descending
    const sorted = [...entities].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end - b.start) - (a.end - a.start);
    });

    const resolved = [];
    let overlapsResolvedCount = 0;

    for (const current of sorted) {
      let isOverlapping = false;

      for (let i = 0; i < resolved.length; i++) {
        const existing = resolved[i];
        
        // Check span overlap condition: start1 < end2 && start2 < end1
        if (current.start < existing.end && existing.start < current.end) {
          isOverlapping = true;
          overlapsResolvedCount++;
          
          const currentPrio = this.getPriority(current.type);
          const existingPrio = this.getPriority(existing.type);

          const currentLen = current.end - current.start;
          const existingLen = existing.end - existing.start;

          // Replace existing if current has strictly higher type priority, or higher confidence, or longer length
          if (
            currentPrio > existingPrio ||
            (currentPrio === existingPrio && current.confidence > existing.confidence) ||
            (currentPrio === existingPrio && current.confidence === existing.confidence && currentLen > existingLen)
          ) {
            resolved[i] = current;
          }
          break;
        }
      }

      if (!isOverlapping) {
        resolved.push(current);
      }
    }

    return { resolvedEntities: resolved, overlapsResolvedCount };
  }

  /**
   * Sorts entities deterministically by start asc, end asc, type alpha
   * @param {Array<Object>} entities 
   * @returns {Array<Object>}
   */
  sortEntities(entities) {
    return [...entities].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.end !== b.end) return a.end - b.end;
      return a.type.localeCompare(b.type);
    });
  }

  /**
   * Detects and validates PII entities within a single text unit object.
   * @param {Object} unit - Structured document unit ({ id, type, text, location })
   * @returns {Object} { validEntities, rawCandidates, rejectedCandidates, overlapsCount }
   */
  detectPiiInTextUnit(unit) {
    if (!unit || typeof unit.text !== 'string' || unit.text.length === 0) {
      return { validEntities: [], rawCandidates: [], rejectedCandidates: [], overlapsCount: 0 };
    }

    const rawCandidates = [];
    const rejectedCandidates = [];

    // 1. Execute all 9 detectors
    for (const detector of this.detectors) {
      try {
        const matches = detector.detect(unit.text);
        if (Array.isArray(matches)) {
          matches.forEach(m => {
            rawCandidates.push({
              ...m,
              source: {
                unitId: unit.id,
                unitType: unit.type,
                location: unit.location
              }
            });
          });
        }
      } catch (err) {
        console.warn(`[PiiDetection Service] Detector '${detector.type}' error: ${err.message}`);
      }
    }

    // 2. Validate candidates & enforce character offset invariant
    const validatedCandidates = [];
    rawCandidates.forEach(cand => {
      const validation = piiValidationService.validateCandidate(cand, unit.text);
      if (validation.isValid) {
        validatedCandidates.push(cand);
      } else {
        rejectedCandidates.push({
          candidate: cand,
          reason: validation.reason
        });
      }
    });

    // 3. Resolve overlaps among validated candidates
    const { resolvedEntities, overlapsResolvedCount } = this.resolveOverlaps(validatedCandidates);
    const sorted = this.sortEntities(resolvedEntities);

    // 4. Attach entity contract fields (stable ID, normalized value, source metadata)
    const validEntities = sorted.map((entity, index) => {
      const entityId = `entity-${unit.id}-${index}`;
      const normalizedVal = piiNormalizationService.normalize(entity.type, entity.text);

      return {
        id: entityId,
        type: entity.type,
        text: entity.text,
        start: entity.start,
        end: entity.end,
        confidence: entity.confidence,
        detector: entity.detector,
        normalizedValue: normalizedVal,
        source: {
          unitId: unit.id,
          unitType: unit.type,
          location: unit.location
        }
      };
    });

    return {
      validEntities,
      rawCandidates,
      rejectedCandidates,
      overlapsCount: overlapsResolvedCount
    };
  }

  /**
   * Scans a full structured document model for PII entities across all 9 categories,
   * performs normalization, validation, canonical grouping, and generates diagnostic detection audit metrics.
   * @param {string} documentId - Document identifier
   * @returns {Object} Detection result summary, audit report, and entity list
   */
  async detectPiiInDocument(documentId) {
    const structuredDoc = await documentService.parseDocument(documentId);

    const allEntities = [];
    const allRawCandidates = [];
    const allRejectedCandidates = [];
    let totalOverlapsResolved = 0;
    let processedUnitsCount = 0;

    const summary = {
      EMAIL: 0,
      PHONE: 0,
      IP_ADDRESS: 0,
      SSN: 0,
      CREDIT_CARD: 0,
      PERSON: 0,
      ORGANIZATION: 0,
      ADDRESS: 0,
      DOB: 0,
      totalEntities: 0
    };

    if (structuredDoc && Array.isArray(structuredDoc.content)) {
      processedUnitsCount = structuredDoc.content.length;

      structuredDoc.content.forEach(unit => {
        const unitResult = this.detectPiiInTextUnit(unit);

        allRawCandidates.push(...unitResult.rawCandidates);
        allRejectedCandidates.push(...unitResult.rejectedCandidates);
        totalOverlapsResolved += unitResult.overlapsCount;

        unitResult.validEntities.forEach(entity => {
          allEntities.push(entity);
          if (summary[entity.type] !== undefined) {
            summary[entity.type]++;
          }
          summary.totalEntities++;
        });
      });
    }

    // Generate diagnostic detection audit report
    const auditReport = piiAuditService.generateAuditReport({
      documentId,
      processedUnits: processedUnitsCount,
      rawCandidates: allRawCandidates,
      rejectedCandidates: allRejectedCandidates,
      finalEntities: allEntities,
      overlapsResolvedCount: totalOverlapsResolved
    });

    return {
      documentId: documentId,
      sourceFile: structuredDoc.sourceFile,
      summary: summary,
      entities: allEntities,
      audit: auditReport
    };
  }

  /**
   * Scans an array of structured text units for PII entities
   * @param {Array<Object>} units 
   * @param {string} documentId 
   * @returns {Object} { entities }
   */
  detectPiiInUnits(units, documentId = 'custom') {
    const allEntities = [];
    if (Array.isArray(units)) {
      units.forEach(unit => {
        const unitResult = this.detectPiiInTextUnit(unit);
        allEntities.push(...unitResult.validEntities);
      });
    }
    return { entities: allEntities };
  }
}

module.exports = new PiiDetectionService();
