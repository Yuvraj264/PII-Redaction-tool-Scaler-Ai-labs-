import React from 'react';
import { UploadCloud, FileText, Lock, CheckCircle2 } from 'lucide-react';

const DocumentUploadPlaceholder = () => {
  return (
    <div className="upload-card">
      <div className="upload-icon-wrapper">
        <UploadCloud size={34} />
      </div>
      
      <h3 className="upload-title">Document Processing Engine Shell</h3>
      
      <p className="upload-description">
        System foundation initialized. Prepared for 127-page Red Herring Prospectus (DOCX) ingestion and synthetic PII redaction pipeline in upcoming executions.
      </p>

      <div className="pill-container">
        <span className="pill">DOCX Format</span>
        <span className="pill">MERN Architecture</span>
        <span className="pill">Execution 001 Complete</span>
        <span className="pill">Engine Ready</span>
      </div>
    </div>
  );
};

export default DocumentUploadPlaceholder;
