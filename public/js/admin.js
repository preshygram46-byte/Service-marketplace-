import { api } from './api.js';
import { showToast } from './ui.js';
import {
  requireRole,
  formatDate,
  statusLabel,
  escapeHtml,
  showLoading,
  formatPrice,
  serviceImageUrl,
  setImageFallback,
} from './utils.js';

requireRole(['admin'], 'index.html');

const createAdminForm = document.getElementById('create-admin-form');
const createServiceForm = document.getElementById('create-service-form');
const createCategoryForm = document.getElementById('create-category-form');
const serviceCategorySelect = document.getElementById('service-category');

let categories = [];
let services = [];
let users = [];
let reviews = [];

function setButtonLoading(button, isLoading, normalText, loadingText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : normalText;
}

async function loadStats() {
  try {
    const stats = await api.getAdminStats();
    document.getElementById('stat-users').textContent = stats?.totalUsers ?? 0;
    document.getElementById('stat-providers').textContent = stats?.users?.provider ?? 0;
    document.getElementById('stat-bookings').textContent = stats?.totalBookings ?? 0;
    document.getElementById('stat-completed').textContent = stats?.bookings?.completed ?? 0;
    renderStatusSummary(stats?.bookings || {});
  } catch (error) {
    showToast(error.message || 'Could not load platform statistics.', true);
  }
}

function renderStatusSummary(bookings) {
  const statuses = ['pending', 'accepted', 'completed', 'declined', 'cancelled'];
  const element = document.getElementById('bookings-status-summary');
  element.innerHTML = statuses.map((status) => `${statusLabel(status)} <strong>${Number(bookings[status] || 0)}</strong>`).join(' · ');
}

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  showLoading(tbody, 3, 'skeleton-row');
  try {
    users = await api.getAdminUsers();
    renderUsersTable();
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message || 'Could not load users.')}</td></tr>`;
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  const empty = document.getElementById('users-empty');
  if (!users.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = users.map((user) => `
    <tr>
      <td>${escapeHtml(user.name || '-')}</td>
      <td>${escapeHtml(user.email || '-')}</td>
      <td>
        <select class="admin-role-select" data-id="${escapeHtml(user.id)}" ${user.id === api.getUser()?.id ? 'disabled' : ''}>
          ${['customer', 'provider', 'admin'].map((role) => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role}</option>`).join('')}
        </select>
      </td>
      <td>${user.createdAt ? formatDate(user.createdAt) : '-'}</td>
      <td class="col-actions">${user.id === api.getUser()?.id ? '<span class="status-text status-text-muted">Current account</span>' : `<button type="button" class="btn btn-danger btn-sm delete-user-btn" data-id="${escapeHtml(user.id)}" data-name="${escapeHtml(user.name || 'user')}">Delete</button>`}</td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.admin-role-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const previous = users.find((item) => String(item.id) === String(select.dataset.id))?.role;
      select.disabled = true;
      try {
        await api.updateUserRole(select.dataset.id, select.value);
        showToast('User role updated.');
        await loadUsers();
        await loadStats();
      } catch (error) {
        select.value = previous || 'customer';
        showToast(error.message || 'Could not update user role.', true);
        select.disabled = false;
      }
    });
  });
  tbody.querySelectorAll('.delete-user-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm(`Delete ${button.dataset.name}? This cannot be undone.`)) return;
      button.disabled = true;
      try {
        await api.deleteUser(button.dataset.id);
        showToast('User deleted.');
        await loadUsers();
        await loadStats();
      } catch (error) {
        showToast(error.message || 'Could not delete user.', true);
        button.disabled = false;
      }
    });
  });
}

async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  showLoading(tbody, 3, 'skeleton-row');
  try {
    const bookings = await api.getBookings();
    renderBookingsTable(bookings);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message || 'Could not load bookings.')}</td></tr>`;
  }
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  const empty = document.getElementById('bookings-empty');
  if (!bookings.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = bookings.map((booking) => `
    <tr>
      <td>${escapeHtml(booking.serviceTitle || '-')}</td>
      <td>${escapeHtml(booking.customerName || '-')}</td>
      <td>${escapeHtml(booking.providerName || '-')}</td>
      <td><span class="badge badge-${escapeHtml(booking.status || 'pending')}">${statusLabel(booking.status || 'pending')}</span></td>
      <td>${booking.requestedDate ? formatDate(booking.requestedDate) : '-'}</td>
    </tr>
  `).join('');
}

