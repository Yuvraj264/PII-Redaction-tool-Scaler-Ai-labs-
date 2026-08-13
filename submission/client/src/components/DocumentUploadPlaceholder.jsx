import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const DocumentUploadPlaceholder = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      uploadFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Invalid file format. Please select a Microsoft Word (.docx) document.');
      setUploadResult(null);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setUploadResult(data.document);
      if (onUploadSuccess) {
        onUploadSuccess(data.document);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="upload-container" style={{ marginBottom: '2.5rem' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx"
        style={{ display: 'none' }}
      />

      {!uploadResult ? (
        <div
          className={`upload-card ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{ cursor: 'pointer' }}
        >
          <div className="upload-icon-wrapper">
            {uploading ? (
              <Loader2 size={36} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <UploadCloud size={36} />
            )}
          </div>

          <h3 className="upload-title">
            {uploading ? 'Ingesting DOCX Document...' : 'Upload DOCX Document'}
          </h3>

          <p className="upload-description">
            Drag and drop your <strong>Red Herring Prospectus (.docx)</strong> file here, or click to browse. Safe metadata ingestion (Execution 002).
          </p>

          <div className="pill-container">
            <span className="pill">DOCX Only</span>
            <span className="pill">Max 50MB</span>
            <span className="pill">Isolated Storage</span>
            <span className="pill">Execution 002</span>
          </div>

          {error && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="info-card"
          style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={28} style={{ color: '#10b981' }} />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                  Document Ingested Successfully
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Metadata generated (No PII extracted yet)
                </span>
              </div>
            </div>

            <button
              onClick={resetUpload}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw size={14} /> Upload Another
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem 1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document ID</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#38bdf8', marginTop: '0.25rem' }}>{uploadResult.documentId}</p>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem 1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original File</span>
              <p style={{ fontSize: '0.88rem', color: '#f8fafc', fontWeight: 600, marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadResult.originalName}</p>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem 1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>File Size</span>
              <p style={{ fontSize: '0.88rem', color: '#f8fafc', fontWeight: 600, marginTop: '0.25rem' }}>{formatFileSize(uploadResult.size)}</p>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem 1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extension</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#a7f3d0', marginTop: '0.25rem' }}>{uploadResult.extension}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadPlaceholder;
