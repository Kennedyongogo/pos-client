import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { API_URL } from './config';

function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'cashier' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/users?client_id=${currentUser.client_id}&role=${currentUser.role}`);
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      await axios.post(`${API_URL}/auth/users`, {
        ...form,
        client_id: currentUser.client_id,
        createdBy: currentUser.id
      });
      setMessage('User created successfully!');
      setForm({ username: '', password: '', full_name: '', role: 'cashier' });
      fetchUsers();
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const handleDeactivate = async (userId) => {
    if (window.confirm('Deactivate this user?')) {
      try {
        await axios.delete(`${API_URL}/auth/users/${userId}?role=${currentUser.role}`);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed');
      }
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#1a1a2e' }}>User Management</h1>
      
      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', marginBottom: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginBottom: '20px' }}>Create New User</h2>
        
        {message && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', background: message.includes('Error') ? '#fee' : '#efe', color: message.includes('Error') ? '#e74c3c' : '#27ae60' }}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Username *</label>
            <input value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password *</label>
            <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Name *</label>
            <input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Role *</label>
            <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', background: 'white' }}>
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={{
              padding: '12px 30px', background: '#27ae60', color: 'white',
              border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
            }}>
              Create User
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginBottom: '20px' }}>All Users ({users.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Username</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Full Name</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Role</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Status</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Created</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: '500' }}>{user.username}</td>
                <td style={{ padding: '10px' }}>{user.full_name}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                    background: user.role === 'admin' ? '#3498db' : '#27ae60',
                    color: 'white'
                  }}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ color: user.active ? '#27ae60' : '#e74c3c' }}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '10px', fontSize: '13px', color: '#7f8c8d' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px' }}>
                  {user.active ? (
                    <button onClick={() => handleDeactivate(user.id)} style={{
                      padding: '5px 12px', background: '#e74c3c', color: 'white',
                      border: 'none', borderRadius: '3px', cursor: 'pointer'
                    }}>
                      Deactivate
                    </button>
                  ) : (
                    <span style={{ color: '#95a5a6', fontSize: '12px' }}>Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Users;