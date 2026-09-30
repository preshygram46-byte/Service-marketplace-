import { api } from './api.js';
import { escapeHtml, formatPrice } from './utils.js';

function renderSkeletons() {
  const catGrid = document.getElementById('landing-categories');
  const provGrid = document.getElementById('landing-providers');
  if (catGrid) {
    catGrid.innerHTML = Array.from({ length: 6 })
      .map(() => '<div class="skeleton-card category-card-skeleton"></div>')
      .join('');
  }
  if (provGrid) {
    provGrid.innerHTML = Array.from({ length: 3 })
      .map(() => '<div class="skeleton-card provider-card-skeleton"></div>')
      .join('');
  }
}

async function loadCategories() {
  const catGrid = document.getElementById('landing-categories');
  if (!catGrid) return;

  try {
    const categories = await api.getCategories();
    if (!categories.length) {
      catGrid.innerHTML = `<p class="empty-message">No service categories available yet.</p>`;
      return;
    }
    catGrid.innerHTML = categories.map(c => {
      const link = c.slug || (c.name || c.id || '').toLowerCase();
      const label = escapeHtml(c.name || c.id || 'Category');
      return `
        <a href="services.html?category=${encodeURIComponent(link)}" class="category-card">
          <span class="material-symbols-outlined">category</span>
          <h3>${label}</h3>
          <span class="category-count">Browse ${label}</span>
        </a>
      `;
    }).join('');
  } catch (err) {
    catGrid.innerHTML = `<p class="empty-message">Couldn't load categories.</p>`;
  }
}

async function loadProviders() {
  const provGrid = document.getElementById('landing-providers');
  if (!provGrid) return;

  try {
    const services = await api.getServices();
    const featured = services.slice(0, 3);
    if (!featured.length) {
      provGrid.innerHTML = `<p class="empty-message">No services listed yet.</p>`;
      return;
    }
    provGrid.innerHTML = featured.map(s => {
      const price = formatPrice(s.price) || 'Pricing on request';
      const provider = s.providerName ? escapeHtml(s.providerName) : '';
      const title = escapeHtml(s.title || 'Untitled service');
      const desc = escapeHtml(s.description || '');
      const catLink = s.categoryId ? encodeURIComponent(s.categoryId) : '';
      return `
        <div class="provider-card">
          <div class="provider-header">
            <div class="provider-name-group">
              <h3>${title}</h3>
              <div class="provider-meta">
                ${provider ? `<span>${provider}</span>` : ''}
                ${s.categoryId ? `<span>${escapeHtml(s.categoryId)}</span>` : ''}
              </div>
            </div>
          </div>
          <p class="provider-bio">${desc}</p>
          <div class="provider-footer">
            <div class="provider-price">${price}</div>
            <a href="service-detail.html?id=${encodeURIComponent(s.id)}" class="btn btn-secondary">View Details</a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    provGrid.innerHTML = `<p class="empty-message">Couldn't load services.</p>`;
  }
}

renderSkeletons();
loadCategories();
loadProviders();
