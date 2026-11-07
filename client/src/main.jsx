import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuctionProvider } from './context/AuctionContext';
import App from './App';
import './index.css';

// Global error boundary to prevent black screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111215] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#ffd000] flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(255,208,0,0.4)] text-black font-black">
            ⚽
          </div>
          <h1 className="text-2xl font-black text-[#ffd000] uppercase tracking-tight mb-2">
            SAG PREMIERE LEAGUE
          </h1>
          <p className="text-sm text-[#8b8e99] max-w-md mb-6">
            An unexpected error occurred while loading. Click below to reload.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-lg bg-[#ffd000] text-black font-black text-xs uppercase tracking-wider hover:bg-[#facc15] transition"
            >
              Reload Platform
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="px-6 py-2.5 rounded-lg bg-[#22242e] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#2c2f3b] transition"
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AuctionProvider>
            <App />
          </AuctionProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
