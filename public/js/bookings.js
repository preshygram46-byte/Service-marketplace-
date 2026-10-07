import { api } from './api.js';
import { showToast } from './ui.js';
import {
  requireAuth,
  formatDate,
  formatTime,
  formatPrice,
  statusLabel,
  escapeHtml,
  showError,
} from './utils.js';

const user = requireAuth('bookings.html');
const canManageRequests = user?.role === 'admin' || user?.role === 'provider';
let currentBookings = [];
let bookingToCancel = null;
let bookingToReview = null;
let activeStatus = 'all';
const reviewedBookingIds = new Set();

const stream = document.getElementById('bookings-stream');
const emptyState = document.getElementById('bookings-empty');
const reviewModal = document.getElementById('review-modal');
const reviewForm = document.getElementById('review-form');
const reviewRating = document.getElementById('review-rating');
const reviewComment = document.getElementById('review-comment');
const reviewServiceTitle = document.getElementById('review-service-title');

if (canManageRequests) {
  const pageTitle = document.querySelector('main h1');
  if (pageTitle) pageTitle.textContent = user.role === 'admin' ? 'All Service Requests' : 'Customer Requests';
  const pageDescription = pageTitle?.parentElement?.querySelector('p');
  if (pageDescription) pageDescription.textContent = 'View service requests and manage their request status.';
}

function renderSkeletons(number = 4) {
  emptyState.classList.add('hidden');
  stream.innerHTML = Array.from({ length: number }, () => '<div class="skeleton-card booking-card-skeleton"></div>').join('');
}

async function loadReviewState(bookings) {
  reviewedBookingIds.clear();
  const completed = bookings.filter((booking) => booking.status === 'completed' && booking.id && booking.serviceId);
  if (!completed.length || canManageRequests) return;

  const uniqueServiceIds = [...new Set(completed.map((booking) => booking.serviceId))];
  const results = await Promise.all(uniqueServiceIds.map(async (serviceId) => {
    try {
      return await api.getReviews({ serviceId });
    } catch {
      return { reviews: [] };
    }
  }));

  results.forEach((result) => {
    (result.reviews || []).forEach((review) => {
      if (review.bookingId) reviewedBookingIds.add(String(review.bookingId));
    });
  });
}

async function loadBookings() {
  renderSkeletons();
  try {
    currentBookings = await api.getBookings();
    await loadReviewState(currentBookings);
    renderList();
  } catch (error) {
    stream.innerHTML = '';
    emptyState.classList.add('hidden');
    showError(stream, error.message || 'Could not load bookings', { ctaText: 'Retry', onCta: loadBookings });
  }
}

