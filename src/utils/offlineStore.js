const PRODUCTS_PREFIX = 'pos_products_';
const PENDING_KEY = 'pos_pending_transactions';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveProductsCache(clientId, products) {
  if (!clientId) return;
  writeJson(`${PRODUCTS_PREFIX}${clientId}`, {
    updatedAt: new Date().toISOString(),
    products: products || []
  });
}

export function loadProductsCache(clientId) {
  if (!clientId) return null;
  const data = readJson(`${PRODUCTS_PREFIX}${clientId}`, null);
  if (!data?.products?.length) return null;
  return data;
}

export function findProductByBarcode(clientId, barcode) {
  const cache = loadProductsCache(clientId);
  if (!cache) return null;
  return cache.products.find((p) => p.barcode === barcode) || null;
}

export function findProductById(clientId, productId) {
  const cache = loadProductsCache(clientId);
  if (!cache) return null;
  return cache.products.find((p) => p.id === productId) || null;
}

function loadAllPending() {
  return readJson(PENDING_KEY, {});
}

function saveAllPending(map) {
  writeJson(PENDING_KEY, map);
}

export function getPendingTransactions(clientId) {
  const map = loadAllPending();
  return map[clientId] || [];
}

export function getPendingCount(clientId) {
  return getPendingTransactions(clientId).length;
}

export function addPendingTransaction(clientId, transaction) {
  const map = loadAllPending();
  const list = map[clientId] || [];
  list.push(transaction);
  map[clientId] = list;
  saveAllPending(map);
}

export function removePendingTransaction(clientId, localId) {
  const map = loadAllPending();
  map[clientId] = (map[clientId] || []).filter((t) => t.localId !== localId);
  saveAllPending(map);
}

export function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
