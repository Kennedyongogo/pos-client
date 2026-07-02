import { fetchWithTimeout } from './fetchWithTimeout';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '4001'
    ? '/api'
    : '/api');

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function apiGet(path, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  return parseResponse(response);
}

export async function apiPost(path, body, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function apiPut(path, body, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function apiDelete(path, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  return parseResponse(response);
}

export { API_BASE };
