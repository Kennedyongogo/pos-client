import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { apiPost } from '../utils/api';
import './Landing.css';

function Landing({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiPost('/auth/login', {
        username,
        password,
        client_code: clientCode
      });

      if (res.success) {
        Swal.fire({
          title: 'Welcome back!',
          text: `Signed in as ${res.data.full_name}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => onLogin(res.data), 800);
      }
    } catch (err) {
      Swal.fire({
        title: 'Login failed',
        text: err.data?.error || err.message || 'Invalid credentials. Please try again.',
        icon: 'error',
        confirmButtonText: 'Try again',
        confirmButtonColor: '#6c5ce7'
      });
    }
    setLoading(false);
  };

  const fieldClass = (name) =>
    `login-input-wrap ${focusedField === name ? 'focused' : ''} ${name === 'password' ? 'password' : ''}`;

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="login-hero-bg">
          <div className="login-orb login-orb-1" />
          <div className="login-orb login-orb-2" />
          <div className="login-orb login-orb-3" />
        </div>
        <div className="login-hero-content">
          <div className="login-hero-logo">CP</div>
          <h1>Run your store smarter</h1>
          <p className="login-hero-tagline">
            Fast checkout, real-time inventory, and sales insights — all in one beautiful POS built for modern retail.
          </p>
          <ul className="login-features">
            <li>
              <span className="login-feature-icon">⚡</span>
              Lightning-fast sales & barcode scanning
            </li>
            <li>
              <span className="login-feature-icon">📦</span>
              Inventory & product management
            </li>
            <li>
              <span className="login-feature-icon">📊</span>
              Reports, staff roles & multi-store ready
            </li>
          </ul>
        </div>
        <p className="login-hero-footer">Carlynve Technologies © 2026</p>
      </aside>

      <main className="login-form-panel">
        <div className="login-card">
          <div className="login-mobile-logo">
            <div className="icon">CP</div>
            <span>Carlynve POS</span>
          </div>

          <div className="login-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Business code <span>optional for owner</span></label>
              <div className={fieldClass('client')}>
                <span className="login-input-icon">🏪</span>
                <input
                  type="text"
                  placeholder="e.g. KENN1927"
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value)}
                  onFocus={() => setFocusedField('client')}
                  onBlur={() => setFocusedField('')}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="login-field">
              <label>Username</label>
              <div className={fieldClass('username')}>
                <span className="login-input-icon">👤</span>
                <input
                  type="text"
                  placeholder="Your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField('')}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className={fieldClass('password')}>
                <span className="login-input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="login-card-footer">Secure login · Carlynve POS</p>
        </div>
      </main>
    </div>
  );
}

export default Landing;
