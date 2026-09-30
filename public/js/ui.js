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

  const icon = isError ? 'error' : 'done_all';
  toast.innerHTML = `
    <span class="material-symbols-outlined">${icon}</span>
    <span class="toast-message"></span>
  `;
  toast.querySelector('.toast-message').textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('reveal'), 10);
  setTimeout(() => {
    toast.classList.remove('reveal');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function renderNav(user) {
  const nav = document.querySelector('nav.main-nav');
  if (!nav) return;

  const path = window.location.pathname.split('/').pop() || 'index.html';

  const link = (href, label, primary = false) => {
    const isActive = path === href ? 'active' : '';
    const cls = primary
      ? `btn btn-primary btn-sm ${isActive}`
      : `${isActive}`;
    return `<a href="${href}" class="${cls}">${label}</a>`;
  };

  const isLanding = path === '' || path === 'index.html';
  const homeLink = isLanding ? '' : link('index.html', 'Home');

  let linksHtml = '';
  if (!user) {
    linksHtml = `
      ${homeLink}
      ${link('services.html', 'Browse Services')}
      ${link('index.html#how-it-works', 'How It Works')}
    `;
  } else if (user.role === 'provider') {
    linksHtml = `
      ${homeLink}
      ${link('services.html', 'Browse Services')}
      ${link('provider-dashboard.html', 'Provider Dashboard')}
      ${link('account.html', 'My Profile')}
    `;
  } else if (user.role === 'admin') {
    linksHtml = `
      ${homeLink}
      ${link('services.html', 'Browse Services')}
      ${link('admin.html', 'Admin Panel')}
      ${link('bookings.html', 'All Requests')}
      ${link('account.html', 'My Profile')}
    `;
  } else {
    linksHtml = `
      ${homeLink}
      ${link('services.html', 'Browse Services')}
      ${link('bookings.html', 'My Requests')}
      ${link('account.html', 'My Profile')}
      ${link('index.html#how-it-works', 'How It Works')}
    `;
  }

  const drawerFooter = user
    ? `
      <div class="nav-drawer-footer">
        <a href="account.html" class="btn btn-secondary btn-block">My Profile</a>
        <button type="button" class="btn btn-secondary btn-block logout-btn">Log Out</button>
      </div>
    `
    : `
      <div class="nav-drawer-footer">
        <a href="login.html" class="btn btn-secondary btn-block">Log In</a>
        <a href="login.html?tab=register" class="btn btn-primary btn-block">Sign Up</a>
      </div>
    `;

  nav.innerHTML = linksHtml + drawerFooter;
}

function renderUserCorner(user) {
  const userCorner = document.querySelector('.user-corner');
  if (!userCorner) return;

  if (user) {
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    const avatarHtml = user.avatar
      ? `<img src="${user.avatar}" alt="${user.name}" class="user-avatar">`
      : `<div class="user-avatar-initial">${initial}</div>`;

    userCorner.innerHTML = `
      <div class="user-info">
        <a href="account.html" class="user-account-link" aria-label="View profile">
          ${avatarHtml}
          <span class="user-name"></span>
        </a>
        <a href="account.html" class="btn btn-secondary btn-sm profile-btn">My Profile</a>
        <button type="button" class="btn btn-secondary btn-sm logout-btn">Log Out</button>
      </div>
    `;
    userCorner.querySelector('.user-name').textContent = user.name;
    userCorner.querySelector('.logout-btn').addEventListener('click', () => api.logout());
  } else {
    userCorner.innerHTML = `
      <div class="auth-links">
        <a href="login.html" class="login-link">Log In</a>
        <a href="login.html?tab=register" class="btn btn-primary btn-sm signup-btn">Sign Up</a>
      </div>
    `;
  }
}

export function initializeShell() {
  const root = document.documentElement;
  const body = document.body;
  const themeToggleBtn = document.querySelector('.theme-toggle');
  const storedTheme = localStorage.getItem('handled_theme') || 'light';

  if (storedTheme === 'dark') {
    root.classList.add('dark');
    body.classList.add('dark');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const next = body.classList.contains('dark') ? 'light' : 'dark';
      if (next === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
      }
      localStorage.setItem('handled_theme', next);
    });
  }

  const user = api.getUser();
  renderNav(user);
  renderUserCorner(user);

  const menuBtns = document.querySelectorAll('.menu');
  const mainNav = document.querySelector('nav.main-nav');
  const navBackdrop = document.querySelector('.nav-backdrop');

  function setNavOpen(open) {
    menuBtns.forEach(b => {
      b.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if (mainNav) mainNav.classList.toggle('is-open', open);
    if (navBackdrop) navBackdrop.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  menuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const willOpen = !(mainNav && mainNav.classList.contains('is-open'));
      setNavOpen(willOpen);
    });
  });

  if (mainNav) {
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setNavOpen(false));
    });
    mainNav.querySelectorAll('.nav-drawer-footer .logout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setNavOpen(false);
        api.logout();
      });
    });
  }

  if (navBackdrop) {
    navBackdrop.addEventListener('click', () => setNavOpen(false));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav && mainNav.classList.contains('is-open')) {
      setNavOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && mainNav && mainNav.classList.contains('is-open')) {
      setNavOpen(false);
    }
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('loggedOut') === 'true') {
    showToast("You've been signed out.");
    params.delete('loggedOut');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    history.replaceState({}, document.title, newUrl);
  }
}

document.addEventListener('DOMContentLoaded', initializeShell);
