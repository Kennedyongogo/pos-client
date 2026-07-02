import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import PageRoutes from './components/PageRoutes';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/*" element={<PageRoutes />} />
      </Routes>
    </Router>
  );
}

function LandingRoute() {
  const saved = localStorage.getItem('pos_user');
  if (saved) {
    try {
      JSON.parse(saved);
      return <Navigate to="/pos" replace />;
    } catch {
      localStorage.removeItem('pos_user');
    }
  }

  return (
    <Landing
      onLogin={(userData) => {
        localStorage.setItem('pos_user', JSON.stringify(userData));
        window.location.href = userData.role === 'system_owner' ? '/owner' : '/pos';
      }}
    />
  );
}

export default App;
