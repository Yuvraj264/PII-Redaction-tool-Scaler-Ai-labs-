const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

/**
 * DOCX Structural Parser Service
 * Reads OpenXML .docx archives in-memory and extracts structured paragraphs, tables,
 * runs, and headers/footers with stable IDs, type tags, runs, and precise location metadata.
 */
class DocxParserService {
  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      preserveOrder: false,
      trimValues: false,
      isArray: (name) => ['w:p', 'w:tbl', 'w:tr', 'w:tc', 'w:r', 'w:t'].includes(name)
    });
  }

  /**
   * Helper to extract individual formatting text runs (<w:r>) from an OpenXML paragraph node (<w:p>)
   * @param {Object} pNode - OpenXML paragraph object
   * @returns {Array<Object>} Array of run objects [{ index: 0, text: "..." }]
   */
  extractRunsFromParagraphNode(pNode) {
    if (!pNode) return [];
    const runs = [];
    let runIndex = 0;

    const traverseForRuns = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node['w:r']) {
        const rList = Array.isArray(node['w:r']) ? node['w:r'] : [node['w:r']];
        rList.forEach(rNode => {
          let runText = '';
          if (rNode['w:t']) {
            const tVal = rNode['w:t'];
            if (Array.isArray(tVal)) {
              runText = tVal.map(t => typeof t === 'string' ? t : (t['#text'] || '')).join('');
            } else if (typeof tVal === 'string') {
              runText = tVal;
            } else if (typeof tVal === 'object' && tVal['#text']) {
              runText = tVal['#text'];
            }
          }

          if (runText.length > 0) {
            runs.push({
              index: runIndex++,
              text: runText
            });
          }
        });
      }

      // Check child properties recursively
      Object.keys(node).forEach(key => {
        if (key !== 'w:r' && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(child => traverseForRuns(child));
          } else {
            traverseForRuns(node[key]);
          }
        }
      });
    };

    traverseForRuns(pNode);
    return runs;
  }

  /**
   * Helper to extract concatenated text string from an OpenXML paragraph node (<w:p>)
   */
  extractTextFromParagraphNode(pNode) {
    const runs = this.extractRunsFromParagraphNode(pNode);
    if (runs.length > 0) {
      return runs.map(r => r.text).join('');
    }
    
    // Fallback direct extraction if runs format differs
    if (!pNode) return '';
    let textParts = [];

    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node['w:t']) {
        const tVal = node['w:t'];
        if (Array.isArray(tVal)) {
          tVal.forEach(t => {
            if (typeof t === 'string') textParts.push(t);
            else if (typeof t === 'object' && t['#text']) textParts.push(t['#text']);
          });
        } else if (typeof tVal === 'string') {
          textParts.push(tVal);
        } else if (typeof tVal === 'object' && tVal['#text']) {
          textParts.push(tVal['#text']);
        }
      }

      Object.keys(node).forEach(key => {
        if (key !== 'w:t' && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(child => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      });
    };

    traverse(pNode);
    return textParts.join('');
  }

  /**
   * Character offset verification utility
   * Verifies standard convention: start (inclusive), end (exclusive)
   * @param {Object} unit - Extracted text unit
   * @param {number} start - 0-indexed inclusive start offset
   * @param {number} end - 0-indexed exclusive end offset
   * @returns {string} Target entity text substring
   */
  extractSubstring(unit, start, end) {
    if (!unit || typeof unit.text !== 'string') return '';
    return unit.text.substring(start, end);
  }

  /**
   * Main parsing method for a .docx file
   * @param {string} filePath - Absolute filesystem path to .docx file
   * @param {string} documentId - Safe document identifier
   * @param {Object} sourceFileMeta - Source document metadata
   * @returns {Object} Application-level Structured Document Model
   */
  async parseDocument(filePath, documentId, sourceFileMeta = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Document file not found at path: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('Document file is empty (0 bytes).');
    }

    let zip;
    try {
      zip = new AdmZip(filePath);
    } catch (err) {
      throw new Error(`Failed to open DOCX archive: ${err.message}`);
    }

    const zipEntries = zip.getEntries();
    const docEntry = zipEntries.find(e => e.entryName === 'word/document.xml');

    if (!docEntry) {
      throw new Error('Invalid DOCX format: missing "word/document.xml" entry inside archive.');
    }

    const xmlContent = docEntry.getData().toString('utf8');
    const parsedXml = this.xmlParser.parse(xmlContent);

    const bodyNode = parsedXml?.['w:document']?.['w:body'];
    if (!bodyNode) {
      throw new Error('Invalid OpenXML document: missing <w:body> element.');
    }

    const contentUnits = [];
    let unitCounter = 1;
    let paragraphCounter = 0;
    let tableCounter = 0;
    let cellCounter = 0;
    let emptyUnitCounter = 0;
    let totalRunCounter = 0;

    // Helper to register an extracted unit
    const addUnit = (type, pNode, textOverride, location) => {
      const id = `unit-${String(unitCounter++).padStart(5, '0')}`;
      const runs = pNode ? this.extractRunsFromParagraphNode(pNode) : [];
      totalRunCounter += runs.length;

      const rawText = textOverride !== undefined ? textOverride : (runs.length > 0 ? runs.map(r => r.text).join('') : this.extractTextFromParagraphNode(pNode));
      const normalizedText = rawText.replace(/\s+/g, ' ').trim();

      if (normalizedText.length === 0) {
        emptyUnitCounter++;
      }

      contentUnits.push({
        id,
        type,
        text: rawText,
        normalizedText,
        runs,
        location: {
          documentId,
          ...location
        }
      });
    };

    // Traverse body top-level elements (<w:p> and <w:tbl>)
    Object.keys(bodyNode).forEach(key => {
      if (key === 'w:p') {
        const pList = Array.isArray(bodyNode['w:p']) ? bodyNode['w:p'] : [bodyNode['w:p']];
        pList.forEach((pNode) => {
          addUnit('paragraph', pNode, undefined, {
            paragraphIndex: paragraphCounter++
          });
        });
      } else if (key === 'w:tbl') {
        const tblList = Array.isArray(bodyNode['w:tbl']) ? bodyNode['w:tbl'] : [bodyNode['w:tbl']];
        tblList.forEach((tblNode) => {
          const tableIdx = tableCounter++;
          const trList = tblNode['w:tr'] ? (Array.isArray(tblNode['w:tr']) ? tblNode['w:tr'] : [tblNode['w:tr']]) : [];

          trList.forEach((trNode, rowIdx) => {
            const tcList = trNode['w:tc'] ? (Array.isArray(trNode['w:tc']) ? trNode['w:tc'] : [trNode['w:tc']]) : [];

            tcList.forEach((tcNode, cellIdx) => {
              cellCounter++;
              const cellParagraphs = tcNode['w:p'] ? (Array.isArray(tcNode['w:p']) ? tcNode['w:p'] : [tcNode['w:p']]) : [];
              
              if (cellParagraphs.length === 0) {
                addUnit('table-cell', null, '', {
                  tableIndex: tableIdx,
                  rowIndex: rowIdx,
                  cellIndex: cellIdx,
                  paragraphIndex: 0
                });
              } else {
                cellParagraphs.forEach((pNode, cellPIdx) => {
                  addUnit('table-cell', pNode, undefined, {
                    tableIndex: tableIdx,
                    rowIndex: rowIdx,
                    cellIndex: cellIdx,
                    paragraphIndex: cellPIdx
                  });
                });
              }
            });
          });
        });
      }
    });

    // Extract Headers and Footers
    const headerEntries = zipEntries.filter(e => /^word\/header\d+\.xml$/i.test(e.entryName));
    const footerEntries = zipEntries.filter(e => /^word\/footer\d+\.xml$/i.test(e.entryName));

    headerEntries.forEach((hEntry, hIdx) => {
      try {
        const hXml = hEntry.getData().toString('utf8');
        const hParsed = this.xmlParser.parse(hXml);
        const hdrNode = hParsed?.['w:hdr'];
        if (hdrNode && hdrNode['w:p']) {
          const pList = Array.isArray(hdrNode['w:p']) ? hdrNode['w:p'] : [hdrNode['w:p']];
          pList.forEach((pNode, pIdx) => {
            const hText = this.extractTextFromParagraphNode(pNode);
            if (hText && hText.trim().length > 0) {
              addUnit('header', pNode, hText, {
                headerId: `header-${hIdx + 1}`,
                paragraphIndex: pIdx
              });
            }
          });
        }
      } catch (err) {
        console.warn(`[DocxParser Warning] Header extraction skipped for ${hEntry.entryName}: ${err.message}`);
      }
    });

    footerEntries.forEach((fEntry, fIdx) => {
      try {
        const fXml = fEntry.getData().toString('utf8');
        const fParsed = this.xmlParser.parse(fXml);
        const ftrNode = fParsed?.['w:ftr'];
        if (ftrNode && ftrNode['w:p']) {
          const pList = Array.isArray(ftrNode['w:p']) ? ftrNode['w:p'] : [ftrNode['w:p']];
          pList.forEach((pNode, pIdx) => {
            const fText = this.extractTextFromParagraphNode(pNode);
            if (fText && fText.trim().length > 0) {
              addUnit('footer', pNode, fText, {
                footerId: `footer-${fIdx + 1}`,
                paragraphIndex: pIdx
              });
            }
          });
        }
      } catch (err) {
        console.warn(`[DocxParser Warning] Footer extraction skipped for ${fEntry.entryName}: ${err.message}`);
      }
    });

    const totalCharacterCount = contentUnits.reduce((sum, unit) => sum + unit.text.length, 0);

    return {
      documentId: documentId,
      sourceFile: {
        originalName: sourceFileMeta.originalName || path.basename(filePath),
        mimeType: sourceFileMeta.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: sourceFileMeta.size || stats.size
      },
      metrics: {
        paragraphCount: paragraphCounter,
        tableCount: tableCounter,
        tableCellCount: cellCounter,
        textUnitCount: contentUnits.length,
        totalCharacterCount: totalCharacterCount,
        totalRunCount: totalRunCounter,
        emptyUnitCount: emptyUnitCounter,
        headerCount: headerEntries.length,
        footerCount: footerEntries.length
      },
      offsetConvention: {
        type: "zero-indexed",
        start: "inclusive",
        end: "exclusive",
        substringGuarantee: "unit.text.substring(start, end) === entityText"
      },
      content: contentUnits
    };
  }
}

module.exports = new DocxParserService();
