function resolveApiBase() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL;

  if (!configuredBase) {
    return '/api/v1';
  }

  const normalizedBase = configuredBase.replace(/\/+$/, '');
  return normalizedBase.endsWith('/api/v1') ? normalizedBase : `${normalizedBase}/api/v1`;
}

const API_BASE = resolveApiBase();
const TOKEN_KEY = 'parkingAccessToken';
const REFRESH_TOKEN_KEY = 'parkingRefreshToken';
const ACCOUNT_KEY = 'parkingAccount';

function toQuery(params) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  return search.toString();
}

function normalizePage(payload) {
  if (!payload || payload.success === false) {
    throw new Error(getErrorMessage(payload, 'Invalid API response'));
  }

  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    pagination: payload.pagination || {
      page: 0,
      size: 0,
      totalElements: 0,
      totalPages: 0,
    },
    meta: payload.meta || null,
  };
}

function getErrorMessage(payload, fallback) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (payload.error?.message) {
    return payload.error.message;
  }

  if (payload.error?.code) {
    return payload.error.code;
  }

  return fallback;
}

function getErrorCode(payload) {
  if (!payload) {
    return '';
  }

  if (typeof payload.code === 'string') {
    return payload.code;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (payload.error?.code) {
    return payload.error.code;
  }

  return '';
}

function handleSessionAuthFailure(payload, path, options = {}) {
  const code = getErrorCode(payload);
  const shouldEndSession = [
    'AUTH_ACCOUNT_LOCKED',
    'AUTH_ACCOUNT_NOT_ACTIVE',
    'AUTH_REFRESH_TOKEN_INVALID',
    'AUTH_TOKEN_EXPIRED',
  ].includes(code);

  if (!shouldEndSession || !getToken() || !shouldAttachToken(path, options)) {
    return;
  }

  clearSession();
  if (!window.location.pathname.endsWith('/auth.html')) {
    window.location.href = '/auth.html';
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function shouldAttachToken(path, options = {}) {
  if (options.auth === false) {
    return false;
  }

  return ![
    '/auth/customers/register',
    '/auth/customers/confirm-registration',
    '/auth/otp/send',
    '/auth/otp/verify',
    '/auth/login',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].includes(path);
}

function normalizeResult(payload) {
  if (!payload || payload.success === false) {
    throw new Error(getErrorMessage(payload, 'Invalid API response'));
  }

  return payload.data ?? payload;
}

export function getStoredAccount() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
  } catch (error) {
    return null;
  }
}

export function saveSession(authResponse) {
  if (authResponse?.accessToken) {
    localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
  }

  if (authResponse?.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
  }

  if (authResponse?.account) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(authResponse.account));
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

export function startSessionGuard(intervalMs = 7000) {
  if (!getToken()) {
    return;
  }

  window.setInterval(async () => {
    if (!getToken()) {
      return;
    }

    try {
      await apiRequest('/auth/me');
    } catch (error) {
      // apiRequest handles auth failures by clearing the session and redirecting.
    }
  }, intervalMs);
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (token && shouldAttachToken(path, options)) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    handleSessionAuthFailure(payload, path, options);
    throw new Error(getErrorMessage(payload, `Request failed with ${response.status}`));
  }

  if (response.status === 204 || payload === null) {
    return null;
  }

  return normalizeResult(payload);
}

export async function apiPage(path, params = {}) {
  const query = toQuery({
    ...params,
    page: params.page ?? 0,
    size: params.size ?? 10,
  });

  const response = await fetch(`${API_BASE}${path}?${query}`, {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  });
  const payload = await response.json();

  if (!response.ok) {
    handleSessionAuthFailure(payload, path);
    throw new Error(getErrorMessage(payload, `Request failed with ${response.status}`));
  }

  return normalizePage(payload);
}

export function jsonBody(data) {
  return JSON.stringify(data);
}

export async function searchParkingLots(params = {}) {
  const query = toQuery({
    ...params,
    page: params.page ?? 0,
    size: params.size ?? 12,
  });
  const response = await fetch(`${API_BASE}/public/parking-lots?${query}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Cannot load parking lots'));
  }

  return normalizePage(payload);
}

export async function getParkingAvailability(parkingLotId, params) {
  const query = toQuery(params);
  const response = await fetch(`${API_BASE}/public/parking-lots/${parkingLotId}/availability?${query}`);
  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(getErrorMessage(payload, 'Cannot load availability'));
  }

  return payload.data;
}

export async function getParkingLotDetail(parkingLotId) {
  const response = await fetch(`${API_BASE}/public/parking-lots/${parkingLotId}`);
  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(getErrorMessage(payload, 'Cannot load parking lot detail'));
  }

  return payload.data;
}

async function getParkingLotPublicCollection(parkingLotId, resource, fallbackMessage) {
  const response = await fetch(`${API_BASE}/public/parking-lots/${parkingLotId}/${resource}`);
  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(getErrorMessage(payload, fallbackMessage));
  }

  return Array.isArray(payload.data) ? payload.data : [];
}

export function getParkingLotCapacities(parkingLotId) {
  return getParkingLotPublicCollection(parkingLotId, 'capacities', 'Cannot load parking lot capacities');
}

export function getParkingLotPricingRules(parkingLotId) {
  return getParkingLotPublicCollection(parkingLotId, 'pricing-rules', 'Cannot load parking lot pricing rules');
}

export function getParkingLotServices(parkingLotId) {
  return getParkingLotPublicCollection(parkingLotId, 'services', 'Cannot load parking lot services');
}

export async function getParkingLotReviews(parkingLotId, params = {}) {
  const query = toQuery({
    ...params,
    page: params.page ?? 0,
    size: params.size ?? 8,
  });
  const response = await fetch(`${API_BASE}/public/parking-lots/${parkingLotId}/reviews?${query}`);
  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(getErrorMessage(payload, 'Cannot load parking lot reviews'));
  }

  return normalizePage(payload);
}
