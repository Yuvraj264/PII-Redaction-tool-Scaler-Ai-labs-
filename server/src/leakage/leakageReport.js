/**
 * Leakage Report Builder
 * Assembles structured, safe Leakage Diagnostic Reports for redacted documents.
 * Computes status (PASS / FAIL), summary metrics, structural comparison results, and leak lists.
 */
class LeakageReportBuilder {
  /**
   * Assembles a structured Leakage Report JSON object
   * @param {Object} params 
   * @returns {Object} Leakage Report
   */
  buildReport({
    documentId,
    redactedFileName,
    originalEntitiesCount = 0,
    expectedReplacementsCount = 0,
    rescanCandidatesCount = 0,
    classifiedFindings = [],
    structuralValidation = {}
  }) {
    let confirmedLeaksCount = 0;
    let possibleLeaksCount = 0;
    let expectedSyntheticCount = 0;
    let scannerFalsePositivesCount = 0;

    const leaks = [];

    classifiedFindings.forEach(item => {
      if (item.classification.category === 'CONFIRMED_LEAK') {
        confirmedLeaksCount++;
        leaks.push({
          entityId: item.entity.id,
          type: item.entity.type,
          severity: item.classification.severity,
          category: item.classification.category,
          source: item.entity.source,
          start: item.entity.start,
          end: item.entity.end,
          description: item.classification.description
        });
      } else if (item.classification.category === 'NEW_UNINTENDED_PII') {
        possibleLeaksCount++;
        leaks.push({
          entityId: item.entity.id,
          type: item.entity.type,
          severity: item.classification.severity,
          category: item.classification.category,
          source: item.entity.source,
          start: item.entity.start,
          end: item.entity.end,
          description: item.classification.description
        });
      } else if (item.classification.category === 'EXPECTED_SYNTHETIC_ENTITY') {
        expectedSyntheticCount++;
      } else {
        scannerFalsePositivesCount++;
      }
    });

    const isStructurallyValid = structuralValidation.reparsedSuccessfully !== false;
    const status = (confirmedLeaksCount === 0 && isStructurallyValid) ? 'PASS' : 'FAIL';

    return {
      documentId,
      redactedFileName,
      status,
      timestamp: new Date().toISOString(),
      summary: {
        originalEntitiesCount,
        expectedReplacementsCount,
        rescanCandidatesCount,
        confirmedLeaksCount,
        possibleLeaksCount,
        expectedSyntheticCount,
        scannerFalsePositivesCount
      },
      structuralValidation: {
        reparsedSuccessfully: isStructurallyValid,
        originalParagraphs: structuralValidation.originalParagraphs || 0,
        redactedParagraphs: structuralValidation.redactedParagraphs || 0,
        originalTables: structuralValidation.originalTables || 0,
        redactedTables: structuralValidation.redactedTables || 0
      },
      leaks
    };
  }
}

module.exports = new LeakageReportBuilder();
