import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { formatCurrency } from '../utils/config';
import { apiGet } from '../utils/api';
import './SalesReport.css';
import { printReceiptDocument } from '../utils/printReceipt';

const AVATAR_COLORS = ['#6c5ce7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

function getAvatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function isToday(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function getPaymentClass(method) {
  const key = (method || '').toLowerCase();
  if (key === 'cash') return 'cash';
  if (key === 'card' || key === 'credit' || key === 'debit') return 'card';
  if (key.includes('mpesa') || key.includes('mobile')) return 'mpesa';
  return 'other';
}

function computeStats(transactions) {
  if (!transactions.length) {
    return {
      total_transactions: 0,
      total_sales: 0,
      avg_sale: 0,
      max_sale: 0,
      total_qty: 0,
      total_items: 0
    };
  }

  const totals = transactions.map((t) => parseFloat(t.total) || 0);
  const totalSales = totals.reduce((sum, value) => sum + value, 0);

  return {
    total_transactions: transactions.length,
    total_sales: totalSales,
    avg_sale: totalSales / transactions.length,
    max_sale: Math.max(...totals),
    total_qty: transactions.reduce((sum, t) => sum + (t.total_qty || 0), 0),
    total_items: transactions.reduce((sum, t) => sum + (t.item_count || 0), 0)
  };
}

function SalesReport({ currentUser }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiGet(`/transactions/all?client_id=${currentUser.client_id}`);
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser.client_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const periodTransactions = useMemo(() => {
    if (period === 'today') {
      return transactions.filter((t) => isToday(t.created_at));
    }
    return transactions;
  }, [transactions, period]);

  const stats = useMemo(() => computeStats(periodTransactions), [periodTransactions]);

  const paymentMethods = useMemo(() => {
    const methods = new Set(
      periodTransactions
        .map((t) => (t.payment_method || 'other').toLowerCase())
        .filter(Boolean)
    );
    return ['all', ...Array.from(methods).sort()];
  }, [periodTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return periodTransactions.filter((t) => {
      const receipt = `pos-${t.id.substring(0, 8)}`;
      const cashier = (t.cashier_name || '').toLowerCase();
      const payment = (t.payment_method || '').toLowerCase();

      const matchesSearch =
        !query ||
        receipt.includes(query) ||
        cashier.includes(query) ||
        payment.includes(query);

      const matchesPayment =
        paymentFilter === 'all' || payment === paymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [periodTransactions, search, paymentFilter]);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const viewReceipt = async (id) => {
    try {
      const res = await apiGet(`/transactions/${id}`);
      const t = res.data;

      let itemsHtml = '';
      let totalQty = 0;
      if (t.items) {
        itemsHtml = t.items.map((item) => {
          totalQty += item.quantity;
          return `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">
            <span style="color:#334155;">${item.product_name} <span style="color:#94a3b8;">×${item.quantity}</span></span>
            <span style="font-weight:700;color:#059669;">${formatCurrency(item.subtotal)}</span>
          </div>`;
        }).join('');
      }

      Swal.fire({
        title: 'Receipt',
        html: `
          <div style="text-align:left;">
            <div style="background:#f8fafc;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
              <p style="margin:0;font-family:monospace;font-weight:700;color:#6c5ce7;">POS-${t.id.substring(0, 8)}</p>
              <p style="margin:6px 0 0;color:#64748b;font-size:13px;">${new Date(t.created_at).toLocaleString()}</p>
            </div>
            <p style="margin:0 0 12px;font-size:13px;color:#475569;font-weight:600;">
              ${t.items?.length || 0} product(s) · ${totalQty} unit(s)
            </p>
            ${itemsHtml || '<p style="color:#94a3b8;">No line items</p>'}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:2px solid #e2e8f0;">
              <span style="font-size:15px;font-weight:800;color:#1e293b;">TOTAL</span>
              <span style="font-size:22px;font-weight:800;color:#059669;">${formatCurrency(t.total)}</span>
            </div>
            <div style="margin-top:14px;display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#64748b;">
              <span>Cashier: <strong style="color:#334155;">${t.cashier_name || 'N/A'}</strong></span>
              <span>Payment: <strong style="color:#334155;text-transform:capitalize;">${t.payment_method || 'N/A'}</strong></span>
            </div>
          </div>
        `,
        showDenyButton: true,
        denyButtonText: '🖨️ Print',
        denyButtonColor: '#10b981',
        confirmButtonText: 'Close',
        confirmButtonColor: '#6c5ce7',
        width: '440px'
      }).then((result) => {
        if (result.isDenied) {
          try {
            printReceiptDocument(
              {
                ...t,
                receipt_number: `POS-${t.id.substring(0, 8)}`
              },
              {
                businessName: currentUser.business_name,
                cashierName: t.cashier_name
              }
            );
          } catch (err) {
            Swal.fire({
              title: 'Print Failed',
              text: err.message || 'Could not open the print dialog.',
              icon: 'error',
              confirmButtonColor: '#6c5ce7'
            });
          }
        }
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'Could not load receipt.', icon: 'error', confirmButtonColor: '#6c5ce7' });
    }
  };

  const periodLabel = period === 'today' ? "Today's" : 'All-time';

  return (
    <div className="sales-page">
      <div className="sales-hero">
        <div>
          <h1>Sales Report</h1>
          <p>Track revenue, transactions, and receipts for your store.</p>
          <span className="sales-business-badge">🏪 {currentUser.business_name}</span>
        </div>
        <div className="sales-hero-actions">
          <div className="sales-period-toggle">
            <button
              type="button"
              className={`sales-period-btn ${period === 'today' ? 'active' : ''}`}
              onClick={() => setPeriod('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`sales-period-btn ${period === 'all' ? 'active' : ''}`}
              onClick={() => setPeriod('all')}
            >
              All time
            </button>
          </div>
          <button
            type="button"
            className="sales-btn-refresh"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div className="sales-stats">
        <div className="sales-stat-card purple">
          <div className="sales-stat-top">
            <div className="sales-stat-icon">🧾</div>
          </div>
          <p className="sales-stat-label">Total Sales</p>
          <p className="sales-stat-value">{stats.total_transactions}</p>
          <p className="sales-stat-sub">{periodLabel} transactions</p>
        </div>
        <div className="sales-stat-card green">
          <div className="sales-stat-top">
            <div className="sales-stat-icon">💰</div>
          </div>
          <p className="sales-stat-label">Revenue</p>
          <p className="sales-stat-value money-green">{formatCurrency(stats.total_sales)}</p>
          <p className="sales-stat-sub">Gross sales total</p>
        </div>
        <div className="sales-stat-card blue">
          <div className="sales-stat-top">
            <div className="sales-stat-icon">📊</div>
          </div>
          <p className="sales-stat-label">Avg Sale</p>
          <p className="sales-stat-value money-blue">{formatCurrency(stats.avg_sale)}</p>
          <p className="sales-stat-sub">Per transaction</p>
        </div>
        <div className="sales-stat-card violet">
          <div className="sales-stat-top">
            <div className="sales-stat-icon">🏆</div>
          </div>
          <p className="sales-stat-label">Largest Sale</p>
          <p className="sales-stat-value money-violet">{formatCurrency(stats.max_sale)}</p>
          <p className="sales-stat-sub">Highest single receipt</p>
        </div>
        <div className="sales-stat-card amber">
          <div className="sales-stat-top">
            <div className="sales-stat-icon">📦</div>
          </div>
          <p className="sales-stat-label">Items Sold</p>
          <p className="sales-stat-value money-amber">{stats.total_qty}</p>
          <p className="sales-stat-sub">{stats.total_items} product lines</p>
        </div>
      </div>

      <div className="sales-panel">
        <div className="sales-panel-header">
          <div>
            <h2>Recent Transactions</h2>
            <span className="sales-panel-count">
              {period === 'today' ? todayLabel : 'Showing latest receipts'}
              {' · '}
              {filteredTransactions.length} of {periodTransactions.length} shown
            </span>
          </div>
          <div className="sales-panel-tools">
            <div className="sales-search-wrap">
              <span>🔍</span>
              <input
                type="text"
                className="sales-search"
                placeholder="Search receipt, cashier, payment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`sales-filter-chip ${paymentFilter === method ? 'active' : ''}`}
                  onClick={() => setPaymentFilter(method)}
                >
                  {method === 'all' ? 'All payments' : method}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="sales-loading">
            <div className="sales-spinner" />
            Loading transactions…
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="sales-empty">
            <div className="sales-empty-icon">📋</div>
            <h3>{search || paymentFilter !== 'all' ? 'No matching transactions' : period === 'today' ? 'No sales today yet' : 'No transactions yet'}</h3>
            <p>
              {search || paymentFilter !== 'all'
                ? 'Try adjusting your search or payment filter.'
                : period === 'today'
                  ? 'Sales from today will appear here once checkout completes.'
                  : 'Completed POS checkouts will show up in this list.'}
            </p>
          </div>
        ) : (
          <div className="sales-table-wrap">
            <table className="sales-table">
              <colgroup>
                <col className="col-receipt" />
                <col className="col-datetime" />
                <col className="col-cashier" />
                <col className="col-products" />
                <col className="col-qty" />
                <col className="col-total" />
                <col className="col-payment" />
                <col className="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date / Time</th>
                  <th>Cashier</th>
                  <th>Products</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const created = new Date(t.created_at);
                  const cashierName = t.cashier_name || 'N/A';

                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="sales-cell-well">
                          <span className="sales-receipt-id">POS-{t.id.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="sales-cell-well">
                          <div className="sales-datetime">
                            <span className="sales-date">{created.toLocaleDateString()}</span>
                            <span className="sales-time">{created.toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sales-cell-well">
                          <div className="sales-cashier-cell">
                            <div
                              className="sales-cashier-avatar"
                              style={{ background: getAvatarColor(cashierName) }}
                            >
                              {cashierName.charAt(0).toUpperCase()}
                            </div>
                            <span className="sales-cashier-name">{cashierName}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sales-cell-well">{t.item_count || 0}</div>
                      </td>
                      <td>
                        <div className="sales-cell-well">
                          <span className="sales-qty-badge">{t.total_qty || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="sales-cell-well">
                          <span className="sales-total">{formatCurrency(t.total)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="sales-cell-well">
                          <span className={`sales-payment-badge ${getPaymentClass(t.payment_method)}`}>
                            {t.payment_method || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="sales-cell-well">
                          <button type="button" className="sales-btn-view" onClick={() => viewReceipt(t.id)}>
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesReport;
