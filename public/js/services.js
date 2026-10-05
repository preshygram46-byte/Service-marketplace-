import { api } from './api.js';
import { formatPrice, escapeHtml, showLoading, showError, showEmpty, categoryIcon } from './utils.js';

const grid = document.getElementById('services-grid');
const countText = document.getElementById('results-count-text');
const searchInput = document.getElementById('search-input');
const desktopSort = document.getElementById('desktop-sort-select');
const mobileSort = document.getElementById('mobile-sort-select');
const emptyState = document.getElementById('empty-state');
const sidebar = document.getElementById('filters-sidebar');
const backdrop = document.getElementById('filter-backdrop');

let lastServices = [];

function renderSkeletons(n = 4) {
  emptyState.classList.add('hidden');
  grid.innerHTML = Array.from({ length: n })
    .map(() => '<div class="skeleton-card catalog-card-skeleton"></div>')
    .join('');
}

async function updateResults(showSkeleton = false) {
  const query = searchInput.value.trim();
  const checked = document.querySelector('input[name="cat"]:checked');
  const category = checked ? checked.value : '';
  const sort = window.innerWidth > 1024 ? desktopSort.value : mobileSort.value;

  if (showSkeleton) renderSkeletons();

  try {
    let services = await api.getServices({ query, category });
    lastServices = services;

    if (sort === 'rating') services = [...services].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'price-low') services = [...services].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === 'price-high') services = [...services].sort((a, b) => (b.price || 0) - (a.price || 0));

    renderGrid(services);
  } catch (err) {
    grid.innerHTML = '';
    emptyState.classList.add('hidden');
    showError(grid, err.message || 'Could not load services', {
      ctaText: 'Retry',
      onCta: () => updateResults(true)
    });
    countText.textContent = 'Unable to load services';
  }
}

function renderGrid(services) {
  countText.textContent = `${services.length} ${services.length === 1 ? 'service' : 'services'} available`;

  if (services.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = services.map((s, index) => {
    const categoryName = escapeHtml(s.categoryName || '');
    const imgSrc = s.image || 'images/header-visual.png';
    const priceText = formatPrice(s.price);
    const priceLine = priceText
      ? `<div class="card-price"><span class="starting-from-label">Starting from</span>${priceText}</div>`
      : '<div class="card-price"><span class="starting-from-label">Pricing on request</span></div>';
    const providerLine = s.providerName
      ? `<span class="card-provider-name">${escapeHtml(s.providerName)}</span>`
      : '';
    const ratingLine = (s.rating !== undefined && s.rating !== null)
      ? `<span class="rating-pill">★ ${escapeHtml(String(s.rating))}</span>`
      : '';
    const featuredClass = (index === 0 && services.length > 2) ? 'featured-treatment' : '';

    return `
    <article class="catalog-card ${featuredClass}">
      <div class="card-img-wrap">
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(s.title || 'Service')}" class="card-img">
        ${categoryName ? `<span class="card-category-badge">${categoryName}</span>` : ''}
      </div>
      <div class="card-content">
        <div class="card-provider-primary">
          <span class="material-symbols-outlined icon-sm">person</span>
          ${providerLine}
          ${ratingLine}
        </div>
        <h3>${escapeHtml(s.title || 'Untitled service')}</h3>
        <p class="card-description">${escapeHtml(s.description || '')}</p>
        <div class="card-footer">
          ${priceLine}
          <a href="service-detail.html?id=${encodeURIComponent(s.id)}" class="btn btn-primary">View Details</a>
        </div>
      </div>
    </article>
  `;
  }).join('');
}

async function initCategories() {
  const radioContainer = document.getElementById('category-radios');
  const params = new URLSearchParams(window.location.search);
  const activeCat = params.get('category');

  let categories = [];
  try {
    categories = await api.getCategories();
  } catch (err) {
    radioContainer.insertAdjacentHTML('beforeend', `
      <p class="empty-message">Categories unavailable.</p>
    `);
    return '';
  }

  let matchValue = '';
  if (activeCat) {
    const lower = activeCat.toLowerCase();
    const found = categories.find(c =>
      (c.name && c.name.toLowerCase() === lower) ||
      (c.slug && c.slug.toLowerCase() === lower) ||
      (c.id && c.id.toLowerCase() === lower)
    );
    if (found) matchValue = found.name || found.id;
  }

  radioContainer.insertAdjacentHTML('beforeend', categories.map(c => {
    const value = c.name || c.id || '';
    return `
      <label class="radio-option">
        <input type="radio" name="cat" value="${escapeHtml(value)}" ${matchValue === value ? 'checked' : ''}>
        <span>${escapeHtml(c.name || c.id || '')}</span>
      </label>
    `;
  }).join(''));

  document.querySelectorAll('input[name="cat"]').forEach(r => {
    r.addEventListener('change', () => updateResults());
  });

  return matchValue;
}

const params = new URLSearchParams(window.location.search);
if (params.get('q')) searchInput.value = params.get('q');

searchInput.addEventListener('input', () => updateResults());
desktopSort.addEventListener('change', () => {
  mobileSort.value = desktopSort.value;
  updateResults();
});
mobileSort.addEventListener('change', () => {
  desktopSort.value = mobileSort.value;
  updateResults();
});
window.addEventListener('resize', () => {
  if (desktopSort.value !== mobileSort.value) {
    mobileSort.value = desktopSort.value;
  }
});

document.getElementById('reset-filters-btn').addEventListener('click', () => {
  searchInput.value = '';
  const allRadio = document.querySelector('input[name="cat"][value=""]');
  if (allRadio) allRadio.checked = true;
  updateResults();
});

document.getElementById('clear-filters-btn').addEventListener('click', () => {
  searchInput.value = '';
  const allRadio = document.querySelector('input[name="cat"][value=""]');
  if (allRadio) allRadio.checked = true;
  updateResults();
});

document.getElementById('open-filters-btn').addEventListener('click', () => {
  sidebar.classList.add('open');
  backdrop.classList.add('active');
});

document.getElementById('close-filters-btn').addEventListener('click', () => {
  sidebar.classList.remove('open');
  backdrop.classList.remove('active');
});

backdrop.addEventListener('click', () => {
  sidebar.classList.remove('open');
  backdrop.classList.remove('active');
});

initCategories().then(() => updateResults(true));
