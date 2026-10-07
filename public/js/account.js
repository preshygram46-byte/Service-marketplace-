import { api } from './api.js';
import { showToast } from './ui.js';
import { requireAuth, formatDate } from './utils.js';

const user = requireAuth('account.html');

document.addEventListener('DOMContentLoaded', async () => {
  if (!user) return;
  renderProfileHeader(user);
  await renderBookingSummary(user);
});

function renderProfileHeader(currentUser) {
  const profileAvatar = document.getElementById('profile-avatar');
  if (profileAvatar) {
    profileAvatar.innerHTML = '<img src="images/avatar.png" alt="Profile Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
  }
  document.getElementById('profile-name').textContent = currentUser.name || 'User';
  document.getElementById('profile-email').textContent = currentUser.email || '-';
  const role = currentUser.role || 'customer';
  document.getElementById('profile-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);

  const nameRead = document.getElementById('profile-name-read');
  if (nameRead) nameRead.textContent = currentUser.name || '-';
  const emailRead = document.getElementById('profile-email-read');
  if (emailRead) emailRead.textContent = currentUser.email || '-';
  const phoneEl = document.getElementById('profile-phone');
  if (phoneEl) phoneEl.textContent = currentUser.phone || '-';
  const roleRead = document.getElementById('profile-role-read');
  if (roleRead) roleRead.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  const joinedEl = document.getElementById('profile-joined');
  if (joinedEl) joinedEl.textContent = currentUser.createdAt ? formatDate(currentUser.createdAt) : '-';
}

async function renderBookingSummary(currentUser) {
  const statTotal = document.getElementById('stat-total');
  const statCompleted = document.getElementById('stat-completed');
  const statPending = document.getElementById('stat-pending');

  try {
    const bookings = await api.getBookings();
    const filtered = currentUser.role === 'admin'
      ? bookings
      : currentUser.role === 'provider'
        ? bookings.filter((booking) => String(booking.providerId) === String(currentUser.id))
        : bookings.filter((booking) => String(booking.customerId) === String(currentUser.id));
    statTotal.textContent = filtered.length;
    statCompleted.textContent = filtered.filter((booking) => booking.status === 'completed').length;
    statPending.textContent = filtered.filter((booking) => booking.status === 'pending').length;
  } catch (err) {
    statTotal.textContent = '0';
    statCompleted.textContent = '0';
    statPending.textContent = '0';
    showToast(err.message || 'Could not load booking summary.', true);
  }
}
