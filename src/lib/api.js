/**
 * api.js — Centralized API client for the CAT Modeling Data Pipeline.
 * All endpoints are proxied via Vite to http://localhost:8000
 */

const BASE = '/api';

async function request(method, path, options = {}) {
  const { body, params, signal } = options;

  let url = `${BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {};
  let fetchBody;

  if (body instanceof FormData) {
    fetchBody = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: fetchBody, signal });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || JSON.stringify(err);
    } catch {}
    throw new Error(detail);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/vnd') || ct.includes('text/csv')) {
    return res.blob();
  }
  return res.json();
}

// ── Upload ─────────────────────────────────────────────────────────────────────
export async function uploadFile(file, targetFormat = 'AIR', rulesConfig = {}) {
  const form = new FormData();
  form.append('file', file);
  const params = { target_format: targetFormat };
  if (Object.keys(rulesConfig).length) {
    form.append('rules_config', JSON.stringify(rulesConfig));
  }
  return request('POST', '/upload', { body: form, params });
}

// ── Column Mapping ─────────────────────────────────────────────────────────────
export async function suggestColumns(uploadId) {
  return request('GET', `/suggest-columns/${uploadId}`);
}

export async function confirmColumns(uploadId, columnMap) {
  return request('POST', `/confirm-columns/${uploadId}`, { body: { column_map: columnMap } });
}

// ── Pipeline Steps ─────────────────────────────────────────────────────────────
export async function runGeocode(uploadId) {
  return request('POST', `/geocode/${uploadId}`);
}

export async function runMapCodes(uploadId) {
  return request('POST', `/map-codes/${uploadId}`);
}

export async function runNormalize(uploadId) {
  return request('POST', `/normalize/${uploadId}`);
}

// ── Review & Corrections ───────────────────────────────────────────────────────
export async function getReview(uploadId) {
  return request('GET', `/review/${uploadId}`);
}

export async function submitCorrections(uploadId, corrections) {
  return request('POST', `/correct/${uploadId}`, { body: { corrections } });
}

// ── Download ───────────────────────────────────────────────────────────────────
export async function downloadOutput(uploadId, format = 'xlsx') {
  return request('GET', `/download/${uploadId}`, { params: { format } });
}

// ── Session Management ─────────────────────────────────────────────────────────
export async function getSession(uploadId) {
  return request('GET', `/session/${uploadId}`);
}

export async function listSessions() {
  return request('GET', '/sessions');
}

export async function deleteSession(uploadId) {
  return request('DELETE', `/session/${uploadId}`);
}

export async function healthCheck() {
  return request('GET', '/health');
}
