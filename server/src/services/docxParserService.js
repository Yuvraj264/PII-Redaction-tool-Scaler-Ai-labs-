const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

/**
 * DOCX Structural Parser Service
 * Reads OpenXML .docx archives in-memory and extracts structured paragraphs, tables,
 * and headers/footers with stable IDs, type tags, and precise location metadata.
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
   * Helper to extract concatenated text string from an OpenXML paragraph node (<w:p>)
   */
  extractTextFromParagraphNode(pNode) {
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

      if (node['w:r'] && Array.isArray(node['w:r'])) {
        node['w:r'].forEach(r => traverse(r));
      } else if (node['w:r']) {
        traverse(node['w:r']);
      }

      // Check child properties recursively
      Object.keys(node).forEach(key => {
        if (key !== 'w:r' && key !== 'w:t' && typeof node[key] === 'object') {
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

    // Verify source file is readable without mutating
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

    // Helper to register an extracted unit
    const addUnit = (type, text, location) => {
      const id = `unit-${String(unitCounter++).padStart(5, '0')}`;
      const rawText = text || '';
      const normalizedText = rawText.replace(/\s+/g, ' ').trim();

      if (normalizedText.length === 0) {
        emptyUnitCounter++;
      }

      contentUnits.push({
        id,
        type,
        text: rawText,
        normalizedText,
        location
      });
    };

    // Traverse body top-level elements (<w:p> and <w:tbl>)
    // To preserve document order, we check bodyNode elements
    Object.keys(bodyNode).forEach(key => {
      if (key === 'w:p') {
        const pList = Array.isArray(bodyNode['w:p']) ? bodyNode['w:p'] : [bodyNode['w:p']];
        pList.forEach((pNode) => {
          const pText = this.extractTextFromParagraphNode(pNode);
          addUnit('paragraph', pText, {
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
                addUnit('table-cell', '', {
                  tableIndex: tableIdx,
                  rowIndex: rowIdx,
                  cellIndex: cellIdx,
                  paragraphIndex: 0
                });
              } else {
                cellParagraphs.forEach((pNode, cellPIdx) => {
                  const cellText = this.extractTextFromParagraphNode(pNode);
                  addUnit('table-cell', cellText, {
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

    // Extract Headers and Footers if present in ZIP entries
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
              addUnit('header', hText, {
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
              addUnit('footer', fText, {
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
        emptyUnitCount: emptyUnitCounter,
        headerCount: headerEntries.length,
        footerCount: footerEntries.length
      },
      content: contentUnits
    };
  }
}

module.exports = new DocxParserService();
