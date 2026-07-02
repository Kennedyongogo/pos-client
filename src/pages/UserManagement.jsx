import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import './UserManagement.css';

const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cashier'
};

const EMPTY_FORM = { username: '', password: '', full_name: '', role: ROLES.CASHIER };

const AVATAR_COLORS = ['#6c5ce7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

function getAvatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && showModal) closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const fetchUsers = async () => {
    try {
      const res = await apiGet(`/auth/users?client_id=${currentUser.client_id}`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q);
      const matchesRole =
        roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const adminCount = users.filter(u => u.role === ROLES.ADMIN && u.active).length;
  const cashierCount = users.filter(u => u.role === ROLES.CASHIER && u.active).length;
  const activeCount = users.filter(u => u.active).length;

  const openModal = () => {
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiPost('/auth/users', {
        ...form,
        client_id: currentUser.client_id,
        createdBy: currentUser.id
      });

      Swal.fire({
        title: 'User Created!',
        html: `
          <div style="text-align: left; line-height: 2.2;">
            <p><b>Username:</b> <span style="font-family:monospace; background:#f0f0f0; padding:4px 10px; border-radius:5px;">${form.username}</span></p>
            <p><b>Password:</b> <span style="font-family:monospace; background:#fff0f0; padding:4px 10px; border-radius:5px; color:#e74c3c;">${form.password}</span></p>
            <p><b>Role:</b> ${form.role === ROLES.ADMIN ? 'Admin' : 'Cashier'}</p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#6c5ce7'
      });

      closeModal();
      fetchUsers();
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'Failed to create user',
        icon: 'error',
        confirmButtonColor: '#302b63'
      });
    }
    setLoading(false);
  };

  const handleDeactivate = async (userId, username) => {
    const result = await Swal.fire({
      title: 'Deactivate User?',
      text: `Deactivate "${username}"? They will no longer be able to log in.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#94a3b8'
    });

    if (result.isConfirmed) {
      try {
        await apiDelete(`/auth/users/${userId}?role=${currentUser.role}`);
        fetchUsers();
        Swal.fire({ title: 'Deactivated', text: 'User can no longer log in.', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err) {
        Swal.fire('Error', err.response?.data?.error || 'Failed', 'error');
      }
    }
  };

  const handleResetPassword = async (userId, displayName) => {
    const result = await Swal.fire({
      title: 'Reset Password',
      html: `Set a new password for <b>${displayName}</b>`,
      input: 'password',
      inputLabel: 'New password',
      inputPlaceholder: 'At least 4 characters',
      inputAttributes: { minlength: 4, autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Save Password',
      confirmButtonColor: '#6c5ce7',
      cancelButtonText: 'Cancel',
      preConfirm: (value) => {
        if (!value || value.length < 4) {
          Swal.showValidationMessage('Password must be at least 4 characters');
        }
        return value;
      }
    });

    if (!result.isConfirmed) return;

    try {
      await apiPut(`/auth/users/${userId}/password`, {
        password: result.value,
        updatedBy: currentUser.id
      });
      Swal.fire({
        title: 'Password Updated',
        text: 'Works on this device now. Syncs to the hosted server when online.',
        icon: 'success',
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Error', err.data?.error || 'Failed to reset password', 'error');
    }
  };

  const renderAction = (u) => {
    if (!u.active) {
      return <span className="users-protected">Inactive</span>;
    }

    return (
      <div className="users-actions">
        <button
          type="button"
          className="users-btn-reset"
          onClick={() => handleResetPassword(u.id, u.full_name)}
        >
          Reset password
        </button>
        {u.role === ROLES.CASHIER && (
          <button type="button" className="users-btn-deactivate" onClick={() => handleDeactivate(u.id, u.username)}>
            Deactivate
          </button>
        )}
        {u.role === ROLES.ADMIN && u.id !== currentUser.id && (
          <span className="users-protected">Admin</span>
        )}
      </div>
    );
  };

  return (
    <div className="users-page">
      <header className="users-hero">
        <div>
          <h1>User Management</h1>
          <p>Create and manage staff accounts for your business</p>
          <span className="users-business-badge">🏪 {currentUser.business_name}</span>
        </div>
        <button type="button" className="users-btn-add" onClick={openModal}>
          <span>+</span> Add User
        </button>
      </header>

      <div className="users-stats">
        <div className="users-stat-card purple">
          <div className="users-stat-top">
            <div>
              <p className="users-stat-label">Total Staff</p>
              <p className="users-stat-value">{users.length}</p>
            </div>
            <div className="users-stat-icon">👥</div>
          </div>
        </div>
        <div className="users-stat-card blue">
          <div className="users-stat-top">
            <div>
              <p className="users-stat-label">Admins</p>
              <p className="users-stat-value">{adminCount}</p>
            </div>
            <div className="users-stat-icon">🔧</div>
          </div>
        </div>
        <div className="users-stat-card green">
          <div className="users-stat-top">
            <div>
              <p className="users-stat-label">Cashiers</p>
              <p className="users-stat-value">{cashierCount}</p>
            </div>
            <div className="users-stat-icon">💰</div>
          </div>
        </div>
        <div className="users-stat-card amber">
          <div className="users-stat-top">
            <div>
              <p className="users-stat-label">Active</p>
              <p className="users-stat-value">{activeCount}</p>
            </div>
            <div className="users-stat-icon">✓</div>
          </div>
        </div>
      </div>

      <div className="users-panel">
        <div className="users-panel-header">
          <div>
            <h2>Staff Directory</h2>
            <span className="users-panel-count">{filteredUsers.length} of {users.length} users</span>
          </div>
          <div className="users-panel-tools">
            <div className="users-search-wrap">
              <span>🔍</span>
              <input
                type="text"
                className="users-search"
                placeholder="Search by name or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: 'All Roles' },
              { id: ROLES.ADMIN, label: 'Admin' },
              { id: ROLES.CASHIER, label: 'Cashier' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`users-filter-chip ${roleFilter === f.id ? 'active' : ''}`}
                onClick={() => setRoleFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="users-empty">
            <div className="users-empty-icon">👥</div>
            <h3>{search ? 'No matching users' : 'No staff yet'}</h3>
            <p>{search ? 'Try a different search term.' : 'Add your first staff member to get started.'}</p>
            {!search && (
              <button type="button" className="users-btn-add" onClick={openModal}>+ Add First User</button>
            )}
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <colgroup>
                <col className="col-name" />
                <col className="col-username" />
                <col className="col-role" />
                <col className="col-status" />
                <col className="col-created" />
                <col className="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="users-cell-well">
                        <div className="users-avatar" style={{ background: getAvatarColor(u.full_name) }}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="users-name">{u.full_name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="users-cell-well">
                        <span className="users-username">{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <div className="users-cell-well">
                        <span className={`users-role-badge ${u.role}`}>
                          {u.role === ROLES.ADMIN ? 'Admin' : 'Cashier'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="users-cell-well">
                        <span className={`users-status-badge ${u.active ? 'active' : 'inactive'}`}>
                          <span className="users-status-dot" />
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="users-cell-well">
                        <span className="users-date">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="users-cell-well">{renderAction(u)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="users-modal-overlay" onClick={closeModal}>
          <div className="users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <div>
                <h2>Add Staff Member</h2>
                <p>Create a new account for {currentUser.business_name}</p>
              </div>
              <button type="button" className="users-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="users-modal-body">
                <div className="users-form-grid">
                  <div className="users-form-field full">
                    <label>Full Name <span>*</span></label>
                    <input
                      value={form.full_name}
                      onChange={e => setForm({ ...form, full_name: e.target.value })}
                      required
                      placeholder="e.g. John Smith"
                      autoFocus
                    />
                  </div>
                  <div className="users-form-field">
                    <label>Username <span>*</span></label>
                    <input
                      value={form.username}
                      onChange={e => setForm({ ...form, username: e.target.value })}
                      required
                      placeholder="Login username"
                    />
                  </div>
                  <div className="users-form-field">
                    <label>Password <span>*</span></label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                      placeholder="Temporary password"
                    />
                  </div>
                  <div className="users-role-cards">
                    <button
                      type="button"
                      className={`users-role-card ${form.role === ROLES.CASHIER ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, role: ROLES.CASHIER })}
                    >
                      <div className="users-role-card-icon">💰</div>
                      <div className="users-role-card-title">Cashier</div>
                      <div className="users-role-card-desc">POS access only</div>
                    </button>
                    <button
                      type="button"
                      className={`users-role-card ${form.role === ROLES.ADMIN ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, role: ROLES.ADMIN })}
                    >
                      <div className="users-role-card-icon">🔧</div>
                      <div className="users-role-card-title">Admin</div>
                      <div className="users-role-card-desc">Full business access</div>
                    </button>
                  </div>
                </div>
                <div className="users-modal-footer">
                  <button type="button" className="users-btn-cancel" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="users-btn-submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
