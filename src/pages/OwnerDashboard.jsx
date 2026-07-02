import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from '../utils/api';
import './OwnerDashboard.css';

const EMPTY_FORM = {
  business_name: '',
  owner_name: '',
  phone: '',
  email: '',
  address: '',
  admin_username: '',
  admin_password: ''
};

const AVATAR_COLORS = ['#6c5ce7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

function getAvatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function OwnerDashboard({ user, onLogout }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/auth/clients?userId=${user.id}`);
      setClients(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showForm) closeForm();
        if (selectedClient) setSelectedClient(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showForm, selectedClient]);

  const activeCount = clients.filter((c) => c.active).length;
  const inactiveCount = clients.length - activeCount;
  const totalSales = clients.reduce((sum, c) => sum + (c.transaction_count || 0), 0);
  const totalUsers = clients.reduce((sum, c) => sum + (c.user_count || 0), 0);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        client.client_code?.toLowerCase().includes(query) ||
        client.business_name?.toLowerCase().includes(query) ||
        client.owner_name?.toLowerCase().includes(query) ||
        client.admin_username?.toLowerCase().includes(query) ||
        client.phone?.includes(query);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && client.active) ||
        (statusFilter === 'inactive' && !client.active);

      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const openForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await apiPost('/auth/clients', { ...form, createdBy: user.id });

      Swal.fire({
        title: 'Client Created!',
        html: `
          <div style="text-align:left;line-height:1.8;">
            <p><b>Business:</b> ${res.data.business_name}</p>
            <p><b>Client Code:</b> <span style="background:#f0edff;padding:4px 10px;border-radius:8px;font-family:monospace;color:#6c5ce7;">${res.data.client_code}</span></p>
            <p><b>Admin Username:</b> <span style="font-family:monospace;color:#2563eb;">${res.data.admin_username}</span></p>
            <p><b>Admin Password:</b> <span style="font-family:monospace;color:#dc2626;">${res.data.admin_password}</span></p>
          </div>
          <p style="color:#dc2626;font-size:13px;margin-top:15px;">Save these credentials. The client code is required for login.</p>
        `,
        icon: 'success',
        confirmButtonText: 'Copy Client Code',
        confirmButtonColor: '#6c5ce7',
        showCancelButton: true,
        cancelButtonText: 'Close',
        cancelButtonColor: '#94a3b8'
      }).then((result) => {
        if (result.isConfirmed) {
          navigator.clipboard.writeText(res.data.client_code);
          Swal.fire({ title: 'Copied!', text: 'Client code copied to clipboard', icon: 'success', confirmButtonColor: '#6c5ce7' });
        }
      });

      closeForm();
      fetchClients();
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'Failed to create client',
        icon: 'error',
        confirmButtonColor: '#6c5ce7'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="owner-page">
      <header className="owner-navbar">
        <div className="owner-navbar-left">
          <div className="owner-navbar-logo">CP</div>
          <div>
            <h1 className="owner-navbar-title">Carlynve POS</h1>
            <p className="owner-navbar-subtitle">System Owner Console</p>
          </div>
        </div>
        <div className="owner-navbar-right">
          <div className="owner-user-pill">
            <div className="owner-user-avatar">{user.full_name?.charAt(0).toUpperCase()}</div>
            <span className="owner-user-name">{user.full_name}</span>
          </div>
          <button type="button" className="owner-btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="owner-content">
        <div className="owner-hero">
          <div>
            <h1>Client Management</h1>
            <p>Onboard businesses, manage client codes, and monitor store activity.</p>
            <span className="owner-role-badge">👑 System Owner</span>
          </div>
          <button type="button" className="owner-btn-add" onClick={openForm}>
            + Add Client
          </button>
        </div>

        <div className="owner-stats">
          <div className="owner-stat-card purple">
            <div className="owner-stat-top">
              <div className="owner-stat-icon">🏪</div>
            </div>
            <p className="owner-stat-label">Total Clients</p>
            <p className="owner-stat-value">{clients.length}</p>
            <p className="owner-stat-sub">Registered businesses</p>
          </div>
          <div className="owner-stat-card green">
            <div className="owner-stat-top">
              <div className="owner-stat-icon">✅</div>
            </div>
            <p className="owner-stat-label">Active</p>
            <p className="owner-stat-value">{activeCount}</p>
            <p className="owner-stat-sub">{inactiveCount} inactive</p>
          </div>
          <div className="owner-stat-card blue">
            <div className="owner-stat-top">
              <div className="owner-stat-icon">🧾</div>
            </div>
            <p className="owner-stat-label">Total Sales</p>
            <p className="owner-stat-value">{totalSales}</p>
            <p className="owner-stat-sub">Across all clients</p>
          </div>
          <div className="owner-stat-card amber">
            <div className="owner-stat-top">
              <div className="owner-stat-icon">👥</div>
            </div>
            <p className="owner-stat-label">Staff Accounts</p>
            <p className="owner-stat-value">{totalUsers}</p>
            <p className="owner-stat-sub">Users in all stores</p>
          </div>
        </div>

        <div className="owner-panel">
          <div className="owner-panel-header">
            <div>
              <h2>Clients</h2>
              <span className="owner-panel-count">
                {filteredClients.length} of {clients.length} clients shown
              </span>
            </div>
            <div className="owner-panel-tools">
              <div className="owner-search-wrap">
                <span>🔍</span>
                <input
                  type="text"
                  className="owner-search"
                  placeholder="Search code, business, owner, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'inactive', label: 'Inactive' }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`owner-filter-chip ${statusFilter === filter.id ? 'active' : ''}`}
                    onClick={() => setStatusFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="owner-loading">
              <div className="owner-spinner" />
              Loading clients…
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="owner-empty">
              <div className="owner-empty-icon">🏪</div>
              <h3>{search || statusFilter !== 'all' ? 'No matching clients' : 'No clients yet'}</h3>
              <p>
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search or status filter.'
                  : 'Add your first business to start using the POS platform.'}
              </p>
              {!search && statusFilter === 'all' && (
                <button type="button" className="owner-btn-add" onClick={openForm}>+ Add First Client</button>
              )}
            </div>
          ) : (
            <div className="owner-table-wrap">
              <table className="owner-table">
                <colgroup>
                  <col className="col-code" />
                  <col className="col-business" />
                  <col className="col-owner" />
                  <col className="col-admin" />
                  <col className="col-phone" />
                  <col className="col-users" />
                  <col className="col-sales" />
                  <col className="col-status" />
                  <col className="col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Client Code</th>
                    <th>Business</th>
                    <th>Owner</th>
                    <th>Admin User</th>
                    <th>Phone</th>
                    <th>Users</th>
                    <th>Sales</th>
                    <th>Status</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} onClick={() => setSelectedClient(client)}>
                      <td>
                        <div className="owner-cell-well">
                          <span className="owner-client-code">{client.client_code}</span>
                        </div>
                      </td>
                      <td>
                        <div className="owner-cell-well">
                          <div className="owner-business-cell">
                            <div
                              className="owner-business-avatar"
                              style={{ background: getAvatarColor(client.business_name) }}
                            >
                              {client.business_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="owner-business-name">{client.business_name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="owner-cell-well">{client.owner_name}</div>
                      </td>
                      <td>
                        <div className="owner-cell-well">
                          <span className="owner-admin-user">{client.admin_username || 'admin'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="owner-cell-well">{client.phone || '—'}</div>
                      </td>
                      <td>
                        <div className="owner-cell-well">
                          <span className="owner-metric-badge users">{client.user_count || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="owner-cell-well">
                          <span className="owner-metric-badge sales">{client.transaction_count || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="owner-cell-well">
                          <span className={`owner-status-badge ${client.active ? 'active' : 'inactive'}`}>
                            <span className="owner-status-dot" />
                            {client.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="owner-cell-well">
                          <button
                            type="button"
                            className="owner-btn-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client);
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="owner-modal-overlay" onClick={closeForm}>
          <div className="owner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <div>
                <h2>New Client Setup</h2>
                <p>Create a business account and admin login credentials.</p>
              </div>
              <button type="button" className="owner-modal-close" onClick={closeForm}>✕</button>
            </div>
            <form className="owner-modal-body" onSubmit={handleCreateClient}>
              <div className="owner-form-grid">
                <div className="owner-form-group">
                  <label htmlFor="business_name">Business Name *</label>
                  <input
                    id="business_name"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    required
                  />
                </div>
                <div className="owner-form-group">
                  <label htmlFor="owner_name">Owner Name *</label>
                  <input
                    id="owner_name"
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    required
                  />
                </div>
                <div className="owner-form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="owner-form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="owner-form-group">
                  <label htmlFor="admin_username">Admin Username</label>
                  <input
                    id="admin_username"
                    value={form.admin_username}
                    onChange={(e) => setForm({ ...form, admin_username: e.target.value })}
                    placeholder="Default: admin"
                  />
                  <p className="owner-form-hint">Leave blank to use the default admin username.</p>
                </div>
                <div className="owner-form-group">
                  <label htmlFor="admin_password">Admin Password</label>
                  <input
                    id="admin_password"
                    value={form.admin_password}
                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                    placeholder="Default: admin123"
                  />
                  <p className="owner-form-hint">Leave blank to use the default password.</p>
                </div>
                <div className="owner-form-group full-width">
                  <label htmlFor="address">Address</label>
                  <input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="owner-modal-actions">
                <button type="button" className="owner-btn-cancel" onClick={closeForm}>Cancel</button>
                <button type="submit" className="owner-btn-submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="owner-modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="owner-modal detail" onClick={(e) => e.stopPropagation()}>
            <div className="owner-detail-hero">
              <div className="owner-detail-hero-main">
                <div
                  className="owner-detail-avatar"
                  style={{ background: getAvatarColor(selectedClient.business_name) }}
                >
                  {selectedClient.business_name?.charAt(0).toUpperCase()}
                </div>
                <div className="owner-detail-hero-text">
                  <h2>{selectedClient.business_name}</h2>
                  <div className="owner-detail-hero-meta">
                    <button
                      type="button"
                      className="owner-detail-code-btn"
                      title="Copy client code"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedClient.client_code);
                        Swal.fire({
                          title: 'Copied',
                          text: 'Client code copied to clipboard',
                          icon: 'success',
                          timer: 1200,
                          showConfirmButton: false
                        });
                      }}
                    >
                      <span className="owner-detail-code-text">{selectedClient.client_code}</span>
                      <span className="owner-detail-copy-icon">⎘</span>
                    </button>
                    <span className={`owner-status-badge ${selectedClient.active ? 'active' : 'inactive'}`}>
                      <span className="owner-status-dot" />
                      {selectedClient.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" className="owner-modal-close light" onClick={() => setSelectedClient(null)}>✕</button>
            </div>

            <div className="owner-detail-body">
              <div className="owner-detail-metrics">
                <div className="owner-detail-metric users">
                  <span className="owner-detail-metric-icon">👥</span>
                  <div>
                    <strong>{selectedClient.user_count || 0}</strong>
                    <span>Users</span>
                  </div>
                </div>
                <div className="owner-detail-metric sales">
                  <span className="owner-detail-metric-icon">🧾</span>
                  <div>
                    <strong>{selectedClient.transaction_count || 0}</strong>
                    <span>Sales</span>
                  </div>
                </div>
                <div className="owner-detail-metric created">
                  <span className="owner-detail-metric-icon">📅</span>
                  <div>
                    <strong>{new Date(selectedClient.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    <span>{new Date(selectedClient.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="owner-detail-fields">
                <div className="owner-detail-field">
                  <span className="owner-detail-field-icon">👤</span>
                  <div>
                    <label>Owner</label>
                    <p>{selectedClient.owner_name}</p>
                  </div>
                </div>
                <div className="owner-detail-field">
                  <span className="owner-detail-field-icon">🔑</span>
                  <div>
                    <label>Admin User</label>
                    <p className="owner-detail-mono">{selectedClient.admin_username || 'admin'}</p>
                  </div>
                </div>
                <div className="owner-detail-field">
                  <span className="owner-detail-field-icon">📞</span>
                  <div>
                    <label>Phone</label>
                    <p>{selectedClient.phone || '—'}</p>
                  </div>
                </div>
                <div className="owner-detail-field">
                  <span className="owner-detail-field-icon">✉️</span>
                  <div>
                    <label>Email</label>
                    <p className="owner-detail-email">{selectedClient.email || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="owner-detail-address">
                <span className="owner-detail-field-icon">📍</span>
                <div>
                  <label>Address</label>
                  <p>{selectedClient.address || '—'}</p>
                </div>
              </div>
            </div>

            <div className="owner-detail-footer">
              <button type="button" className="owner-btn-cancel" onClick={() => setSelectedClient(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;
