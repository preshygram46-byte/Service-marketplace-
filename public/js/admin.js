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
const editServiceForm = document.getElementById('edit-service-form');
const editServiceModal = document.getElementById('edit-service-modal');

let categories = [];
let services = [];
let users = [];
let reviews = [];
let reviewsLoaded = false;

function setButtonLoading(button, isLoading, normalText, loadingText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : normalText;
}

function setFieldError(input, message) {
  if (!input) return false;
  input.setCustomValidity(message || '');
  if (message) {
    input.reportValidity();
    input.setAttribute('aria-invalid', 'true');
    return false;
  }
  input.removeAttribute('aria-invalid');
  return true;
}

function validateText(input, label, { min = 1, max = 200 } = {}) {
  const value = input?.value.trim() || '';
  if (value.length < min) return setFieldError(input, `${label} must be at least ${min} characters.`);
  if (value.length > max) return setFieldError(input, `${label} must be ${max} characters or fewer.`);
  return setFieldError(input, '');
}

function validatePrice(input) {
  const value = Number(input?.value);
  if (!Number.isFinite(value) || value < 0) return setFieldError(input, 'Enter a valid price of 0 or more.');
  return setFieldError(input, '');
}

function renderStatusSummary(bookings) {
  const element = document.getElementById('bookings-status-summary');
  if (!element) return;
  const statuses = ['pending', 'accepted', 'completed', 'declined', 'cancelled'];
  element.innerHTML = statuses
    .map((status) => `<span>${statusLabel(status)} <strong>${Number(bookings[status] || 0)}</strong></span>`)
    .join('');
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

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
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
  if (!tbody || !empty) return;
  if (!users.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  const currentUserId = api.getUser()?.id;
  tbody.innerHTML = users.map((user) => `
    <tr>
      <td data-label="Name">${escapeHtml(user.name || '-')}</td>
      <td data-label="Email">${escapeHtml(user.email || '-')}</td>
      <td data-label="Role">
        <select class="admin-role-select" data-id="${escapeHtml(user.id)}" ${String(user.id) === String(currentUserId) ? 'disabled' : ''} aria-label="Role for ${escapeHtml(user.name || 'user')}">
          ${['customer', 'provider', 'admin'].map((role) => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role}</option>`).join('')}
        </select>
      </td>
      <td data-label="Date Joined">${user.createdAt ? formatDate(user.createdAt) : '-'}</td>
      <td data-label="Actions" class="col-actions">${String(user.id) === String(currentUserId) ? '<span class="status-text status-text-muted">Current account</span>' : `<button type="button" class="btn btn-danger btn-sm delete-user-btn" data-id="${escapeHtml(user.id)}" data-name="${escapeHtml(user.name || 'user')}">Delete</button>`}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.admin-role-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const previous = users.find((item) => String(item.id) === String(select.dataset.id))?.role;
      select.disabled = true;
      try {
        await api.updateUserRole(select.dataset.id, select.value);
        showToast('User role updated.');
        await Promise.all([loadUsers(), loadStats()]);
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
        await Promise.all([loadUsers(), loadStats()]);
      } catch (error) {
        showToast(error.message || 'Could not delete user.', true);
        button.disabled = false;
      }
    });
  });
}

