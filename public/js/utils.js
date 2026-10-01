import { api } from './api.js';

const NAIRA = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) return String(value);
  return NAIRA.format(num);
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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function combineDateTime(date, time) {
  if (!date) return null;
  if (!time) return new Date(`${date}T00:00:00`).toISOString();
  const normalized = time.replace(/\s+/g, '').toUpperCase();
  const iso = new Date(`${date}T${normalized.includes('AM') || normalized.includes('PM') ? convert12hTo24h(time) : time}`).toISOString();
  return iso;
}

function convert12hTo24h(time) {
  const normalized = time.replace(/\s+/g, '').toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
  if (!match) return time;
  let [, hh, mm, period] = match;
  let h = parseInt(hh, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${mm}:00`;
}

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled'
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

export function requireAuth(redirectTo = null) {
  if (!api.getToken()) {
    const next = redirectTo || (window.location.pathname.split('/').pop() || 'index.html');
    window.location.replace(`login.html?next=${encodeURIComponent(next)}`);
    throw new Error('Not authenticated');
  }
  return api.getUser();
}

export function requireRole(roles, redirectTo = 'index.html') {
  const user = requireAuth();
  if (!roles.includes(user.role)) {
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
    ? `<button type="button" class="btn btn-primary empty-cta retry-cta">${ctaText}</button>`
    : '';
  host.innerHTML = `
    <div class="empty-state error-state">
      <span class="material-symbols-outlined empty-icon">error</span>
      <p class="empty-message">${escapeHtml(message)}</p>
      ${cta}
    </div>`;
  if (onCta) {
    const btn = host.querySelector('.retry-cta');
    if (btn) btn.addEventListener('click', onCta);
  }
}

export function showEmpty(host, message, { icon = 'inbox', ctaText = '', ctaHref = '' } = {}) {
  if (!host) return;
  const cta = ctaHref
    ? `<a href="${ctaHref}" class="btn btn-primary empty-cta">${ctaText}</a>`
    : '';
  host.innerHTML = `
    <div class="empty-state">
      <span class="material-symbols-outlined empty-icon">${icon}</span>
      <p class="empty-message">${escapeHtml(message)}</p>
      ${cta}
    </div>`;
}

export function categoryIcon() {
  return 'category';
}
