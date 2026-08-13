import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DocumentUploadPlaceholder from './components/DocumentUploadPlaceholder';
import { Shield, Database, Cpu, FileCheck } from 'lucide-react';

const App = () => {
  const [healthData, setHealthData] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          setHealthData(data);
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      } catch (error) {
        console.warn('Backend connection health check failed:', error.message);
        setIsBackendOnline(false);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const requiredPiiTypes = [
    'Full Names',
    'Email Addresses',
    'Phone Numbers',
    'Company / Org Names',
    'Physical Addresses',
    'Social Security Numbers',
    'Credit Card Numbers',
    'Dates of Birth',
    'IP Addresses'
  ];

  return (
    <div className="app-container">
      <Navbar healthData={healthData} isBackendOnline={isBackendOnline} />

      <main className="main-content">
        <section className="hero-section">
          <h2 className="hero-title">
            Enterprise <span>PII Redaction</span> Engine
          </h2>
          <p className="hero-subtitle">
            MERN foundation for high-precision synthetic redaction of sensitive data across Red Herring Prospectus DOCX files.
          </p>
        </section>

        <DocumentUploadPlaceholder />

        <div className="grid-2">
          <div className="info-card">
            <div className="info-card-header">
              <Shield className="info-card-icon" size={24} />
              <h3 className="info-card-title">Target PII Schema (Planned Scope)</h3>
            </div>
            <p>
              The system architecture is structured to support 9 core entity categories required for synthetic replacement:
            </p>
            <ul className="supported-pii-list">
              {requiredPiiTypes.map((pii, index) => (
                <li key={index} className="supported-pii-item">{pii}</li>
              ))}
            </ul>
          </div>

          <div className="info-card">
            <div className="info-card-header">
              <Cpu className="info-card-icon" size={24} />
              <h3 className="info-card-title">Execution 001 System Status</h3>
            </div>
            <p>
              Current status response from backend REST API (<code>GET /api/health</code>):
            </p>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Pinging backend API status...</p>
            ) : isBackendOnline ? (
              <pre className="response-box">
{JSON.stringify(healthData, null, 2)}
              </pre>
            ) : (
              <div style={{ color: '#ef4444', fontSize: '0.88rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px' }}>
                Backend server is currently offline or unreachable. Please start the backend service on port 5001.
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        Scaler AI Labs Assignment — PII Redaction Tool (Execution 002 DOCX Ingestion Foundation)
      </footer>
    </div>
  );
};

export default App;
