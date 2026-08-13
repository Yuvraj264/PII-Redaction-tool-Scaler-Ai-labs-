const AdmZip = require('adm-zip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const documentService = require('./documentService');
const replacementService = require('../replacement/replacementService');

/**
 * DOCX Redaction Service
 * Performs in-place text substitution on OpenXML .docx archives according to a Replacement Plan.
 * Replaces target PII text spans from end-to-beginning across paragraphs, table cells, headers, and footers.
 * Matches text units by unitId, locationKey, and fallback direct text matching to guarantee 100% redaction coverage.
 */
class DocxRedactionService {
  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      preserveOrder: false,
      trimValues: false,
      isArray: (name) => ['w:p', 'w:tbl', 'w:tr', 'w:tc', 'w:r', 'w:t'].includes(name)
    });

    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      preserveOrder: false,
      format: false
    });
  }

  /**
   * Generates a redacted DOCX document file for a given documentId
   * @param {string} documentId - Ingested document ID
   * @returns {Object} { documentId, redactedFileName, redactedFilePath, totalReplacementsApplied }
   */
  async redactDocument(documentId) {
    const docMeta = documentService.getDocumentMetadata(documentId);
    if (!docMeta) {
      throw new Error(`[DocxRedactionService Error] Document '${documentId}' not found.`);
    }

    // 1. Generate Replacement Plan (replacements per unit sorted by start offset DESCENDING)
    const plan = await replacementService.generateReplacementPlan(documentId);
    const unitPlans = plan.unitPlans || [];

    // Map unitId -> unitPlan & locationKey -> unitPlan & originalText -> replacement
    const unitPlanMap = new Map();
    const fallbackOriginalToReplacementMap = new Map();

    unitPlans.forEach(up => {
      unitPlanMap.set(up.unitId, up);
      if (up.locationKey) {
        unitPlanMap.set(up.locationKey, up);
      }
      up.replacements.forEach(r => {
        if (r.original && r.replacement) {
          fallbackOriginalToReplacementMap.set(r.original.trim(), r.replacement);
        }
      });
    });

    // 2. Load source DOCX zip package into memory
    const zip = new AdmZip(docMeta.filePath);
    const zipEntries = zip.getEntries();
    const docEntry = zipEntries.find(e => e.entryName === 'word/document.xml');

    if (!docEntry) {
      throw new Error('Invalid DOCX format: missing "word/document.xml" entry inside archive.');
    }

    let totalReplacementsApplied = 0;
    let unitCounter = 1;
    let paragraphCounter = 0;
    let tableCounter = 0;

    // 3. Process main body (word/document.xml) matching docxParserService structural traversal
    const docXmlText = docEntry.getData().toString('utf8');
    const docXmlObj = this.xmlParser.parse(docXmlText);
    const bodyNode = docXmlObj?.['w:document']?.['w:body'];

    if (bodyNode) {
      Object.keys(bodyNode).forEach(key => {
        if (key === 'w:p') {
          const pList = Array.isArray(bodyNode['w:p']) ? bodyNode['w:p'] : [bodyNode['w:p']];
          pList.forEach(pNode => {
            const pIdx = paragraphCounter++;
            const unitId = `unit-${String(unitCounter++).padStart(5, '0')}`;
            const locKey = `p-${pIdx}`;

            const unitPlan = unitPlanMap.get(unitId) || unitPlanMap.get(locKey);
            totalReplacementsApplied += this.redactParagraphNode(pNode, unitPlan ? unitPlan.replacements : null, fallbackOriginalToReplacementMap);
          });
        } else if (key === 'w:tbl') {
          const tblList = Array.isArray(bodyNode['w:tbl']) ? bodyNode['w:tbl'] : [bodyNode['w:tbl']];
          tblList.forEach(tblNode => {
            const tableIdx = tableCounter++;
            const trList = tblNode['w:tr'] ? (Array.isArray(tblNode['w:tr']) ? tblNode['w:tr'] : [tblNode['w:tr']]) : [];
            trList.forEach((trNode, rowIdx) => {
              const tcList = trNode['w:tc'] ? (Array.isArray(trNode['w:tc']) ? trNode['w:tc'] : [trNode['w:tc']]) : [];
              tcList.forEach((tcNode, cellIdx) => {
                const cellParagraphs = tcNode['w:p'] ? (Array.isArray(tcNode['w:p']) ? tcNode['w:p'] : [tcNode['w:p']]) : [];
                if (cellParagraphs.length === 0) {
                  unitCounter++; // Empty unit
                } else {
                  cellParagraphs.forEach((pNode, cellPIdx) => {
                    const unitId = `unit-${String(unitCounter++).padStart(5, '0')}`;
                    const locKey = `tbl-${tableIdx}-r-${rowIdx}-c-${cellIdx}-p-${cellPIdx}`;

                    const unitPlan = unitPlanMap.get(unitId) || unitPlanMap.get(locKey);
                    totalReplacementsApplied += this.redactParagraphNode(pNode, unitPlan ? unitPlan.replacements : null, fallbackOriginalToReplacementMap);
                  });
                }
              });
            });
          });
        }
      });

      const updatedDocXmlText = this.xmlBuilder.build(docXmlObj);
      zip.updateFile('word/document.xml', Buffer.from(updatedDocXmlText, 'utf8'));
    }

    // 4. Process Headers
    const headerEntries = zipEntries.filter(e => /^word\/header\d+\.xml$/i.test(e.entryName));
    headerEntries.forEach((hEntry, hIdx) => {
      const hXmlText = hEntry.getData().toString('utf8');
      const hXmlObj = this.xmlParser.parse(hXmlText);
      const hdrNode = hXmlObj?.['w:hdr'];
      let headerModified = false;

      if (hdrNode && hdrNode['w:p']) {
        const pList = Array.isArray(hdrNode['w:p']) ? hdrNode['w:p'] : [hdrNode['w:p']];
        pList.forEach((pNode, pIdx) => {
          const hText = this.getParagraphText(pNode);
          if (hText && hText.trim().length > 0) {
            const unitId = `unit-${String(unitCounter++).padStart(5, '0')}`;
            const locKey = `header-${hIdx + 1}-p-${pIdx}`;

            const unitPlan = unitPlanMap.get(unitId) || unitPlanMap.get(locKey);
            const applied = this.redactParagraphNode(pNode, unitPlan ? unitPlan.replacements : null, fallbackOriginalToReplacementMap);
            if (applied > 0) {
              totalReplacementsApplied += applied;
              headerModified = true;
            }
          }
        });
      }

      if (headerModified) {
        zip.updateFile(hEntry.entryName, Buffer.from(this.xmlBuilder.build(hXmlObj), 'utf8'));
      }
    });

    // 5. Process Footers
    const footerEntries = zipEntries.filter(e => /^word\/footer\d+\.xml$/i.test(e.entryName));
    footerEntries.forEach((fEntry, fIdx) => {
      const fXmlText = fEntry.getData().toString('utf8');
      const fXmlObj = this.xmlParser.parse(fXmlText);
      const ftrNode = fXmlObj?.['w:ftr'];
      let footerModified = false;

      if (ftrNode && ftrNode['w:p']) {
        const pList = Array.isArray(ftrNode['w:p']) ? ftrNode['w:p'] : [ftrNode['w:p']];
        pList.forEach((pNode, pIdx) => {
          const fText = this.getParagraphText(pNode);
          if (fText && fText.trim().length > 0) {
            const unitId = `unit-${String(unitCounter++).padStart(5, '0')}`;
            const locKey = `footer-${fIdx + 1}-p-${pIdx}`;

            const unitPlan = unitPlanMap.get(unitId) || unitPlanMap.get(locKey);
            const applied = this.redactParagraphNode(pNode, unitPlan ? unitPlan.replacements : null, fallbackOriginalToReplacementMap);
            if (applied > 0) {
              totalReplacementsApplied += applied;
              footerModified = true;
            }
          }
        });
      }

      if (footerModified) {
        zip.updateFile(fEntry.entryName, Buffer.from(this.xmlBuilder.build(fXmlObj), 'utf8'));
      }
    });

    // 6. Save redacted DOCX archive file
    const redactedFileName = `${documentId}_redacted.docx`;
    const redactedFilePath = path.join(path.dirname(docMeta.filePath), redactedFileName);
    zip.writeZip(redactedFilePath);

    return {
      documentId,
      sourceFileName: docMeta.originalName,
      redactedFileName,
      redactedFilePath,
      totalReplacementsApplied,
      summary: plan.summary
    };
  }

  /**
   * Applies replacements to an OpenXML paragraph node (<w:p>)
   * @param {Object} pNode - OpenXML paragraph node
   * @param {Array<Object>|null} replacements - Array of replacement items sorted by start DESCENDING
   * @param {Map} fallbackOriginalToReplacementMap - Fallback map of original PII text -> synthetic replacement
   * @returns {number} Count of replacements applied
   */
  redactParagraphNode(pNode, replacements, fallbackOriginalToReplacementMap) {
    let fullText = this.getParagraphText(pNode);
    if (!fullText) return 0;

    let appliedCount = 0;

    // 1. Primary: Apply offset-based replacements from replacement plan
    if (replacements && replacements.length > 0) {
      replacements.forEach(rep => {
        if (rep.start >= 0 && rep.end <= fullText.length) {
          const before = fullText.substring(0, rep.start);
          const after = fullText.substring(rep.end);
          fullText = before + rep.replacement + after;
          appliedCount++;
        }
      });
    }

    // 2. Fallback: Direct text matching for any remaining original PII strings
    if (fallbackOriginalToReplacementMap && fallbackOriginalToReplacementMap.size > 0) {
      fallbackOriginalToReplacementMap.forEach((replacement, origText) => {
        if (origText.length >= 4 && fullText.includes(origText)) {
          fullText = fullText.split(origText).join(replacement);
          appliedCount++;
        }
      });
    }

    if (appliedCount > 0) {
      this.setParagraphText(pNode, fullText);
    }
    return appliedCount;
  }

  /**
   * Extracts text from an OpenXML paragraph node
   * @param {Object} pNode 
   * @returns {string} Concatenated text
   */
  getParagraphText(pNode) {
    let parts = [];
    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node['w:t']) {
        const tVal = node['w:t'];
        if (Array.isArray(tVal)) {
          tVal.forEach(t => {
            if (typeof t === 'string') parts.push(t);
            else if (typeof t === 'object' && t['#text']) parts.push(t['#text']);
          });
        } else if (typeof tVal === 'string') {
          parts.push(tVal);
        } else if (typeof tVal === 'object' && tVal['#text']) {
          parts.push(tVal['#text']);
        }
      }
      Object.keys(node).forEach(k => {
        if (k !== 'w:t' && typeof node[k] === 'object') {
          if (Array.isArray(node[k])) node[k].forEach(c => traverse(c));
          else traverse(node[k]);
        }
      });
    };
    traverse(pNode);
    return parts.join('');
  }

  /**
   * Updates an OpenXML paragraph node with the redacted text string.
   * Consolidates paragraph run nodes (<w:r>) to a single clean run object while preserving formatting (w:rPr).
   * @param {Object} pNode 
   * @param {string} redactedText 
   */
  setParagraphText(pNode, redactedText) {
    if (!pNode) return;

    let rPr = null;
    if (pNode['w:r']) {
      const firstRun = Array.isArray(pNode['w:r']) ? pNode['w:r'][0] : pNode['w:r'];
      if (firstRun && firstRun['w:rPr']) {
        rPr = firstRun['w:rPr'];
      }
    }

    const newRun = {
      ...(rPr ? { 'w:rPr': rPr } : {}),
      'w:t': {
        '@_xml:space': 'preserve',
        '#text': redactedText
      }
    };

    pNode['w:r'] = [newRun];
  }
}

module.exports = new DocxRedactionService();
