import { api } from './api.js';

const NAIRA = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) return String(value);
  return `₦${NAIRA.format(num)}`;
}

export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function combineDateTime(date, time) {
  if (!date) return null;
  const value = time ? `${date}T${time}` : `${date}T00:00:00`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '-');
}

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeInternalNext(value, fallback = 'index.html') {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (/^[a-zA-Z0-9_-]+\.html(?:\?[^#]*)?(?:#[^]*)?$/.test(decoded)) return decoded;
  } catch {
    return fallback;
  }
  return fallback;
}

export function requireAuth(redirectTo = null) {
  if (!api.getToken()) {
    const next = redirectTo || `${window.location.pathname.split('/').pop() || 'index.html'}${window.location.search || ''}`;
    window.location.replace(`login.html?next=${encodeURIComponent(next)}`);
    throw new Error('Not authenticated');
  }
  return api.getUser();
}

export function requireRole(roles, redirectTo = 'index.html') {
  const user = requireAuth();
  if (!user || !roles.includes(user.role)) {
    window.location.replace(redirectTo);
    throw new Error('Not authorised');
  }
  return user;
}

export function showLoading(host, count = 4, className = 'skeleton-card') {
  if (!host) return;
  host.innerHTML = Array.from({ length: count })
    .map(() => `<div class="${className}"></div>`)
    .join('');
}

export function showError(host, message, { ctaText = 'Try Again', onCta = null } = {}) {
  if (!host) return;
  const cta = onCta
    ? `<button type="button" class="btn btn-primary empty-cta retry-cta">${escapeHtml(ctaText)}</button>`
    : '';
  host.innerHTML = `
    <div class="empty-state error-state">
      <span class="material-symbols-outlined empty-icon">error</span>
      <p class="empty-message">${escapeHtml(message)}</p>
      ${cta}
    </div>`;
  if (onCta) host.querySelector('.retry-cta')?.addEventListener('click', onCta);
}

export function showEmpty(host, message, { icon = 'inbox', ctaText = '', ctaHref = '' } = {}) {
  if (!host) return;
  const cta = ctaHref
    ? `<a href="${escapeHtml(ctaHref)}" class="btn btn-primary empty-cta">${escapeHtml(ctaText)}</a>`
    : '';
  host.innerHTML = `
    <div class="empty-state">
      <span class="material-symbols-outlined empty-icon">${escapeHtml(icon)}</span>
      <p class="empty-message">${escapeHtml(message)}</p>
      ${cta}
    </div>`;
}

export function categoryIcon(categoryName = '') {
  const value = String(categoryName).toLowerCase();
  if (/plumb|sink|water|pipe/.test(value)) return 'plumbing';
  if (/electric|solar|inverter|power|generator/.test(value)) return 'bolt';
  if (/clean|housekeep|laundry/.test(value)) return 'cleaning_services';
  if (/tutor|education|lesson|math|waec|school|academic/.test(value)) return 'school';
  if (/beauty|hair|spa|makeup|barber/.test(value)) return 'spa';
  if (/carpent|wood|furniture|bookshelf/.test(value)) return 'handyman';
  if (/repair|maintenance|handyman/.test(value)) return 'handyman';
  return 'category';
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function serviceImageUrl(service, width = 1000, height = 700) {
  if (service?.image) return service.image;
  const title = String(service?.title || 'local professional service').trim();
  const category = String(service?.categoryName || '').trim();
  const query = [title, category, 'professional service'].filter(Boolean).join(' ');
  const lock = (hashString(query) % 999) + 1;
  return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(query)}?lock=${lock}`;
}

export function setImageFallback(img, fallback = 'images/service-fallback.png') {
  if (!img) return;
  img.addEventListener('error', () => {
    if (img.dataset.fallbackApplied === 'true') return;
    img.dataset.fallbackApplied = 'true';
    img.src = fallback;
  }, { once: true });
}
