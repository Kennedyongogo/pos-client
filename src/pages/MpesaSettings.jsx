import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiGet, apiPost, apiPut } from '../utils/api';
import './MpesaSettings.css';

const SANDBOX_SHORTCODE = '174379';
const SANDBOX_PASSKEY =
  'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

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
  const [status, setStatus] = useState({
    configured: false,
    hasConsumerKey: false,
    hasConsumerSecret: false,
    hasPasskey: false,
    passkeyLength: 0,
    stkAudit: null
  });

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
      setStatus({
        configured: Boolean(res.data.configured),
        hasConsumerKey: Boolean(res.data.hasConsumerKey),
        hasConsumerSecret: Boolean(res.data.hasConsumerSecret),
        hasPasskey: Boolean(res.data.hasPasskey),
        passkeyLength: res.data.passkeyLength || 0,
        stkAudit: res.data.stkAudit || null
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

  const applySandboxDefaults = () => {
    setForm((prev) => ({
      ...prev,
      env: 'sandbox',
      enabled: true,
      shortcode: SANDBOX_SHORTCODE,
      passkey: SANDBOX_PASSKEY
    }));
    setShowSecrets(true);
  };

  const ensurePasskeyForTest = () => {
    if (form.passkey?.trim()) return true;
    if (status.hasPasskey) return true;
    Swal.fire(
      'Passkey required',
      'Paste the Lipa Na M-Pesa Online passkey (or click Fill sandbox defaults), then save before testing.',
      'warning'
    );
    return false;
  };

  const handleTest = async () => {
    if (!ensurePasskeyForTest()) return;
    try {
      await apiPut(`/mpesa/settings/${clientId}`, {
        ...form,
        updatedBy: currentUser.id
      });
      const res = await apiPost('/mpesa/test-auth', { client_id: clientId });
      const audit = res.data?.stkAudit;
      if (audit && !audit.ok) {
        Swal.fire('OAuth OK, STK not ready', res.data?.message || audit.issue, 'warning');
        return;
      }
      Swal.fire('Daraja OK', res.data?.message || 'OAuth and STK credentials look valid.', 'success');
    } catch (err) {
      Swal.fire('Test failed', err.data?.error || err.message || 'Invalid credentials', 'error');
    }
  };

  const handleTestStk = async () => {
    if (!ensurePasskeyForTest()) return;
    try {
      await apiPut(`/mpesa/settings/${clientId}`, {
        ...form,
        updatedBy: currentUser.id
      });
      const res = await apiPost('/mpesa/test-stk', { client_id: clientId });
      Swal.fire('STK sent', res.data?.message || res.data?.customerMessage || 'Check sandbox phone 254708374149', 'success');
    } catch (err) {
      Swal.fire('STK test failed', err.data?.error || err.message || 'Could not send STK', 'error');
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
            {status.configured ? (
              <span className="mpesa-status-ok"> ✓ Ready for STK when online</span>
            ) : (
              <span className="mpesa-status-warn">
                {' '}
                ✗ Not ready — enable M-Pesa, fill shortcode, consumer key/secret, and passkey, then save.
              </span>
            )}
          </p>
          {form.env === 'sandbox' && (
            <p className="mpesa-note mpesa-sandbox-hint">
              Sandbox: shortcode <code>174379</code>, passkey from Daraja → M-Pesa Express (64 hex chars).
              Test phone: <code>254708374149</code>. Do not use Security Credential.
            </p>
          )}
          {status.stkAudit && !status.stkAudit.ok && (
            <p className="mpesa-note mpesa-status-warn">
              STK issue: {status.stkAudit.issue}
              {status.passkeyLength > 0 ? ` (stored passkey length: ${status.passkeyLength})` : ''}
              {status.stkAudit.sandboxPasskeyMatch === false
                ? ' — passkey does not match sandbox default; use Fill sandbox defaults.'
                : ''}
            </p>
          )}

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
              <label>Lipa Na M-Pesa Online passkey</label>
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
            {form.env === 'sandbox' && (
              <button type="button" className="mpesa-btn-secondary" onClick={applySandboxDefaults}>
                Fill sandbox defaults
              </button>
            )}
            <button type="button" className="mpesa-btn-secondary" onClick={handleTest}>
              Test OAuth
            </button>
            <button type="button" className="mpesa-btn-secondary" onClick={handleTestStk}>
              Test STK (1 KES)
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
