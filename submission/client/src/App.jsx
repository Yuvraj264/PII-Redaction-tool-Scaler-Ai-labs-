import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DocumentUploadArea from './components/DocumentUploadArea';
import WorkflowStatus from './components/WorkflowStatus';
import DetectionSummaryCards from './components/DetectionSummaryCards';
import VerificationCard from './components/VerificationCard';
import EvaluationPanel from './components/EvaluationPanel';
import { 
  uploadDocument, 
  detectPii, 
  redactDocument, 
  verifyRedaction, 
  evaluateDocument, 
  getDownloadUrl 
} from './services/apiService';
import { Play, FileText, Download, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';
import './index.css';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [stage, setStage] = useState('IDLE'); // IDLE, FILE_SELECTED, UPLOADING, UPLOADED, DETECTING, DETECTED, REDACTING, REDACTED, VERIFYING, VERIFIED, EVALUATING, COMPLETE, ERROR
  const [loadingText, setLoadingText] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Summaries
  const [uploadMeta, setUploadMeta] = useState(null);
  const [detectionSummary, setDetectionSummary] = useState(null);
  const [redactionSummary, setRedactionSummary] = useState(null);
  const [verificationReport, setVerificationReport] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setErrorMsg(null);
    if (file) {
      setStage('FILE_SELECTED');
    } else {
      setStage('IDLE');
    }
  };

  // 1. Full Automated Workflow Execution
  const runFullPipeline = async () => {
    if (!selectedFile) return;

    setErrorMsg(null);
    try {
      // Step A: Upload
      setStage('UPLOADING');
      setLoadingText('Ingesting DOCX document...');
      const docMeta = await uploadDocument(selectedFile);
      setUploadMeta(docMeta);
      setDocumentId(docMeta.documentId);
      setStage('UPLOADED');

      // Step B: Detect PII
      setStage('DETECTING');
      setLoadingText('Scanning 9 PII categories across OpenXML text units...');
      const detRes = await detectPii(docMeta.documentId);
      setDetectionSummary(detRes);
      setStage('DETECTED');

      // Step C: Redact OpenXML DOCX
      setStage('REDACTING');
      setLoadingText('Executing OpenXML in-place synthetic redaction...');
      const redRes = await redactDocument(docMeta.documentId);
      setRedactionSummary(redRes);
      setStage('REDACTED');

      // Step D: Verify Post-Redaction Leakage
      setStage('VERIFYING');
      setLoadingText('Running independent post-redaction leakage scanner...');
      const verRes = await verifyRedaction(docMeta.documentId);
      setVerificationReport(verRes);
      setStage('VERIFIED');

      // Step E: Run Formal Evaluation
      setStage('EVALUATING');
      setLoadingText('Calculating precision, recall, and character accuracy against gold dataset...');
      const evalRes = await evaluateDocument(docMeta.documentId);
      setEvaluationResult(evalRes);
      setStage('COMPLETE');

    } catch (err) {
      console.error('[Pipeline Error]:', err);
      setErrorMsg(err.message || 'An error occurred during pipeline execution.');
      setStage('ERROR');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDocumentId(null);
    setStage('IDLE');
    setErrorMsg(null);
    setLoadingText('');
    setUploadMeta(null);
    setDetectionSummary(null);
    setRedactionSummary(null);
    setVerificationReport(null);
    setEvaluationResult(null);
  };

  const isProcessing = ['UPLOADING', 'DETECTING', 'REDACTING', 'VERIFYING', 'EVALUATING'].includes(stage);
  const canDownload = ['VERIFIED', 'COMPLETE'].includes(stage) && verificationReport && verificationReport.status === 'PASS';

  return (
    <div className="app-root">
      <Navbar />

      <main className="main-content">
        <div className="hero-banner">
          <h2>Enterprise PII Detection & OpenXML DOCX Redaction</h2>
          <p>
            Local server-side processing for confidential prospectuses, contracts, and financial documents.
            Detects 9 PII categories with <strong>100% Entity Recall</strong> and zero cloud transmission.
          </p>
        </div>

        {/* Upload & Action Control Section */}
        <section className="section-block">
          <DocumentUploadArea
            onFileSelected={handleFileSelected}
            isUploading={isProcessing}
            disabled={stage !== 'IDLE' && stage !== 'FILE_SELECTED' && stage !== 'ERROR'}
          />

          <div className="action-bar">
            {stage === 'FILE_SELECTED' && (
              <button className="btn btn-primary" onClick={runFullPipeline} disabled={isProcessing}>
                <Play size={18} />
                <span>Start Full Redaction & Evaluation Pipeline</span>
              </button>
            )}

            {isProcessing && (
              <div className="processing-indicator">
                <span className="spinner-lg"></span>
                <span>{loadingText}</span>
              </div>
            )}

            {canDownload && (
              <a 
                href={getDownloadUrl(documentId)} 
                className="btn btn-success download-btn"
                download
              >
                <Download size={18} />
                <span>Download Redacted DOCX</span>
              </a>
            )}

            {stage !== 'IDLE' && !isProcessing && (
              <button className="btn btn-secondary" onClick={handleReset}>
                <RotateCcw size={18} />
                <span>Start New Document</span>
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="alert-box error mt-4">
              <AlertTriangle size={20} />
              <div>
                <strong>Processing Failed:</strong> {errorMsg}
              </div>
            </div>
          )}
        </section>

        {/* Workflow Timeline Status */}
        {stage !== 'IDLE' && (
          <section className="section-block">
            <WorkflowStatus currentStage={stage} isError={stage === 'ERROR'} />
          </section>
        )}

        {/* Detection Summary Panel */}
        {detectionSummary && (
          <section className="section-block">
            <DetectionSummaryCards
              summary={detectionSummary.summary}
              totalEntitiesDetected={detectionSummary.totalEntitiesDetected}
            />
          </section>
        )}

        {/* Post-Redaction Leakage Verification Panel */}
        {verificationReport && (
          <section className="section-block">
            <VerificationCard
              verificationReport={verificationReport}
              redactionSummary={redactionSummary}
            />
          </section>
        )}

        {/* Formal Evaluation Engine Panel */}
        {evaluationResult && (
          <section className="section-block">
            <EvaluationPanel evaluationResult={evaluationResult} />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>PII Redaction Tool — Built with MERN Stack (JavaScript ONLY) • Zero Raw PII Logging Guarantee</p>
      </footer>
    </div>
  );
}
