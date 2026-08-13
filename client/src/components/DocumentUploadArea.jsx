import React, { useState, useRef } from 'react';
import { UploadCloud, FileCheck, X, AlertTriangle } from 'lucide-react';

export default function DocumentUploadArea({ onFileSelected, isUploading, disabled }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;

    const isDocx = file.name.toLowerCase().endsWith('.docx') || 
                  file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isDocx) {
      setErrorMsg('Only Microsoft Word (.docx) documents are supported.');
      return false;
    }

    const maxSize = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxSize) {
      setErrorMsg('File size exceeds the 25 MB limit.');
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        if (onFileSelected) onFileSelected(file);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        if (onFileSelected) onFileSelected(file);
      }
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileSelected) onFileSelected(null);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="upload-area-container">
      {errorMsg && (
        <div className="alert-box error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div
        className={`dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !selectedFile && !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="file-input-hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {!selectedFile ? (
          <div className="dropzone-prompt">
            <div className="upload-icon-circle">
              <UploadCloud size={32} />
            </div>
            <h4 className="upload-heading">Drag & drop your DOCX document here</h4>
            <p className="upload-subheading">or click to browse from your computer (.docx files up to 25 MB)</p>
          </div>
        ) : (
          <div className="selected-file-info">
            <div className="file-icon-wrapper">
              <FileCheck size={28} />
            </div>
            <div className="file-details">
              <h4 className="file-name">{selectedFile.name}</h4>
              <span className="file-meta">{formatSize(selectedFile.size)} • Microsoft Word Document</span>
            </div>
            {!disabled && (
              <button type="button" className="clear-btn" onClick={handleClear} title="Remove File">
                <X size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
