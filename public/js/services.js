import { api } from './api.js';
import {
  formatPrice,
  escapeHtml,
  showLoading,
  showError,
  serviceImageUrl,
  setImageFallback,
  categoryIcon,
} from './utils.js';

const grid = document.getElementById('services-grid');
const countText = document.getElementById('results-count-text');
const searchInput = document.getElementById('search-input');
const desktopSort = document.getElementById('desktop-sort-select');
const mobileSort = document.getElementById('mobile-sort-select');
const emptyState = document.getElementById('empty-state');
const sidebar = document.getElementById('filters-sidebar');
const backdrop = document.getElementById('filter-backdrop');
const categoryRadios = document.getElementById('category-radios');
const openFiltersBtn = document.getElementById('open-filters-btn');
const closeFiltersBtn = document.getElementById('close-filters-btn');
const resetBtn = document.getElementById('reset-filters-btn');
const clearBtn = document.getElementById('clear-filters-btn');

let lastServices = [];
let searchTimer = null;
let requestSequence = 0;
let reviewCache = new Map();

function renderSkeletons(n = 6) {
  emptyState.classList.add('hidden');
  grid.innerHTML = Array.from({ length: n }, () => '<div class="skeleton-card catalog-card-skeleton"></div>').join('');
}

function getSelectedCategory() {
  return document.querySelector('input[name="cat"]:checked')?.value || '';
}

function getSort() {
  return window.innerWidth > 1024 ? desktopSort.value : mobileSort.value;
}

async function getRatingStats(services) {
  const ratingNeeded = getSort() === 'rating';
  if (!ratingNeeded && services.length > 12) return services;

  const results = await Promise.all(services.map(async (service) => {
    if (!service.id) return service;
    if (!reviewCache.has(service.id)) {
      reviewCache.set(service.id, api.getReviews({ serviceId: service.id }).catch(() => ({ averageRating: 0, count: 0 })));
    }
    const stats = await reviewCache.get(service.id);
    return { ...service, rating: stats.averageRating, reviewCount: stats.count };
  }));
  return results;
}

async function updateResults(showSkeleton = false) {
  const sequence = ++requestSequence;
  const query = searchInput.value.trim();
  const category = getSelectedCategory();
  const sort = getSort();

  if (showSkeleton) renderSkeletons();

  try {
    let services = await api.getServices({ query, category, limit: 100 });
    if (sequence !== requestSequence) return;

    services = await getRatingStats(services);
    if (sequence !== requestSequence) return;

    if (sort === 'rating') services.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'price-low') services.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (sort === 'price-high') services.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (sort === 'newest') services.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    lastServices = services;
    renderGrid(services);
  } catch (err) {
    grid.innerHTML = '';
    emptyState.classList.add('hidden');
    showError(grid, err.message || 'Could not load services', {
      ctaText: 'Retry',
      onCta: () => updateResults(true),
    });
    if (countText) countText.textContent = 'Unable to load services';
  }
}

