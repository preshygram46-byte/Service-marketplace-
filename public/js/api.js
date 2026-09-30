const BASE_URL = window.HANDLED_API_BASE_URL || '';

const TOKEN_KEY = 'handled_token';
const USER_KEY = 'handled_user';

function normalizeId(record) {
  if (!record) return record;
  const id = record._id ?? record.id;
  const { _id, ...rest } = record;
  return { ...rest, id: id ?? rest.id };
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = api.getToken();
  const isForm = options.body instanceof FormData;

  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err) {
    throw new Error('Network error. Please check your connection and try again.');
  }

  if (res.status === 401) {
    api.logout({ silent: true });
    return window.location.replace('login.html');
  }

  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }

  if (!res.ok || (body && body.success === false)) {
    const message = (body && body.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (body && typeof body === 'object' && 'success' in body) {
    return body.data;
  }
  return body;
}

export const api = {
  async login({ email, password }) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const { token, user } = data || {};
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(normalizeId(user)));
    return { message: 'Login successful', data: { user: normalizeId(user) } };
  },

  async register({ name, email, phone, password, role = 'customer' }) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, role })
    });
    const { token, user } = data || {};
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(normalizeId(user)));
    return { message: 'Account created successfully', data: { user: normalizeId(user) } };
  },

  logout({ silent = false } = {}) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (!silent) window.location.href = 'index.html?loggedOut=true';
  },

  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  async getCategories() {
    const data = await request('/api/categories');
    return Array.isArray(data) ? data.map(normalizeId) : [];
  },

  async getServices({ query = '', category = '' } = {}) {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (category) params.set('category', category);
    const qs = params.toString();
    const data = await request(`/api/services${qs ? `?${qs}` : ''}`);
    return Array.isArray(data) ? data.map(normalizeId) : [];
  },

  async getServiceById(id) {
    const data = await request(`/api/services/${encodeURIComponent(id)}`);
    return normalizeId(data);
  },

  async getBookings() {
    const data = await request('/api/bookings');
    return Array.isArray(data) ? data.map(normalizeId) : [];
  },

  async createBooking({ serviceId, requestedDate, notes }) {
    const data = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ serviceId, requestedDate, notes })
    });
    return { message: 'Service request submitted successfully', data: normalizeId(data) };
  },

  async updateBookingStatus(id, status) {
    const data = await request(`/api/bookings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return { message: `Request ${status} successfully`, data: normalizeId(data) };
  }
};
