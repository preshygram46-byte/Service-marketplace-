import { api } from './api.js';
import { showToast } from './ui.js';
import {
  requireRole,
  formatDate,
  formatTime,
  formatPrice,
  statusLabel,
  escapeHtml,
  showLoading,
  showError,
  showEmpty,
  serviceImageUrl,
  setImageFallback,
} from './utils.js';

const user = requireRole(['provider', 'admin'], 'index.html');
const providerName = document.getElementById('provider-name');
const roleBadge = document.getElementById('provider-role-badge');
const requestStream = document.getElementById('requests-stream');
const servicesStream = document.getElementById('provider-services-stream');
const serviceForm = document.getElementById('provider-service-form');
const serviceModal = document.getElementById('provider-service-modal');
const serviceModalTitle = document.getElementById('provider-service-modal-title');
const serviceIdInput = document.getElementById('provider-service-id');
const serviceTitleInput = document.getElementById('provider-service-title');
const serviceCategoryInput = document.getElementById('provider-service-category');
const servicePriceInput = document.getElementById('provider-service-price');
const serviceDescriptionInput = document.getElementById('provider-service-description');

providerName.textContent = user.name || 'Provider';
if (roleBadge) roleBadge.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

async function loadRequests() {
  showLoading(requestStream, 3, 'skeleton-card provider-request-skeleton');
  try {
    const bookings = await api.getBookings();
    const mine = bookings.filter((booking) => String(booking.providerId) === String(user.id));
    if (!mine.length) {
      showEmpty(requestStream, 'No incoming service requests yet', { icon: 'inbox', ctaText: 'View Marketplace', ctaHref: 'services.html' });
      return;
    }

    requestStream.innerHTML = mine.map((booking) => {
      const status = booking.status || 'pending';
      const title = escapeHtml(booking.serviceTitle || booking.serviceId || 'Service request');
      const customer = booking.customerName ? escapeHtml(booking.customerName) : 'Customer';
      const dateText = booking.requestedDate ? formatDate(booking.requestedDate) : '-';
      const timeText = booking.requestedDate ? formatTime(booking.requestedDate) : '';
      const priceText = booking.price !== undefined && booking.price !== null ? formatPrice(booking.price) : '';
      const notes = booking.notes ? escapeHtml(booking.notes) : '';
      return `
        <article class="provider-request-card">
          <div class="request-main">
            <span class="badge badge-${escapeHtml(status)}">${statusLabel(status)}</span>
            <h3>${title}</h3>
            <span class="client-name">CLIENT: ${customer}</span>
            <div class="request-meta">
              <div class="detail-row"><span class="material-symbols-outlined" aria-hidden="true">calendar_today</span>${dateText}</div>
              ${timeText ? `<div class="detail-row"><span class="material-symbols-outlined" aria-hidden="true">schedule</span>${timeText}</div>` : ''}
              ${booking.id ? `<div class="detail-row"><span class="material-symbols-outlined" aria-hidden="true">tag</span>REF #${escapeHtml(booking.id)}</div>` : ''}
            </div>
            ${notes ? `<div class="booking-notes-callout notes-inline">Note: “${notes}”</div>` : ''}
          </div>
          ${priceText ? `<div class="request-price"><span class="metric-label">Quoted</span><span class="price-big">${priceText}</span></div>` : ''}
          <div class="request-actions">${getActionButtons(booking)}</div>
        </article>
      `;
    }).join('');
    attachRequestListeners();
  } catch (err) {
    requestStream.innerHTML = '';
    showError(requestStream, err.message || 'Could not load requests', { ctaText: 'Retry', onCta: loadRequests });
  }
}

function getActionButtons(booking) {
  if (booking.status === 'pending') {
    return `<button type="button" class="btn btn-primary action-accept" data-id="${escapeHtml(booking.id)}">Accept</button>
      <button type="button" class="btn btn-secondary action-decline" data-id="${escapeHtml(booking.id)}">Decline</button>`;
  }
  if (booking.status === 'accepted') {
    return `<button type="button" class="btn btn-primary action-complete" data-id="${escapeHtml(booking.id)}">Mark as Completed</button>`;
  }
  if (booking.status === 'completed') {
    return '<span class="status-text"><span class="material-symbols-outlined icon-success" aria-hidden="true">check_circle</span> Completed</span>';
  }
  return '<span class="status-text status-text-muted">Request Closed</span>';
}

function attachRequestListeners() {
  document.querySelectorAll('.action-accept, .action-decline, .action-complete').forEach((button) => {
    button.addEventListener('click', async () => {
      const status = button.classList.contains('action-accept') ? 'accepted' : button.classList.contains('action-decline') ? 'declined' : 'completed';
      button.disabled = true;
      try {
        await api.updateBookingStatus(button.dataset.id, status);
        showToast(`Request ${statusLabel(status).toLowerCase()} successfully.`);
        await loadRequests();
      } catch (err) {
        showToast(err.message || 'Could not update request.', true);
        button.disabled = false;
      }
    });
  });
}

async function loadCategories() {
  if (!serviceCategoryInput) return;
  try {
    const categories = await api.getCategories();
    serviceCategoryInput.innerHTML = `<option value="">Select a category</option>${categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('')}`;
  } catch {
    serviceCategoryInput.innerHTML = '<option value="">Categories unavailable</option>';
    serviceCategoryInput.disabled = true;
  }
}

async function loadServices() {
  if (!servicesStream) return;
  showLoading(servicesStream, 3, 'skeleton-card provider-service-skeleton');
  try {
    const services = await api.getServices({ provider: user.id, limit: 100 });
    if (!services.length) {
      showEmpty(servicesStream, 'You have not listed any services yet.', { icon: 'category', ctaText: 'Create your first service', ctaHref: '#provider-service-form' });
      return;
    }
    servicesStream.innerHTML = services.map((service) => `
      <article class="provider-service-card">
        <img class="provider-service-image" src="${escapeHtml(serviceImageUrl(service, 700, 450))}" alt="${escapeHtml(service.title || 'Service')}" loading="lazy">
        <div class="provider-service-content">
          <span class="badge badge-role">${escapeHtml(service.categoryName || 'Service')}</span>
          <h3>${escapeHtml(service.title || 'Untitled service')}</h3>
          <p>${escapeHtml(service.description || '')}</p>
          <strong>${formatPrice(service.price) || 'Pricing on request'}</strong>
          <div class="provider-service-actions">
            <button type="button" class="btn btn-secondary edit-service-btn" data-id="${escapeHtml(service.id)}">Edit</button>
            <button type="button" class="btn btn-danger delete-service-btn" data-id="${escapeHtml(service.id)}" data-title="${escapeHtml(service.title || 'service')}">Delete</button>
          </div>
        </div>
      </article>
    `).join('');
    servicesStream.querySelectorAll('img').forEach((img) => setImageFallback(img));
    attachServiceListeners();
  } catch (err) {
    servicesStream.innerHTML = '';
    showError(servicesStream, err.message || 'Could not load your services', { ctaText: 'Retry', onCta: loadServices });
  }
}

function openServiceModal(service = null) {
  serviceModal?.classList.add('open');
  if (service) {
    serviceModalTitle.textContent = 'Edit Service';
    serviceIdInput.value = service.id;
    serviceTitleInput.value = service.title || '';
    serviceCategoryInput.value = service.categoryId || '';
    servicePriceInput.value = service.price ?? '';
    serviceDescriptionInput.value = service.description || '';
  } else {
    serviceModalTitle.textContent = 'Create Service';
    serviceForm.reset();
    serviceIdInput.value = '';
  }
  serviceTitleInput.focus();
}

function closeServiceModal() {
  serviceModal?.classList.remove('open');
}

async function attachServiceListeners() {
  const services = await api.getServices({ provider: user.id, limit: 100 }).catch(() => []);
  document.querySelectorAll('.edit-service-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const service = services.find((item) => String(item.id) === String(button.dataset.id));
      if (service) openServiceModal(service);
    });
  });
  document.querySelectorAll('.delete-service-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm(`Delete “${button.dataset.title}”? This cannot be undone.`)) return;
      button.disabled = true;
      try {
        await api.deleteService(button.dataset.id);
        showToast('Service deleted.');
        await loadServices();
      } catch (err) {
        showToast(err.message || 'Could not delete service.', true);
        button.disabled = false;
      }
    });
  });
}

document.getElementById('create-provider-service-btn')?.addEventListener('click', () => openServiceModal());
document.querySelectorAll('.provider-service-close').forEach((button) => button.addEventListener('click', closeServiceModal));
serviceModal?.addEventListener('click', (event) => { if (event.target === serviceModal) closeServiceModal(); });

document.getElementById('provider-service-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const id = serviceIdInput.value.trim();
  const payload = {
    title: serviceTitleInput.value.trim(),
    categoryId: serviceCategoryInput.value,
    price: Number(servicePriceInput.value),
    description: serviceDescriptionInput.value.trim(),
  };
  if (!payload.title || !payload.categoryId || !payload.description || !Number.isFinite(payload.price) || payload.price < 0) {
    showToast('Complete all service fields with a valid price.', true);
    return;
  }
  button.disabled = true;
  try {
    if (id) await api.updateService(id, payload);
    else await api.createService(payload);
    closeServiceModal();
    showToast(id ? 'Service updated.' : 'Service created.');
    await loadServices();
  } catch (err) {
    showToast(err.message || 'Could not save service.', true);
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeServiceModal();
});

Promise.all([loadRequests(), loadCategories(), loadServices()]);
