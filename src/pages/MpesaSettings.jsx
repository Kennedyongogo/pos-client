import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiGet, apiPost, apiPut } from '../utils/api';
import './MpesaSettings.css';

const EMPTY_FORM = {
  enabled: false,
  env: 'sandbox',
  shortcode: '',
  consumerKey: '',
  consumerSecret: '',
  passkey: ''
};

function MpesaSettings({ currentUser }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const clientId = currentUser.client_id;

  useEffect(() => {
    loadSettings();
  }, [clientId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/mpesa/settings/${clientId}?userId=${currentUser.id}`);
      setForm({
        enabled: res.data.enabled,
        env: res.data.env || 'sandbox',
        shortcode: res.data.shortcode || '',
        consumerKey: '',
        consumerSecret: '',
        passkey: ''
      });
    } catch (err) {
      Swal.fire('Error', err.data?.error || 'Could not load M-Pesa settings', 'error');
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut(`/mpesa/settings/${clientId}`, {
        ...form,
        updatedBy: currentUser.id
      });
      Swal.fire({
        title: 'M-Pesa saved',
        text: 'Your shop can use M-Pesa STK when online.',
        icon: 'success',
        timer: 2200,
        showConfirmButton: false
      });
      await loadSettings();
    } catch (err) {
      Swal.fire('Error', err.data?.error || 'Failed to save M-Pesa settings', 'error');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    try {
      await apiPut(`/mpesa/settings/${clientId}`, {
        ...form,
        updatedBy: currentUser.id
      });
      await apiPost('/mpesa/test-auth', { client_id: clientId });
      Swal.fire('Daraja OK', 'Your M-Pesa credentials are valid.', 'success');
    } catch (err) {
      Swal.fire('Test failed', err.data?.error || err.message || 'Invalid credentials', 'error');
    }
  };

  if (loading) {
    return <div className="mpesa-page"><div className="mpesa-loading">Loading M-Pesa settings…</div></div>;
  }

  return (
    <div className="mpesa-page">
      <header className="mpesa-hero">
        <div>
          <h1>M-Pesa setup</h1>
          <p>Configure Safaricom Daraja for {currentUser.business_name}</p>
          <span className="mpesa-badge">🏪 {currentUser.client_code}</span>
        </div>
      </header>

      <div className="mpesa-panel">
        <div className="mpesa-panel-header">
          <h2>Daraja credentials</h2>
          <p>Enter your shop&apos;s Safaricom developer app keys and Lipa Na M-Pesa passkey.</p>
        </div>

        <div className="mpesa-panel-body">
          <p className="mpesa-note">
            M-Pesa STK only works when the shop is <strong>online</strong>. Use cash when offline.
            Callback URL is managed on the hosted server.
          </p>

          <form onSubmit={handleSave} className="mpesa-form">
          <label className="mpesa-toggle">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            <span>Enable M-Pesa STK for this shop</span>
          </label>

          <div className="mpesa-grid">
            <div className="mpesa-field">
              <label>Environment</label>
              <select
                value={form.env}
                onChange={(e) => setForm({ ...form, env: e.target.value })}
              >
                <option value="sandbox">Sandbox (testing)</option>
                <option value="production">Production (live)</option>
              </select>
            </div>
            <div className="mpesa-field">
              <label>Business shortcode / till</label>
              <input
                value={form.shortcode}
                onChange={(e) => setForm({ ...form, shortcode: e.target.value })}
                placeholder="174379"
                required={form.enabled}
              />
            </div>
            <div className="mpesa-field full">
              <label>Consumer key</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={form.consumerKey}
                onChange={(e) => setForm({ ...form, consumerKey: e.target.value })}
                placeholder="From developer.safaricom.co.ke"
                autoComplete="off"
              />
            </div>
            <div className="mpesa-field full">
              <label>Consumer secret</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={form.consumerSecret}
                onChange={(e) => setForm({ ...form, consumerSecret: e.target.value })}
                placeholder="Leave blank to keep existing"
                autoComplete="off"
              />
            </div>
            <div className="mpesa-field full">
              <label>Lipa Na M-Pesa passkey</label>
              <div className="mpesa-secret-wrap">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={form.passkey}
                  onChange={(e) => setForm({ ...form, passkey: e.target.value })}
                  placeholder="Leave blank to keep existing"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="mpesa-eye"
                  onClick={() => setShowSecrets(!showSecrets)}
                  aria-label={showSecrets ? 'Hide secrets' : 'Show secrets'}
                >
                  {showSecrets ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          </div>

          <div className="mpesa-actions">
            <button type="button" className="mpesa-btn-secondary" onClick={handleTest}>
              Test OAuth
            </button>
            <button type="submit" className="mpesa-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save M-Pesa settings'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MpesaSettings;