function renderGrid(services) {
  if (countText) countText.textContent = `${services.length} ${services.length === 1 ? 'service' : 'services'} available`;

  if (!services.length) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = services.map((service) => {
    const categoryName = escapeHtml(service.categoryName || 'Service');
    const icon = categoryIcon(service.categoryName);
    const image = serviceImageUrl(service, 900, 620);
    const priceText = formatPrice(service.price);
    const rating = Number(service.rating || 0);
    const reviewCount = Number(service.reviewCount || 0);
    const ratingLine = reviewCount
      ? `<span class="rating-pill" aria-label="${rating.toFixed(1)} out of 5 from ${reviewCount} reviews">★ ${rating.toFixed(1)} <span>(${reviewCount})</span></span>`
      : '';

    return `
      <article class="catalog-card">
        <a class="card-img-wrap" href="service-detail.html?id=${encodeURIComponent(service.id)}" aria-label="View ${escapeHtml(service.title || 'service')}">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(service.title || 'Service')}" class="card-img" loading="lazy">
          <span class="card-category-badge"><span class="material-symbols-outlined icon-xs" aria-hidden="true">${icon}</span>${categoryName}</span>
        </a>
        <div class="card-content">
          <div class="card-provider-primary">
            <span class="material-symbols-outlined icon-sm" aria-hidden="true">person</span>
            <span class="card-provider-name">${escapeHtml(service.providerName || 'Provider')}</span>
            ${ratingLine}
          </div>
          <h3><a href="service-detail.html?id=${encodeURIComponent(service.id)}">${escapeHtml(service.title || 'Untitled service')}</a></h3>
          <p class="card-description">${escapeHtml(service.description || '')}</p>
          <div class="card-footer">
            <div class="card-price">${priceText ? `<span class="starting-from-label">Starting from</span>${priceText}` : '<span class="starting-from-label">Pricing on request</span>'}</div>
            <a href="service-detail.html?id=${encodeURIComponent(service.id)}" class="btn btn-primary">View Details</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('img.card-img').forEach((img) => setImageFallback(img));
}

async function initCategories() {
  if (!categoryRadios) return;
  const params = new URLSearchParams(window.location.search);
  const activeCat = params.get('category');

  try {
    const categories = await api.getCategories();
    let matchSlug = '';
    if (activeCat) {
      const found = categories.find((category) =>
        [category.id, category.name, category.slug]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase() === activeCat.toLowerCase()),
      );
      matchSlug = found?.slug || '';
    }

    categoryRadios.innerHTML = `
      <label class="radio-option">
        <input type="radio" name="cat" value="" ${!matchSlug ? 'checked' : ''}>
        <span>All categories</span>
      </label>
      ${categories.map((category) => {
        const value = category.slug || category.id || '';
        return `
          <label class="radio-option">
            <input type="radio" name="cat" value="${escapeHtml(value)}" ${matchSlug === value ? 'checked' : ''}>
            <span class="category-filter-label"><span class="material-symbols-outlined icon-sm" aria-hidden="true">${categoryIcon(category.name)}</span>${escapeHtml(category.name || 'Unnamed category')}</span>
          </label>
        `;
      }).join('')}
    `;

    categoryRadios.querySelectorAll('input[name="cat"]').forEach((radio) => {
      radio.addEventListener('change', () => updateResults(true));
    });
  } catch {
    categoryRadios.innerHTML = '<p class="empty-message">Could not load categories.</p>';
  }
}

function setFiltersOpen(open) {
  sidebar?.classList.toggle('is-open', open);
  backdrop?.classList.toggle('is-open', open);
  backdrop?.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('filters-open', open);
}

openFiltersBtn?.addEventListener('click', () => setFiltersOpen(true));
closeFiltersBtn?.addEventListener('click', () => setFiltersOpen(false));
backdrop?.addEventListener('click', () => setFiltersOpen(false));

resetBtn?.addEventListener('click', () => {
  const allCatRadio = categoryRadios?.querySelector('input[name="cat"][value=""]');
  if (allCatRadio) allCatRadio.checked = true;
  searchInput.value = '';
  desktopSort.value = 'newest';
  mobileSort.value = 'newest';
  setFiltersOpen(false);
  updateResults(true);
});

clearBtn?.addEventListener('click', () => {
  const allCatRadio = categoryRadios?.querySelector('input[name="cat"][value=""]');
  if (allCatRadio) allCatRadio.checked = true;
  searchInput.value = '';
  updateResults(true);
});

searchInput?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => updateResults(false), 300);
});

desktopSort?.addEventListener('change', () => updateResults(false));
mobileSort?.addEventListener('change', () => {
  desktopSort.value = mobileSort.value;
  updateResults(false);
});

document.addEventListener('DOMContentLoaded', async () => {
  await initCategories();
  await updateResults(true);
});
