import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import OwnerDashboard from '../pages/OwnerDashboard';
import Pos from '../pages/Pos';
import Admin from '../pages/Admin';
import UserManagement from '../pages/UserManagement';
import MpesaSettings from '../pages/MpesaSettings';
import CustomerDisplay from '../pages/CustomerDisplay';
import Navbar from './Navbar';

function PageRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('pos_user');
      return null;
    }
  });

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
    localStorage.setItem('pos_customer_cart', '[]');
    localStorage.setItem('pos_customer_total', '0');
    navigate('/', { replace: true });
  };

  if (!user) {
    return null;
  }

  if (user.role === 'system_owner') {
    return (
      <Routes>
        <Route
          path="/owner"
          element={<OwnerDashboard user={user} onLogout={handleLogout} />}
        />
        <Route path="*" element={<Navigate to="/owner" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/pos" element={<Pos user={user} onLogout={handleLogout} />} />
      <Route
        path="/admin/products"
        element={
          <ShopShell user={user} activePage="products" onLogout={handleLogout}>
            <Admin clientId={user.client_id} />
          </ShopShell>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ShopShell user={user} activePage="users" onLogout={handleLogout}>
            <UserManagement currentUser={user} />
          </ShopShell>
        }
      />
      <Route
        path="/admin/mpesa"
        element={
          <ShopShell user={user} activePage="mpesa" onLogout={handleLogout}>
            <MpesaSettings currentUser={user} />
          </ShopShell>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ShopShell user={user} activePage="report" onLogout={handleLogout}>
            <SalesReport currentUser={user} />
          </ShopShell>
        }
      />
      <Route path="/customer-display" element={<CustomerDisplay />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}

function ShopShell({ user, activePage, onLogout, children }) {
  const navigate = useNavigate();

  const adminNavProps = user?.role === 'admin' ? {
    onProducts: () => navigate('/admin/products'),
    onUsers: () => navigate('/admin/users'),
    onMpesa: () => navigate('/admin/mpesa'),
    onReport: () => navigate('/admin/reports'),
    onToggleSplitView: () => navigate('/pos'),
    onCustomerDisplay: () => window.open('/customer-display', '_blank', 'width=500,height=700')
  } : {};

  return (
    <div className="App">
      <Navbar
        user={user}
        activePage={activePage}
        onBack={() => navigate('/pos')}
        backLabel="POS"
        onLogout={onLogout}
        {...adminNavProps}
      />
      {children}
    </div>
  );
}

export default PageRoutes;
