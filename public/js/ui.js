import { api } from './api.js';

export function showToast(message, isError = false) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.setAttribute('role', isError ? 'alert' : 'status');
  toast.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${isError ? 'error' : 'done_all'}</span><span class="toast-message"></span>`;
  toast.querySelector('.toast-message').textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('reveal'));
  setTimeout(() => {
    toast.classList.remove('reveal');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function renderNav(user) {
  const nav = document.querySelector('nav.main-nav');
  if (!nav) return;
  nav.id = 'primary-nav';
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const link = (href, label) => {
    const isActive = path === href ? 'active' : '';
    return `<a href="${href}" class="${isActive}">${label}</a>`;
  };
  const isLanding = path === '' || path === 'index.html';
  const homeLink = isLanding ? '' : link('index.html', 'Home');

  let linksHtml = '';
  if (!user) {
    linksHtml = `${homeLink}${link('services.html', 'Browse Services')}${link('index.html#how-it-works', 'How It Works')}`;
  } else if (user.role === 'provider') {
    linksHtml = `${homeLink}${link('services.html', 'Browse Services')}${link('provider-dashboard.html', 'Provider Dashboard')}${link('account.html', 'My Profile')}`;
  } else if (user.role === 'admin') {
    linksHtml = `${homeLink}${link('services.html', 'Browse Services')}${link('admin.html', 'Admin Panel')}${link('bookings.html', 'All Requests')}${link('account.html', 'My Profile')}`;
  } else {
    linksHtml = `${homeLink}${link('services.html', 'Browse Services')}${link('bookings.html', 'My Requests')}${link('account.html', 'My Profile')}${link('index.html#how-it-works', 'How It Works')}`;
  }

  const drawerFooter = user
    ? '<div class="nav-drawer-footer"><a href="account.html" class="btn btn-secondary btn-block">My Profile</a><button type="button" class="btn btn-secondary btn-block logout-btn">Log Out</button></div>'
    : '<div class="nav-drawer-footer"><a href="login.html" class="btn btn-secondary btn-block">Log In</a><a href="login.html?tab=register" class="btn btn-primary btn-block">Sign Up</a></div>';

  nav.innerHTML = linksHtml + drawerFooter;
}

function renderUserCorner(user) {
  const userCorner = document.querySelector('.user-corner');
  if (!userCorner) return;
  if (user) {
    userCorner.innerHTML = `
      <div class="user-info">
        <a href="account.html" class="user-account-link" aria-label="View profile">
          <img src="images/avatar.png" alt="User Avatar" class="user-avatar" onerror="this.src='images/avatar.png'">
          <span class="user-name"></span>
        </a>
        <a href="account.html" class="btn btn-secondary btn-sm profile-btn">My Profile</a>
        <button type="button" class="btn btn-secondary btn-sm logout-btn">Log Out</button>
      </div>`;
    userCorner.querySelector('.user-name').textContent = user.name || 'User';
    userCorner.querySelector('.logout-btn').addEventListener('click', () => api.logout());
  } else {
    userCorner.innerHTML = '<div class="auth-links"><a href="login.html" class="login-link">Log In</a><a href="login.html?tab=register" class="btn btn-primary btn-sm signup-btn">Sign Up</a></div>';
  }
}

export function initializeShell() {
  const root = document.documentElement;
  const body = document.body;
  const themeToggleBtn = document.querySelector('.theme-toggle');
  const storedTheme = localStorage.getItem('handled_theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const theme = storedTheme || (prefersDark ? 'dark' : 'light');

  function applyTheme(value) {
    const dark = value === 'dark';
    root.classList.toggle('dark', dark);
    body.classList.toggle('dark', dark);
    themeToggleBtn?.setAttribute('aria-pressed', String(dark));
    themeToggleBtn?.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  applyTheme(theme);
  themeToggleBtn?.addEventListener('click', () => {
    const next = body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('handled_theme', next);
  });

  const user = api.getUser();
  renderNav(user);
  renderUserCorner(user);

  const menuBtns = document.querySelectorAll('.menu');
  const mainNav = document.querySelector('nav.main-nav');
  const navBackdrop = document.querySelector('.nav-backdrop');

  let lastFocusedMenuButton = null;

  function setNavOpen(open) {
    menuBtns.forEach((button) => {
      button.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    });
    mainNav?.classList.toggle('is-open', open);
    navBackdrop?.classList.toggle('is-open', open);
    navBackdrop?.setAttribute('aria-hidden', String(!open));
    mainNav?.setAttribute('aria-hidden', String(!open));
    body.classList.toggle('nav-open', open);
    if (open) {
      lastFocusedMenuButton = document.activeElement;
      mainNav?.querySelector('a')?.focus();
    } else if (lastFocusedMenuButton instanceof HTMLElement) {
      lastFocusedMenuButton.focus();
    }
  }

  menuBtns.forEach((button) => button.addEventListener('click', () => setNavOpen(!(mainNav?.classList.contains('is-open')))));
  mainNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setNavOpen(false)));
  mainNav?.querySelectorAll('.nav-drawer-footer .logout-btn').forEach((button) => button.addEventListener('click', () => { setNavOpen(false); api.logout(); }));
  navBackdrop?.addEventListener('click', () => setNavOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mainNav?.classList.contains('is-open')) setNavOpen(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && mainNav?.classList.contains('is-open')) setNavOpen(false);
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('loggedOut') === 'true') {
    showToast("You've been signed out.");
    params.delete('loggedOut');
    const newSearch = params.toString();
    history.replaceState({}, document.title, window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash);
  }
}

document.addEventListener('DOMContentLoaded', initializeShell);
