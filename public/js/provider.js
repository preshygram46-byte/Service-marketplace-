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
  showEmpty
} from './utils.js';

const user = requireRole(['provider', 'admin'], 'index.html');

document.getElementById('provider-name').textContent = user.name || 'Provider';
const roleBadge = document.getElementById('provider-role-badge');
if (roleBadge) roleBadge.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

const stream = document.getElementById('requests-stream');

async function loadRequests() {
  showLoading(stream, 3, 'skeleton-card provider-request-skeleton');

  let bookings = [];
  try {
    bookings = await api.getBookings();
  } catch (err) {
    stream.innerHTML = '';
    showError(stream, err.message || 'Could not load requests', {
      ctaText: 'Retry',
      onCta: loadRequests
    });
    return;
  }

  const mine = bookings.filter(b => b.providerId === user.id);

  if (mine.length === 0) {
    stream.innerHTML = '';
    showEmpty(stream, 'No incoming service requests yet', {
      icon: 'inbox',
      ctaText: 'View Marketplace',
      ctaHref: 'services.html'
    });
    return;
  }

  stream.innerHTML = mine.map(b => {
    const status = statusLabel(b.status);
    const title = escapeHtml(b.serviceTitle || b.serviceId || 'Service request');
    const customer = b.customerName ? escapeHtml(b.customerName) : '';
    const dateText = b.requestedDate ? formatDate(b.requestedDate) : '—';
    const timeText = b.requestedDate ? formatTime(b.requestedDate) : '';
    const priceText = b.price !== undefined && b.price !== null ? formatPrice(b.price) : '';
    const notes = b.notes ? escapeHtml(b.notes) : '';

    return `
    <article class="provider-request-card">
      <div class="request-main">
        <span class="badge badge-${escapeHtml(b.status)}">${status}</span>
        <h3>${title}</h3>
        ${customer ? `<span class="client-name">CLIENT: ${customer}</span>` : ''}
        <div class="request-meta">
          <div class="detail-row"><span class="material-symbols-outlined">calendar_today</span> ${dateText}</div>
          ${timeText ? `<div class="detail-row"><span class="material-symbols-outlined">schedule</span> ${timeText}</div>` : ''}
          ${b.id ? `<div class="detail-row"><span class="material-symbols-outlined">tag</span> REF #${escapeHtml(b.id)}</div>` : ''}
        </div>
        ${notes ? `<div class="booking-notes-callout notes-inline">Note: "${notes}"</div>` : ''}
      </div>
      ${priceText ? `<div class="request-price"><span class="metric-label">Quoted</span><span class="price-big">${priceText}</span></div>` : ''}
      <div class="request-actions">
        ${getActionButtons(b)}
      </div>
    </article>
  `;
  }).join('');

  attachActionListeners();
}

function getActionButtons(b) {
  if (b.status === 'pending') {
    return `
      <button type="button" class="btn btn-primary action-accept" data-id="${escapeHtml(b.id)}">Accept</button>
      <button type="button" class="btn btn-secondary action-decline" data-id="${escapeHtml(b.id)}">Decline</button>
    `;
  }
  if (b.status === 'accepted') {
    return `<button type="button" class="btn btn-primary action-complete" data-id="${escapeHtml(b.id)}">Mark as Completed</button>`;
  }
  if (b.status === 'completed') {
    return `<span class="status-text"><span class="material-symbols-outlined icon-success">check_circle</span> Completed</span>`;
  }
  return `<span class="status-text status-text-muted">Request Closed</span>`;
}

function attachActionListeners() {
  document.querySelectorAll('.action-accept').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.updateBookingStatus(btn.dataset.id, 'accepted');
        showToast('Request accepted. The customer has been notified.');
        loadRequests();
      } catch (err) {
        showToast(err.message || 'Could not update request.', true);
      }
    });
  });

  document.querySelectorAll('.action-decline').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.updateBookingStatus(btn.dataset.id, 'declined');
        showToast('Request declined.');
        loadRequests();
      } catch (err) {
        showToast(err.message || 'Could not update request.', true);
      }
    });
  });

  document.querySelectorAll('.action-complete').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.updateBookingStatus(btn.dataset.id, 'completed');
        showToast('Request marked as completed.');
        loadRequests();
      } catch (err) {
        showToast(err.message || 'Could not update request.', true);
      }
    });
  });
}

loadRequests();
