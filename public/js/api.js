const BASE_URL =
  window.HANDLED_API_BASE_URL ||
  'https://handeled-service-marketplace-api.onrender.com';

const TOKEN_KEY = 'handled_token';
const USER_KEY = 'handled_user';

function normalizeId(record) {
  if (!record) return record;
  const id = record._id ?? record.id;
  const { _id, ...rest } = record;
  return { ...rest, id: id ?? rest.id };
}

function normalizeBooking(b) {
  if (!b) return b;
  const id = b._id ?? b.id;
  const customerObj = typeof b.customerId === 'object' && b.customerId !== null ? b.customerId : null;
  const providerObj = typeof b.providerId === 'object' && b.providerId !== null ? b.providerId : null;
  const serviceObj = typeof b.serviceId === 'object' && b.serviceId !== null ? b.serviceId : null;

  const { _id, ...rest } = b;
  return {
    ...rest,
    id,
    customerId: customerObj ? (customerObj._id ?? customerObj.id) : (b.customerId ? String(b.customerId) : null),
    customerName: customerObj?.name ?? null,
    customerEmail: customerObj?.email ?? null,
    customerPhone: customerObj?.phone ?? null,
    providerId: providerObj ? (providerObj._id ?? providerObj.id) : (b.providerId ? String(b.providerId) : null),
    providerName: providerObj?.name ?? null,
    providerEmail: providerObj?.email ?? null,
    providerPhone: providerObj?.phone ?? null,
    serviceId: serviceObj ? (serviceObj._id ?? serviceObj.id) : (b.serviceId ? String(b.serviceId) : null),
    serviceTitle: serviceObj?.title ?? null,
    price: serviceObj?.price ?? null,
  };
}

function normalizeService(s) {
  if (!s) return s;
  const id = s._id ?? s.id;
  const catObj = typeof s.categoryId === 'object' && s.categoryId !== null ? s.categoryId : null;
  const provObj = typeof s.providerId === 'object' && s.providerId !== null ? s.providerId : null;
  const { _id, ...rest } = s;
  return {
    ...rest,
    id,
    categoryId: catObj ? (catObj._id ?? catObj.id) : (s.categoryId ? String(s.categoryId) : null),
    categoryName: catObj?.name ?? s.categoryName ?? null,
    categorySlug: catObj?.slug ?? s.categorySlug ?? null,
    providerId: provObj ? (provObj._id ?? provObj.id) : (s.providerId ? String(s.providerId) : null),
    providerName: provObj?.name ?? s.providerName ?? null,
    rating: s.rating ?? null,
    image: s.image ?? null,
  };
}

function normalizeReview(review) {
  if (!review) return review;
  const id = review._id ?? review.id;
  const customerObj = typeof review.customerId === 'object' && review.customerId !== null ? review.customerId : null;
  const { _id, ...rest } = review;
  return {
    ...rest,
    id,
    customerId: customerObj ? (customerObj._id ?? customerObj.id) : (review.customerId ? String(review.customerId) : null),
    customerName: customerObj?.name ?? null,
    bookingId: review.bookingId?._id ?? review.bookingId,
    serviceId: review.serviceId?._id ?? review.serviceId,
    providerId: review.providerId?._id ?? review.providerId,
  };
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = api.getToken();
  const isForm = options.body instanceof FormData;
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Network error. Please check your connection and try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    api.logout({ silent: true });
    window.location.replace('login.html');
    return null;
  }

  if (!response.ok || (body && body.success === false)) {
    throw new Error(body?.message || `Request failed (${response.status})`);
  }

  if (body && typeof body === 'object' && 'success' in body) return body.data;
  return body;
}

export const api = {
  async login({ email, password }) {
    const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    const { token, user } = data || {};
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(normalizeId(user)));
    return { message: 'Login successful', data: { user: normalizeId(user) } };
  },

  async register({ name, email, phone, password, role = 'customer' }) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, role }),
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

  async createCategory({ name }) {
    return normalizeId(await request('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }));
  },

  async updateCategory(id, { name }) {
    return normalizeId(await request(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }));
  },

  async deleteCategory(id) {
    return request(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getServices({ query = '', category = '', provider = '', limit = 100 } = {}) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (provider) params.set('provider', provider);
    if (limit) params.set('limit', String(limit));
    const queryString = params.toString();
    const data = await request(`/api/services${queryString ? `?${queryString}` : ''}`);
    return Array.isArray(data) ? data.map(normalizeService) : [];
  },

  async getServiceById(id) {
    return normalizeService(await request(`/api/services/${encodeURIComponent(id)}`));
  },

  async createService({ title, description, price, categoryId }) {
    return normalizeService(await request('/api/services', {
      method: 'POST',
      body: JSON.stringify({ title, description, price: Number(price), categoryId }),
    }));
  },

  async updateService(id, { title, description, price, categoryId }) {
    const body = {};
    if (title !== undefined) body.title = title;
    if (description !== undefined) body.description = description;
    if (price !== undefined) body.price = Number(price);
    if (categoryId !== undefined) body.categoryId = categoryId;
    return normalizeService(await request(`/api/services/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }));
  },

  async deleteService(id) {
    return request(`/api/services/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getReviews({ serviceId = '', providerId = '' } = {}) {
    const params = new URLSearchParams();
    if (serviceId) params.set('serviceId', serviceId);
    if (providerId) params.set('providerId', providerId);
    const data = await request(`/api/reviews?${params.toString()}`);
    return {
      reviews: Array.isArray(data?.reviews) ? data.reviews.map(normalizeReview) : [],
      averageRating: Number(data?.averageRating || 0),
      count: Number(data?.count || 0),
    };
  },

  async createReview({ bookingId, rating, comment }) {
    return normalizeReview(await request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ bookingId, rating: Number(rating), comment }),
    }));
  },

  async deleteReview(id) {
    return request(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getBookings() {
    const data = await request('/api/bookings');
    return Array.isArray(data) ? data.map(normalizeBooking) : [];
  },

  async getBookingById(id) {
    return normalizeBooking(await request(`/api/bookings/${encodeURIComponent(id)}`));
  },

  async createBooking({ serviceId, requestedDate, notes }) {
    return {
      message: 'Service request submitted successfully',
      data: normalizeBooking(await request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ serviceId, requestedDate, notes }),
      })),
    };
  },

  async updateBookingStatus(id, status) {
    return {
      message: `Request ${status} successfully`,
      data: normalizeBooking(await request(`/api/bookings/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })),
    };
  },

  async getAdminUsers(role = '') {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const data = await request(`/api/admin/users${query}`);
    const users = Array.isArray(data) ? data : data?.users;
    return Array.isArray(users) ? users.map(normalizeId) : [];
  },

  async createAdmin({ name, email, phone, password }) {
    return normalizeId(await request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    }));
  },

  async updateUserRole(id, role) {
    return normalizeId(await request(`/api/admin/users/${encodeURIComponent(id)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }));
  },

  async deleteUser(id) {
    return request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getAdminStats() {
    return request('/api/admin/stats');
  },
};
