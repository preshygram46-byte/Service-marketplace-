import { api } from './api.js';
import { showToast } from './ui.js';
import { formatPrice, combineDateTime } from './utils.js';

const params = new URLSearchParams(window.location.search);
const serviceId = params.get('id');

let currentService = null;
let bookingSubmitted = false;

const detailMain = document.querySelector('.detail-main');
const detailTitle = document.getElementById('detail-title');
const detailCategoryBadge = document.getElementById('detail-category-badge');
const detailDescription = document.getElementById('detail-description');
const breadcrumbCat = document.getElementById('breadcrumb-cat');
const detailImg = document.getElementById('detail-img');

const summaryTitle = document.getElementById('summary-title');
const summaryProvider = document.getElementById('summary-provider');
const summaryPrice = document.getElementById('summary-price');
const summaryUnit = document.getElementById('summary-unit');

const panelPrice = document.getElementById('panel-price');
const panelUnit = document.getElementById('panel-unit');
const mobilePrice = document.getElementById('mobile-price');
const mobileUnit = document.getElementById('mobile-unit');

const providerName = document.getElementById('provider-name');
const providerSpecialty = document.getElementById('provider-specialty');
const providerResponse = document.getElementById('provider-response');
const providerSkills = document.getElementById('provider-skills');
const providerAvatar = document.getElementById('provider-avatar');

const modal = document.getElementById('booking-modal');
const closeBtn = document.getElementById('close-booking-modal');
const bookingForm = document.getElementById('booking-request-form');
const openBtns = [
  document.getElementById('open-booking-modal-desktop'),
  document.getElementById('open-booking-modal-mobile')
];
const bookDate = document.getElementById('book-date');
const bookTime = document.getElementById('book-time');
const bookNotes = document.getElementById('book-notes');
const submitBtn = document.getElementById('submit-booking-btn');

function showMissingService() {
  detailTitle.textContent = 'Service not found';
  detailDescription.textContent = 'We could not load this service. It may have been removed or is temporarily unavailable.';
  if (detailImg) detailImg.style.display = 'none';
  if (providerAvatar) providerAvatar.style.display = 'none';
  if (providerName) providerName.textContent = '';
  if (providerSpecialty) providerSpecialty.textContent = '';
  if (providerResponse) providerResponse.textContent = '';
  if (providerSkills) providerSkills.innerHTML = '';
  [panelPrice, mobilePrice, summaryPrice].forEach(el => { if (el) el.textContent = '—'; });
  [panelUnit, mobileUnit, summaryUnit].forEach(el => { if (el) el.textContent = ''; });
  openBtns.forEach(btn => { if (btn) btn.disabled = true; });
}

async function loadService() {
  if (!serviceId) {
    showToast('No service selected.', true);
    showMissingService();
    return;
  }

  try {
    currentService = await api.getServiceById(serviceId);
    document.title = `${currentService.title || 'Service'} — Handled`;

    detailTitle.textContent = currentService.title || 'Untitled service';
    detailDescription.textContent = currentService.description || '';
    breadcrumbCat.textContent = currentService.categoryId || 'Service';
    if (detailCategoryBadge) detailCategoryBadge.textContent = currentService.categoryId || 'Service';
    if (detailImg) {
      detailImg.src = currentService.image || 'images/header-visual.png';
      detailImg.alt = currentService.title || 'Service';
    }

    const priceText = formatPrice(currentService.price);
    if (summaryTitle) summaryTitle.textContent = currentService.title || '';
    if (summaryProvider) summaryProvider.textContent = currentService.providerName || 'Provider';
    if (summaryPrice) summaryPrice.textContent = priceText || '—';
    if (summaryUnit) summaryUnit.textContent = '';

    if (panelPrice) panelPrice.textContent = priceText || '—';
    if (panelUnit) panelUnit.textContent = '';
    if (mobilePrice) mobilePrice.textContent = priceText || '—';
    if (mobileUnit) mobileUnit.textContent = '';

    if (providerName) providerName.textContent = currentService.providerName || '';
    if (providerSpecialty) providerSpecialty.textContent = currentService.categoryId ? `${currentService.categoryId} Specialist` : '';
    if (providerResponse) providerResponse.textContent = '';
    if (providerAvatar) providerAvatar.alt = currentService.providerName || 'Provider';
    if (providerSkills) providerSkills.innerHTML = '';
  } catch (err) {
    showToast(err.message || 'Could not load service.', true);
    showMissingService();
  }
}

function handleOpenModal(triggerSource) {
  if (bookingSubmitted) {
    showToast("You've already sent a request for this service. Check your bookings.");
    return;
  }
  if (!api.getToken()) {
    if (triggerSource === 'desktop') {
      document.getElementById('guest-auth-prompt-desktop').classList.remove('hidden');
    } else {
      document.getElementById('guest-auth-prompt-mobile').classList.remove('hidden');
    }
    return;
  }
  modal.classList.add('open');
}

openBtns.forEach(btn => {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const isMobile = btn.id === 'open-booking-modal-mobile';
    handleOpenModal(isMobile ? 'mobile' : 'desktop');
  });
});

closeBtn.addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
bookDate.value = tomorrow.toISOString().split('T')[0];

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (bookingSubmitted || !currentService) return;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Request...';

  const requestedDate = combineDateTime(bookDate.value, bookTime.value);
  if (!requestedDate) {
    showToast('Please choose a preferred date.', true);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Request to Provider';
    return;
  }

  try {
    await api.createBooking({
      serviceId: currentService.id,
      requestedDate,
      notes: bookNotes.value
    });
    modal.classList.remove('open');
    bookingSubmitted = true;
    openBtns.forEach(btn => {
      if (!btn) return;
      btn.textContent = '✓ Request Sent';
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    });
    showToast('Service request sent. The provider will review and respond shortly.');
  } catch (err) {
    showToast(err.message || 'Could not submit request.', true);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Request to Provider';
  }
});

loadService();
