import { api } from './api.js';
import { showToast } from './ui.js';
import {
  requireAuth,
  formatDate,
  formatTime,
  formatPrice,
  statusLabel,
  escapeHtml,
  showLoading,
  showError,
  showEmpty
} from './utils.js';

const user = requireAuth('bookings.html');

let currentBookings = [];
let bookingToCancel = null;
let activeStatus = 'all';

const stream = document.getElementById('bookings-stream');
const emptyState = document.getElementById('bookings-empty');

function renderSkeletons(n = 4) {
  emptyState.classList.add('hidden');
  stream.innerHTML = Array.from({ length: n })
    .map(() => '<div class="skeleton-card booking-card-skeleton"></div>')
    .join('');
}

async function loadBookings() {
  renderSkeletons();
  try {
    currentBookings = await api.getBookings();
    renderList();
  } catch (err) {
    stream.innerHTML = '';
    emptyState.classList.add('hidden');
    showError(stream, err.message || 'Could not load bookings', {
      ctaText: 'Retry',
      onCta: loadBookings
    });
  }
}

function renderList() {
  const filtered = activeStatus === 'all'
    ? currentBookings
    : currentBookings.filter(b => b.status === activeStatus);

  if (filtered.length === 0) {
    stream.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  stream.innerHTML = filtered.map(b => {
    const status = statusLabel(b.status);
    const dateText = b.requestedDate ? formatDate(b.requestedDate) : '—';
    const timeText = b.requestedDate ? formatTime(b.requestedDate) : '';
    const priceText = b.price !== undefined && b.price !== null ? formatPrice(b.price) : '';
    const title = escapeHtml(b.serviceTitle || b.serviceId || 'Service request');
    const providerLine = b.providerName ? escapeHtml(b.providerName) : '';
    const category = b.categoryId ? escapeHtml(b.categoryId) : '';
    const notes = b.notes ? escapeHtml(b.notes) : '';

    return `
    <article class="booking-card">
      <div class="booking-card-ref">
        <div class="booking-ref-group">
          <span class="badge badge-${escapeHtml(b.status)}">${status}</span>
          ${b.id ? `<span class="ref-number">REF #${escapeHtml(b.id)}</span>` : ''}
        </div>
        ${category ? `<span class="ref-number">${category}</span>` : ''}
      </div>
      <div class="booking-card-main">
        <div class="booking-info">
          <h2>${title}</h2>
          <div class="booking-details-grid">
            ${providerLine ? `<div class="detail-row"><span class="material-symbols-outlined">person</span><span>${providerLine}</span></div>` : ''}
            <div class="detail-row"><span class="material-symbols-outlined">calendar_today</span><span>${dateText}</span></div>
            ${timeText ? `<div class="detail-row"><span class="material-symbols-outlined">schedule</span><span>${timeText}</span></div>` : ''}
            ${priceText ? `<div class="detail-row"><span class="material-symbols-outlined">payments</span><span>${priceText}</span></div>` : ''}
          </div>
          ${notes ? `<div class="booking-notes-callout">Note: "${notes}"</div>` : ''}
        </div>
        <div class="booking-actions">
          ${getActionButtons(b)}
        </div>
      </div>
    </article>
  `;
  }).join('');

  attachActionListeners();
}

function getActionButtons(b) {
  if (b.status === 'pending') {
    return `<button type="button" class="btn btn-secondary cancel-trigger-btn" data-id="${escapeHtml(b.id)}">Cancel Request</button>`;
  }
  if (b.status === 'accepted') {
    return `<button type="button" class="btn btn-secondary cancel-trigger-btn" data-id="${escapeHtml(b.id)}">Cancel</button>`;
  }
  if (b.status === 'completed' || b.status === 'declined' || b.status === 'cancelled') {
    return `<a href="services.html" class="btn btn-secondary">Browse More</a>`;
  }
  return '';
}

function attachActionListeners() {
  document.querySelectorAll('.cancel-trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bookingToCancel = btn.dataset.id;
      document.getElementById('cancel-modal').classList.add('open');
    });
  });
}

document.querySelectorAll('.status-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeStatus = tab.dataset.status;
    renderList();
  });
});

document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.target.closest('.modal-backdrop').classList.remove('open');
  });
});

document.getElementById('confirm-cancel-btn').addEventListener('click', async () => {
  if (!bookingToCancel) return;
  try {
    await api.updateBookingStatus(bookingToCancel, 'cancelled');
    document.getElementById('cancel-modal').classList.remove('open');
    showToast('Service request cancelled.');
    await loadBookings();
  } catch (err) {
    showToast(err.message || 'Could not cancel request.', true);
  } finally {
    bookingToCancel = null;
  }
});

loadBookings();
