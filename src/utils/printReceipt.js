import { formatCurrency } from './config';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString();
}

function buildReceiptHtml({
  businessName,
  receiptNumber,
  items = [],
  total,
  paymentMethod,
  cashierName,
  createdAt,
  isTest = false
}) {
  const itemRows = items.length
    ? items.map((item) => `
        <tr>
          <td class="item-name">${escapeHtml(item.product_name)}</td>
          <td class="item-qty">${item.quantity}</td>
          <td class="item-price">${formatCurrency(item.unit_price)}</td>
          <td class="item-sub">${formatCurrency(item.subtotal)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" class="empty">No items</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(receiptNumber)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 72mm;
      margin: 0 auto;
      font-family: 'Courier New', Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      padding: 4px 2px 8px;
    }
    .center { text-align: center; }
    .title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .test-banner {
      border: 1px dashed #000;
      padding: 4px;
      margin-bottom: 8px;
      font-weight: 700;
      text-align: center;
    }
    .meta { margin: 2px 0; font-size: 10px; }
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      padding: 2px 0;
      vertical-align: top;
    }
    th {
      text-align: left;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      font-size: 9px;
    }
    .item-name { width: 42%; word-break: break-word; }
    .item-qty { width: 12%; text-align: center; }
    .item-price { width: 22%; text-align: right; }
    .item-sub { width: 24%; text-align: right; }
    .empty { text-align: center; padding: 8px 0; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 700;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #000;
    }
    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="receipt">
    ${isTest ? '<div class="test-banner">*** PRINTER TEST ***</div>' : ''}
    <div class="center">
      <div class="title">${escapeHtml(businessName || 'Carlynve POS')}</div>
      <div class="meta">Receipt: ${escapeHtml(receiptNumber || 'N/A')}</div>
      <div class="meta">${escapeHtml(formatDate(createdAt))}</div>
      <div class="meta">Cashier: ${escapeHtml(cashierName || 'N/A')}</div>
    </div>
    <div class="divider"></div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="item-qty">Qty</th>
          <th class="item-price">Price</th>
          <th class="item-sub">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="total-row">
      <span>TOTAL</span>
      <span>${formatCurrency(total)}</span>
    </div>
    <div class="divider"></div>
    <div class="center meta">Payment: ${escapeHtml((paymentMethod || 'cash').toUpperCase())}</div>
    <div class="footer">
      ${isTest ? 'If you can read this, your printer is working.' : 'Thank you for your purchase!'}
    </div>
  </div>
</body>
</html>`;
}

function removePrintFrame(iframe) {
  if (iframe?.parentNode) {
    iframe.parentNode.removeChild(iframe);
  }
}

export function printReceiptDocument(receipt, options = {}) {
  const html = buildReceiptHtml({
    businessName: options.businessName || receipt.business_name,
    receiptNumber: receipt.receipt_number || `POS-${String(receipt.id || '').substring(0, 8)}`,
    items: receipt.items || [],
    total: receipt.total,
    paymentMethod: receipt.mpesa_receipt
      ? `${receipt.payment_method || 'mpesa'} · ${receipt.mpesa_receipt}`
      : receipt.payment_method,
    cashierName: options.cashierName || receipt.cashier_name,
    createdAt: receipt.created_at,
    isTest: options.isTest
  });

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Receipt print');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;

  if (!frameWindow || !frameDoc) {
    removePrintFrame(iframe);
    throw new Error('Could not open the print dialog. Please try again.');
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      setTimeout(() => removePrintFrame(iframe), 1000);
    }
  };

  if (frameDoc.readyState === 'complete') {
    setTimeout(triggerPrint, 100);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 100);
    setTimeout(triggerPrint, 500);
  }
}
