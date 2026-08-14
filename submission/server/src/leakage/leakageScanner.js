const fs = require('fs');
const path = require('path');
const documentService = require('../services/documentService');
const docxParserService = require('../services/docxParserService');
const piiDetectionService = require('../services/piiDetectionService');
const piiNormalizationService = require('../services/piiNormalizationService');
const allowlistService = require('../services/allowlistService');
const replacementService = require('../replacement/replacementService');
const leakageAnalyzer = require('./leakageAnalyzer');
const leakageReportBuilder = require('./leakageReport');

/**
 * Leakage Scanner Service
 * Independently parses a generated redacted DOCX file, executes all 9 PII detectors,
 * compares findings against original entity sets and replacement registries, validates structural integrity,
 * and generates a diagnostic Leakage Report.
 */
class LeakageScanner {
  constructor() {
    this.genericHeaderTerms = new Set([
      'registered office', 'corporate office', 'restated financial', 'working capital',
      'plot no', 'indian rupee', 'board of directors', 'companies act', 'equity shares',
      'red herring prospectus', 'statutory auditor', 'audit committee', 'brlm', 'brlms',
      'book running lead manager', 'book running lead managers', 'infra park', 'scsb', 'scsbs',
      'mutual fund', 'mutual funds', 'stock exchange', 'stock exchanges', 'bandra east',
      'kirtane & pandit, llp', 'kirtane & pandit', 'electricals private limited',
      'private limited', 'limited', 'private ltd', 'pvt ltd', 'llp', 'corporation',
      'fugitive economic offender', 'development authority', 'family trust',
      'key managerial', 'key managerial personnel', 'promoter group'
    ]);
  }

