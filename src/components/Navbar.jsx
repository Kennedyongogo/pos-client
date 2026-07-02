import React, { useState, useEffect } from 'react';
import './Navbar.css';

function Navbar({
  user,
  isOnline = true,
  usingCache = false,
  pendingCount = 0,
  activePage = 'pos',
  splitView = false,
  onBack,
  backLabel = 'Back',
  onProducts,
  onUsers,
  onReport,
  onToggleSplitView,
  onCustomerDisplay,
  onLogout
}) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAdmin = user.role === 'admin';
  const showNav = isAdmin && onProducts;
  const isSubPage = activePage !== 'pos';

  let connectionLabel = 'Local server';
  if (!isOnline && usingCache) {
    connectionLabel = pendingCount ? `Offline · Cached · ${pendingCount} queued` : 'Offline · Cached';
  } else if (!isOnline) {
    connectionLabel = pendingCount ? `Offline · ${pendingCount} queued` : 'Offline';
  } else if (pendingCount > 0) {
    connectionLabel = `${pendingCount} sale(s) queued`;
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        {isSubPage && onBack ? (
          <button type="button" className="navbar-back" onClick={onBack}>
            ← {backLabel}
          </button>
        ) : (
          <div className="navbar-brand">
            <div className="navbar-logo">CP</div>
            <div className="navbar-title-wrap">
              <h1 className="navbar-title">{user.business_name || 'POS System'}</h1>
              <p className="navbar-subtitle">Point of Sale</p>
            </div>
          </div>
        )}

        {showNav && (
          <nav className="navbar-nav">
            <button
              type="button"
              className={`navbar-nav-btn ${activePage === 'pos' ? 'active' : ''}`}
              onClick={onBack && activePage !== 'pos' ? onBack : undefined}
              disabled={activePage === 'pos'}
              title="POS"
            >
              🛒 <span className="label">POS</span>
            </button>
            <button
              type="button"
              className={`navbar-nav-btn ${activePage === 'products' ? 'active' : ''}`}
              onClick={onProducts}
              title="Products"
            >
              📦 <span className="label">Products</span>
            </button>
            <button
              type="button"
              className={`navbar-nav-btn ${activePage === 'users' ? 'active' : ''}`}
              onClick={onUsers}
              title="Users"
            >
              👥 <span className="label">Users</span>
            </button>
            <button
              type="button"
              className={`navbar-nav-btn ${activePage === 'report' ? 'active' : ''}`}
              onClick={onReport}
              title="Report"
            >
              📊 <span className="label">Report</span>
            </button>
            {onToggleSplitView && activePage === 'pos' && (
              <button
                type="button"
                className={`navbar-nav-btn ${splitView ? 'toggle-on' : ''}`}
                onClick={onToggleSplitView}
                title="Customer view"
              >
                👁️ <span className="label">{splitView ? 'Hide' : 'Customer'}</span>
              </button>
            )}
            {onCustomerDisplay && activePage === 'pos' && (
              <button type="button" className="navbar-nav-btn" onClick={onCustomerDisplay} title="Open display">
                🖥️ <span className="label">Display</span>
              </button>
            )}
          </nav>
        )}
      </div>

      <div className="navbar-right">
        <div className="navbar-meta">
          <span className={`navbar-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="navbar-status-dot" />
            {connectionLabel}
          </span>
          <span className="navbar-clock">{time}</span>
        </div>

        <div className="navbar-divider" />

        <div className="navbar-user">
          <div className="navbar-avatar">{user.full_name?.charAt(0).toUpperCase()}</div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user.full_name}</span>
            <span className={`navbar-role-badge ${user.role}`}>
              {user.role === 'admin' ? 'Admin' : 'Cashier'}
            </span>
          </div>
        </div>

        <button type="button" className="navbar-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
