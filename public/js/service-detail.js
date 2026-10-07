import { api } from './api.js';
import { showToast } from './ui.js';
import {
  formatPrice,
  combineDateTime,
  escapeHtml,
  localDateString,
  serviceImageUrl,
  setImageFallback,
} from './utils.js';

const params = new URLSearchParams(window.location.search);
const serviceId = params.get('id');

let currentService = null;
let bookingSubmitted = false;
let lastFocusedElement = null;

const detailTitle = document.getElementById('detail-title');
const detailCategoryBadge = document.getElementById('detail-category-badge');
const detailDescription = document.getElementById('detail-description');
const breadcrumbCat = document.getElementById('breadcrumb-cat');
const detailImg = document.getElementById('detail-img');
const summaryTitle = document.getElementById('summary-title');
const summaryProvider = document.getElementById('summary-provider');
const summaryPrice = document.getElementById('summary-price');
const panelPrice = document.getElementById('panel-price');
const mobilePrice = document.getElementById('mobile-price');
const providerName = document.getElementById('provider-name');
const providerSpecialty = document.getElementById('provider-specialty');
const providerAvatar = document.getElementById('provider-avatar');
const reviewSummary = document.getElementById('review-summary');
const reviewsList = document.getElementById('reviews-list');
const reviewsSection = document.getElementById('reviews-section');

const modal = document.getElementById('booking-modal');
const closeBtn = document.getElementById('close-booking-modal');
const bookingForm = document.getElementById('booking-request-form');
const openBtns = [
  document.getElementById('open-booking-modal-desktop'),
  document.getElementById('open-booking-modal-mobile'),
];
const bookDate = document.getElementById('book-date');
const bookTime = document.getElementById('book-time');
const bookNotes = document.getElementById('book-notes');
const submitBtn = document.getElementById('submit-booking-btn');

function showMissingService() {
  detailTitle.textContent = 'Service not found';
  detailDescription.textContent = 'We could not load this service. It may have been removed or is temporarily unavailable.';
  if (detailImg) detailImg.style.display = 'none';
  if (providerAvatar) providerAvatar.innerHTML = '';
  if (providerName) providerName.textContent = '';
  if (providerSpecialty) providerSpecialty.textContent = '';
  [panelPrice, mobilePrice, summaryPrice].forEach((el) => { if (el) el.textContent = '-'; });
  openBtns.forEach((btn) => { if (btn) btn.disabled = true; });
  reviewsSection?.classList.add('hidden');
}

function renderProviderInitial(name) {
  const value = String(name || 'Provider').trim();
  return value.charAt(0).toUpperCase() || 'P';
}

async function loadReviews() {
  if (!serviceId || !reviewsSection) return;
  try {
    const data = await api.getReviews({ serviceId });
    const average = Number(data.averageRating || 0);
    const count = Number(data.count || 0);
    reviewSummary.innerHTML = count
      ? `<strong>★ ${average.toFixed(1)}</strong><span>${count} ${count === 1 ? 'review' : 'reviews'}</span>`
      : '<span>No reviews yet</span>';

    if (!count) {
      reviewsList.innerHTML = '<div class="review-empty">Be the first customer to review this service after a completed request.</div>';
      return;
    }

    reviewsList.innerHTML = data.reviews.map((review) => {
      const stars = '★'.repeat(Number(review.rating || 0)) + '☆'.repeat(5 - Number(review.rating || 0));
      return `
        <article class="review-card">
          <div class="review-card-header">
            <strong>${escapeHtml(review.customerName || 'Customer')}</strong>
            <span class="review-stars" aria-label="${escapeHtml(String(review.rating))} out of 5">${stars}</span>
          </div>
          ${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : '<p class="review-no-comment">No written comment.</p>'}
        </article>
      `;
    }).join('');
  } catch {
    reviewsSection.classList.add('hidden');
  }
}

