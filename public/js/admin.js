import { api } from './api.js';
import { showToast } from './ui.js';
import { requireRole, formatDate, statusLabel, escapeHtml, showLoading, showError } from './utils.js';

const user = requireRole(['admin'], 'index.html');

async function loadAdminData() {
  const statsRow = document.querySelector('.admin-stats-row');
  const usersSection = document.getElementById('users');
  const bookingsSection = document.querySelector('.admin-section:last-of-type');

  showLoading(document.getElementById('users-tbody'), 3, 'skeleton-card');
  showLoading(document.getElementById('bookings-tbody'), 3, 'skeleton-card');

  let bookings = [];
  try {
    bookings = await api.getBookings();
  } catch (err) {
    document.getElementById('bookings-status-summary').textContent = 'Could not load bookings.';
    showToast(err.message || 'Could not load bookings.', true);
  }

  renderStats([], bookings);
  renderStatusSummary(bookings);
  renderUsersTable([]);
  renderBookingsTable(bookings);
}

function renderStats(users, bookings) {
  document.getElementById('stat-users').textContent = users.length || '—';
  document.getElementById('stat-providers').textContent = users.filter(u => u.role === 'provider').length || '—';
  document.getElementById('stat-bookings').textContent = bookings.length;
  document.getElementById('stat-completed').textContent = bookings.filter(b => b.status === 'completed').length;
}

function renderStatusSummary(bookings) {
  const counts = ['pending', 'accepted', 'completed', 'declined', 'cancelled'].reduce((acc, s) => {
    acc[s] = bookings.filter(b => b.status === s).length;
    return acc;
  }, {});
  const el = document.getElementById('bookings-status-summary');
  el.innerHTML = `Pending <strong>${counts.pending}</strong> · Accepted <strong>${counts.accepted}</strong> · Completed <strong>${counts.completed}</strong> · Declined <strong>${counts.declined}</strong> · Cancelled <strong>${counts.cancelled}</strong>`;
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  const empty = document.getElementById('users-empty');
  tbody.innerHTML = '';
  if (!users || !users.length) {
    empty.classList.remove('hidden');
    empty.querySelector('.empty-message').textContent = 'User list requires backend /api/users endpoint.';
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${escapeHtml(u.name || '—')}</td>
      <td>${escapeHtml(u.email || '—')}</td>
      <td><span class="badge badge-role">${escapeHtml(u.role || 'customer')}</span></td>
      <td>${formatDate(u.joinedAt)}</td>
    </tr>
  `).join('');
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  const empty = document.getElementById('bookings-empty');
  if (!bookings.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td>${escapeHtml(b.serviceTitle || b.serviceId || '—')}</td>
      <td>${escapeHtml(b.customerName || '—')}</td>
      <td>${escapeHtml(b.providerName || '—')}</td>
      <td><span class="badge badge-${escapeHtml(b.status)}">${statusLabel(b.status)}</span></td>
      <td>${b.requestedDate ? formatDate(b.requestedDate) : '—'}</td>
    </tr>
  `).join('');
}

loadAdminData().catch(err => showToast(err.message || 'Failed to load admin data.', true));