function renderList() {
  const filtered = activeStatus === 'all' ? currentBookings : currentBookings.filter((booking) => booking.status === activeStatus);
  if (!filtered.length) {
    stream.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  stream.innerHTML = filtered.map((booking) => {
    const status = booking.status || 'pending';
    const dateText = booking.requestedDate ? formatDate(booking.requestedDate) : '-';
    const timeText = booking.requestedDate ? formatTime(booking.requestedDate) : '';
    const priceText = booking.price !== undefined && booking.price !== null ? formatPrice(booking.price) : '';
    const title = escapeHtml(booking.serviceTitle || 'Service request');
    const personName = canManageRequests ? booking.customerName || 'Customer' : booking.providerName || 'Provider';
    const personLabel = canManageRequests ? 'Customer' : 'Provider';
    const notes = booking.notes ? escapeHtml(booking.notes) : '';

    return `
      <article class="booking-card">
        <div class="booking-card-ref">
          <div class="booking-ref-group">
            <span class="badge badge-${escapeHtml(status)}">${statusLabel(status)}</span>
            ${booking.id ? `<span class="ref-number">REF #${escapeHtml(booking.id)}</span>` : ''}
          </div>
        </div>
        <div class="booking-card-main">
          <div class="booking-info">
            <h2>${title}</h2>
            <div class="booking-details-grid">
              <div class="detail-row"><span class="material-symbols-outlined" aria-hidden="true">person</span><span>${escapeHtml(personLabel)}: ${escapeHtml(personName)}</span></div>
              <div class="detail-row"><span class="material-symbols-outlined" aria-hidden="true">calendar_today</span><span>${dateText}</span></div>
              ${timeText ? `<div class="detail-row"><span class="material-symbols-outlined" aria-hidden="true">schedule</span><span>${timeText}</span></div>` : ''}
              ${priceText ? `<div class="detail-row"><span class="material-symbols-outlined" aria-hidden="true">payments</span><span>${priceText}</span></div>` : ''}
            </div>
            ${notes ? `<div class="booking-notes-callout">Note: “${notes}”</div>` : ''}
          </div>
          <div class="booking-actions">${getActionButtons(booking)}</div>
        </div>
      </article>
    `;
  }).join('');

  attachActionListeners();
}

function getActionButtons(booking) {
  const bookingId = escapeHtml(booking.id || '');
  if (canManageRequests) {
    if (booking.status === 'pending') {
      return `<button type="button" class="btn btn-primary booking-status-btn" data-id="${bookingId}" data-status="accepted">Accept</button>
        <button type="button" class="btn btn-secondary booking-status-btn" data-id="${bookingId}" data-status="declined">Decline</button>`;
    }
    if (booking.status === 'accepted') {
      return `<button type="button" class="btn btn-primary booking-status-btn" data-id="${bookingId}" data-status="completed">Mark Completed</button>`;
    }
    return '';
  }

  if (booking.status === 'pending' || booking.status === 'accepted') {
    return `<button type="button" class="btn btn-secondary cancel-trigger-btn" data-id="${bookingId}">Cancel Request</button>`;
  }
  if (booking.status === 'completed') {
    const reviewButton = reviewedBookingIds.has(String(booking.id))
      ? '<span class="status-text status-text-muted"><span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Reviewed</span>'
      : `<button type="button" class="btn btn-primary review-trigger-btn" data-id="${bookingId}">Leave Review</button>`;
    return `${reviewButton}<a href="services.html" class="btn btn-secondary">Browse More</a>`;
  }
  return '<a href="services.html" class="btn btn-secondary">Browse More</a>';
}

function attachActionListeners() {
  document.querySelectorAll('.booking-status-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await api.updateBookingStatus(button.dataset.id, button.dataset.status);
        showToast(`Request ${statusLabel(button.dataset.status).toLowerCase()} successfully.`);
        await loadBookings();
      } catch (error) {
        showToast(error.message || 'Could not update request.', true);
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('.cancel-trigger-btn').forEach((button) => {
    button.addEventListener('click', () => {
      bookingToCancel = button.dataset.id;
      document.getElementById('cancel-modal')?.classList.add('open');
    });
  });

  document.querySelectorAll('.review-trigger-btn').forEach((button) => {
    button.addEventListener('click', () => {
      bookingToReview = currentBookings.find((booking) => String(booking.id) === String(button.dataset.id));
      if (!bookingToReview) return;
      reviewServiceTitle.textContent = bookingToReview.serviceTitle || 'Completed service';
      reviewRating.value = '5';
      reviewComment.value = '';
      reviewModal.classList.add('open');
      reviewRating.focus();
    });
  });
}

document.querySelectorAll('.status-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.status-tab').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    activeStatus = tab.dataset.status;
    renderList();
  });
});

document.querySelectorAll('.close-modal').forEach((button) => {
  button.addEventListener('click', (event) => event.target.closest('.modal-backdrop')?.classList.remove('open'));
});

document.getElementById('confirm-cancel-btn')?.addEventListener('click', async () => {
  if (!bookingToCancel) return;
  const button = document.getElementById('confirm-cancel-btn');
  button.disabled = true;
  try {
    await api.updateBookingStatus(bookingToCancel, 'cancelled');
    document.getElementById('cancel-modal')?.classList.remove('open');
    showToast('Service request cancelled.');
    await loadBookings();
  } catch (error) {
    showToast(error.message || 'Could not cancel request.', true);
  } finally {
    bookingToCancel = null;
    button.disabled = false;
  }
});

reviewForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!bookingToReview) return;
  const button = reviewForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api.createReview({ bookingId: bookingToReview.id, rating: reviewRating.value, comment: reviewComment.value.trim() });
    reviewModal.classList.remove('open');
    showToast('Review submitted successfully.');
    await loadBookings();
  } catch (error) {
    showToast(error.message || 'Could not submit review.', true);
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach((modal) => modal.classList.remove('open'));
});

loadBookings();