async function loadService() {
  if (!serviceId) {
    showToast('No service selected.', true);
    showMissingService();
    return;
  }

  try {
    currentService = await api.getServiceById(serviceId);
    document.title = `${currentService.title || 'Service'} - Handled`;

    detailTitle.textContent = currentService.title || 'Untitled service';
    detailDescription.textContent = currentService.description || 'No description provided.';
    const categoryName = currentService.categoryName || 'Service';
    breadcrumbCat.textContent = categoryName;
    if (detailCategoryBadge) detailCategoryBadge.textContent = categoryName;

    if (detailImg) {
      detailImg.src = serviceImageUrl(currentService, 1200, 800);
      detailImg.alt = currentService.title || 'Service';
      setImageFallback(detailImg);
    }

    const priceText = formatPrice(currentService.price);
    if (summaryTitle) summaryTitle.textContent = currentService.title || '';
    if (summaryProvider) summaryProvider.textContent = currentService.providerName || 'Provider';
    if (summaryPrice) summaryPrice.textContent = priceText || 'Pricing on request';
    if (panelPrice) panelPrice.textContent = priceText || 'Pricing on request';
    if (mobilePrice) mobilePrice.textContent = priceText || 'Pricing on request';

    if (providerName) providerName.textContent = currentService.providerName || 'Provider';
    if (providerSpecialty) providerSpecialty.textContent = `${categoryName} provider`;
    if (providerAvatar) providerAvatar.innerHTML = '<img src="images/avatar.png" alt="Provider Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';

    const currentUser = api.getUser();
    const isOwner = currentUser && currentService.providerId && String(currentUser.id) === String(currentService.providerId);
    openBtns.forEach((button) => {
      if (!button) return;
      if (isOwner) {
        button.disabled = true;
        button.textContent = 'Your Service';
        button.setAttribute('aria-disabled', 'true');
      }
    });
    if (isOwner) {
      ['guest-auth-prompt-desktop', 'guest-auth-prompt-mobile'].forEach((id) => {
        const prompt = document.getElementById(id);
        if (!prompt) return;
        prompt.classList.remove('hidden');
        const message = prompt.querySelector('span:last-child');
        if (message) message.textContent = 'You cannot book your own service.';
      });
    }

    await loadReviews();
  } catch (err) {
    showToast(err.message || 'Could not load service.', true);
    showMissingService();
  }
}

function setModalOpen(open, trigger = null) {
  if (!modal) return;
  if (open) {
    lastFocusedElement = trigger || document.activeElement;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    closeBtn?.focus();
  } else {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    lastFocusedElement?.focus?.();
  }
}

function handleOpenModal(triggerSource, trigger) {
  if (bookingSubmitted) {
    showToast("You've already sent a request for this service. Check your bookings.");
    return;
  }
  const currentUser = api.getUser();
  if (currentUser?.id && currentService?.providerId && String(currentUser.id) === String(currentService.providerId)) {
    showToast('You cannot book your own service.', true);
    return;
  }
  if (!api.getToken()) {
    const next = encodeURIComponent(`service-detail.html?id=${serviceId}`);
    const prompt = document.getElementById(triggerSource === 'desktop' ? 'guest-auth-prompt-desktop' : 'guest-auth-prompt-mobile');
    if (prompt) {
      prompt.querySelectorAll('a[href*="next="]').forEach((link) => {
        link.href = `login.html?next=${next}`;
      });
      prompt.classList.remove('hidden');
    }
    return;
  }
  setModalOpen(true, trigger);
}

openBtns.forEach((btn) => {
  btn?.addEventListener('click', () => handleOpenModal(btn.id.includes('mobile') ? 'mobile' : 'desktop', btn));
});

closeBtn?.addEventListener('click', () => setModalOpen(false));
modal?.addEventListener('click', (event) => {
  if (event.target === modal) setModalOpen(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.classList.contains('open')) setModalOpen(false);
});

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
bookDate.min = localDateString(tomorrow);
bookDate.value = localDateString(tomorrow);

bookingForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (bookingSubmitted || !currentService) return;

  const requestedDate = combineDateTime(bookDate.value, bookTime.value);
  if (!requestedDate || new Date(requestedDate) <= new Date()) {
    showToast('Please choose a future date and time.', true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Request...';

  try {
    await api.createBooking({ serviceId: currentService.id, requestedDate, notes: bookNotes.value.trim() });
    setModalOpen(false);
    bookingSubmitted = true;
    openBtns.forEach((btn) => {
      if (!btn) return;
      btn.textContent = 'Request Sent';
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    });
    showToast('Service request sent. The provider will review and respond shortly.');
  } catch (err) {
    showToast(err.message || 'Could not submit request.', true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Request Service';
  }
});

loadService();
