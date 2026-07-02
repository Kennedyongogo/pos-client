import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import CustomerDisplay from './CustomerDisplay';
import Navbar from '../components/Navbar';
import '../App.css';
import './Pos.css';

import { formatCurrency } from '../utils/config';
import { apiGet, apiPost } from '../utils/api';
import { bootLog } from '../utils/bootDebug';
import { printReceiptDocument } from '../utils/printReceipt';
import {
  saveProductsCache,
  loadProductsCache,
  findProductByBarcode,
  getPendingTransactions,
  getPendingCount,
  addPendingTransaction,
  removePendingTransaction,
  createLocalId
} from '../utils/offlineStore';

function Pos({ user, onLogout }) {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [usingCache, setUsingCache] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [cloudSyncPending, setCloudSyncPending] = useState(0);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [splitView, setSplitView] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    sessionStorage.removeItem('pos_boot_retry');
    bootLog('POS screen mounted', { url: window.location.href });
  }, []);

  const refreshPendingCount = useCallback(() => {
    if (user?.client_id) {
      setPendingCount(getPendingCount(user.client_id));
    }
  }, [user?.client_id]);

  const fetchProducts = useCallback(async () => {
    if (!user?.client_id) return;
    try {
      const res = await apiGet(`/products?client_id=${user.client_id}`);
      setProducts(res.data);
      saveProductsCache(user.client_id, res.data);
      setUsingCache(false);
    } catch (err) {
      console.error(err);
      const cached = loadProductsCache(user.client_id);
      if (cached) {
        setProducts(cached.products);
        setUsingCache(true);
      }
    }
  }, [user?.client_id]);

  const flushPendingTransactions = useCallback(async () => {
    if (!user?.client_id) return 0;
    const pending = getPendingTransactions(user.client_id);
    let synced = 0;

    for (const tx of pending) {
      try {
        await apiPost('/transactions', {
          items: tx.items,
          total: tx.total,
          tax: tx.tax || 0,
          discount: tx.discount || 0,
          payment_method: tx.payment_method || 'cash',
          cashier_name: tx.cashier_name,
          cashier_id: tx.cashier_id,
          client_id: tx.client_id
        });
        removePendingTransaction(user.client_id, tx.localId);
        synced += 1;
      } catch {
        break;
      }
    }

    refreshPendingCount();
    if (synced > 0) {
      await fetchProducts();
    }
    return synced;
  }, [user?.client_id, fetchProducts, refreshPendingCount]);

  const checkConnection = useCallback(async () => {
    try {
      const health = await apiGet('/health');
      setIsOnline(true);
      setCloudSyncPending(health.sync?.pending || 0);
      setCloudSyncEnabled(Boolean(health.sync?.shopMode));

      const synced = await flushPendingTransactions();
      if (synced > 0) {
        Swal.fire({
          title: 'Sales synced locally',
          text: `${synced} queued sale(s) saved to the local database.`,
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      }

      if (health.sync?.shopMode) {
        try {
          const flush = await apiPost('/sync/flush', {});
          setCloudSyncPending(flush.data?.pending || 0);
          if (flush.data?.synced > 0) {
            Swal.fire({
              title: 'Synced to cloud',
              text: `${flush.data.synced} record(s) sent to your hosted server.`,
              icon: 'success',
              timer: 2800,
              showConfirmButton: false
            });
            await fetchProducts();
          }
        } catch {
          // VPS unreachable — local sales still work
        }
      }
    } catch {
      setIsOnline(false);
    }
  }, [flushPendingTransactions, fetchProducts]);

  useEffect(() => {
    if (user && user.role !== 'system_owner') {
      fetchProducts();
      checkConnection();
      refreshPendingCount();
    }
  }, [user, fetchProducts, checkConnection, refreshPendingCount]);

  useEffect(() => {
    if (!user || user.role === 'system_owner') return undefined;
    const timer = setInterval(checkConnection, 30000);
    return () => clearInterval(timer);
  }, [user, checkConnection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && barcode.trim() && user?.role !== 'system_owner') {
        addToCartByBarcode(barcode.trim());
        setBarcode('');
      }
      if (e.key === 'F2' && user?.role !== 'system_owner') {
        e.preventDefault();
        startCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcode, cart, user]);

  const addToCartByBarcode = async (code) => {
    try {
      const res = await apiGet(`/products/barcode/${code}?client_id=${user.client_id}`);
      addProductToCart(res.data);
    } catch {
      const cached = findProductByBarcode(user.client_id, code);
      if (cached) {
        addProductToCart(cached);
        return;
      }
      Swal.fire({ title: 'Not Found', text: 'Product not found!', icon: 'warning', timer: 1500, showConfirmButton: false });
    }
  };

  const addProductToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price } : item);
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price, subtotal: product.price }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.product_id !== id));
  
  const updateQuantity = (id, qty) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: qty, subtotal: qty * i.unit_price } : i));
  };

  // THESE MUST BE DECLARED BEFORE the useEffect that uses them
  const total = cart.reduce((s, i) => s + i.subtotal, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(p => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(productSearch));
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, categoryFilter]);

  const getProductAccent = (name) => {
    const colors = ['#6c5ce7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const getStockBadge = (stock) => {
    if (stock <= 0) return { class: 'out', label: 'Out' };
    if (stock <= 5) return { class: 'low', label: stock };
    return { class: 'ok', label: stock };
  };

  // Sync cart to localStorage for customer display (MUST come after total declaration)
  useEffect(() => {
    localStorage.setItem('pos_customer_cart', JSON.stringify(cart));
    localStorage.setItem('pos_customer_total', total.toString());
    localStorage.setItem('pos_customer_name', user?.business_name || '');
  }, [cart, total, user]);

  const finalizeSale = async (paymentMethod = 'cash', mpesaDetails = {}) => {
    if (cart.length === 0) return;
    const payload = {
      items: cart,
      total,
      tax: 0,
      discount: 0,
      payment_method: paymentMethod,
      cashier_name: user.full_name,
      cashier_id: user.id,
      client_id: user.client_id
    };

    try {
      const res = await apiPost('/transactions', payload);
      const sale = {
        ...res.data,
        payment_method: paymentMethod,
        mpesa_receipt: mpesaDetails.receipt || null,
        mpesa_phone: mpesaDetails.phone || null
      };
      setReceipt(sale);
      setCart([]);
      localStorage.setItem('pos_customer_cart', '[]');
      localStorage.setItem('pos_customer_total', '0');
      fetchProducts();
    } catch (err) {
      const isNetworkError = !err.status;

      if (isNetworkError && user.client_id) {
        const localId = createLocalId();
        const createdAt = new Date().toISOString();
        addPendingTransaction(user.client_id, {
          localId,
          ...payload,
          created_at: createdAt
        });
        refreshPendingCount();
        setReceipt({
          id: localId,
          receipt_number: `OFF-${localId.substring(0, 8).toUpperCase()}`,
          items: cart.map((item, index) => ({
            id: `${localId}-${index}`,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal
          })),
          total,
          payment_method: paymentMethod,
          mpesa_receipt: mpesaDetails.receipt || null,
          mpesa_phone: mpesaDetails.phone || null,
          created_at: createdAt,
          pending: true
        });
        setCart([]);
        localStorage.setItem('pos_customer_cart', '[]');
        localStorage.setItem('pos_customer_total', '0');
        Swal.fire({
          title: 'Saved offline',
          text: 'Sale queued on this device. It will sync when the local server is back.',
          icon: 'info',
          timer: 3200,
          showConfirmButton: false
        });
        return;
      }

      Swal.fire({
        title: 'Error',
        text: 'Transaction failed: ' + (err.data?.error || err.message || 'Unknown error'),
        icon: 'error'
      });
    }
  };

  const pollMpesaStatus = async (checkoutRequestId) => {
    const maxAttempts = 45;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await apiGet(`/mpesa/status/${checkoutRequestId}`);
      const { status, resultDesc, mpesaReceiptNumber, phone } = res.data;
      if (status === 'completed') {
        return { status, mpesaReceiptNumber, phone };
      }
      if (status === 'failed') {
        return { status, error: resultDesc || 'Payment was cancelled or failed' };
      }
    }
    return { status: 'failed', error: 'Timed out — customer did not complete payment in time' };
  };

  const handleMpesaCheckout = async () => {
    if (!isOnline) {
      Swal.fire({
        icon: 'info',
        title: 'M-Pesa needs internet',
        text: 'Use cash while offline. M-Pesa STK works when you are connected.',
        confirmButtonColor: '#6c5ce7'
      });
      return;
    }

    try {
      const cfg = await apiGet(`/mpesa/config?client_id=${user.client_id}`);
      if (!cfg.data?.enabled || !cfg.data?.configured) {
        Swal.fire({
          icon: 'warning',
          title: 'M-Pesa not set up',
          text: 'Ask the system owner to configure M-Pesa for this shop on the hosted server.',
          confirmButtonColor: '#6c5ce7'
        });
        return;
      }
    } catch {
      Swal.fire({
        icon: 'warning',
        title: 'M-Pesa unavailable',
        text: 'Could not reach the local server for M-Pesa. Is START_POS.bat running?',
        confirmButtonColor: '#6c5ce7'
      });
      return;
    }

    const { value: phone, isConfirmed } = await Swal.fire({
      title: 'M-Pesa — prompt customer',
      html: `<p style="margin:0 0 8px;color:#64748b">Amount: <strong>${formatCurrency(total)}</strong></p>`,
      input: 'tel',
      inputLabel: 'Customer phone number',
      inputPlaceholder: '07XXXXXXXX or 2547XXXXXXXX',
      showCancelButton: true,
      confirmButtonText: 'Send STK push',
      confirmButtonColor: '#00a651',
      inputValidator: (value) => {
        if (!value?.trim()) return 'Phone number is required';
        return null;
      }
    });

    if (!isConfirmed || !phone) return;

    Swal.fire({
      title: 'Sending M-Pesa prompt…',
      html: `Customer: <strong>${phone}</strong>`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const stkRes = await apiPost('/mpesa/stk-push', {
        client_id: user.client_id,
        phone: phone.trim(),
        amount: total,
        accountReference: user.business_name || 'POS',
        transactionDesc: 'POS Sale'
      });

      const { checkoutRequestId, customerMessage } = stkRes.data;

      Swal.update({
        title: 'Waiting for customer',
        html: `${customerMessage || 'Check the customer phone for the M-Pesa prompt.'}<br><small>Enter PIN on their phone to pay ${formatCurrency(total)}</small>`
      });

      const payment = await pollMpesaStatus(checkoutRequestId);
      Swal.close();

      if (payment.status === 'completed') {
        await finalizeSale('mpesa', {
          receipt: payment.mpesaReceiptNumber,
          phone: payment.phone
        });
        return;
      }

      Swal.fire({
        icon: 'error',
        title: 'M-Pesa payment failed',
        text: payment.error || 'Customer did not complete payment',
        confirmButtonColor: '#6c5ce7'
      });
    } catch (err) {
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'M-Pesa error',
        text: err.data?.error || err.message || 'Could not send STK push',
        confirmButtonColor: '#6c5ce7'
      });
    }
  };

  const startCheckout = async () => {
    if (cart.length === 0) return;

    const result = await Swal.fire({
      title: 'Payment method',
      html: `<p style="margin:0;color:#64748b">Total due: <strong style="color:#1e293b">${formatCurrency(total)}</strong></p>${!isOnline ? '<p style="margin:8px 0 0;font-size:13px;color:#94a3b8">Offline — cash only</p>' : ''}`,
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Cash',
      showDenyButton: isOnline,
      denyButtonText: 'M-Pesa (STK)',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#00a651',
      reverseButtons: true
    });

    if (result.dismiss) return;
    if (result.isConfirmed) {
      await finalizeSale('cash');
      return;
    }
    if (result.isDenied) {
      await handleMpesaCheckout();
    }
  };

  const handlePrintReceipt = () => {
    if (!receipt) return;
    try {
      printReceiptDocument(receipt, {
        businessName: user.business_name,
        cashierName: user.full_name
      });
    } catch (err) {
      Swal.fire({
        title: 'Print Failed',
        text: err.message || 'Could not open the print dialog.',
        icon: 'error',
        confirmButtonColor: '#6c5ce7'
      });
    }
  };

  const openCustomerDisplay = () => {
    window.open('/customer-display', '_blank', 'width=500,height=700');
  };

  const adminNavProps = user?.role === 'admin' ? {
    onProducts: () => navigate('/admin/products'),
    onUsers: () => navigate('/admin/users'),
    onReport: () => navigate('/admin/reports'),
    onToggleSplitView: () => setSplitView((v) => !v),
    onCustomerDisplay: () => window.open('/customer-display', '_blank', 'width=500,height=700')
  } : {};

  const navbarStatusProps = { isOnline, usingCache, pendingCount, cloudSyncPending, cloudSyncEnabled };

  return (
    <div className="App">
      <Navbar
        user={user}
        {...navbarStatusProps}
        activePage="pos"
        splitView={splitView}
        onBack={() => navigate('/pos')}
        onLogout={onLogout}
        {...adminNavProps}
      />

      <div className="pos-screen">
        <div className={`pos-layout ${splitView ? 'split' : ''}`}>
          <div className="products-panel">
            <div className="products-panel-header">
              <div className="products-panel-title">
                <h2>Products</h2>
                <span className="products-count">{filteredProducts.length} items</span>
              </div>

              <div className="pos-scan-bar">
                <span className="pos-scan-icon">📷</span>
                <input
                  type="text"
                  placeholder="Scan barcode or type code..."
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  autoFocus
                />
                <span className="pos-scan-hint">Enter ↵</span>
              </div>

              <div className="pos-filter-row">
                <div className="pos-search-wrap">
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                </div>
                {categories.length > 2 && categories.slice(0, 5).map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`pos-category-chip ${categoryFilter === c ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(c)}
                  >
                    {c === 'all' ? 'All' : c}
                  </button>
                ))}
              </div>
            </div>

            <div className="products-grid-wrap">
              {filteredProducts.length === 0 ? (
                <div className="products-empty">
                  <div className="products-empty-icon">📦</div>
                  <p>{productSearch || categoryFilter !== 'all' ? 'No products match your search' : 'No products available'}</p>
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map(p => {
                    const stock = getStockBadge(p.stock || 0);
                    const outOfStock = (p.stock || 0) <= 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`product-button ${outOfStock ? 'out-of-stock' : ''}`}
                        style={{ '--product-accent': getProductAccent(p.name) }}
                        onClick={() => !outOfStock && addProductToCart(p)}
                        disabled={outOfStock}
                      >
                        <div className="product-button-top">
                          <div className="product-avatar" style={{ background: getProductAccent(p.name) }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`product-stock-badge ${stock.class}`}>{stock.label}</span>
                        </div>
                        <span className="product-name">{p.name}</span>
                        <span className="product-price">{formatCurrency(p.price)}</span>
                        {p.category && <span className="product-category">{p.category}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="cart-panel">
            <div className="cart-header">
              <h2>Current Sale</h2>
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <div className="empty-cart-icon">🛒</div>
                  <p>Cart is empty</p>
                  <span>Scan a barcode or tap a product to start</span>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="cart-item">
                    <span className="cart-item-name">{item.product_name}</span>
                    <span className="cart-item-price">{formatCurrency(item.subtotal)}</span>
                    <div className="cart-item-controls">
                      <button type="button" className="cart-qty-btn" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>−</button>
                      <span className="cart-item-qty">{item.quantity}</span>
                      <button type="button" className="cart-qty-btn" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>+</button>
                      <span className="cart-item-unit">@ {formatCurrency(item.unit_price)}</span>
                    </div>
                    <button type="button" className="cart-item-remove" onClick={() => removeFromCart(item.product_id)} title="Remove">✕</button>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-summary-row">
                <span>Line items</span>
                <strong>{cart.length}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Quantity</span>
                <strong>{itemCount}</strong>
              </div>
              <div className="cart-total-row">
                <span className="cart-total-label">Total</span>
                <span className="cart-total-amount">{formatCurrency(total)}</span>
              </div>
              <div className="cart-actions">
                <button type="button" className="btn-payment" onClick={startCheckout} disabled={cart.length === 0}>
                  Complete Sale
                  <span className="hint">Press F2</span>
                </button>
                <button type="button" className="btn-clear" onClick={() => setCart([])} disabled={cart.length === 0}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          {splitView && (
            <CustomerDisplay cart={cart} total={total} businessName={user.business_name} compact={true} />
          )}
        </div>
      </div>

      {receipt && (
        <div className="receipt-overlay" onClick={() => setReceipt(null)}>
          <div className="receipt" onClick={e => e.stopPropagation()}>
            <div className="receipt-header">
              <h2>{receipt.pending ? 'Sale Queued' : 'Sale Complete'}</h2>
              <p className="receipt-number">#{receipt.receipt_number}</p>
              {receipt.pending && (
                <p className="receipt-meta" style={{ color: '#fef3c7', marginTop: 8 }}>
                  Will sync when the local server is available
                </p>
              )}
            </div>
            <div className="receipt-body">
              {receipt.items?.map(item => (
                <div key={item.id} className="receipt-item">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <div className="receipt-total">
                <span>Total</span>
                <span>{formatCurrency(receipt.total)}</span>
              </div>
              <p className="receipt-meta">{new Date(receipt.created_at).toLocaleString()}</p>
              <p className="receipt-meta">Cashier: {user.full_name}</p>
              <p className="receipt-meta" style={{ textTransform: 'capitalize' }}>
                Payment: {receipt.payment_method || 'cash'}
                {receipt.mpesa_receipt ? ` · ${receipt.mpesa_receipt}` : ''}
              </p>
            </div>
            <div className="receipt-actions">
              <button type="button" className="receipt-btn-print" onClick={handlePrintReceipt}>🖨️ Print Receipt</button>
              <button type="button" className="receipt-btn-close" onClick={() => setReceipt(null)}>Close</button>
            </div>
            <p className="receipt-print-hint">Select your receipt printer in the print dialog, or choose &quot;Print to PDF&quot; to preview.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pos;