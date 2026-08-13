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

/**
 * PII Detection Service
 * Aggregates deterministic and contextual/NLP detectors, resolves overlapping candidate spans,
 * sorts entities deterministically, and maps source document location metadata.
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

    // Priority ranking for resolving overlapping entity spans (higher = preferred)
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
   * Prioritizes: 1) Specific entity type rank, 2) Confidence score, 3) Longer span length.
   * @param {Array<Object>} entities 
   * @returns {Array<Object>} Non-overlapping entities
   */
  resolveOverlaps(entities) {
    if (entities.length <= 1) return entities;

    // Sort candidates by start ascending, then length descending
    const sorted = [...entities].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end - b.start) - (a.end - a.start);
    });

    const resolved = [];

    for (const current of sorted) {
      let isOverlapping = false;

      for (let i = 0; i < resolved.length; i++) {
        const existing = resolved[i];
        
        // Check span overlap condition: start1 < end2 && start2 < end1
        if (current.start < existing.end && existing.start < current.end) {
          isOverlapping = true;
          
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

    return resolved;
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
   * Detects PII entities within a single text unit object.
   * @param {Object} unit - Structured document unit ({ id, type, text, location })
   * @returns {Array<Object>} List of detected entities with source mapping
   */
  detectPiiInTextUnit(unit) {
    if (!unit || typeof unit.text !== 'string' || unit.text.length === 0) {
      return [];
    }

    const rawCandidates = [];

    // Execute all 9 detectors (deterministic + contextual)
    for (const detector of this.detectors) {
      try {
        const matches = detector.detect(unit.text);
        if (Array.isArray(matches)) {
          rawCandidates.push(...matches);
        }
      } catch (err) {
        console.warn(`[PiiDetection Service] Detector '${detector.type}' error: ${err.message}`);
      }
    }

    // Resolve overlaps and sort deterministically
    const nonOverlapping = this.resolveOverlaps(rawCandidates);
    const sorted = this.sortEntities(nonOverlapping);

    // Verify invariant & attach source location metadata
    return sorted.map(entity => {
      // Invariant check: unit.text.substring(start, end) === entity.text
      const verifiedSub = unit.text.substring(entity.start, entity.end);
      if (verifiedSub !== entity.text) {
        console.warn(`[PiiDetection Warning] Substring invariant failed for entity '${entity.text}' vs '${verifiedSub}'`);
      }

      return {
        type: entity.type,
        text: entity.text,
        start: entity.start,
        end: entity.end,
        confidence: entity.confidence,
        detector: entity.detector,
        source: {
          unitId: unit.id,
          type: unit.type,
          location: unit.location
        }
      };
    });
  }

  /**
   * Scans a full structured document model for PII entities across all 9 categories
   * @param {string} documentId - Document identifier
   * @returns {Object} Detection result summary and entity list
   */
  async detectPiiInDocument(documentId) {
    const structuredDoc = await documentService.parseDocument(documentId);

    const allEntities = [];
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
      structuredDoc.content.forEach(unit => {
        const unitEntities = this.detectPiiInTextUnit(unit);
        unitEntities.forEach(entity => {
          allEntities.push(entity);
          if (summary[entity.type] !== undefined) {
            summary[entity.type]++;
          }
          summary.totalEntities++;
        });
      });
    }

    return {
      documentId: documentId,
      sourceFile: structuredDoc.sourceFile,
      summary: summary,
      entities: allEntities
    };
  }
}

module.exports = new PiiDetectionService();

