import { api } from './api.js';
import { showToast } from './ui.js';
import {
  requireAuth,
  formatDate,
  escapeHtml,
  showLoading,
  showError
} from './utils.js';

const user = requireAuth('account.html');

document.addEventListener('DOMContentLoaded', async () => {
  if (!user) return;
  renderProfileHeader(user);
  await renderBookingSummary(user);
});

function renderProfileHeader(user) {
  const initial = (user.name || 'U').charAt(0).toUpperCase();
  document.getElementById('profile-avatar').textContent = initial;
  document.getElementById('profile-name').textContent = user.name || 'User';
  document.getElementById('profile-email').textContent = user.email || '—';
  const roleBadge = document.getElementById('profile-role');
  roleBadge.textContent = (user.role || 'customer').charAt(0).toUpperCase() + (user.role || 'customer').slice(1);

  const nameRead = document.getElementById('profile-name-read');
  if (nameRead) nameRead.textContent = user.name || '—';
  const emailRead = document.getElementById('profile-email-read');
  if (emailRead) emailRead.textContent = user.email || '—';
  const phoneEl = document.getElementById('profile-phone');
  if (phoneEl) phoneEl.textContent = user.phone || '—';
  const roleRead = document.getElementById('profile-role-read');
  if (roleRead) roleRead.textContent = (user.role || 'customer').charAt(0).toUpperCase() + (user.role || 'customer').slice(1);
  const joinedEl = document.getElementById('profile-joined');
  if (joinedEl) joinedEl.textContent = user.joinedAt || user.createdAt ? formatDate(user.joinedAt || user.createdAt) : '—';
}

async function renderBookingSummary(user) {
  const statTotal = document.getElementById('stat-total');
  const statCompleted = document.getElementById('stat-completed');
  const statPending = document.getElementById('stat-pending');

  try {
    const bookings = await api.getBookings();
    const filtered = bookings.filter(b => {
      if (user.role === 'provider' || user.role === 'admin') return b.providerId === user.id;
      return b.customerId === user.id || b.customerName === user.name;
    });
    const completed = filtered.filter(b => b.status === 'completed').length;
    const pending = filtered.filter(b => b.status === 'pending').length;
    statTotal.textContent = filtered.length;
    statCompleted.textContent = completed;
    statPending.textContent = pending;
  } catch (err) {
    statTotal.textContent = '0';
    statCompleted.textContent = '0';
    statPending.textContent = '0';
    showToast(err.message || 'Could not load booking summary.', true);
  }
}
