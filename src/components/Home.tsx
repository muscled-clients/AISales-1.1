import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">Muscled Sales AI</h1>
        <p className="home-subtitle">Choose your AI-powered sales tool</p>

        <div className="pathway-cards">
          {/* Proposals AI Card */}
          <div
            className="pathway-card"
            onClick={() => navigate('/proposals-ai')}
          >
            <div className="card-icon">📄</div>
            <h2 className="card-title">Proposals AI</h2>
            <p className="card-description">
              Generate professional sales proposals with AI assistance
            </p>
            <div className="card-features">
              <span className="feature-tag">Document Generation</span>
              <span className="feature-tag">Templates</span>
              <span className="feature-tag">Smart Formatting</span>
            </div>
            <button className="card-button">
              Launch Proposals AI →
            </button>
          </div>

          {/* AI Sales Assistant Card */}
          <div
            className="pathway-card"
            onClick={() => navigate('/ai-sales-assistant')}
          >
            <div className="card-icon">🎙️</div>
            <h2 className="card-title">AI Sales Assistant</h2>
            <p className="card-description">
              Real-time AI assistance during sales calls with live transcription
            </p>
            <div className="card-features">
              <span className="feature-tag">Live Transcription</span>
              <span className="feature-tag">AI Chat</span>
              <span className="feature-tag">Smart Todos</span>
            </div>
            <button className="card-button">
              Launch Sales Assistant →
            </button>
          </div>
        </div>

        {/* Session History Link */}
        <div className="secondary-actions">
          <button
            className="secondary-button"
            onClick={() => navigate('/session-history')}
          >
            📚 View Session History
          </button>
        </div>

        <footer className="home-footer">
          <p>Made with ❤️ for better sales conversations</p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
