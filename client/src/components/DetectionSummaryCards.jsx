import React from 'react';
import { User, Mail, Phone, Building2, MapPin, Calendar, CreditCard, Lock, Network } from 'lucide-react';

export default function DetectionSummaryCards({ summary, totalEntitiesDetected }) {
  const breakdown = summary?.breakdown || {};

  const CATEGORIES = [
    { key: 'PERSON', label: 'Person Names', icon: User, color: '#3b82f6' },
    { key: 'EMAIL', label: 'Email Addresses', icon: Mail, color: '#10b981' },
    { key: 'PHONE', label: 'Phone Numbers', icon: Phone, color: '#f59e0b' },
    { key: 'ORGANIZATION', label: 'Organizations', icon: Building2, color: '#8b5cf6' },
    { key: 'ADDRESS', label: 'Physical Addresses', icon: MapPin, color: '#ec4899' },
    { key: 'DOB', label: 'Dates of Birth', icon: Calendar, color: '#06b6d4' },
    { key: 'SSN', label: 'SSN Numbers', icon: Lock, color: '#ef4444' },
    { key: 'CREDIT_CARD', label: 'Credit Cards (Luhn)', icon: CreditCard, color: '#6366f1' },
    { key: 'IP_ADDRESS', label: 'IP Addresses', icon: Network, color: '#64748b' }
  ];

  return (
    <div className="detection-summary-panel">
      <div className="summary-header">
        <div>
          <h3 className="section-title">PII Candidates Summary</h3>
          <p className="section-subtitle">Aggregate candidate entity spans detected across 9 supported categories</p>
        </div>
        <div className="total-badge">
          <span className="total-count">{totalEntitiesDetected || 0}</span>
          <span className="total-label">PII Candidates Detected</span>
        </div>
      </div>

      <div className="category-cards-grid">
        {CATEGORIES.map(cat => {
          const count = breakdown[cat.key] || 0;
          const Icon = cat.icon;
          return (
            <div key={cat.key} className={`category-card ${count > 0 ? 'active' : 'empty'}`}>
              <div className="card-top">
                <div className="icon-wrapper" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                  <Icon size={20} />
                </div>
                <span className="count-number" style={{ color: count > 0 ? cat.color : '#94a3b8' }}>
                  {count}
                </span>
              </div>
              <div className="card-label">{cat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
