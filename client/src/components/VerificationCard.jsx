import React from 'react';
import { ShieldCheck, ShieldAlert, FileText, CheckCircle } from 'lucide-react';

export default function VerificationCard({ verificationReport, redactionSummary }) {
  if (!verificationReport) return null;

  const status = verificationReport.status || 'PASS';
  const summary = verificationReport.summary || {};
  const isPass = status === 'PASS' && (summary.confirmedLeaksCount || 0) === 0;

  return (
    <div className={`verification-panel ${isPass ? 'pass' : 'fail'}`}>
      <div className="verification-header">
        <div className="status-badge-container">
          {isPass ? (
            <div className="status-badge pass">
              <ShieldCheck size={24} />
              <span>LEAKAGE SCAN PASSED</span>
            </div>
          ) : (
            <div className="status-badge fail">
              <ShieldAlert size={24} />
              <span>LEAKAGE DETECTED</span>
            </div>
          )}
        </div>
        <div className="verification-meta">
          <FileText size={16} />
          <span>{verificationReport.redactedFileName || 'Redacted Document'}</span>
        </div>
      </div>

      <div className="verification-grid">
        <div className="stat-box leak-box">
          <span className="stat-value">{summary.confirmedLeaksCount || 0}</span>
          <span className="stat-label">Confirmed Original Leaks</span>
        </div>

        <div className="stat-box">
          <span className="stat-value">{summary.possibleLeaksCount || 0}</span>
          <span className="stat-label">Possible Leaks</span>
        </div>

        <div className="stat-box synthetic-box">
          <span className="stat-value">{summary.expectedSyntheticCount || 0}</span>
          <span className="stat-label">Expected Synthetic Entities</span>
        </div>

        <div className="stat-box">
          <span className="stat-value">{summary.scannerFalsePositivesCount || 0}</span>
          <span className="stat-label">Scanner False Positives</span>
        </div>
      </div>

      {redactionSummary && (
        <div className="redaction-metrics-row">
          <div className="metric-chip">
            <CheckCircle size={14} />
            <span>OpenXML Run Replacements Applied: <strong>{redactionSummary.totalReplacementsApplied || 0}</strong></span>
          </div>
          <div className="metric-chip">
            <CheckCircle size={14} />
            <span>OpenXML Replacements Applied: <strong>{redactionSummary.totalReplacementsApplied || 0}</strong></span>
          </div>
        </div>
      )}

      {!isPass && (
        <div className="warning-banner">
          <ShieldAlert size={18} />
          <span>Warning: Residual PII leakage confirmed. Document should not be submitted externally without review.</span>
        </div>
      )}
    </div>
  );
}