async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
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
  if (!tbody || !empty) return;
  if (!bookings.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = bookings.map((booking) => `
    <tr>
      <td data-label="Service">${escapeHtml(booking.serviceTitle || '-')}</td>
      <td data-label="Customer">${escapeHtml(booking.customerName || '-')}</td>
      <td data-label="Provider">${escapeHtml(booking.providerName || '-')}</td>
      <td data-label="Status"><span class="badge badge-${escapeHtml(booking.status || 'pending')}">${statusLabel(booking.status || 'pending')}</span></td>
      <td data-label="Requested">${booking.requestedDate ? formatDate(booking.requestedDate) : '-'}</td>
    </tr>
  `).join('');
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

async function loadCategories() {
  try {
    categories = await api.getCategories();
    renderCategorySelect();
    renderCategoriesTable();
  } catch (error) {
    categories = [];
    if (serviceCategorySelect) {
      serviceCategorySelect.innerHTML = '<option value="">Categories unavailable</option>';
      serviceCategorySelect.disabled = true;
    }
    showToast(error.message || 'Could not load categories.', true);
  }
}

function renderCategoriesTable() {
  const tbody = document.getElementById('categories-tbody');
  const empty = document.getElementById('categories-empty');
  if (!tbody || !empty) return;
  if (!categories.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = categories.map((category) => `
    <tr>
      <td data-label="Name"><input class="admin-inline-input category-edit-input" data-id="${escapeHtml(category.id)}" value="${escapeHtml(category.name)}" aria-label="Category name"></td>
      <td data-label="Slug">${escapeHtml(category.slug || '-')}</td>
      <td data-label="Actions" class="col-actions"><button type="button" class="btn btn-secondary btn-sm save-category-btn" data-id="${escapeHtml(category.id)}">Save</button> <button type="button" class="btn btn-danger btn-sm delete-category-btn" data-id="${escapeHtml(category.id)}">Delete</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.save-category-btn').forEach((button) => button.addEventListener('click', async () => {
    const input = [...tbody.querySelectorAll('.category-edit-input')].find((item) => String(item.dataset.id) === String(button.dataset.id));
    const name = input?.value.trim() || '';
    if (!name) {
      showToast('Category name cannot be empty.', true);
      input?.focus();
      return;
    }
    if (name.length > 100) {
      showToast('Category name must be 100 characters or fewer.', true);
      input?.focus();
      return;
    }
    button.disabled = true;
    try {
      await api.updateCategory(button.dataset.id, { name });
      showToast('Category updated.');
      await Promise.all([loadCategories(), loadServices()]);
      reviewsLoaded = false;
    } catch (error) {
      showToast(error.message || 'Could not update category.', true);
    } finally {
      button.disabled = false;
    }
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
    reviewsLoaded = false;
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message || 'Could not load services.')}</td></tr>`;
  }
}

function renderServicesTable() {
  const tbody = document.getElementById('services-tbody');
  const empty = document.getElementById('services-empty');
  if (!tbody || !empty) return;
  if (!services.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = services.map((service) => `
    <tr>
      <td data-label="Service"><strong>${escapeHtml(service.title || '-')}</strong></td>
      <td data-label="Provider">${escapeHtml(service.providerName || '-')}</td>
      <td data-label="Category">${escapeHtml(service.categoryName || '-')}</td>
      <td data-label="Price">${formatPrice(service.price) || '-'}</td>
      <td data-label="Image"><img class="admin-service-thumb" src="${escapeHtml(serviceImageUrl(service, 180, 120))}" alt="" loading="lazy"></td>
      <td data-label="Actions" class="col-actions"><button type="button" class="btn btn-secondary btn-sm edit-admin-service-btn" data-id="${escapeHtml(service.id)}">Edit</button> <button type="button" class="btn btn-danger btn-sm delete-admin-service-btn" data-id="${escapeHtml(service.id)}">Delete</button></td>
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
      await Promise.all([loadServices(), loadStats()]);
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
  editServiceModal?.classList.add('open');
  document.getElementById('edit-service-title')?.focus();
}

function closeEditService() {
  editServiceModal?.classList.remove('open');
}

function validateServiceForm(form, fields) {
  const validTitle = validateText(fields.title, 'Service title', { min: 2, max: 120 });
  const validDescription = validateText(fields.description, 'Description', { min: 10, max: 2000 });
  const validPrice = validatePrice(fields.price);
  if (!fields.category.value) {
    setFieldError(fields.category, 'Select a category.');
    fields.category.focus();
    return false;
  }
  if (!validTitle) {
    fields.title.focus();
    return false;
  }
  if (!validDescription) {
    fields.description.focus();
    return false;
  }
  if (!validPrice) {
    fields.price.focus();
    return false;
  }
  return form.checkValidity();
}

editServiceForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = {
    title: document.getElementById('edit-service-title'),
    category: document.getElementById('edit-service-category'),
    price: document.getElementById('edit-service-price'),
    description: document.getElementById('edit-service-description'),
  };
  if (!validateServiceForm(form, fields)) return;
  const button = form.querySelector('button[type="submit"]');
  setButtonLoading(button, true, 'Save Changes', 'Saving...');
  try {
    await api.updateService(document.getElementById('edit-service-id').value, {
      title: fields.title.value.trim(),
      categoryId: fields.category.value,
      price: Number(fields.price.value),
      description: fields.description.value.trim(),
    });
    closeEditService();
    showToast('Service updated.');
    await loadServices();
  } catch (error) {
    showToast(error.message || 'Could not update service.', true);
  } finally {
    setButtonLoading(button, false, 'Save Changes', 'Saving...');
  }
});

document.querySelectorAll('.edit-service-close').forEach((button) => button.addEventListener('click', closeEditService));
editServiceModal?.addEventListener('click', (event) => {
  if (event.target === editServiceModal) closeEditService();
});

async function loadReviews() {
  const tbody = document.getElementById('reviews-tbody');
  if (!tbody || reviewsLoaded) return;
  showLoading(tbody, 3, 'skeleton-row');
  try {
    const serviceResults = await Promise.all(
      services.map((service) => api.getReviews({ serviceId: service.id }).catch(() => ({ reviews: [] }))),
    );
    reviews = serviceResults.flatMap((result, index) =>
      (result.reviews || []).map((review) => ({ ...review, serviceTitle: services[index]?.title || 'Service' })),
    );
    reviewsLoaded = true;
    renderReviewsTable();
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message || 'Could not load reviews.')}</td></tr>`;
  }
}

function renderReviewsTable() {
  const tbody = document.getElementById('reviews-tbody');
  const empty = document.getElementById('reviews-empty');
  if (!tbody || !empty) return;
  if (!reviews.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = reviews.map((review) => `
    <tr>
      <td data-label="Service">${escapeHtml(review.serviceTitle)}</td>
      <td data-label="Customer">${escapeHtml(review.customerName || 'Customer')}</td>
      <td data-label="Rating"><span class="review-stars" aria-label="${escapeHtml(String(review.rating || 0))} out of 5">${'★'.repeat(Number(review.rating || 0))}</span></td>
      <td data-label="Comment">${escapeHtml(review.comment || '-')}</td>
      <td data-label="Actions" class="col-actions"><button type="button" class="btn btn-danger btn-sm delete-review-btn" data-id="${escapeHtml(review.id)}">Delete</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.delete-review-btn').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('Delete this review?')) return;
    button.disabled = true;
    try {
      await api.deleteReview(button.dataset.id);
      showToast('Review deleted.');
      reviewsLoaded = false;
      await loadReviews();
    } catch (error) {
      showToast(error.message || 'Could not delete review.', true);
      button.disabled = false;
    }
  }));
}

createAdminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = {
    name: document.getElementById('admin-name'),
    email: document.getElementById('admin-email'),
    phone: document.getElementById('admin-phone'),
    password: document.getElementById('admin-password'),
  };
  if (!validateText(fields.name, 'Full name', { min: 2, max: 100 })) {
    fields.name.focus();
    return;
  }
  if (!fields.email.checkValidity()) {
    fields.email.reportValidity();
    return;
  }
  if (fields.phone.value.trim() && !/^[+\d][\d\s().-]{6,19}$/.test(fields.phone.value.trim())) {
    setFieldError(fields.phone, 'Enter a valid phone number.');
    fields.phone.focus();
    return;
  }
  if (fields.password.value.length < 6) {
    setFieldError(fields.password, 'Password must be at least 6 characters.');
    fields.password.focus();
    return;
  }
  setFieldError(fields.email, '');
  setFieldError(fields.phone, '');
  setFieldError(fields.password, '');
  if (!form.checkValidity()) return;

  const button = document.getElementById('create-admin-button');
  setButtonLoading(button, true, 'Create Admin', 'Creating...');
  try {
    await api.createAdmin({
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      password: fields.password.value,
    });
    form.reset();
    showToast('Administrator account created successfully.');
    await Promise.all([loadUsers(), loadStats()]);
  } catch (error) {
    showToast(error.message || 'Could not create administrator.', true);
  } finally {
    setButtonLoading(button, false, 'Create Admin', 'Creating...');
  }
});

createCategoryForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = document.getElementById('category-name');
  if (!validateText(input, 'Category name', { min: 2, max: 100 })) {
    input.focus();
    return;
  }
  const button = document.getElementById('create-category-button');
  setButtonLoading(button, true, 'Create Category', 'Creating...');
  try {
    await api.createCategory({ name: input.value.trim() });
    form.reset();
    await loadCategories();
    showToast('Category created successfully.');
  } catch (error) {
    showToast(error.message || 'Could not create category.', true);
  } finally {
    setButtonLoading(button, false, 'Create Category', 'Creating...');
  }
});

createServiceForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = {
    title: document.getElementById('service-title'),
    category: document.getElementById('service-category'),
    price: document.getElementById('service-price'),
    description: document.getElementById('service-description'),
  };
  if (!validateServiceForm(form, fields)) return;

  const button = document.getElementById('create-service-button');
  setButtonLoading(button, true, 'Create Service', 'Creating...');
  try {
    await api.createService({
      title: fields.title.value.trim(),
      categoryId: fields.category.value,
      price: Number(fields.price.value),
      description: fields.description.value.trim(),
    });
    form.reset();
    showToast('Service created successfully.');
    await Promise.all([loadServices(), loadStats()]);
  } catch (error) {
    showToast(error.message || 'Could not create service.', true);
  } finally {
    setButtonLoading(button, false, 'Create Service', 'Creating...');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeEditService();
});

const loadInitialData = async () => {
  await Promise.all([loadStats(), loadUsers(), loadCategories(), loadBookings(), loadServices()]);
  window.setTimeout(loadReviews, 400);
};

loadInitialData();