async function loadCategories() {
  try {
    categories = await api.getCategories();
    renderCategorySelect();
    renderCategoriesTable();
  } catch (error) {
    categories = [];
    serviceCategorySelect.innerHTML = '<option value="">Categories unavailable</option>';
    serviceCategorySelect.disabled = true;
    showToast(error.message || 'Could not load categories.', true);
  }
}

function renderCategorySelect() {
  if (!serviceCategorySelect) return;
  serviceCategorySelect.disabled = !categories.length;
  const options = categories.length
    ? `<option value="">Select a category</option>${categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('')}`
    : '<option value="">No categories available</option>';
  serviceCategorySelect.innerHTML = options;
  const editSelect = document.getElementById('edit-service-category');
  if (editSelect) {
    editSelect.disabled = !categories.length;
    editSelect.innerHTML = options;
  }
}

function renderCategoriesTable() {
  const tbody = document.getElementById('categories-tbody');
  const empty = document.getElementById('categories-empty');
  if (!tbody) return;
  if (!categories.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = categories.map((category) => `
    <tr>
      <td><input class="admin-inline-input category-edit-input" data-id="${escapeHtml(category.id)}" value="${escapeHtml(category.name)}"></td>
      <td>${escapeHtml(category.slug || '-')}</td>
      <td class="col-actions"><button type="button" class="btn btn-secondary btn-sm save-category-btn" data-id="${escapeHtml(category.id)}">Save</button> <button type="button" class="btn btn-danger btn-sm delete-category-btn" data-id="${escapeHtml(category.id)}">Delete</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.save-category-btn').forEach((button) => button.addEventListener('click', async () => {
    const input = tbody.querySelector(`.category-edit-input[data-id="${CSS.escape(button.dataset.id)}"]`);
    const name = input?.value.trim();
    if (!name) return showToast('Category name cannot be empty.', true);
    button.disabled = true;
    try {
      await api.updateCategory(button.dataset.id, { name });
      showToast('Category updated.');
      await loadCategories();
      await loadServices();
    } catch (error) {
      showToast(error.message || 'Could not update category.', true);
    } finally { button.disabled = false; }
  }));
  tbody.querySelectorAll('.delete-category-btn').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('Delete this category? Categories containing services cannot be deleted.')) return;
    button.disabled = true;
    try {
      await api.deleteCategory(button.dataset.id);
      showToast('Category deleted.');
      await loadCategories();
    } catch (error) {
      showToast(error.message || 'Could not delete category.', true);
      button.disabled = false;
    }
  }));
}

async function loadServices() {
  const tbody = document.getElementById('services-tbody');
  if (!tbody) return;
  showLoading(tbody, 3, 'skeleton-row');
  try {
    services = await api.getServices({ limit: 100 });
    renderServicesTable();
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message || 'Could not load services.')}</td></tr>`;
  }
}

function renderServicesTable() {
  const tbody = document.getElementById('services-tbody');
  const empty = document.getElementById('services-empty');
  if (!services.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = services.map((service) => `
    <tr>
      <td><strong>${escapeHtml(service.title || '-')}</strong></td>
      <td>${escapeHtml(service.providerName || '-')}</td>
      <td>${escapeHtml(service.categoryName || '-')}</td>
      <td>${formatPrice(service.price) || '-'}</td>
      <td><img class="admin-service-thumb" src="${escapeHtml(serviceImageUrl(service, 180, 120))}" alt="" loading="lazy"></td>
      <td class="col-actions"><button type="button" class="btn btn-secondary btn-sm edit-admin-service-btn" data-id="${escapeHtml(service.id)}">Edit</button> <button type="button" class="btn btn-danger btn-sm delete-admin-service-btn" data-id="${escapeHtml(service.id)}">Delete</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('img').forEach((img) => setImageFallback(img));
  tbody.querySelectorAll('.edit-admin-service-btn').forEach((button) => button.addEventListener('click', () => openServiceEdit(button.dataset.id)));
  tbody.querySelectorAll('.delete-admin-service-btn').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('Delete this service? This cannot be undone.')) return;
    button.disabled = true;
    try {
      await api.deleteService(button.dataset.id);
      showToast('Service deleted.');
      await loadServices();
      await loadStats();
    } catch (error) {
      showToast(error.message || 'Could not delete service.', true);
      button.disabled = false;
    }
  }));
}

function openServiceEdit(id) {
  const service = services.find((item) => String(item.id) === String(id));
  if (!service) return;
  document.getElementById('edit-service-id').value = service.id;
  document.getElementById('edit-service-title').value = service.title || '';
  document.getElementById('edit-service-category').value = service.categoryId || '';
  document.getElementById('edit-service-price').value = service.price ?? '';
  document.getElementById('edit-service-description').value = service.description || '';
  document.getElementById('edit-service-modal').classList.add('open');
  document.getElementById('edit-service-title').focus();
}

function closeEditService() {
  document.getElementById('edit-service-modal')?.classList.remove('open');
}

document.querySelectorAll('.edit-service-close').forEach((button) => button.addEventListener('click', closeEditService));
document.getElementById('edit-service-modal')?.addEventListener('click', (event) => { if (event.target.id === 'edit-service-modal') closeEditService(); });

document.getElementById('edit-service-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api.updateService(document.getElementById('edit-service-id').value, {
      title: document.getElementById('edit-service-title').value.trim(),
      categoryId: document.getElementById('edit-service-category').value,
      price: Number(document.getElementById('edit-service-price').value),
      description: document.getElementById('edit-service-description').value.trim(),
    });
    closeEditService();
    showToast('Service updated.');
    await loadServices();
  } catch (error) {
    showToast(error.message || 'Could not update service.', true);
  } finally { button.disabled = false; }
});

async function loadReviews() {
  const tbody = document.getElementById('reviews-tbody');
  if (!tbody) return;
  showLoading(tbody, 3, 'skeleton-row');
  try {
    const serviceResults = await Promise.all(services.map((service) => api.getReviews({ serviceId: service.id }).catch(() => ({ reviews: [] }))));
    reviews = serviceResults.flatMap((result, index) => (result.reviews || []).map((review) => ({ ...review, serviceTitle: services[index]?.title || 'Service' })));
    renderReviewsTable();
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message || 'Could not load reviews.')}</td></tr>`;
  }
}

function renderReviewsTable() {
  const tbody = document.getElementById('reviews-tbody');
  const empty = document.getElementById('reviews-empty');
  if (!reviews.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = reviews.map((review) => `
    <tr>
      <td>${escapeHtml(review.serviceTitle)}</td>
      <td>${escapeHtml(review.customerName || 'Customer')}</td>
      <td><span class="review-stars">${'★'.repeat(Number(review.rating || 0))}</span></td>
      <td>${escapeHtml(review.comment || '-')}</td>
      <td class="col-actions"><button type="button" class="btn btn-danger btn-sm delete-review-btn" data-id="${escapeHtml(review.id)}">Delete</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.delete-review-btn').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('Delete this review?')) return;
    button.disabled = true;
    try {
      await api.deleteReview(button.dataset.id);
      showToast('Review deleted.');
      await loadReviews();
    } catch (error) {
      showToast(error.message || 'Could not delete review.', true);
      button.disabled = false;
    }
  }));
}

createAdminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('create-admin-button');
  const data = new FormData(createAdminForm);
  setButtonLoading(button, true, 'Create Admin', 'Creating...');
  try {
    await api.createAdmin({ name: data.get('name')?.trim(), email: data.get('email')?.trim(), phone: data.get('phone')?.trim(), password: data.get('password') });
    createAdminForm.reset();
    showToast('Administrator account created successfully.');
    await loadUsers();
    await loadStats();
  } catch (error) {
    showToast(error.message || 'Could not create administrator.', true);
  } finally { setButtonLoading(button, false, 'Create Admin', 'Creating...'); }
});

createCategoryForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('create-category-button');
  const name = new FormData(createCategoryForm).get('name')?.trim();
  setButtonLoading(button, true, 'Create Category', 'Creating...');
  try {
    await api.createCategory({ name });
    createCategoryForm.reset();
    await loadCategories();
    showToast('Category created successfully.');
  } catch (error) {
    showToast(error.message || 'Could not create category.', true);
  } finally { setButtonLoading(button, false, 'Create Category', 'Creating...'); }
});

createServiceForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('create-service-button');
  const data = new FormData(createServiceForm);
  const price = Number(data.get('price'));
  if (!Number.isFinite(price) || price < 0) {
    showToast('Please enter a valid service price.', true);
    return;
  }
  setButtonLoading(button, true, 'Create Service', 'Creating...');
  try {
    await api.createService({ title: data.get('title')?.trim(), categoryId: data.get('categoryId'), price, description: data.get('description')?.trim() });
    createServiceForm.reset();
    showToast('Service created successfully.');
    await loadServices();
    await loadStats();
  } catch (error) {
    showToast(error.message || 'Could not create service.', true);
  } finally { setButtonLoading(button, false, 'Create Service', 'Creating...'); }
});

document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeEditService(); });

Promise.all([loadStats(), loadUsers(), loadCategories(), loadBookings(), loadServices()]).then(loadReviews);
