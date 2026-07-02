export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '4001'
    ? '/api'
    : '/api');

export const CURRENCY_LABEL = 'KSh';

export function formatCurrency(amount) {
  const value = parseFloat(amount);
  if (!Number.isFinite(value)) return `${CURRENCY_LABEL} 0.00`;
  return `${CURRENCY_LABEL} ${value.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
