import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../utils/config';

function CustomerDisplay({ cart, total, businessName, compact }) {
  const [displayCart, setDisplayCart] = useState([]);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [displayName, setDisplayName] = useState('');

  // Listen for cart updates from localStorage (for second window)
  useEffect(() => {
    const checkUpdates = () => {
      const savedCart = localStorage.getItem('pos_customer_cart');
      const savedTotal = localStorage.getItem('pos_customer_total');
      const savedName = localStorage.getItem('pos_customer_name');
      
      if (savedCart) setDisplayCart(JSON.parse(savedCart));
      if (savedTotal) setDisplayTotal(parseFloat(savedTotal));
      if (savedName) setDisplayName(savedName);
    };

    // Check immediately
    checkUpdates();

    // Listen for changes
    window.addEventListener('storage', checkUpdates);
    const interval = setInterval(checkUpdates, 500); // Fallback polling

    return () => {
      window.removeEventListener('storage', checkUpdates);
      clearInterval(interval);
    };
  }, []);

  // Use props if available (split view), otherwise use localStorage (second window)
  const items = cart && cart.length > 0 ? cart : displayCart;
  const showTotal = total > 0 ? total : displayTotal;
  const name = businessName || displayName;

  return (
    <div style={compact ? styles.compactContainer : styles.fullContainer}>
      {/* Header */}
      <div style={compact ? styles.compactHeader : styles.fullHeader}>
        <h1 style={compact ? styles.compactTitle : styles.fullTitle}>
          {name || 'POS System'}
        </h1>
      </div>

      {/* Items */}
      <div style={compact ? styles.compactItems : styles.fullItems}>
        {items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>🛒</p>
            <p style={styles.emptyText}>Waiting for items...</p>
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} style={compact ? styles.compactItem : styles.fullItem}>
              <span style={compact ? styles.compactItemName : styles.fullItemName}>
                {item.product_name}
              </span>
              <span style={compact ? styles.compactItemQty : styles.fullItemQty}>
                x{item.quantity}
              </span>
              <span style={compact ? styles.compactItemPrice : styles.fullItemPrice}>
                {formatCurrency(item.subtotal || item.unit_price * item.quantity)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Total */}
      <div style={compact ? styles.compactTotal : styles.fullTotal}>
        <div style={styles.totalLine} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={compact ? styles.compactTotalLabel : styles.fullTotalLabel}>TOTAL</span>
          <span style={compact ? styles.compactTotalValue : styles.fullTotalValue}>
            {formatCurrency(showTotal)}
          </span>
        </div>
        <div style={styles.totalLine} />
      </div>

      {/* Footer */}
      <div style={compact ? styles.compactFooter : styles.fullFooter}>
        <p style={styles.footerText}>Thank you for shopping!</p>
      </div>
    </div>
  );
}

const styles = {
  // ===== FULL SCREEN (Second Window) =====
  fullContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '40px',
  },
  fullHeader: {
    textAlign: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
  },
  fullTitle: {
    fontSize: '36px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '2px',
  },
  fullItems: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '20px',
  },
  fullItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    fontSize: '24px',
  },
  fullItemName: {
    flex: 2,
    fontWeight: '500',
  },
  fullItemQty: {
    flex: 1,
    textAlign: 'center',
    color: '#a29bfe',
    fontWeight: '600',
  },
  fullItemPrice: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '700',
    fontSize: '28px',
  },
  fullTotal: {
    marginTop: '20px',
  },
  fullTotalLabel: {
    fontSize: '28px',
    fontWeight: '600',
    letterSpacing: '3px',
  },
  fullTotalValue: {
    fontSize: '48px',
    fontWeight: '800',
    color: '#00b894',
  },
  fullFooter: {
    textAlign: 'center',
    marginTop: '30px',
    opacity: 0.6,
  },

  // ===== COMPACT (Split View) =====
  compactContainer: {
    height: '100%',
    background: '#1a1a2e',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    borderRadius: '0 10px 10px 0',
  },
  compactHeader: {
    textAlign: 'center',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
  },
  compactTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
  },
  compactItems: {
    flex: 1,
    overflowY: 'auto',
  },
  compactItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontSize: '14px',
  },
  compactItemName: {
    flex: 2,
    fontWeight: '500',
    fontSize: '13px',
  },
  compactItemQty: {
    flex: 1,
    textAlign: 'center',
    color: '#a29bfe',
    fontSize: '13px',
  },
  compactItemPrice: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    fontSize: '14px',
  },
  compactTotal: {
    marginTop: '10px',
  },
  compactTotalLabel: {
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '2px',
  },
  compactTotalValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#00b894',
  },
  compactFooter: {
    textAlign: 'center',
    marginTop: '10px',
    opacity: 0.5,
  },

  // ===== SHARED =====
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    opacity: 0.5,
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0 0 10px',
  },
  emptyText: {
    fontSize: '18px',
    margin: 0,
  },
  totalLine: {
    height: '2px',
    background: 'rgba(255,255,255,0.2)',
    margin: '10px 0',
  },
  footerText: {
    fontSize: '14px',
    margin: 0,
  },
};

export default CustomerDisplay;