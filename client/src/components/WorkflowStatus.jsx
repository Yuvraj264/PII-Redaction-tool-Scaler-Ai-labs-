import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';

export default function WorkflowStatus({ currentStage, isError }) {
  const STAGES = [
    { id: 'UPLOAD', label: '1. Ingest DOCX' },
    { id: 'DETECT', label: '2. Detect PII' },
    { id: 'REDACT', label: '3. Redact DOCX' },
    { id: 'VERIFY', label: '4. Leakage Scan' },
    { id: 'EVALUATE', label: '5. Evaluate' }
  ];

  const getStageState = (stageId, index) => {
    const stageOrder = ['IDLE', 'UPLOADING', 'UPLOADED', 'DETECTING', 'DETECTED', 'REDACTING', 'REDACTED', 'VERIFYING', 'VERIFIED', 'EVALUATING', 'COMPLETE'];
    const currentIndex = stageOrder.indexOf(currentStage);

    const stageMap = {
      'UPLOAD': ['UPLOADING', 'UPLOADED'],
      'DETECT': ['DETECTING', 'DETECTED'],
      'REDACT': ['REDACTING', 'REDACTED'],
      'VERIFY': ['VERIFYING', 'VERIFIED'],
      'EVALUATE': ['EVALUATING', 'COMPLETE']
    };

    const targetStages = stageMap[stageId] || [];
    const minTargetIndex = stageOrder.indexOf(targetStages[0]);
    const maxTargetIndex = stageOrder.indexOf(targetStages[1]);

    if (currentIndex > maxTargetIndex) return 'completed';
    if (currentIndex >= minTargetIndex && currentIndex <= maxTargetIndex) {
      if (currentIndex === minTargetIndex) return 'active';
      return 'completed';
    }
    return 'pending';
  };

  return (
    <div className="workflow-status-card">
      <h3 className="section-title">Processing Pipeline Workflow</h3>
      <div className="timeline-container">
        {STAGES.map((stage, idx) => {
          const state = getStageState(stage.id, idx);
          return (
            <div key={stage.id} className={`timeline-step ${state} ${isError && state === 'active' ? 'error' : ''}`}>
              <div className="step-node">
                {state === 'completed' && <Check className="step-icon" />}
                {state === 'active' && <Loader2 className="step-icon spinner" />}
                {state === 'pending' && <Circle className="step-icon" />}
              </div>
              <span className="step-label">{stage.label}</span>
              {idx < STAGES.length - 1 && <div className={`timeline-connector ${state === 'completed' ? 'filled' : ''}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
