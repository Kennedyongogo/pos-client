import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { formatCurrency } from '../utils/config';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { saveProductsCache } from '../utils/offlineStore';
import './Admin.css';

const EMPTY_FORM = { barcode: '', name: '', price: '', cost: '', stock: '', category: '' };

function getStockLevel(stock) {
  if (stock <= 0) return 'out';
  if (stock <= 5) return 'low';
  if (stock <= 20) return 'medium';
  return 'high';
}

function getAvatarColor(name) {
  const colors = ['#6c5ce7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

function Admin({ clientId }) {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && showModal) closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const fetchProducts = async () => {
    try {
      const res = await apiGet(`/products?client_id=${clientId}`);
      setProducts(res.data);
      saveProductsCache(clientId, res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(search)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const level = getStockLevel(p.stock || 0);
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in' && level !== 'out') ||
        (stockFilter === 'low' && (level === 'low' || level === 'out')) ||
        (stockFilter === 'out' && level === 'out');

      const matchesCategory =
        categoryFilter === 'all' || p.category === categoryFilter;

      return matchesSearch && matchesStock && matchesCategory;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === 'stock') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'profit') {
        const profitA = parseFloat(a.price || 0) - parseFloat(a.cost || 0);
        const profitB = parseFloat(b.price || 0) - parseFloat(b.cost || 0);
        return profitB - profitA;
      }
      return 0;
    });

    return list;
  }, [products, search, stockFilter, categoryFilter, sortBy]);

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * parseFloat(p.price || 0)), 0);
  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;

  const formProfit = (parseFloat(form.price) || 0) - (parseFloat(form.cost) || 0);
  const formMargin = parseFloat(form.price) > 0
    ? ((formProfit / parseFloat(form.price)) * 100).toFixed(1)
    : '0.0';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      barcode: form.barcode,
      name: form.name,
      price: parseFloat(form.price),
      cost: form.cost ? parseFloat(form.cost) : 0,
      stock: form.stock ? parseInt(form.stock, 10) : 0,
      category: form.category,
      client_id: clientId
    };
    try {
      if (editing) await apiPut(`/products/${editing}`, data);
      else await apiPost('/products', data);

      Swal.fire({
        title: editing ? 'Updated!' : 'Added!',
        text: `${form.name} has been ${editing ? 'updated' : 'added'} successfully.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      fetchProducts();
      closeModal();
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.response?.data?.error || err.message, icon: 'error' });
    }
  };

  const handleEdit = (p) => {
    setEditing(p.id);
    setForm({
      barcode: p.barcode || '',
      name: p.name,
      price: p.price.toString(),
      cost: p.cost?.toString() || '',
      stock: p.stock?.toString() || '0',
      category: p.category || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: 'Delete Product?',
      text: `Remove "${name}" from your catalog? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Keep',
      cancelButtonColor: '#94a3b8'
    });

    if (result.isConfirmed) {
      try {
        await apiDelete(`/products/${id}`);
        fetchProducts();
        Swal.fire({ title: 'Deleted', text: 'Product removed from catalog.', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch {
        Swal.fire('Error', 'Delete failed', 'error');
      }
    }
  };

  const renderStockCell = (p) => {
    const level = getStockLevel(p.stock || 0);
    const maxBar = Math.max(...products.map(x => x.stock || 0), 1);
    const width = Math.min(100, ((p.stock || 0) / maxBar) * 100);

    return (
      <div className="admin-stock-wrap">
        <span className={`admin-stock-badge ${level}`}>
          {p.stock} {level === 'out' ? '· Out' : level === 'low' ? '· Low' : ''}
        </span>
        <div className="admin-stock-bar">
          <div className={`admin-stock-fill ${level}`} style={{ width: `${width}%` }} />
        </div>
      </div>
    );
  };

  const renderProductRow = (p) => {
    const profit = parseFloat(p.price || 0) - parseFloat(p.cost || 0);
    const margin = parseFloat(p.price) > 0 ? ((profit / parseFloat(p.price)) * 100).toFixed(0) : 0;

    return (
      <tr key={p.id}>
        <td>
          <div className="cell-well">
            <div className="admin-product-cell">
              <div className="admin-product-avatar" style={{ background: getAvatarColor(p.name) }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="admin-product-name">{p.name}</div>
            </div>
          </div>
        </td>
        <td>
          <div className="cell-well">
            {p.barcode ? <span className="admin-barcode">{p.barcode}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
          </div>
        </td>
        <td>
          <div className="cell-well">
            {p.category ? <span className="admin-category-badge">{p.category}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
          </div>
        </td>
        <td>
          <div className="cell-well">
            <span className="admin-price">{formatCurrency(p.price)}</span>
          </div>
        </td>
        <td>
          <div className="cell-well">
            <span className="admin-cost">{formatCurrency(p.cost || 0)}</span>
          </div>
        </td>
        <td>
          <div className="cell-well">{renderStockCell(p)}</div>
        </td>
        <td>
          <div className="cell-well">
            <div className="admin-profit-cell">
              <span className={`admin-profit ${profit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(profit)}
              </span>
              <span className="admin-margin">{margin}% margin</span>
            </div>
          </div>
        </td>
        <td>
          <div className="cell-well">
            <div className="admin-actions">
              <button type="button" className="admin-action-btn edit" onClick={() => handleEdit(p)} title="Edit">✏️</button>
              <button type="button" className="admin-action-btn delete" onClick={() => handleDelete(p.id, p.name)} title="Delete">🗑️</button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const renderProductCard = (p) => {
    const profit = parseFloat(p.price || 0) - parseFloat(p.cost || 0);
    const level = getStockLevel(p.stock || 0);

    return (
      <div key={p.id} className="admin-product-card">
        <div className="admin-card-top">
          <div className="admin-product-cell">
            <div className="admin-product-avatar" style={{ background: getAvatarColor(p.name) }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="admin-product-name">{p.name}</div>
              {p.category && <span className="admin-category-badge">{p.category}</span>}
            </div>
          </div>
          <div className="admin-card-price">{formatCurrency(p.price)}</div>
        </div>
        <div className="admin-card-stats">
          <div className="admin-card-stat">
            <label>Stock</label>
            <span className={`admin-stock-badge ${level}`} style={{ display: 'inline-block' }}>{p.stock}</span>
          </div>
          <div className="admin-card-stat">
            <label>Profit</label>
            <span className={profit >= 0 ? 'positive' : 'negative'}>{formatCurrency(profit)}</span>
          </div>
          <div className="admin-card-stat">
            <label>Cost</label>
            <span>{formatCurrency(p.cost || 0)}</span>
          </div>
          <div className="admin-card-stat">
            <label>Barcode</label>
            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.barcode || '—'}</span>
          </div>
        </div>
        <div className="admin-card-actions">
          <button type="button" style={{ background: '#eff6ff', color: '#2563eb' }} onClick={() => handleEdit(p)}>Edit</button>
          <button type="button" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => handleDelete(p.id, p.name)}>Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-page">
      <header className="admin-hero">
        <div>
          <h1>Product Management</h1>
          <p>Manage your inventory, pricing, and product catalog</p>
        </div>
        <div className="admin-hero-actions">
          <button type="button" className="admin-btn-add" onClick={openAddModal}>
            <span>+</span> Add Product
          </button>
        </div>
      </header>

      <div className="admin-stats">
        <div className="admin-stat-card purple">
          <div className="admin-stat-top">
            <div>
              <p className="admin-stat-label">Total Products</p>
              <p className="admin-stat-value">{products.length}</p>
            </div>
            <div className="admin-stat-icon">📦</div>
          </div>
          <p className="admin-stat-sub">{categories.length - 1} categories</p>
        </div>
        <div className="admin-stat-card blue">
          <div className="admin-stat-top">
            <div>
              <p className="admin-stat-label">Total Stock</p>
              <p className="admin-stat-value">{totalStock.toLocaleString()}</p>
            </div>
            <div className="admin-stat-icon">📊</div>
          </div>
          <p className="admin-stat-sub">Units across all products</p>
        </div>
        <div className="admin-stat-card green">
          <div className="admin-stat-top">
            <div>
              <p className="admin-stat-label">Inventory Value</p>
              <p className="admin-stat-value">{formatCurrency(totalValue)}</p>
            </div>
            <div className="admin-stat-icon">💰</div>
          </div>
          <p className="admin-stat-sub">At retail price</p>
        </div>
        <div className="admin-stat-card amber">
          <div className="admin-stat-top">
            <div>
              <p className="admin-stat-label">Needs Attention</p>
              <p className="admin-stat-value" style={{ color: lowStockCount + outOfStockCount > 0 ? '#d97706' : '#0f172a' }}>
                {lowStockCount + outOfStockCount}
              </p>
            </div>
            <div className="admin-stat-icon">⚠️</div>
          </div>
          <p className="admin-stat-sub">{lowStockCount} low · {outOfStockCount} out of stock</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <span className="admin-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, barcode, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="admin-search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'in', 'low', 'out'].map(f => (
              <button
                key={f}
                type="button"
                className={`admin-filter-chip ${stockFilter === f ? 'active' : ''}`}
                onClick={() => setStockFilter(f)}
              >
                {f === 'all' ? 'All Stock' : f === 'in' ? 'In Stock' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>
          {categories.length > 2 && (
            <select className="admin-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
          )}
          <select className="admin-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="price">Sort: Price</option>
            <option value="stock">Sort: Stock</option>
            <option value="profit">Sort: Profit</option>
          </select>
        </div>
        <div className="admin-view-toggle">
          <button type="button" className={`admin-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>Table</button>
          <button type="button" className={`admin-view-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>Cards</button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>Product Catalog</h2>
          <span className="admin-panel-count">{filteredProducts.length} of {products.length} products</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📦</div>
            <h3>{search || stockFilter !== 'all' || categoryFilter !== 'all' ? 'No matching products' : 'No products yet'}</h3>
            <p>
              {search || stockFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Add your first product to start building your catalog.'}
            </p>
            {!search && stockFilter === 'all' && categoryFilter === 'all' && (
              <button type="button" className="admin-btn-add" onClick={openAddModal}>+ Add First Product</button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <colgroup>
                <col className="col-product" />
                <col className="col-barcode" />
                <col className="col-category" />
                <col className="col-price" />
                <col className="col-cost" />
                <col className="col-stock" />
                <col className="col-profit" />
                <col className="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Cost</th>
                  <th>Stock</th>
                  <th>Profit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{filteredProducts.map(renderProductRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="admin-cards-grid">{filteredProducts.map(renderProductCard)}</div>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal product-form" onClick={(e) => e.stopPropagation()}>
            <div className="admin-product-modal-hero">
              <div className="admin-product-modal-hero-text">
                <h2>{editing ? 'Edit Product' : 'Add New Product'}</h2>
                <span className="admin-product-modal-badge">
                  {editing ? form.name || 'Update details' : 'New catalog item'}
                </span>
              </div>
              <button type="button" className="admin-modal-close light" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="admin-product-modal-form">
              <div className="admin-product-modal-body">
                <div className="admin-product-preview-strip">
                  <div className="admin-product-preview-item">
                    <span>Profit</span>
                    <strong className={formProfit >= 0 ? 'green' : 'red'}>{formatCurrency(formProfit)}</strong>
                  </div>
                  <div className="admin-product-preview-item">
                    <span>Margin</span>
                    <strong>{formMargin}%</strong>
                  </div>
                  <div className="admin-product-preview-item">
                    <span>Stock Value</span>
                    <strong>{formatCurrency((parseFloat(form.price) || 0) * (parseInt(form.stock, 10) || 0))}</strong>
                  </div>
                </div>

                <div className="admin-product-form-grid">
                  <div className="admin-form-field span-full">
                    <label>Product Name <span>*</span></label>
                    <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Whole Milk 1L" autoFocus />
                  </div>
                  <div className="admin-form-field">
                    <label>Barcode</label>
                    <input name="barcode" value={form.barcode} onChange={handleChange} placeholder="Scan or type" />
                  </div>
                  <div className="admin-form-field">
                    <label>Category</label>
                    <input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Dairy" list="category-suggestions" />
                    <datalist id="category-suggestions">
                      {categories.filter(c => c !== 'all').map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="admin-form-field">
                    <label>Selling Price (KSh) <span>*</span></label>
                    <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required placeholder="0.00" />
                  </div>
                  <div className="admin-form-field">
                    <label>Cost Price (KSh)</label>
                    <input name="cost" type="number" step="0.01" min="0" value={form.cost} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="admin-form-field span-full">
                    <label>Stock Quantity <span>*</span></label>
                    <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="admin-product-modal-footer">
                <button type="button" className="admin-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="admin-btn-submit">
                  {editing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
