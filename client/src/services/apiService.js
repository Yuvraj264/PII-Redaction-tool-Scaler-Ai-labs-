/**
 * API Service Layer — PII Redaction Client
 * Centralized REST API consumption client with normalized error handling and safe UI responses.
 * Strictly consumes backend API responses without performing PII detection or document modification in React.
 */

const API_BASE = '/api';

/**
 * Normalizes HTTP fetch responses and handles API error payloads
 * @param {Response} response 
 * @returns {Promise<Object>} JSON data
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server returned HTTP error status ${response.status}`);
    }
    throw new Error('Invalid server response format.');
  }

  if (!response.ok || data.success === false) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Uploads a DOCX document to the backend ingestion endpoint
 * @param {File} file - Selected .docx file
 * @returns {Promise<Object>} Normalized upload metadata { documentId, originalName, sizeBytes, format, uploadTimestamp }
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await handleResponse(response);
  return data.document;
}

/**
 * Executes PII detection on an ingested document
 * @param {string} documentId - Ingested document ID
 * @returns {Promise<Object>} Safe detection summary { totalEntitiesDetected, breakdown, entitiesCount }
 */
export async function detectPii(documentId) {
  const response = await fetch(`${API_BASE}/documents/${documentId}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await handleResponse(response);
  return {
    documentId: data.documentId,
    summary: data.summary,
    totalEntitiesDetected: data.summary ? data.summary.totalEntitiesDetected : (data.entities ? data.entities.length : 0),
    breakdown: data.summary ? data.summary.breakdown : {}
  };
}

/**
 * Generates an OpenXML redacted DOCX file for an ingested document
 * @param {string} documentId - Ingested document ID
 * @returns {Promise<Object>} Redaction summary { documentId, redactedFileName, totalReplacementsApplied }
 */
export async function redactDocument(documentId) {
  const response = await fetch(`${API_BASE}/documents/${documentId}/redact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await handleResponse(response);
  return data.redaction;
}

/**
 * Runs independent post-redaction PII leakage verification
 * @param {string} documentId - Ingested document ID
 * @returns {Promise<Object>} Verification summary report { status, summary, leaks }
 */
export async function verifyRedaction(documentId) {
  const response = await fetch(`${API_BASE}/documents/${documentId}/verify-redaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await handleResponse(response);
  return data.leakageReport;
}

/**
 * Runs formal evaluation engine for an ingested document
 * @param {string} documentId - Ingested document ID
 * @returns {Promise<Object>} Evaluation result payload
 */
export async function evaluateDocument(documentId) {
  const response = await fetch(`${API_BASE}/evaluation/final`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId })
  });

  const data = await handleResponse(response);
  return data.result ? data.result : data;
}

/**
 * Returns the download URL for the generated redacted DOCX file
 * @param {string} documentId - Ingested document ID
 * @returns {string} Download endpoint URL
 */
export function getDownloadUrl(documentId) {
  return `${API_BASE}/documents/${documentId}/download`;
}
