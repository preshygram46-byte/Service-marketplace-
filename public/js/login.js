import { api } from './api.js';
import { showToast } from './ui.js';
import { safeInternalNext } from './utils.js';

const loginTab = document.getElementById('tab-btn-login');
const registerTab = document.getElementById('tab-btn-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const errorText = authError ? authError.querySelector('.error-text') : null;
const params = new URLSearchParams(window.location.search);

function switchTab(tab) {
  const isRegister = tab === 'register';
  loginTab.classList.toggle('active', !isRegister);
  registerTab.classList.toggle('active', isRegister);
  loginForm.classList.toggle('hidden', isRegister);
  registerForm.classList.toggle('hidden', !isRegister);
  if (authError) authError.style.display = 'none';
}

loginTab.addEventListener('click', () => switchTab('login'));
registerTab.addEventListener('click', () => switchTab('register'));

if (params.get('tab') === 'register') switchTab('register');

document.querySelectorAll('.role-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const hidden = document.getElementById('register-role');
    if (hidden) hidden.value = btn.dataset.role;
  });
});

function showError(msg) {
  if (!errorText) return;
  errorText.textContent = msg;
  authError.style.display = 'flex';
}

function resolveRedirect(role) {
  const next = params.get('next');
  if (next) return safeInternalNext(next, 'index.html');
  if (role === 'provider') return 'provider-dashboard.html';
  if (role === 'admin') return 'admin.html';
  return 'bookings.html';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showError('Enter your email and password.');
  if (!loginForm.checkValidity()) { loginForm.reportValidity(); return; }
  submitButton.disabled = true;
  try {
    const res = await api.login({ email, password });
    showToast(res.message);
    const redirect = resolveRedirect(res.data.user.role);
    setTimeout(() => { window.location.href = redirect; }, 600);
  } catch (err) {
    showError(err.message);
    submitButton.disabled = false;
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = registerForm.querySelector('button[type="submit"]');
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('register-role').value;
  if (!name || !email || !password) return showError('Name, email, and password are required.');
  if (name.length < 2) return showError('Enter your full name.');
  if (!registerForm.checkValidity()) { registerForm.reportValidity(); return; }
  if (password.length < 6) return showError('Password must be at least 6 characters.');
  if (phone && !/^[+\d][\d\s().-]{6,19}$/.test(phone)) return showError('Enter a valid phone number.');
  submitButton.disabled = true;
  try {
    const res = await api.register({ name, email, phone, password, role });
    showToast(res.message);
    const redirect = resolveRedirect(res.data.user.role);
    setTimeout(() => { window.location.href = redirect; }, 600);
  } catch (err) {
    showError(err.message);
    submitButton.disabled = false;
  }
});
