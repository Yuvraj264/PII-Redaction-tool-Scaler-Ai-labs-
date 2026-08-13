import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Navbar() {
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'healthy' || data.status === 'ok' || data.success) {
          setHealth('healthy');
        } else {
          setHealth('degraded');
        }
      })
      .catch(() => setHealth('offline'));
  }, []);

  return (
    <header className="app-navbar">
      <div className="navbar-container">
        <div className="brand">
          <div className="brand-icon">
            <Shield className="icon" />
          </div>
          <div>
            <h1 className="brand-title">PII Redaction Engine</h1>
            <p className="brand-subtitle">Enterprise DOCX Privacy Compliance</p>
          </div>
        </div>

        <div className="navbar-status">
          <span className="version-badge">v1.0.0-final</span>
          <div className={`health-indicator ${health}`} title={`Server Health: ${health}`}>
            {health === 'healthy' && <CheckCircle2 className="status-icon success" />}
            {health !== 'healthy' && <AlertCircle className="status-icon warning" />}
            <span className="health-text">
              {health === 'healthy' ? 'System Online' : health === 'offline' ? 'Server Offline' : 'Degraded'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
