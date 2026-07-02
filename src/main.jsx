import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { attachGlobalBootListeners, bootLog } from './utils/bootDebug';

attachGlobalBootListeners();
bootLog('main.jsx started', { url: window.location.href });

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#f4f6fb',
          fontFamily: 'Segoe UI, sans-serif',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#1a1640', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Check the browser console for errors.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#6c5ce7',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
