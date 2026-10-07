import { api } from './api.js';
import { escapeHtml, formatPrice, categoryIcon, serviceImageUrl, setImageFallback } from './utils.js';

function renderSkeletons() {
  const catGrid = document.getElementById('landing-categories');
  const serviceGrid = document.getElementById('landing-providers');
  if (catGrid) catGrid.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton-card category-card-skeleton"></div>').join('');
  if (serviceGrid) serviceGrid.innerHTML = Array.from({ length: 3 }, () => '<div class="skeleton-card provider-card-skeleton"></div>').join('');
}

async function loadCategories() {
  const catGrid = document.getElementById('landing-categories');
  if (!catGrid) return;
  try {
    const categories = await api.getCategories();
    if (!categories.length) {
      catGrid.innerHTML = '<p class="empty-message">No service categories available yet.</p>';
      return;
    }
    catGrid.innerHTML = categories.map((category) => {
      const link = category.slug || category.id || '';
      const label = escapeHtml(category.name || category.id || 'Category');
      return `
        <a href="services.html?category=${encodeURIComponent(link)}" class="category-card">
          <span class="material-symbols-outlined" aria-hidden="true">${categoryIcon(category.name)}</span>
          <h3>${label}</h3>
          <span class="category-count">Browse ${label}</span>
        </a>
      `;
    }).join('');
  } catch {
    catGrid.innerHTML = '<p class="empty-message">Couldn\'t load categories.</p>';
  }
}

async function loadRecentServices() {
  const grid = document.getElementById('landing-providers');
  if (!grid) return;
  try {
    const services = await api.getServices({ limit: 6 });
    const recent = services.slice(0, 3);
    if (!recent.length) {
      grid.innerHTML = '<p class="empty-message">No services listed yet.</p>';
      return;
    }
    grid.innerHTML = recent.map((service) => {
      const price = formatPrice(service.price) || 'Pricing on request';
      const provider = escapeHtml(service.providerName || 'Provider');
      const title = escapeHtml(service.title || 'Untitled service');
      const category = escapeHtml(service.categoryName || 'Service');
      const image = serviceImageUrl(service, 900, 600);
      return `
        <article class="provider-card">
          <div class="provider-header">
            <img class="provider-avatar-lg" src="${escapeHtml(image)}" alt="${title}" loading="lazy">
            <div class="provider-name-group">
              <h3>${title}</h3>
              <div class="provider-meta">
                <span>${provider}</span>
                <span aria-hidden="true">·</span>
                <span>${category}</span>
              </div>
            </div>
          </div>
          <p class="provider-bio">${escapeHtml(service.description || '')}</p>
          <div class="provider-footer">
            <div class="provider-price">${price}</div>
            <a href="service-detail.html?id=${encodeURIComponent(service.id)}" class="btn btn-secondary">View Details</a>
          </div>
        </article>
      `;
    }).join('');
    grid.querySelectorAll('img').forEach((img) => setImageFallback(img));
  } catch {
    grid.innerHTML = '<p class="empty-message">Couldn\'t load services.</p>';
  }
}

renderSkeletons();
loadCategories();
loadRecentServices();
