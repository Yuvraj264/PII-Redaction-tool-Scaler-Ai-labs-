import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';

const Navbar = ({ healthData, isBackendOnline }) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="/" className="brand">
          <div className="brand-icon">
            <ShieldCheck size={22} />
          </div>
          <div className="brand-text">
            <h1>PII Redaction Tool</h1>
            <span>Scaler AI Labs</span>
          </div>
        </a>

        <div className={`status-badge ${isBackendOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          <span>
            {isBackendOnline
              ? `Backend Operational (v${healthData?.version || '1.0.0'})`
              : 'Backend Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