  /**
   * Scans a redacted DOCX document for residual PII leakage
   * @param {string} documentId - Original document ID
   * @param {string} [redactedFilePath] - Optional explicit path to redacted DOCX file
   * @returns {Object} Diagnostic Leakage Report
   */
  async scanRedactedDocument(documentId, redactedFilePath) {
    const docMeta = documentService.getDocumentMetadata(documentId);
    if (!docMeta) {
      throw new Error(`[LeakageScanner Error] Original document '${documentId}' not found.`);
    }

    let redactedBuffer = null;
    if (global.documentStore.has(documentId)) {
      const cached = global.documentStore.get(documentId);
      if (cached && cached.redactedBuffer) {
        redactedBuffer = cached.redactedBuffer;
      }
    }

    const defaultRedactedPath = path.join(path.dirname(docMeta.filePath || UPLOAD_DIR), `${documentId}_redacted.docx`);
    const targetRedactedPath = redactedFilePath || defaultRedactedPath;

    if (!redactedBuffer && !fs.existsSync(targetRedactedPath)) {
      throw new Error(`[LeakageScanner Error] Redacted file '${targetRedactedPath}' does not exist.`);
    }

    // 1. Retrieve original document structured parsing metrics
    const origBuffer = documentService.getDocumentBuffer(documentId);
    const originalStructDoc = await docxParserService.parseDocument(origBuffer || docMeta.filePath, documentId);

    // 2. Retrieve original Replacement Plan & entities list
    const originalPlan = await replacementService.generateReplacementPlan(documentId);
    const originalEntities = (await piiDetectionService.detectPiiInDocument(documentId)).entities || [];

    // Build lookup sets for classification
    const originalPiiNormalizedSet = new Set();
    originalEntities.forEach(e => {
      if (e.text) {
        const cleanText = e.text.replace(/^[\s“"’'”]+|[\s“"’'”]+$/g, '').trim();
        if (cleanText && !allowlistService.isAllowlisted(e.type, cleanText) && !this.genericHeaderTerms.has(cleanText.toLowerCase())) {
          originalPiiNormalizedSet.add(cleanText);
          originalPiiNormalizedSet.add(cleanText.toLowerCase());
          const norm = piiNormalizationService.normalize(e.type, cleanText);
          if (norm) {
            originalPiiNormalizedSet.add(norm);
            originalPiiNormalizedSet.add(`${e.type.toLowerCase()}:${norm}`);
          }
        }
      }
    });

    const syntheticReplacementsSet = new Set();
    const targetedOriginalPiiSet = new Set();

    originalPlan.unitPlans.forEach(up => {
      up.replacements.forEach(r => {
        if (r.replacement) {
          syntheticReplacementsSet.add(r.replacement.trim());
          syntheticReplacementsSet.add(r.replacement.trim().toLowerCase());
          const norm = piiNormalizationService.normalize(r.type, r.replacement);
          if (norm) syntheticReplacementsSet.add(norm);
        }
        if (r.original) {
          const cleanOrig = r.original.replace(/^[\s“"’'”]+|[\s“"’'”]+$/g, '').trim();
          if (cleanOrig && !allowlistService.isAllowlisted(r.type, cleanOrig) && !this.genericHeaderTerms.has(cleanOrig.toLowerCase())) {
            targetedOriginalPiiSet.add(cleanOrig);
          }
        }
      });
    });

    // 3. Reparse Redacted DOCX independently
    let redactedStructDoc = null;
    let reparsedSuccessfully = true;

    try {
      redactedStructDoc = await docxParserService.parseDocument(redactedBuffer || targetRedactedPath, `${documentId}_redacted`);
    } catch (err) {
      reparsedSuccessfully = false;
    }

    const structuralValidation = {
      reparsedSuccessfully,
      originalParagraphs: originalStructDoc.content ? originalStructDoc.content.filter(u => u.type === 'paragraph').length : 0,
      redactedParagraphs: (redactedStructDoc && redactedStructDoc.content) ? redactedStructDoc.content.filter(u => u.type === 'paragraph').length : 0,
      originalTables: originalStructDoc.metadata ? originalStructDoc.metadata.tablesCount : 0,
      redactedTables: (redactedStructDoc && redactedStructDoc.metadata) ? redactedStructDoc.metadata.tablesCount : 0
    };

    if (!reparsedSuccessfully || !redactedStructDoc) {
      return leakageReportBuilder.buildReport({
        documentId,
        redactedFileName: path.basename(targetRedactedPath),
        originalEntitiesCount: originalEntities.length,
        expectedReplacementsCount: originalPlan.summary.replacementCount,
        rescanCandidatesCount: 0,
        classifiedFindings: [],
        structuralValidation
      });
    }

    // 4. Run all 9 PII detectors on reparsed redacted text units
    const rescanResult = piiDetectionService.detectPiiInUnits(redactedStructDoc.content, documentId);
    const rescanEntities = rescanResult.entities || [];

    // 5. Classify rescan candidate findings
    const classifiedFindings = [];

    rescanEntities.forEach(rescanEntity => {
      const classification = leakageAnalyzer.classifyFinding(
        rescanEntity,
        originalEntities,
        syntheticReplacementsSet,
        originalPiiNormalizedSet
      );

      classifiedFindings.push({
        entity: rescanEntity,
        classification
      });
    });

    // 6. Direct Substring Inspection: Search all reparsed units for targeted original PII strings
    this.performDirectSubstringInspection(redactedStructDoc.content, targetedOriginalPiiSet, syntheticReplacementsSet, classifiedFindings);

    // 7. Assemble final report
    return leakageReportBuilder.buildReport({
      documentId,
      redactedFileName: path.basename(targetRedactedPath),
      originalEntitiesCount: originalEntities.length,
      expectedReplacementsCount: originalPlan.summary.replacementCount,
      rescanCandidatesCount: rescanEntities.length,
      classifiedFindings,
      structuralValidation
    });
  }

  /**
   * Helper to perform direct exact string search for targeted original PII strings
   * @param {Array<Object>} textUnits 
   * @param {Set} targetedOriginalPiiSet 
   * @param {Set} syntheticReplacementsSet 
   * @param {Array<Object>} classifiedFindings 
   */
  performDirectSubstringInspection(textUnits, targetedOriginalPiiSet, syntheticReplacementsSet, classifiedFindings) {
    if (!textUnits || !targetedOriginalPiiSet) return;

    targetedOriginalPiiSet.forEach(targetText => {
      if (!targetText || targetText.length < 5) return;
      const cleanTarget = targetText.replace(/^[\s“"’'”]+|[\s“"’'”]+$/g, '').trim();
      const lowerTarget = cleanTarget.toLowerCase();

      // Skip generic headings, allowlisted terms, or strings matching synthetic replacements
      if (
        this.genericHeaderTerms.has(lowerTarget) || 
        allowlistService.isAllowlisted('ORGANIZATION', cleanTarget) ||
        allowlistService.isAllowlisted('PERSON', cleanTarget) ||
        allowlistService.isAllowlisted('ADDRESS', cleanTarget) ||
        syntheticReplacementsSet.has(cleanTarget) || 
        syntheticReplacementsSet.has(lowerTarget)
      ) {
        return;
      }

      textUnits.forEach(unit => {
        if (!unit.text) return;
        const unitText = unit.text;

        const exactIndex = unitText.indexOf(cleanTarget);

        if (exactIndex !== -1) {
          const alreadyAdded = classifiedFindings.some(f => 
            f.classification.category === 'CONFIRMED_LEAK' && f.entity.source && f.entity.source.unitId === unit.id
          );

          if (!alreadyAdded) {
            classifiedFindings.push({
              entity: {
                id: `leak-${unit.id}-${exactIndex}`,
                type: 'PII_LEAK',
                text: cleanTarget,
                start: exactIndex,
                end: exactIndex + cleanTarget.length,
                confidence: 1.0,
                detector: 'directSubstringScanner',
                source: {
                  unitId: unit.id,
                  unitType: unit.type,
                  location: unit.location
                }
              },
              classification: {
                category: 'CONFIRMED_LEAK',
                expectedSynthetic: false,
                severity: 'CRITICAL',
                description: `Direct substring search found unredacted original PII '${cleanTarget}' in text unit ${unit.id}`
              }
            });
          }
        }
      });
    });
  }
}

module.exports = new LeakageScanner();
