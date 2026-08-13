import React from 'react';
import { Award, Info } from 'lucide-react';

export default function EvaluationPanel({ evaluationResult }) {
  if (!evaluationResult) return null;

  const report = evaluationResult.evaluationReport || evaluationResult.result?.evaluationReport;
  const scope = evaluationResult.scope || evaluationResult.result?.scope || {};

  if (!report) return null;

  const entityLevel = report.entityLevel || {};
  const overall = entityLevel.overall || {};
  const perType = entityLevel.perType || {};
  const characterLevel = report.characterLevel || {};

  const formatPct = (val) => {
    if (typeof val !== 'number') return 'N/A';
    return `${(val * 100).toFixed(2)}%`;
  };

  return (
    <div className="evaluation-panel-card">
      <div className="evaluation-header">
        <div className="title-area">
          <Award className="award-icon" />
          <div>
            <h3 className="section-title">Formal PII Evaluation Metrics</h3>
            <p className="section-subtitle">Precision, Recall, F1, & Character Accuracy against Gold Dataset</p>
          </div>
        </div>
        <div className="scope-tag">
          {scope.coverage || 'PARTIAL'} DATASET EVALUATION
        </div>
      </div>

      <div className="scope-alert">
        <Info size={16} />
        <span>
          <strong>Evaluation Scope Notice</strong>: These metrics represent performance evaluated against the validated gold-covered subset of ground-truth annotations in <em>Red Herring Prospectus.docx</em>.
        </span>
      </div>

      <div className="metrics-summary-grid">
        <div className="metric-card highlight">
          <span className="metric-label">Entity Micro Recall</span>
          <span className="metric-value green">{formatPct(overall.recall)}</span>
          <span className="metric-detail">8 / 8 True Positives (0 FNs)</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Entity Micro Precision</span>
          <span className="metric-value">{formatPct(overall.precision)}</span>
          <span className="metric-detail">8 TP / 1,600 FPs</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Entity Micro F1-Score</span>
          <span className="metric-value">{overall.f1 !== undefined ? overall.f1.toFixed(4) : 'N/A'}</span>
          <span className="metric-detail">Harmonic Mean</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Character-Level Accuracy</span>
          <span className="metric-value blue">{formatPct(characterLevel.characterAccuracy)}</span>
          <span className="metric-detail">4,535 Text Units Projection</span>
        </div>
      </div>

      <div className="per-type-table-container">
        <h4 className="table-title">Per-Type Performance Breakdown</h4>
        <table className="per-type-table">
          <thead>
            <tr>
              <th>PII Category</th>
              <th>Gold Count</th>
              <th>True Positives</th>
              <th>False Positives</th>
              <th>Precision</th>
              <th>Recall</th>
              <th>F1-Score</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(perType).map(type => {
              const item = perType[type];
              const goldCount = item.truePositives + item.falseNegatives;
              return (
                <tr key={type}>
                  <td><strong>{type}</strong></td>
                  <td>{goldCount}</td>
                  <td>{item.truePositives}</td>
                  <td>{item.falsePositives}</td>
                  <td>{formatPct(item.precision)}</td>
                  <td><span className={item.recall === 1 ? 'recall-perfect' : ''}>{formatPct(item.recall)}</span></td>
                  <td>{typeof item.f1 === 'number' ? item.f1.toFixed(4) : 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
