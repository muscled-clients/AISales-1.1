import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProposalsAI.css';

const ProposalsAI: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="proposals-container">
      <div className="proposals-content">
        <button
          className="back-button"
          onClick={() => navigate('/')}
        >
          ← Back to Home
        </button>

        <div className="proposals-hero">
          <div className="hero-icon">📄</div>
          <h1>Proposals AI</h1>
          <p className="hero-subtitle">AI-Powered Proposal Generation</p>
        </div>

        <div className="coming-soon-card">
          <h2>🚧 Coming Soon</h2>
          <p>
            Proposals AI is currently under development. This feature will allow you to:
          </p>

          <ul className="feature-list">
            <li>
              <span className="feature-icon">✨</span>
              <span>Generate professional sales proposals with AI assistance</span>
            </li>
            <li>
              <span className="feature-icon">📝</span>
              <span>Use customizable templates for different industries</span>
            </li>
            <li>
              <span className="feature-icon">🎯</span>
              <span>Auto-fill client details and project requirements</span>
            </li>
            <li>
              <span className="feature-icon">💼</span>
              <span>Smart pricing recommendations based on market data</span>
            </li>
            <li>
              <span className="feature-icon">📊</span>
              <span>Track proposal status and client engagement</span>
            </li>
          </ul>

          <div className="cta-section">
            <p className="cta-text">In the meantime, try our AI Sales Assistant</p>
            <button
              className="cta-button"
              onClick={() => navigate('/ai-sales-assistant')}
            >
              Launch AI Sales Assistant →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalsAI;
