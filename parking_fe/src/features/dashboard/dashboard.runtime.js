import {
  apiPage,
  apiRequest,
  clearSession,
  getStoredAccount,
  jsonBody,
  saveSession,
  startSessionGuard,
} from '../../services/api.js';

const page = document.body.dataset.page;
const PENDING_CONFIRM_EMAIL_KEY = 'parkingPendingConfirmEmail';

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return [...document.querySelectorAll(selector)];
}

function setText(selector, value) {
  const element = $(selector);
  if (element) {
    element.textContent = value ?? '-';
  }
}

function setStatus(selector, message, error = false) {
  const element = $(selector);
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle('error', error);
}

function formData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (value !== '') {
      data[key] = value;
    }
  });
  return data;
}

function toIso(value) {
  return value ? new Date(value).toISOString() : undefined;
}

function money(value, currency = 'VND') {
  const amount = Number(value?.amount ?? value ?? 0);
  return new Intl.NumberFormat('en-US', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);
}

function shortId(value) {
  const text = String(value || '');
  return text.length > 8 ? text.slice(0, 8).toUpperCase() : text || '-';
}

function renderList(selector, items, renderItem, empty = 'No records yet.') {
  const element = $(selector);
  if (!element) {
    return;
  }

  element.innerHTML = items.length
    ? items.map(renderItem).join('')
    : `<div class="empty-state">${empty}</div>`;
}

function normalizeFilterValue(value) {
  return String(value || '').trim().toLowerCase();
}

function userDisplayName(user) {
  return user.fullName || user.name || user.displayName || user.email || user.phone || user.id || 'Unknown user';
}

function userInitials(user) {
  const label = userDisplayName(user).replace(/@.*/, '');
  const pieces = label.split(/[.\-_\s]+/).filter(Boolean);
  const initials = pieces.length > 1
    ? `${pieces[0][0]}${pieces[1][0]}`
    : label.slice(0, 2);

  return initials.toUpperCase();
}

function ensureAdminRequestNavLink() {
  const nav = $('.admin-nav-links');
  if (!nav) {
    return;
  }

  if (!nav.querySelector('a[href="/admin.html"]')) {
    const dashboardLink = document.createElement('a');
    dashboardLink.href = '/admin.html';
    dashboardLink.classList.toggle('active', page === 'admin');
    dashboardLink.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z" />
      </svg>
      Dashboard
    `;
    nav.insertBefore(dashboardLink, nav.firstElementChild);
  }

  if (!nav.querySelector('a[href="/admin-requests.html"]')) {
    const link = document.createElement('a');
    link.href = '/admin-requests.html';
    link.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h10l4 4v14H5V3Zm9 2v4h4l-4-4ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Zm0-8h4v2H8V7Z" />
      </svg>
      Requests
    `;

    const lotLink = nav.querySelector('a[href="/admin-lots.html"]');
    if (lotLink?.nextSibling) {
      nav.insertBefore(link, lotLink.nextSibling);
    } else {
      nav.appendChild(link);
    }
  }
}

function shortAccountId(id, prefix = 'USR') {
  const rawId = String(id || '').trim();
  if (!rawId) {
    return '-';
  }

  const compactId = rawId.replace(/-/g, '');
  const suffix = compactId.length > 8 ? compactId.slice(-6) : compactId;
  return `${prefix}-${suffix.toUpperCase()}`;
}

function vehicleTypeLabel(type) {
  return String(type || 'CAR')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function adminBookingTotal(booking) {
  return booking?.priceBreakdown?.total || booking?.total || 0;
}

function adminParkingDuration(booking) {
  const start = parseDate(booking?.actualCheckInTime) || parseDate(booking?.startTime);
  const end = parseDate(booking?.actualCheckOutTime)
    || (booking?.status === 'CHECKED_IN' ? new Date() : parseDate(booking?.endTime));

  if (!start || !end || end <= start) {
    return '-';
  }

  const totalMinutes = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('pending')) {
    return 'pending';
  }
  if (normalized.includes('suspend')) {
    return 'suspended';
  }
  if (normalized.includes('lock')) {
    return 'locked';
  }
  return normalized || 'active';
}

function accountStatusLabel(status) {
  const normalized = String(status || 'ACTIVE').toUpperCase();
  if (normalized === 'PENDING_APPROVAL') {
    return 'Email Unverified';
  }
  return normalized
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function refundStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('pending')) {
    return 'pending';
  }
  if (normalized.includes('success')) {
    return 'succeeded';
  }
  if (normalized.includes('refund')) {
    return 'refunded';
  }
  return normalized || 'pending';
}

function bindLogout() {
  $all('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', () => {
      clearSession();
      window.location.href = '/auth.html';
    });
  });
}

function pathForRole(role) {
  if (role === 'ADMIN') {
    return '/admin-users.html';
  }

  if (role === 'STAFF') {
    return '/staff.html';
  }

  if (role === 'CUSTOMER') {
    return '/customer.html';
  }

  return '/';
}

function isPendingCustomer(auth) {
  return auth?.account?.role === 'CUSTOMER'
    && auth.account.status === 'PENDING_APPROVAL'
    && !auth.accessToken;
}

function goToConfirmRegistration(email) {
  if (email) {
    sessionStorage.setItem(PENDING_CONFIRM_EMAIL_KEY, email);
  }
  window.location.href = '/confirm.html';
}

async function loadIdentity() {
  const account = getStoredAccount();
  if (account) {
    setText('[data-account-role]', account.role || 'Signed in');
    setText('[data-account-avatar]', (account.role || 'ME').slice(0, 2));
  }

  try {
    const current = await apiRequest('/auth/me');
    setText('[data-account-role]', current.role || 'Signed in');
    setText('[data-account-avatar]', (current.role || 'ME').slice(0, 2));
    return current;
  } catch (error) {
    setText('[data-account-role]', 'Guest');
    return null;
  }
}

async function requireRole(expectedRole) {
  const current = await loadIdentity();

  if (!current) {
    window.location.href = '/auth.html';
    return null;
  }

  if (current.role !== expectedRole) {
    window.location.href = pathForRole(current.role);
    return null;
  }

  return current;
}

function initTabs() {
  $all('[data-tab-target]').forEach((button) => {
    button.addEventListener('click', () => {
      showAuthPanel(button.dataset.tabTarget, button);
    });
  });

  $('[data-auth-switch]')?.addEventListener('click', () => {
    const registerVisible = !$('[data-tab-panel="register"]')?.classList.contains('hidden');
    showAuthPanel(registerVisible ? 'login' : 'register');
  });
}

function showAuthPanel(target, activeButton = null) {
  $all('[data-tab-target]').forEach((item) => item.classList.toggle('active', item === activeButton));
  $all('[data-tab-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.tabPanel !== target));
  setText('[data-login-footer-copy]', target === 'register' ? 'Already have an account?' : "Don't have an account?");
  setText('[data-auth-switch]', target === 'register' ? 'Sign in' : 'Sign up for free');
}

function initPasswordToggle() {
  $all('[data-action="toggle-password"]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.parentElement?.querySelector('input');
      if (!input) {
        return;
      }

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });
}

function openRegistrationPendingModal() {
  const modal = $('#registrationPendingModal');
  if (!modal) {
    return;
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeRegistrationPendingModal() {
  const modal = $('#registrationPendingModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

async function initAuth() {
  initTabs();
  initPasswordToggle();

  $all('[data-close-registration-pending]').forEach((button) => {
    button.addEventListener('click', closeRegistrationPendingModal);
  });

  $('#registrationPendingModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeRegistrationPendingModal();
    }
  });

  $('[data-action="forgot-password"]')?.addEventListener('click', async () => {
    const username = $('#loginUsername')?.value.trim();
    if (!username) {
      setStatus('#authStatus', 'Enter your email or phone first.', true);
      return;
    }

    setStatus('#authStatus', 'Sending reset instructions...');
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: jsonBody({ username }),
      });
      setStatus('#authStatus', 'Reset instructions sent.');
    } catch (error) {
      setStatus('#authStatus', error.message, true);
    }
  });

  $('#loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#authStatus', 'Signing in...');

    try {
      const auth = await apiRequest('/auth/login', {
        method: 'POST',
        body: jsonBody(formData(event.currentTarget)),
      });
      if (isPendingCustomer(auth)) {
        goToConfirmRegistration(auth.account?.email || $('#loginUsername')?.value.trim());
        return;
      }
      saveSession(auth);
      window.location.href = pathForRole(auth.account?.role);
    } catch (error) {
      setStatus('#authStatus', error.message, true);
    }
  });

  $('#registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('#registerStatus', 'Creating account...');

    try {
      const auth = await apiRequest('/auth/customers/register', {
        method: 'POST',
        body: jsonBody(formData(form)),
      });
      goToConfirmRegistration(auth.account?.email || formData(form).email);
      form?.reset?.();
      setStatus('#registerStatus', '');
    } catch (error) {
      setStatus('#registerStatus', error.message, true);
    }
  });
}

async function initConfirmRegistration() {
  const emailInput = $('#confirmEmail');
  const storedEmail = sessionStorage.getItem(PENDING_CONFIRM_EMAIL_KEY) || '';
  if (emailInput && storedEmail) {
    emailInput.value = storedEmail;
  }

  $('#confirmRegistrationForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#confirmStatus', 'Verifying code...');

    try {
      const auth = await apiRequest('/auth/customers/confirm-registration', {
        method: 'POST',
        body: jsonBody(data),
      });
      sessionStorage.removeItem(PENDING_CONFIRM_EMAIL_KEY);
      saveSession(auth);
      setStatus('#confirmStatus', 'Account confirmed.');
      window.location.href = pathForRole(auth.account?.role);
    } catch (error) {
      setStatus('#confirmStatus', error.message, true);
    }
  });

  $('[data-confirm-resend]')?.addEventListener('click', async () => {
    const destination = $('#confirmEmail')?.value.trim();
    if (!destination) {
      setStatus('#confirmStatus', 'Enter your email first.', true);
      return;
    }

    setStatus('#confirmStatus', 'Sending a new code...');
    try {
      await apiRequest('/auth/otp/send', {
        method: 'POST',
        body: jsonBody({
          destination,
          purpose: 'CUSTOMER_REGISTRATION',
        }),
      });
      sessionStorage.setItem(PENDING_CONFIRM_EMAIL_KEY, destination);
      setStatus('#confirmStatus', 'New code sent.');
    } catch (error) {
      setStatus('#confirmStatus', error.message, true);
    }
  });
}

let adminUsersCache = [];
let adminUsersPagination = null;
let adminStaffCache = [];
let adminStaffPagination = null;
let adminRequestsCache = [];
let adminRequestsPagination = null;
let activeAdminRequest = null;
let adminFinanceCommissionItems = [];
let adminCommissionModalContext = null;
let adminCommissionModalPeriod = 'today';
let adminBookingsCache = [];
let activeAdminBooking = null;
let adminDashboardPerformanceMetric = 'bookings';
let adminDashboardPerformanceRange = 'today';
let adminDashboardControlsBound = false;
let adminDashboardSummaryCache = {};

function filteredAdminUsers() {
  const search = normalizeFilterValue($('#adminUserSearch')?.value);
  const status = $('#adminStatusFilter')?.value || '';

  return adminUsersCache.filter((user) => {
    const haystack = normalizeFilterValue([
      user.id,
      String(user.id || '').replace(/-/g, ''),
      shortAccountId(user.id, 'CUS'),
      user.fullName,
      user.name,
      user.displayName,
      user.email,
      user.phone,
      user.status,
    ].join(' '));

    return (!search || haystack.includes(search))
      && (!status || user.status === status);
  });
}

function renderAdminUsers(items = adminUsersCache, pagination = adminUsersPagination) {
  const element = $('#adminUserList');
  if (!element) {
    return;
  }

  if (!items.length) {
    element.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">No users found.</div>
        </td>
      </tr>
    `;
    setText('#adminUserPaginationText', 'Showing 0 users');
    return;
  }

  element.innerHTML = items.map((user) => {
    const label = userDisplayName(user);
    const statusName = user.status || 'ACTIVE';
    const userStatusClass = statusClass(statusName);
    const mutedAvatar = userStatusClass === 'suspended' || userStatusClass === 'locked' ? ' muted' : '';
    const displayId = shortAccountId(user.id, 'CUS');
    const isEmailUnverified = statusName === 'PENDING_APPROVAL';
    const canActivate = userStatusClass === 'suspended' || userStatusClass === 'locked';
    const toggleStatus = canActivate ? 'ACTIVE' : 'SUSPENDED';
    const toggleTitle = canActivate ? 'Activate account' : 'Suspend account';
    const toggleClass = canActivate ? 'success' : 'danger';
    const toggleIcon = canActivate
      ? '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.1 14.4-4.2-4.2 1.4-1.4 2.8 2.8 5.7-5.7 1.4 1.4-7.1 7.1Z" />'
      : '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a7.9 7.9 0 0 1 4.9 1.7L5.7 16.9A8 8 0 0 1 12 4Zm0 16a7.9 7.9 0 0 1-4.9-1.7L18.3 7.1A8 8 0 0 1 12 20Z" />';

    return `
      <tr class="${escapeHtml(userStatusClass)}">
        <td>
          <div class="admin-user-cell">
              <span class="admin-user-avatar${mutedAvatar}">${escapeHtml(userInitials(user))}</span>
            <div>
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(user.email || 'No email')}</span>
            </div>
          </div>
        </td>
        <td><span class="admin-short-id" title="${escapeHtml(user.id)}">${escapeHtml(displayId)}</span></td>
        <td><span class="admin-user-status ${escapeHtml(userStatusClass)}">${escapeHtml(accountStatusLabel(statusName))}</span></td>
        <td>${escapeHtml(formatDate(user.updatedAt || user.createdAt))}</td>
        <td>
          <div class="admin-user-row-actions">
            <button type="button" title="View detail" data-admin-view-user="${escapeHtml(user.id)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5 0 9 5.5 9 7s-4 7-9 7-9-5.5-9-7 4-7 9-7Zm0 2c-3.7 0-6.8 3.8-7 5 .2 1.2 3.3 5 7 5s6.8-3.8 7-5c-.2-1.2-3.3-5-7-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>
            </button>
            ${isEmailUnverified
              ? `<button type="button" disabled title="Waiting for customer email verification">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 3.2V17h16V8.2l-8 5.3-8-5.3Zm1.7-1.2 6.3 4.2L18.3 7H5.7Z" /></svg>
                </button>`
              : `<button type="button" class="${escapeHtml(toggleClass)}" title="${escapeHtml(toggleTitle)}" data-admin-update-user-status="${escapeHtml(user.id)}" data-admin-user-status="${escapeHtml(toggleStatus)}" data-admin-user-version="${escapeHtml(user.version)}">
                  <svg viewBox="0 0 24 24" aria-hidden="true">${toggleIcon}</svg>
                </button>`}
            <button type="button" title="View vehicles" data-admin-view-vehicles="${escapeHtml(user.id)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14l-1.5-4.5A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.9 1.5L5 11Zm3.4-4h7.2l.7 2H7.7l.7-2ZM4 13v5h2v-2h12v2h2v-5H4Zm3 1.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm10 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" /></svg>
            </button>
            <button type="button" title="Booking history" data-admin-view-bookings="${escapeHtml(user.id)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3a9 9 0 1 0 8.9 10H20a7 7 0 1 1-2.1-5L15 11h7V4l-2.7 2.7A8.9 8.9 0 0 0 13 3Zm-1 5h2v5l4 2-.9 1.8-5.1-2.6V8Z" /></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const total = pagination?.totalElements ?? adminUsersCache.length;
  setText('#adminUserPaginationText', `Showing ${items.length} of ${total} users`);
}

function refreshAdminUserTable() {
  renderAdminUsers(filteredAdminUsers(), adminUsersPagination);
  bindAdminUserActions();
}

function bindAdminUserControls() {
  $('#adminUserSearch')?.addEventListener('input', refreshAdminUserTable);
  $('#adminStatusFilter')?.addEventListener('change', refreshAdminUserTable);
  $all('[data-admin-close-user-detail]').forEach((button) => {
    button.addEventListener('click', closeAdminUserDetailModal);
  });
  $('#userDetailModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeAdminUserDetailModal();
    }
  });
  $all('[data-admin-close-vehicles]').forEach((button) => {
    button.addEventListener('click', closeAdminVehiclesModal);
  });
  $('#userVehiclesModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeAdminVehiclesModal();
    }
  });
  $all('[data-admin-close-bookings]').forEach((button) => {
    button.addEventListener('click', closeAdminBookingsModal);
  });
  $('#userBookingsModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeAdminBookingsModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAdminUserDetailModal();
      closeAdminVehiclesModal();
      closeAdminBookingsModal();
    }
  });
}

function openAdminUserDetailModal(userId) {
  const modal = $('#userDetailModal');
  if (!modal) {
    return;
  }

  const user = adminUsersCache.find((item) => String(item.id) === String(userId));
  if (!user) {
    setStatus('#adminStatus', 'Customer detail not found.', true);
    return;
  }

  setText('#userDetailAvatar', userInitials(user));
  setText('#userDetailName', userDisplayName(user));
  setText('#userDetailEmail', user.email || 'No email');
  setText('#userDetailPhone', user.phone || 'No phone');

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeAdminUserDetailModal() {
  const modal = $('#userDetailModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function adminVehicleImage(vehicle) {
  if (vehicle.imageUrl) {
    return `<img src="${escapeHtml(vehicle.imageUrl)}" alt="${escapeHtml(vehicle.plateNumber || 'Vehicle image')}" loading="lazy">`;
  }

  return `
    <div class="admin-vehicle-placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M5 11h14l-1.5-4.5A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.9 1.5L5 11Zm3.4-4h7.2l.7 2H7.7l.7-2ZM4 13v5h2v-2h12v2h2v-5H4Zm3 1.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm10 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" />
      </svg>
    </div>
  `;
}

function renderAdminVehicles(vehicles) {
  const list = $('#userVehiclesList');
  if (!list) {
    return;
  }

  if (!vehicles.length) {
    list.innerHTML = '<div class="empty-state">This customer has not registered any active vehicles yet.</div>';
    return;
  }

  list.innerHTML = vehicles.map((vehicle) => `
    <article class="admin-vehicle-card">
      <div class="admin-vehicle-photo">
        ${adminVehicleImage(vehicle)}
      </div>
      <div class="admin-vehicle-content">
        <div class="admin-vehicle-title-row">
          <div>
            <span>Plate Number</span>
            <strong>${escapeHtml(vehicle.plateNumber || 'No plate')}</strong>
          </div>
          ${vehicle.defaultVehicle ? '<em>Default</em>' : ''}
        </div>
        <div class="admin-vehicle-fields">
          <div>
            <span>Make / Model</span>
            <strong>${escapeHtml(vehicle.brand || 'Not provided')}</strong>
          </div>
          <div>
            <span>Color</span>
            <strong>${escapeHtml(vehicle.color || 'Not provided')}</strong>
          </div>
          <div>
            <span>Vehicle Type</span>
            <strong>${escapeHtml(vehicleTypeLabel(vehicle.vehicleType))}</strong>
          </div>
        </div>
      </div>
    </article>
  `).join('');
}

async function openAdminVehiclesModal(userId) {
  const modal = $('#userVehiclesModal');
  if (!modal) {
    return;
  }

  const user = adminUsersCache.find((item) => String(item.id) === String(userId));
  setText('#userVehiclesSubtitle', user
    ? `${userDisplayName(user)} · ${user.email || 'No email'}`
    : 'Registered customer vehicles');

  const list = $('#userVehiclesList');
  if (list) {
    list.innerHTML = '<div class="admin-vehicles-loading">Loading registered vehicles...</div>';
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  try {
    const vehicles = await apiRequest(`/admin/users/${userId}/vehicles`);
    renderAdminVehicles(Array.isArray(vehicles) ? vehicles : []);
  } catch (error) {
    if (list) {
      list.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Unable to load vehicles.')}</div>`;
    }
  }
}

function closeAdminVehiclesModal() {
  const modal = $('#userVehiclesModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function renderAdminUserBookingHistory(bookings, totalElements = bookings.length) {
  const list = $('#userBookingsList');
  if (!list) {
    return;
  }

  setText('#userBookingsCount', `${bookings.length} of ${totalElements} latest`);

  if (!bookings.length) {
    list.innerHTML = '<div class="empty-state">This customer has no booking history yet.</div>';
    return;
  }

  list.innerHTML = bookings.map((booking) => {
    const isPaid = String(booking.paymentStatus || '').toUpperCase() === 'PAID';
    const amount = money(adminBookingTotal(booking));
    const paidAmount = isPaid ? amount : `${amount} due`;
    const parkingLot = booking.parkingLotName || booking.parkingLot?.name || booking.parkingLotId || 'Parking lot pending';

    return `
      <article class="admin-booking-history-card">
        <div>
          <span>Vehicle</span>
          <strong>${escapeHtml(booking.plateNumber || booking.vehiclePlateNumber || 'Vehicle pending')}</strong>
          <small>${escapeHtml(vehicleTypeLabel(booking.vehicleType))}</small>
        </div>
        <div>
          <span>Parking Lot</span>
          <strong>${escapeHtml(parkingLot)}</strong>
          <small>${escapeHtml(formatDateTime(booking.startTime))}</small>
        </div>
        <div>
          <span>Amount</span>
          <strong>${escapeHtml(paidAmount)}</strong>
          <small>${escapeHtml(String(booking.paymentStatus || 'UNPAID').replaceAll('_', ' '))}</small>
        </div>
        <div>
          <span>Parked Time</span>
          <strong>${escapeHtml(adminParkingDuration(booking))}</strong>
          <small>${escapeHtml(String(booking.status || '-').replaceAll('_', ' '))}</small>
        </div>
      </article>
    `;
  }).join('');
}

async function openAdminBookingsModal(userId) {
  const modal = $('#userBookingsModal');
  if (!modal) {
    return;
  }

  const user = adminUsersCache.find((item) => String(item.id) === String(userId));
  setText('#userBookingsSubtitle', user
    ? `${userDisplayName(user)} · ${user.email || 'No email'}`
    : 'Customer booking history');
  setText('#userBookingsCount', 'Loading');

  const list = $('#userBookingsList');
  if (list) {
    list.innerHTML = '<div class="admin-vehicles-loading">Loading booking history...</div>';
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  try {
    const pageResult = await apiPage(`/admin/users/${userId}/bookings`, {
      size: 20,
      sort: 'updatedAt,desc',
    });
    renderAdminUserBookingHistory(pageResult.items || [], pageResult.pagination?.totalElements ?? pageResult.items?.length ?? 0);
  } catch (error) {
    setText('#userBookingsCount', 'Unable to load');
    if (list) {
      list.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Unable to load booking history.')}</div>`;
    }
  }
}

function closeAdminBookingsModal() {
  const modal = $('#userBookingsModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function adminStatusReason(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACTIVE') {
    return 'Admin activated customer account';
  }
  if (normalized === 'SUSPENDED') {
    return 'Admin suspended customer account';
  }
  if (normalized === 'LOCKED') {
    return 'Admin locked customer account';
  }
  return 'Admin updated customer account status';
}

async function updateAdminUserStatus(userId, status, expectedVersion) {
  const normalizedStatus = String(status || 'ACTIVE').toUpperCase();
  setStatus('#adminStatus', `${accountStatusLabel(normalizedStatus)} customer account...`);

  await apiRequest(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: jsonBody({
      status: normalizedStatus,
      reason: adminStatusReason(normalizedStatus),
      expectedVersion: expectedVersion ? Number(expectedVersion) : null,
    }),
  });

  setStatus('#adminStatus', `Customer account is now ${accountStatusLabel(normalizedStatus)}.`);
  await reloadAdminPage();
}

function bindAdminUserActions() {
  $all('[data-admin-view-user]').forEach((button) => {
    button.addEventListener('click', () => {
      openAdminUserDetailModal(button.dataset.adminViewUser);
    });
  });

  $all('[data-admin-update-user-status]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await updateAdminUserStatus(
          button.dataset.adminUpdateUserStatus,
          button.dataset.adminUserStatus,
          button.dataset.adminUserVersion,
        );
      } catch (error) {
        setStatus('#adminStatus', error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  });

  $all('[data-admin-view-vehicles]').forEach((button) => {
    button.addEventListener('click', () => {
      openAdminVehiclesModal(button.dataset.adminViewVehicles);
    });
  });

  $all('[data-admin-view-bookings]').forEach((button) => {
    button.addEventListener('click', () => {
      openAdminBookingsModal(button.dataset.adminViewBookings);
    });
  });

  $all('[data-admin-copy-user]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.adminCopyUser);
        setStatus('#adminStatus', 'User ID copied.');
      } catch (error) {
        setStatus('#adminStatus', button.dataset.adminCopyUser);
      }
    });
  });

  $all('[data-admin-action-message]').forEach((button) => {
    button.addEventListener('click', () => {
      setStatus('#adminStatus', button.dataset.adminActionMessage);
    });
  });
}

function filteredAdminStaff() {
  const search = normalizeFilterValue($('#adminStaffSearch')?.value);
  const status = $('#adminStaffStatusFilter')?.value || '';

  return adminStaffCache.filter((staff) => {
    const haystack = normalizeFilterValue([
      staff.id,
      String(staff.id || '').replace(/-/g, ''),
      shortAccountId(staff.id, 'STF'),
      staff.fullName,
      staff.name,
      staff.displayName,
      staff.email,
      staff.phone,
      staff.status,
    ].join(' '));

    return (!search || haystack.includes(search))
      && (!status || staff.status === status);
  });
}

function staffActions(staff) {
  const statusName = staff.status || 'ACTIVE';
  const staffStatusClass = statusClass(statusName);
  const isPending = staffStatusClass === 'pending';

  if (isPending) {
    return `
      <button type="button" title="View detail" data-admin-view-staff="${escapeHtml(staff.id)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5 0 9 5.5 9 7s-4 7-9 7-9-5.5-9-7 4-7 9-7Zm0 2c-3.7 0-6.8 3.8-7 5 .2 1.2 3.3 5 7 5s6.8-3.8 7-5c-.2-1.2-3.3-5-7-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>
      </button>
      <button type="button" class="success" title="Approve staff" data-admin-staff-command="approve" data-staff-id="${escapeHtml(staff.id)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.1 14.4-4.2-4.2 1.4-1.4 2.8 2.8 5.7-5.7 1.4 1.4-7.1 7.1Z" /></svg>
      </button>
      <button type="button" class="danger" title="Reject staff" data-admin-staff-command="reject" data-staff-id="${escapeHtml(staff.id)}" data-staff-version="${escapeHtml(staff.version)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.2 12.8-1.4 1.4L12 13.4l-2.8 2.8-1.4-1.4 2.8-2.8-2.8-2.8 1.4-1.4 2.8 2.8 2.8-2.8 1.4 1.4-2.8 2.8 2.8 2.8Z" /></svg>
      </button>
    `;
  }

  const canActivate = staffStatusClass === 'suspended' || staffStatusClass === 'locked';
  const toggleStatus = canActivate ? 'ACTIVE' : 'SUSPENDED';
  const toggleTitle = canActivate ? 'Activate staff account' : 'Suspend staff account';
  const toggleClass = canActivate ? 'success' : 'danger';
  const toggleIcon = canActivate
    ? '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.1 14.4-4.2-4.2 1.4-1.4 2.8 2.8 5.7-5.7 1.4 1.4-7.1 7.1Z" />'
    : '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a7.9 7.9 0 0 1 4.9 1.7L5.7 16.9A8 8 0 0 1 12 4Zm0 16a7.9 7.9 0 0 1-4.9-1.7L18.3 7.1A8 8 0 0 1 12 20Z" />';

  return `
    <button type="button" title="View detail" data-admin-view-staff="${escapeHtml(staff.id)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5 0 9 5.5 9 7s-4 7-9 7-9-5.5-9-7 4-7 9-7Zm0 2c-3.7 0-6.8 3.8-7 5 .2 1.2 3.3 5 7 5s6.8-3.8 7-5c-.2-1.2-3.3-5-7-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>
    </button>
    <button type="button" class="${escapeHtml(toggleClass)}" title="${escapeHtml(toggleTitle)}" data-admin-update-staff-status="${escapeHtml(staff.id)}" data-admin-staff-status="${escapeHtml(toggleStatus)}" data-admin-staff-version="${escapeHtml(staff.version)}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${toggleIcon}</svg>
    </button>
  `;
}

function renderAdminStaff(items = adminStaffCache, pagination = adminStaffPagination) {
  const table = $('#adminStaffList');
  const cards = $('#adminStaffCards');
  if (!table) {
    return;
  }

  const activeCount = adminStaffCache.filter((staff) => staff.status === 'ACTIVE').length;
  const pendingCount = adminStaffCache.filter((staff) => statusClass(staff.status) === 'pending').length;

  setText('#adminStaffTotal', pagination?.totalElements ?? adminStaffCache.length);
  setText('#adminStaffActive', activeCount);
  setText('#adminStaffPending', pendingCount);
  setText('#adminStaffPagination', `Showing ${items.length} of ${pagination?.totalElements ?? adminStaffCache.length} staff`);

  if (!items.length) {
    table.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">No staff accounts found.</div>
        </td>
      </tr>
    `;
    if (cards) {
      cards.innerHTML = '<div class="empty-state">No staff accounts found.</div>';
    }
    return;
  }

  table.innerHTML = items.map((staff) => {
    const label = userDisplayName(staff);
    const statusName = staff.status || 'ACTIVE';
    const staffStatusClass = statusClass(statusName);
    const mutedAvatar = staffStatusClass === 'suspended' || staffStatusClass === 'locked' ? ' muted' : '';
    const displayId = shortAccountId(staff.id, 'STF');

    return `
      <tr class="${escapeHtml(staffStatusClass)}">
        <td>
          <div class="admin-user-cell">
            <span class="admin-user-avatar${mutedAvatar}">${escapeHtml(userInitials(staff))}</span>
            <div>
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(staff.email || 'No email')}</span>
            </div>
          </div>
        </td>
        <td><span class="admin-short-id" title="${escapeHtml(staff.id)}">${escapeHtml(displayId)}</span></td>
        <td><span class="admin-user-status ${escapeHtml(staffStatusClass)}">${escapeHtml(accountStatusLabel(statusName))}</span></td>
        <td>${escapeHtml(formatDate(staff.updatedAt || staff.createdAt))}</td>
        <td><div class="admin-user-row-actions">${staffActions(staff)}</div></td>
      </tr>
    `;
  }).join('');

  if (cards) {
    cards.innerHTML = items.map((staff) => {
      const statusName = staff.status || 'ACTIVE';
      const staffStatusClass = statusClass(statusName);
      const displayId = shortAccountId(staff.id, 'STF');
      return `
        <article class="admin-staff-card ${escapeHtml(staffStatusClass)}">
          <div class="admin-staff-card-head">
            <div class="admin-staff-member">
              <span class="admin-staff-avatar">${escapeHtml(userInitials(staff))}</span>
              <div>
                <strong>${escapeHtml(userDisplayName(staff))}</strong>
                <span class="admin-short-id" title="${escapeHtml(staff.id)}">${escapeHtml(displayId)}</span>
              </div>
            </div>
            <span class="admin-staff-status ${escapeHtml(staffStatusClass)}">${escapeHtml(accountStatusLabel(statusName))}</span>
          </div>
          <p>${escapeHtml(staff.phone || staff.email || 'No contact')}</p>
          <span class="admin-staff-lot-chip">No assigned lots in admin API</span>
          <div class="admin-staff-card-actions">${staffActions(staff)}</div>
        </article>
      `;
    }).join('');
  }
}

function refreshAdminStaffTable() {
  renderAdminStaff(filteredAdminStaff(), adminStaffPagination);
  bindAdminStaffActions();
}

function updateStaffCreatePreview() {
  const form = $('#staffCreateForm');
  if (!form) {
    return;
  }

  const fullName = form.elements.fullName?.value?.trim();
  const email = form.elements.email?.value?.trim();
  const phone = form.elements.phone?.value?.trim();
  const previewUser = { fullName, email, phone };

  setText('#staffCreatePreviewName', fullName || 'New staff account');
  setText('#staffCreatePreviewEmail', email || 'staff@example.com');
  setText('#staffCreatePreviewPhone', phone || 'Not provided');
  setText('#staffCreatePreviewAvatar', userInitials(previewUser));
}

function openStaffModal() {
  const modal = $('#staffModal');
  if (!modal) {
    return;
  }

  updateStaffCreatePreview();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeStaffModal() {
  const modal = $('#staffModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function formatRuleTime(value) {
  if (!value) {
    return '-';
  }
  return String(value).slice(0, 5);
}

function groupedActiveRatesByVehicle(pricingRules) {
  return pricingRules
    .filter((rule) => rule.active !== false)
    .reduce((groups, rule) => {
      const vehicleType = rule.vehicleType || 'CAR';
      groups[vehicleType] = groups[vehicleType] || [];
      groups[vehicleType].push(rule);
      return groups;
    }, {});
}

function lowestRateLabel(pricingRules, vehicleType) {
  const rates = pricingRules
    .filter((rule) => rule.active !== false && String(rule.vehicleType || '').toUpperCase() === vehicleType)
    .map((rule) => Number(rule.hourlyRate))
    .filter(Number.isFinite);

  if (!rates.length) {
    return '-';
  }

  return money(Math.min(...rates));
}

function renderAdminStaffLotDetail(detail) {
  const content = $('#staffLotDetailContent');
  if (!content) {
    return;
  }

  const lot = detail?.parkingLot;
  if (!lot) {
    content.innerHTML = '<div class="empty-state">This staff account has no assigned parking lot yet.</div>';
    return;
  }

  const capacities = Array.isArray(detail.capacities) ? detail.capacities : [];
  const pricingRules = Array.isArray(detail.pricingRules) ? detail.pricingRules : [];
  const services = Array.isArray(detail.services) ? detail.services : [];
  const activeServices = services.filter((service) => service.active !== false);
  const coordinate = lot.latitude && lot.longitude ? `${lot.latitude}, ${lot.longitude}` : '-';
  const groupedRates = groupedActiveRatesByVehicle(pricingRules);
  const vehicleOrder = ['CAR', 'MOTORBIKE'];
  const rateGroups = [
    ...vehicleOrder.filter((vehicleType) => groupedRates[vehicleType]?.length),
    ...Object.keys(groupedRates).filter((vehicleType) => !vehicleOrder.includes(vehicleType)),
  ];

  content.innerHTML = `
    <section class="admin-staff-lot-hero">
      <div>
        <span class="admin-staff-lot-kicker">Managed Parking Lot</span>
        <h3>${escapeHtml(lot.name || 'Unnamed parking lot')}</h3>
        <p>${escapeHtml(lot.address || 'No address')}</p>
      </div>
      <span class="admin-user-status ${escapeHtml(statusClass(lot.status))}">${escapeHtml(String(lot.status || 'DRAFT').replaceAll('_', ' '))}</span>
    </section>

    <section class="admin-staff-lot-meta">
      <div class="admin-staff-lot-base-rates">
        <span>Base Hourly Rate</span>
        <div>
          <strong><small>Car</small>${escapeHtml(lowestRateLabel(pricingRules, 'CAR'))}</strong>
          <strong><small>Motorbike</small>${escapeHtml(lowestRateLabel(pricingRules, 'MOTORBIKE'))}</strong>
        </div>
      </div>
      <div>
        <span>Updated</span>
        <strong>${escapeHtml(formatDate(lot.updatedAt || lot.createdAt))}</strong>
      </div>
      <div>
        <span>Coordinates</span>
        <strong>${escapeHtml(coordinate)}</strong>
      </div>
    </section>

    <section class="admin-staff-lot-section compact">
      <div class="admin-staff-lot-section-title">
        <h4>Slot Capacity</h4>
        <span>Live availability by vehicle type</span>
      </div>
      <div class="admin-staff-lot-capacity-list refined">
        ${capacities.length ? capacities.map((capacity) => {
          const total = Math.max(0, Number(capacity.totalCapacity ?? 0));
          const available = Math.max(0, Number(capacity.available ?? 0));
          const percentage = total ? Math.min(100, Math.max(0, (available / total) * 100)) : 0;
          return `
            <div class="admin-staff-lot-capacity-row">
              <div>
                <strong>${escapeHtml(vehicleTypeLabel(capacity.vehicleType))}</strong>
                <span>${escapeHtml(available)} available of ${escapeHtml(total)} total</span>
              </div>
              <div class="admin-staff-lot-meter" aria-hidden="true">
                <i style="width: ${percentage}%"></i>
              </div>
              <em>${escapeHtml(capacity.checkedIn ?? 0)} checked in</em>
            </div>
          `;
        }).join('') : '<div class="empty-state">No capacity configured yet.</div>'}
      </div>
    </section>

    <section class="admin-staff-lot-section compact">
      <div class="admin-staff-lot-section-title">
        <h4>Hourly Rates</h4>
        <span>Pricing windows configured by staff</span>
      </div>
      <div class="admin-staff-lot-rate-list refined">
        ${rateGroups.length ? rateGroups.map((vehicleType) => `
          <div class="admin-staff-lot-rate-group">
            <strong>${escapeHtml(vehicleTypeLabel(vehicleType))}</strong>
            <div>
              ${groupedRates[vehicleType].map((rule) => `
                <span class="admin-staff-lot-rate-chip">
                  <em>${escapeHtml(formatRuleTime(rule.startTime))} - ${escapeHtml(formatRuleTime(rule.endTime))}</em>
                  ${escapeHtml(money(rule.hourlyRate))}
                </span>
              `).join('')}
            </div>
          </div>
        `).join('') : '<div class="empty-state">No hourly rates configured yet.</div>'}
      </div>
    </section>

    <section class="admin-staff-lot-section compact">
      <div class="admin-staff-lot-section-title">
        <h4>Amenities & Services</h4>
        <span>Available options for this lot</span>
      </div>
      <div class="admin-staff-lot-service-list">
        ${activeServices.length ? activeServices.map((service, index) => `
          <span class="tone-${index % 4}">${escapeHtml(service.name || 'Service')} · ${escapeHtml(money(service.price))}</span>
        `).join('') : '<div class="empty-state">No amenities or services configured yet.</div>'}
      </div>
    </section>

    ${lot.description ? `
      <section class="admin-staff-lot-section compact">
        <div class="admin-staff-lot-section-title">
          <h4>Description</h4>
        </div>
        <p class="admin-staff-lot-description">${escapeHtml(lot.description)}</p>
      </section>
    ` : ''}
  `;
}

async function openAdminStaffDetailModal(staffId) {
  const modal = $('#staffDetailModal');
  if (!modal) {
    return;
  }

  const staff = adminStaffCache.find((item) => String(item.id) === String(staffId));
  if (!staff) {
    setStatus('#adminStatus', 'Staff detail not found.', true);
    return;
  }

  setText('#staffDetailSubtitle', `${userDisplayName(staff)} · ${staff.email || 'No email'}`);
  const content = $('#staffLotDetailContent');
  if (content) {
    content.innerHTML = '<div class="admin-vehicles-loading">Loading managed parking lot...</div>';
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  try {
    const pageResult = await apiPage(`/admin/staff/${staffId}/parking-lots`, { size: 1 });
    renderAdminStaffLotDetail(pageResult.items?.[0] || null);
  } catch (error) {
    if (content) {
      content.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Unable to load managed parking lot.')}</div>`;
    }
  }
}

function closeAdminStaffDetailModal() {
  const modal = $('#staffDetailModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function adminStaffStatusReason(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACTIVE') {
    return 'Admin activated staff account';
  }
  if (normalized === 'SUSPENDED') {
    return 'Admin suspended staff account';
  }
  return 'Admin updated staff account status';
}

async function updateAdminStaffStatus(staffId, status, expectedVersion) {
  const normalizedStatus = String(status || 'ACTIVE').toUpperCase();
  setStatus('#adminStatus', `${accountStatusLabel(normalizedStatus)} staff account...`);

  await apiRequest(`/admin/users/${staffId}/status`, {
    method: 'PATCH',
    body: jsonBody({
      status: normalizedStatus,
      reason: adminStaffStatusReason(normalizedStatus),
      expectedVersion: expectedVersion ? Number(expectedVersion) : null,
    }),
  });

  setStatus('#adminStatus', `Staff account is now ${accountStatusLabel(normalizedStatus)}.`);
  await reloadAdminPage();
}

function bindAdminStaffControls() {
  $('#adminStaffSearch')?.addEventListener('input', refreshAdminStaffTable);
  $('#adminStaffStatusFilter')?.addEventListener('change', refreshAdminStaffTable);
  $('#staffCreateForm')?.addEventListener('input', updateStaffCreatePreview);

  $all('[data-admin-open-staff-modal]').forEach((button) => {
    button.addEventListener('click', openStaffModal);
  });

  $all('[data-admin-close-staff-modal]').forEach((button) => {
    button.addEventListener('click', closeStaffModal);
  });

  $('#staffModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeStaffModal();
    }
  });

  $all('[data-admin-close-staff-detail]').forEach((button) => {
    button.addEventListener('click', closeAdminStaffDetailModal);
  });

  $('#staffDetailModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeAdminStaffDetailModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeStaffModal();
      closeAdminStaffDetailModal();
    }
  });
}

function bindAdminStaffActions() {
  $all('[data-admin-view-staff]').forEach((button) => {
    button.addEventListener('click', () => {
      openAdminStaffDetailModal(button.dataset.adminViewStaff);
    });
  });

  $all('[data-admin-update-staff-status]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await updateAdminStaffStatus(
          button.dataset.adminUpdateStaffStatus,
          button.dataset.adminStaffStatus,
          button.dataset.adminStaffVersion,
        );
      } catch (error) {
        setStatus('#adminStatus', error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  });

  $all('[data-admin-staff-command]').forEach((button) => {
    button.addEventListener('click', async () => {
      const staffId = button.dataset.staffId;
      const action = button.dataset.adminStaffCommand;
      const isReject = action === 'reject';
      const reason = isReject ? window.prompt('Reject reason', 'Rejected by admin') : '';

      if (isReject && reason === null) {
        return;
      }

      setStatus('#adminStatus', `${isReject ? 'Rejecting' : 'Approving'} staff account...`);

      try {
        await apiRequest(`/admin/staff/${staffId}/${action}`, {
          method: 'POST',
          body: isReject ? jsonBody({
            reason: reason || 'Rejected by admin',
            expectedVersion: button.dataset.staffVersion ? Number(button.dataset.staffVersion) : null,
          }) : undefined,
        });
        setStatus('#adminStatus', 'Staff command completed.');
        await reloadAdminPage();
      } catch (error) {
        setStatus('#adminStatus', error.message, true);
      }
    });
  });

  $all('[data-admin-copy-staff]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.adminCopyStaff);
        setStatus('#adminStatus', 'Staff ID copied.');
      } catch (error) {
        setStatus('#adminStatus', button.dataset.adminCopyStaff);
      }
    });
  });
}

function requestStaffName(request) {
  return request.requestedByName || request.staffName || request.requestedByEmail || request.requestedBy || 'Unknown staff';
}

function renderAdminRequests(items = adminRequestsCache, pagination = adminRequestsPagination) {
  const table = $('#adminRequestList');
  if (!table) {
    return;
  }

  setText('#adminRequestTotal', pagination?.totalElements ?? items.length);
  setText('#adminRequestPagination', `Showing ${items.length} of ${pagination?.totalElements ?? items.length} requests`);

  if (!items.length) {
    table.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">No parking lot edit requests waiting for review.</div>
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = items.map((request) => {
    const staff = {
      email: request.requestedByEmail,
      fullName: requestStaffName(request),
      id: request.requestedBy,
    };

    return `
      <tr>
        <td>
          <div class="admin-staff-member">
            <span class="admin-staff-avatar">${escapeHtml(userInitials(staff))}</span>
            <div>
              <strong>${escapeHtml(requestStaffName(request))}</strong>
              <span>${escapeHtml(request.requestedByEmail || 'No email')}</span>
            </div>
          </div>
        </td>
        <td><span class="admin-short-id" title="${escapeHtml(request.id)}">${escapeHtml(shortAccountId(request.id, 'REQ'))}</span></td>
        <td>
          <strong class="admin-request-lot-name">${escapeHtml(request.parkingLotName || request.name || 'Parking lot')}</strong>
          <span class="admin-request-lot-preview">${escapeHtml(request.name || 'No requested name')}</span>
        </td>
        <td>${escapeHtml(formatDateTime(request.createdAt))}</td>
        <td>
          <div class="admin-user-row-actions">
            <button type="button" title="View request" data-admin-view-request="${escapeHtml(request.id)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5 0 9 5.5 9 7s-4 7-9 7-9-5.5-9-7 4-7 9-7Zm0 2c-3.7 0-6.8 3.8-7 5 .2 1.2 3.3 5 7 5s6.8-3.8 7-5c-.2-1.2-3.3-5-7-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRequestCapacity(capacities = []) {
  if (!capacities.length) {
    return '<div class="empty-state">No slot capacity changes submitted.</div>';
  }

  return capacities.map((capacity) => `
    <div class="admin-request-mini-row">
      <span>${escapeHtml(vehicleTypeLabel(capacity.vehicleType))}</span>
      <strong>${escapeHtml(capacity.totalCapacity ?? 0)} slots</strong>
    </div>
  `).join('');
}

function renderRequestRates(pricingRules = []) {
  const groupedRates = groupedActiveRatesByVehicle(pricingRules);
  const vehicleOrder = ['CAR', 'MOTORBIKE'];
  const rateGroups = [
    ...vehicleOrder.filter((vehicleType) => groupedRates[vehicleType]?.length),
    ...Object.keys(groupedRates).filter((vehicleType) => !vehicleOrder.includes(vehicleType)),
  ];

  if (!rateGroups.length) {
    return '<div class="empty-state">No hourly rate changes submitted.</div>';
  }

  return rateGroups.map((vehicleType) => `
    <div class="admin-request-rate-group">
      <strong>${escapeHtml(vehicleTypeLabel(vehicleType))}</strong>
      <div>
        ${groupedRates[vehicleType].map((rule) => `
          <span class="admin-staff-lot-rate-chip">
            <em>${escapeHtml(formatRuleTime(rule.startTime))} - ${escapeHtml(formatRuleTime(rule.endTime))}</em>
            ${escapeHtml(money(rule.hourlyRate))}
          </span>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderRequestServices(services = []) {
  if (!services.length) {
    return '<div class="empty-state">No amenities or service changes submitted.</div>';
  }

  return services.map((service, index) => `
    <span class="tone-${index % 4}${service.active === false ? ' muted' : ''}">
      ${escapeHtml(service.name || 'Service')} · ${escapeHtml(money(service.price))}
      ${service.active === false ? ' · Off' : ''}
    </span>
  `).join('');
}

function renderRequestImages(images = []) {
  if (!images.length) {
    return '<div class="empty-state">No parking lot images submitted.</div>';
  }

  return images.slice(0, 3).map((image, index) => `
    <figure>
      <img src="${escapeHtml(image.imageUrl || '')}" alt="${escapeHtml(`Requested parking image ${index + 1}`)}" />
      <figcaption>Image ${index + 1}</figcaption>
    </figure>
  `).join('');
}

function renderAdminRequestDetail(request) {
  const content = $('#requestDetailContent');
  if (!content) {
    return;
  }

  setText('#requestDetailSubtitle', `${requestStaffName(request)} · ${request.requestedByEmail || 'No email'}`);
  const coordinate = request.latitude && request.longitude ? `${request.latitude}, ${request.longitude}` : '-';

  content.innerHTML = `
    <section class="admin-request-hero">
      <div>
        <span>Requested Parking Lot Update</span>
        <h3>${escapeHtml(request.name || 'Unnamed parking lot')}</h3>
        <p>${escapeHtml(request.address || 'No address')}</p>
      </div>
      <span class="admin-user-status pending">${escapeHtml(String(request.status || 'PENDING').replaceAll('_', ' '))}</span>
    </section>

    <section class="admin-request-summary-grid">
      <div><span>Current Parking Lot</span><strong>${escapeHtml(request.parkingLotName || '-')}</strong></div>
      <div><span>Request ID</span><strong title="${escapeHtml(request.id)}">${escapeHtml(shortAccountId(request.id, 'REQ'))}</strong></div>
      <div><span>Submitted</span><strong>${escapeHtml(formatDateTime(request.createdAt))}</strong></div>
      <div><span>Coordinates</span><strong>${escapeHtml(coordinate)}</strong></div>
    </section>

    ${request.description ? `
      <section class="admin-request-section">
        <h4>Description</h4>
        <p>${escapeHtml(request.description)}</p>
      </section>
    ` : ''}

    <section class="admin-request-section">
      <h4>Parking Lot Images</h4>
      <div class="admin-request-image-grid">${renderRequestImages(request.images || [])}</div>
    </section>

    <section class="admin-request-section">
      <h4>Slot Capacity</h4>
      <div class="admin-request-mini-grid">${renderRequestCapacity(request.capacities || [])}</div>
    </section>

    <section class="admin-request-section">
      <h4>Hourly Rates</h4>
      <div class="admin-request-rate-list">${renderRequestRates(request.pricingRules || [])}</div>
    </section>

    <section class="admin-request-section">
      <h4>Amenities & Services</h4>
      <div class="admin-staff-lot-service-list">${renderRequestServices(request.services || [])}</div>
    </section>
  `;
}

async function openAdminRequestDetailModal(requestId) {
  const modal = $('#requestDetailModal');
  if (!modal) {
    return;
  }

  activeAdminRequest = adminRequestsCache.find((item) => String(item.id) === String(requestId)) || null;
  const approveButton = $('#approveRequestButton');
  if (approveButton) {
    approveButton.dataset.requestId = requestId;
    approveButton.disabled = false;
  }

  const content = $('#requestDetailContent');
  if (content) {
    content.innerHTML = '<div class="admin-vehicles-loading">Loading request detail...</div>';
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  try {
    activeAdminRequest = await apiRequest(`/admin/parking-lots/update-requests/${requestId}`);
    renderAdminRequestDetail(activeAdminRequest);
  } catch (error) {
    if (content) {
      content.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Unable to load request detail.')}</div>`;
    }
  }
}

function closeAdminRequestDetailModal() {
  const modal = $('#requestDetailModal');
  if (!modal) {
    return;
  }

  activeAdminRequest = null;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

async function approveAdminRequest(requestId) {
  if (!requestId) {
    return;
  }

  const approveButton = $('#approveRequestButton');
  if (approveButton) {
    approveButton.disabled = true;
  }

  setStatus('#adminStatus', 'Approving parking lot change request...');
  try {
    await apiRequest(`/admin/parking-lots/update-requests/${requestId}/approve`, {
      method: 'POST',
    });
    closeAdminRequestDetailModal();
    setStatus('#adminStatus', 'Parking lot information has been updated.');
    await reloadAdminPage();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  } finally {
    if (approveButton) {
      approveButton.disabled = false;
    }
  }
}

function bindAdminRequestControls() {
  $all('[data-admin-close-request-detail]').forEach((button) => {
    button.addEventListener('click', closeAdminRequestDetailModal);
  });

  $('#requestDetailModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeAdminRequestDetailModal();
    }
  });

  $('#approveRequestButton')?.addEventListener('click', (event) => {
    approveAdminRequest(event.currentTarget.dataset.requestId || activeAdminRequest?.id);
  });

  $('[data-admin-refresh-requests]')?.addEventListener('click', () => {
    loadAdminRequests();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAdminRequestDetailModal();
    }
  });
}

function bindAdminRequestActions() {
  $all('[data-admin-view-request]').forEach((button) => {
    button.addEventListener('click', () => {
      openAdminRequestDetailModal(button.dataset.adminViewRequest);
    });
  });
}

function renderAdminRefunds(items = [], pagination = null) {
  const element = $('#adminRefundList');
  if (!element) {
    return;
  }

  const totalRefunded = items.reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
  const pendingRefunds = items.filter((refund) => refundStatusClass(refund.status) === 'pending').length;

  setText('#adminRefundTotal', money(totalRefunded, items[0]?.currency || 'VND'));
  setText('#adminRefundPending', pendingRefunds);

  if (!items.length) {
    element.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">No refunds found.</div>
        </td>
      </tr>
    `;
    return;
  }

  element.innerHTML = items.map((refund) => {
    const statusName = refund.status || 'PENDING';
    const refundClass = refundStatusClass(statusName);
    const paymentId = refund.paymentId || refund.id;
    const actionText = refundClass === 'pending' ? 'Review' : '';

    return `
      <tr>
        <td><span class="admin-refund-payment-id">${escapeHtml(paymentId)}</span></td>
        <td><span class="admin-refund-amount">${escapeHtml(money(refund.amount, refund.currency || 'VND'))}</span></td>
        <td>${escapeHtml(refund.reason || 'No reason provided')}</td>
        <td><span class="admin-refund-status ${escapeHtml(refundClass)}">${escapeHtml(statusName)}</span></td>
        <td>
          <button class="admin-refund-action${actionText ? ' review' : ''}" type="button" data-admin-fill-refund="${escapeHtml(paymentId)}" data-admin-refund-amount="${escapeHtml(refund.amount)}" data-admin-refund-reason="${escapeHtml(refund.reason || '')}" aria-label="Refund action">
            ${actionText || '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openRefundModal() {
  const modal = $('#refundModal');
  if (!modal) {
    return;
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeRefundModal() {
  const modal = $('#refundModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function bindAdminRefundControls() {
  $all('[data-admin-open-refund-modal]').forEach((button) => {
    button.addEventListener('click', openRefundModal);
  });

  $all('[data-admin-close-refund-modal]').forEach((button) => {
    button.addEventListener('click', closeRefundModal);
  });

  $('#refundModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeRefundModal();
    }
  });
}

function bindAdminRefundActions() {
  $all('[data-admin-fill-refund]').forEach((button) => {
    button.addEventListener('click', () => {
      const form = $('#refundForm');
      if (!form) {
        return;
      }

      form.querySelector('[name="paymentId"]').value = button.dataset.adminFillRefund;
      form.querySelector('[name="amount"]').value = button.dataset.adminRefundAmount || '';
      form.querySelector('[name="reason"]').value = button.dataset.adminRefundReason || 'Other';
      openRefundModal();
    });
  });
}

function commissionStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('paid') || normalized.includes('deduct')) {
    return 'succeeded';
  }
  if (normalized.includes('cancel')) {
    return 'refunded';
  }
  return 'pending';
}

function commissionPaymentMethodLabel(method) {
  const normalized = String(method || '').toUpperCase();
  if (normalized === 'BANK_TRANSFER') {
    return 'Bank transfer';
  }
  if (normalized === 'CASH') {
    return 'Cash';
  }
  if (normalized === 'QR') {
    return 'QR';
  }
  if (normalized === 'CARD') {
    return 'Card';
  }
  return normalized || '-';
}

function commissionRateLabel(commission) {
  const rate = Number(commission?.commissionRate);
  return Number.isFinite(rate) ? `${Math.round(rate * 100)}%` : '10%';
}

function commissionDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  return date.toLocaleDateString('en-CA');
}

function adminCommissionStaffKey(commission) {
  return String(commission.staffId || commission.staffEmail || 'staff');
}

function adminCommissionLotKey(commission) {
  return String(commission.parkingLotId || 'lot');
}

function isTodayDateKey(key) {
  return key === new Date().toLocaleDateString('en-CA');
}

function adminCommissionPeriodRange(period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  if (period === '7days') {
    start.setDate(start.getDate() - 6);
  }

  if (period === '30days') {
    start.setDate(start.getDate() - 29);
  }

  return { start, end };
}

function isWithinAdminCommissionPeriod(value, period) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const { start, end } = adminCommissionPeriodRange(period);
  return date >= start && date < end;
}

function staffDisplayName(commission) {
  const name = commission.staffName || '';
  const email = commission.staffEmail || '';
  if (name && name !== email) {
    return name;
  }

  return email ? email.split('@')[0] : shortId(commission.staffId);
}

function groupedAdminCommissions(items = []) {
  const groups = new Map();

  items.forEach((commission) => {
    const dateKey = commissionDateKey(commission.createdAt);
    if (!isTodayDateKey(dateKey)) {
      return;
    }

    const staffKey = adminCommissionStaffKey(commission);
    const parkingLotKey = adminCommissionLotKey(commission);
    const key = [staffKey, parkingLotKey, dateKey].join('|');
    const existing = groups.get(key) || {
      staffKey,
      staffId: commission.staffId,
      staffName: staffDisplayName(commission),
      staffEmail: commission.staffEmail || '',
      parkingLotKey,
      parkingLotId: commission.parkingLotId,
      parkingLotName: commission.parkingLotName || '-',
      dateKey,
      grossAmount: 0,
      commissionAmount: 0,
      staffNetAmount: 0,
      currency: commission.currency || 'VND',
      payableIds: [],
      collectedCount: 0,
      totalCount: 0,
    };
    const status = String(commission.status || '').toUpperCase();
    existing.grossAmount += Number(commission.grossAmount || 0);
    existing.commissionAmount += Number(commission.commissionAmount || 0);
    existing.staffNetAmount += Number(commission.staffNetAmount || 0);
    existing.totalCount += 1;
    if (status === 'PAYABLE') {
      existing.payableIds.push(commission.id);
    } else {
      existing.collectedCount += 1;
    }
    groups.set(key, existing);
  });

  const statusFilter = $('#adminCommissionStatusFilter')?.value || '';
  return [...groups.values()]
    .filter((group) => {
      if (statusFilter === 'UNCOLLECTED') {
        return group.payableIds.length > 0;
      }
      if (statusFilter === 'COLLECTED') {
        return group.payableIds.length === 0;
      }
      return true;
    })
    .sort((left, right) => right.commissionAmount - left.commissionAmount);
}

function renderAdminCommissions(items = []) {
  const element = $('#adminCommissionList');
  if (!element) {
    return;
  }

  const groups = groupedAdminCommissions(items);

  if (!groups.length) {
    element.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">No commission totals found for today.</div>
        </td>
      </tr>
    `;
    return;
  }

  element.innerHTML = groups.map((group) => {
    const isCollected = group.payableIds.length === 0;
    const status = isCollected ? 'Collected' : 'Uncollected';
    return `
      <tr>
        <td>
          <strong>${escapeHtml(group.staffName || '-')}</strong>
          <span>${escapeHtml(group.staffEmail || shortId(group.staffId))}</span>
        </td>
        <td>${escapeHtml(group.parkingLotName || '-')}</td>
        <td><span class="admin-refund-amount">${escapeHtml(money(group.grossAmount, group.currency))}</span></td>
        <td><strong>${escapeHtml(money(group.commissionAmount, group.currency))}</strong><span>10%</span></td>
        <td>${escapeHtml(money(group.staffNetAmount, group.currency))}</td>
        <td><span class="admin-refund-status ${isCollected ? 'succeeded' : 'pending'}">${escapeHtml(status)}</span></td>
        <td>
          <button
            class="admin-refund-action admin-commission-detail-icon-button"
            type="button"
            title="View commission detail"
            aria-label="View commission detail"
            data-admin-open-commission-detail
            data-admin-commission-staff-key="${escapeHtml(group.staffKey)}"
            data-admin-commission-lot-key="${escapeHtml(group.parkingLotKey)}"
            data-admin-commission-staff-name="${escapeHtml(group.staffName || '-')}"
            data-admin-commission-staff-email="${escapeHtml(group.staffEmail || shortId(group.staffId))}"
            data-admin-commission-lot-name="${escapeHtml(group.parkingLotName || '-')}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5c5.1 0 8.7 4.4 9.8 6.2.3.5.3 1.1 0 1.6C20.7 14.6 17.1 19 12 19s-8.7-4.4-9.8-6.2a1.5 1.5 0 0 1 0-1.6C3.3 9.4 6.9 5 12 5Zm0 2c-4 0-6.9 3.4-8 5 1.1 1.6 4 5 8 5s6.9-3.4 8-5c-1.1-1.6-4-5-8-5Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm0 2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z" />
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  bindAdminCommissionActions();
}

function adminCommissionDetailItems() {
  if (!adminCommissionModalContext) {
    return [];
  }

  return adminFinanceCommissionItems
    .filter((commission) => {
      return adminCommissionStaffKey(commission) === adminCommissionModalContext.staffKey
        && adminCommissionLotKey(commission) === adminCommissionModalContext.parkingLotKey
        && isWithinAdminCommissionPeriod(commission.createdAt, adminCommissionModalPeriod);
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function renderAdminCommissionDetail() {
  const list = $('#adminCommissionDetailList');
  if (!list || !adminCommissionModalContext) {
    return;
  }

  const items = adminCommissionDetailItems();
  const currency = items.find((item) => item.currency)?.currency || 'VND';
  const payableIds = items
    .filter((commission) => String(commission.status || '').toUpperCase() === 'PAYABLE' && commission.id)
    .map((commission) => commission.id);
  const totals = items.reduce((summary, commission) => {
    summary.gross += Number(commission.grossAmount || 0);
    summary.admin += Number(commission.commissionAmount || 0);
    summary.net += Number(commission.staffNetAmount || 0);
    return summary;
  }, { gross: 0, admin: 0, net: 0 });

  setText('#adminCommissionDetailTitle', adminCommissionModalContext.staffName || 'Commission detail');
  setText(
    '#adminCommissionDetailMeta',
    `${adminCommissionModalContext.staffEmail || '-'} - ${adminCommissionModalContext.parkingLotName || '-'}`
  );
  setText('#adminCommissionDetailGross', money(totals.gross, currency));
  setText('#adminCommissionDetailAdmin', money(totals.admin, currency));
  setText('#adminCommissionDetailNet', money(totals.net, currency));

  const payButton = $('#adminCommissionMarkFilteredPaid');
  if (payButton) {
    payButton.disabled = payableIds.length === 0;
    payButton.dataset.adminCommissionPayableIds = payableIds.join(',');
    payButton.textContent = payableIds.length ? `Mark ${payableIds.length} paid` : 'All paid';
  }

  $all('[data-admin-commission-detail-period]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminCommissionDetailPeriod === adminCommissionModalPeriod);
  });

  if (!items.length) {
    list.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">No commission records found for this period.</div>
        </td>
      </tr>
    `;
    return;
  }

  list.innerHTML = items.map((commission) => {
    const status = commission.status || 'PAYABLE';
    return `
      <tr>
        <td>
          <strong>${escapeHtml(commission.bookingCode || shortId(commission.bookingId))}</strong>
          <span>${escapeHtml(shortId(commission.paymentId))}</span>
        </td>
        <td>${escapeHtml(money(commission.grossAmount, commission.currency || 'VND'))}</td>
        <td>${escapeHtml(commissionPaymentMethodLabel(commission.paymentMethod))}</td>
        <td>${escapeHtml(commissionRateLabel(commission))}</td>
        <td><strong>${escapeHtml(money(commission.commissionAmount, commission.currency || 'VND'))}</strong></td>
        <td>${escapeHtml(money(commission.staffNetAmount, commission.currency || 'VND'))}</td>
        <td><span class="admin-refund-status ${escapeHtml(commissionStatusClass(status))}">${escapeHtml(status)}</span></td>
        <td>${escapeHtml(formatDate(commission.createdAt))}</td>
      </tr>
    `;
  }).join('');
}

function closeAdminCommissionDetail() {
  const modal = $('#adminCommissionDetailModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  adminCommissionModalContext = null;
}

function openAdminCommissionDetail(context) {
  const modal = $('#adminCommissionDetailModal');
  if (!modal) {
    return;
  }

  adminCommissionModalContext = context;
  adminCommissionModalPeriod = 'today';
  renderAdminCommissionDetail();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function bindAdminCommissionActions() {
  $all('[data-admin-open-commission-detail]').forEach((button) => {
    button.addEventListener('click', () => {
      openAdminCommissionDetail({
        parkingLotKey: button.dataset.adminCommissionLotKey || 'lot',
        parkingLotName: button.dataset.adminCommissionLotName || '-',
        staffEmail: button.dataset.adminCommissionStaffEmail || '',
        staffKey: button.dataset.adminCommissionStaffKey || 'staff',
        staffName: button.dataset.adminCommissionStaffName || '-',
      });
    });
  });

  $all('[data-admin-mark-commissions-collected]').forEach((button) => {
    button.addEventListener('click', async () => {
      const ids = String(button.dataset.adminMarkCommissionsCollected || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (!ids.length) {
        return;
      }

      button.disabled = true;
      button.textContent = 'Updating...';
      setStatus('#adminStatus', 'Marking commission as collected...');
      try {
        await Promise.all(ids.map((id) => apiRequest(`/admin/finance/commissions/${id}/mark-collected`, {
          method: 'POST',
        })));
        setStatus('#adminStatus', 'Commission marked as collected.');
        await loadAdminFinance();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Mark collected';
        setStatus('#adminStatus', error.message, true);
      }
    });
  });
}

function bindAdminCommissionDetailModal() {
  $all('[data-admin-close-commission-detail]').forEach((button) => {
    button.addEventListener('click', closeAdminCommissionDetail);
  });

  $('#adminCommissionDetailModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeAdminCommissionDetail();
    }
  });

  $all('[data-admin-commission-detail-period]').forEach((button) => {
    button.addEventListener('click', () => {
      adminCommissionModalPeriod = button.dataset.adminCommissionDetailPeriod || 'today';
      renderAdminCommissionDetail();
    });
  });

  $('#adminCommissionMarkFilteredPaid')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const ids = String(button.dataset.adminCommissionPayableIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (!ids.length) {
      return;
    }

    button.disabled = true;
    button.textContent = 'Updating...';
    setStatus('#adminStatus', 'Marking filtered commissions as paid...');
    try {
      await Promise.all(ids.map((id) => apiRequest(`/admin/finance/commissions/${id}/mark-collected`, {
        method: 'POST',
      })));
      await loadAdminFinance();
      renderAdminCommissionDetail();
      setStatus('#adminStatus', 'Filtered commissions marked as paid.');
    } catch (error) {
      setStatus('#adminStatus', error.message, true);
      renderAdminCommissionDetail();
    }
  });
}

function bindAdminFinanceControls() {
  $('#adminCommissionStatusFilter')?.addEventListener('change', loadAdminFinance);
}

function renderAdminLots(items = []) {
  renderList('#adminPendingLots', items, (lot, index) => `
    <article class="admin-approval-card">
      <div class="admin-approval-image">
        <img src="${index % 2 === 0 ? '/assets/garage-premium.svg' : '/assets/building-garage.svg'}" alt="Parking lot preview" />
      </div>
      <div class="admin-approval-body">
        <div class="admin-approval-header">
          <div>
            <h3>${escapeHtml(lot.name)}<span class="admin-approval-status">${escapeHtml(lot.status)}</span></h3>
            <div class="admin-approval-meta">
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z" /></svg>
                Owner: Staff submission
              </span>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" /></svg>
                ${escapeHtml(lot.address)}
              </span>
              <span>ID: ${escapeHtml(lot.id)}</span>
            </div>
          </div>
          <div class="admin-submitted">
            Submitted
            <strong>${escapeHtml(formatDate(lot.updatedAt))}</strong>
          </div>
        </div>
        <div class="admin-approval-actions">
          <button class="admin-approve-button" type="button" data-admin-parking-command="approve" data-parking-lot-id="${escapeHtml(lot.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 13.4-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4-6.3 6.3Z" /></svg>
            Approve Lot
          </button>
          <button class="admin-reject-button" type="button" data-admin-parking-command="reject" data-parking-lot-id="${escapeHtml(lot.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.5 6.1 1.4 1.4-2.5 2.5 2.5 2.5-1.4 1.4-2.5-2.5-2.5 2.5-1.4-1.4 2.5-2.5-2.5-2.5 1.4-1.4 2.5 2.5 2.5-2.5Z" /></svg>
            Reject to Draft
          </button>
          <a class="admin-details-button" href="/parking-detail.html?id=${encodeURIComponent(lot.id)}">
            View Details
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.2 5.3 5.7 5.7H3v2h15.9l-5.7 5.7 1.4 1.4L22.7 12l-8.1-8.1-1.4 1.4Z" /></svg>
          </a>
        </div>
      </div>
    </article>
  `, 'No pending parking lots.');
}

function auditActor(log) {
  if (!log.actorId) {
    return 'System Auto';
  }

  return `${log.actorRole || 'Actor'} ${String(log.actorId).slice(0, 8)}`;
}

function auditActorInitials(log) {
  if (!log.actorId) {
    return 'SYS';
  }

  return String(log.actorRole || 'AD').slice(0, 2).toUpperCase();
}

function auditStatus(log) {
  return log.newValue === 'FAILED' ? 'FAILED' : 'SUCCESS';
}

function bookingStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('cancel') || normalized.includes('declin') || normalized.includes('expired')) {
    return 'cancelled';
  }
  if (normalized.includes('check') || normalized.includes('confirm')) {
    return 'active';
  }
  if (normalized.includes('pending')) {
    return 'pending';
  }
  return 'neutral';
}

function paymentStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('refund')) {
    return 'refunded';
  }
  if (normalized === 'paid' || normalized === 'partially_paid') {
    return 'paid';
  }
  return 'pending';
}

function adminBookingDateRange() {
  const activeRange = $('[data-admin-booking-range].active')?.dataset.adminBookingRange || 'today';
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  const start = new Date(end);
  if (activeRange === '7') {
    start.setDate(start.getDate() - 7);
  } else if (activeRange === '30') {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(start.getDate() - 1);
  }

  return {
    createdFrom: start.toISOString(),
    createdTo: end.toISOString(),
  };
}

function adminBookingQueryParams() {
  const search = $('#adminBookingSearch')?.value?.trim() || '';
  const status = $('#adminBookingStatusFilter')?.value || '';
  const dateRange = adminBookingDateRange();
  return {
    ...dateRange,
    search,
    status,
    size: 50,
    sort: 'createdAt,desc',
  };
}

function adminBookingSearchParams(mode = 'bookingCode') {
  const { createdFrom, createdTo, search, status, size, sort } = adminBookingQueryParams();
  return {
    bookingCode: search && mode === 'bookingCode' ? search : undefined,
    createdFrom,
    createdTo,
    plateNumber: search && mode === 'plateNumber' ? search : undefined,
    size,
    sort,
    status,
  };
}

function bookingCustomerLabel(booking) {
  return booking.customerName || booking.customerEmail || booking.customerPhone || shortId(booking.customerId);
}

function bookingVehicleSummary(booking) {
  return [
    booking.vehicleBrand,
    booking.vehicleColor,
    vehicleTypeLabel(booking.vehicleType),
  ].filter(Boolean).join(' / ');
}

function bookingCheckInDisplay(booking) {
  return formatDateTime(booking.actualCheckInTime) || 'Not checked in';
}

function bookingCheckOutDisplay(booking) {
  return formatDateTime(booking.actualCheckOutTime) || 'Not checked out';
}

function renderAdminBookings(items = [], pagination = null) {
  const element = $('#adminBookingList');
  if (!element) {
    return;
  }

  const activeCount = items.filter((booking) => ['CHECKED_IN', 'CONFIRMED'].includes(booking.status)).length;
  const totalRevenue = items.reduce((sum, booking) => sum + Number(booking.total?.amount || 0), 0);

  setText('#adminBookingTotal', pagination?.totalElements ?? items.length);
  setText('#adminBookingActive', activeCount);
  setText('#adminBookingRevenue', money(totalRevenue, items[0]?.total?.currency || 'VND'));
  setText('#adminBookingPagination', `Showing ${items.length} of ${pagination?.totalElements ?? items.length} results`);

  if (!items.length) {
    element.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">No bookings found.</div>
        </td>
      </tr>
    `;
    return;
  }

  element.innerHTML = items.map((booking) => {
    const statusClassName = bookingStatusClass(booking.status);
    const paymentAmount = booking.total ? money(booking.total.amount, booking.total.currency || 'VND') : '-';
    const checkInDisplay = bookingCheckInDisplay(booking);
    const checkOutDisplay = bookingCheckOutDisplay(booking);

    return `
      <tr>
        <td><strong>${escapeHtml(booking.bookingCode || shortId(booking.id))}</strong><span>${escapeHtml(shortId(booking.id))}</span></td>
        <td><strong>${escapeHtml(bookingCustomerLabel(booking))}</strong><span>${escapeHtml(booking.customerEmail || booking.customerPhone || '-')}</span></td>
        <td><strong>${escapeHtml(booking.plateNumber || shortId(booking.vehicleId))}</strong><span>${escapeHtml(bookingVehicleSummary(booking) || '-')}</span></td>
        <td><strong>${escapeHtml(booking.parkingLotName || shortId(booking.parkingLotId))}</strong><span>${escapeHtml(shortId(booking.parkingLotId))}</span></td>
        <td><strong>${escapeHtml(checkInDisplay)}</strong><span>${escapeHtml(checkOutDisplay)}</span></td>
        <td><span class="admin-booking-status ${escapeHtml(statusClassName)}">${escapeHtml(booking.status)}</span></td>
        <td><strong>${escapeHtml(paymentAmount)}</strong></td>
        <td>
          <button type="button" class="admin-booking-action" data-admin-booking-detail="${escapeHtml(booking.id)}" aria-label="View booking details">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.1 0 8.7 4.4 9.8 6.2.3.5.3 1.1 0 1.6C20.7 14.6 17.1 19 12 19s-8.7-4.4-9.8-6.2a1.5 1.5 0 0 1 0-1.6C3.3 9.4 6.9 5 12 5Zm0 2c-4 0-6.9 3.4-8 5 1.1 1.6 4 5 8 5s6.9-3.4 8-5c-1.1-1.6-4-5-8-5Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm0 2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z" /></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminBookingDetail(booking) {
  activeAdminBooking = booking;
  setText('#adminBookingDetailTitle', booking.bookingCode || shortId(booking.id));
  setText('#adminBookingDetailMeta', `${booking.status || '-'} - ${booking.paymentStatus || 'UNPAID'}`);
  setText('#adminBookingDetailCustomer', bookingCustomerLabel(booking));
  setText('#adminBookingDetailCustomerMeta', booking.customerEmail || booking.customerPhone || shortId(booking.customerId));
  setText('#adminBookingDetailVehicle', booking.plateNumber || shortId(booking.vehicleId));
  setText('#adminBookingDetailVehicleMeta', bookingVehicleSummary(booking) || '-');
  setText('#adminBookingDetailLot', booking.parkingLotName || shortId(booking.parkingLotId));
  setText('#adminBookingDetailLotMeta', shortId(booking.parkingLotId));
  setText('#adminBookingDetailTotal', money(adminBookingTotal(booking)));
  setText('#adminBookingDetailPayment', `${booking.paymentMethod || '-'} - ${booking.paymentStatus || 'UNPAID'}`);
  setText('#adminBookingDetailCheckIn', bookingCheckInDisplay(booking));
  setText('#adminBookingDetailCheckOut', bookingCheckOutDisplay(booking));
}

function openAdminBookingDetailModal(booking) {
  const modal = $('#adminBookingDetailModal');
  if (!modal) {
    return;
  }

  renderAdminBookingDetail(booking);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeAdminBookingDetailModal() {
  const modal = $('#adminBookingDetailModal');
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  activeAdminBooking = null;
}

function bindAdminBookingActions() {
  $all('[data-admin-booking-detail]').forEach((button) => {
    button.addEventListener('click', async () => {
      setStatus('#adminStatus', 'Loading booking detail...');
      try {
        const detail = await apiRequest(`/admin/bookings/${button.dataset.adminBookingDetail}`);
        openAdminBookingDetailModal(detail);
        setStatus('#adminStatus', '');
      } catch (error) {
        setStatus('#adminStatus', error.message, true);
      }
    });
  });
}

function bindAdminBookingControls() {
  const search = $('#adminBookingSearch');
  let searchTimer = null;
  search?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadAdminBookings, 300);
  });

  $('#adminBookingStatusFilter')?.addEventListener('change', loadAdminBookings);
  $('[data-admin-refresh-bookings]')?.addEventListener('click', loadAdminBookings);
  $all('[data-admin-booking-range]').forEach((button) => {
    button.addEventListener('click', () => {
      $all('[data-admin-booking-range]').forEach((item) => item.classList.toggle('active', item === button));
      loadAdminBookings();
    });
  });

  $all('[data-admin-close-booking-detail]').forEach((button) => {
    button.addEventListener('click', closeAdminBookingDetailModal);
  });

  $('#adminBookingDetailModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeAdminBookingDetailModal();
    }
  });
}

function renderAuditDetail(log) {
  if (!log) {
    setText('#auditDetailId', 'ID: -');
    setText('#auditDetailAction', 'Select a log');
    setText('#auditDetailEntity', 'No audit entry selected.');
    setText('#auditDetailActor', '-');
    setText('#auditDetailActorRole', '-');
    setText('#auditDetailIp', '-');
    setText('#auditDetailOld', '-');
    setText('#auditDetailNew', '-');
    setText('#auditDetailReason', 'No reason provided.');
    setText('#auditDetailRequest', '-');
    return;
  }

  setText('#auditDetailId', `ID: ${log.id}`);
  setText('#auditDetailAction', log.action);
  setText('#auditDetailEntity', `${log.entityType}: ${log.entityId}`);
  setText('#auditDetailActor', auditActor(log));
  setText('#auditDetailActorRole', `${log.actorRole || 'SYSTEM'}${log.actorId ? ` (${log.actorId})` : ''}`);
  setText('#auditDetailIp', log.ipAddress || '-');
  setText('#auditDetailOld', log.oldValue || '-');
  setText('#auditDetailNew', log.newValue || '-');
  setText('#auditDetailReason', log.reason || 'No reason provided.');
  setText('#auditDetailRequest', log.requestId || '-');
}

function renderAdminAuditLogs(items = [], pagination = null) {
  const element = $('#adminAuditList');
  if (!element) {
    return;
  }

  if (!items.length) {
    element.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">No audit logs found.</div>
        </td>
      </tr>
    `;
    setText('#adminAuditPagination', 'Showing 0 entries');
    renderAuditDetail(null);
    return;
  }

  element.innerHTML = items.map((log, index) => {
    const status = auditStatus(log);
    return `
      <tr class="${index === 0 ? 'active' : ''}" data-admin-audit-id="${escapeHtml(log.id)}">
        <td>
          <strong>${escapeHtml(formatTime(log.createdAt))}</strong>
          <span>${escapeHtml(formatDate(log.createdAt))}</span>
        </td>
        <td>
          <div class="admin-audit-actor">
            <span>${escapeHtml(auditActorInitials(log))}</span>
            ${escapeHtml(auditActor(log))}
          </div>
        </td>
        <td><code class="${status === 'FAILED' ? 'danger' : ''}">${escapeHtml(log.action)}</code></td>
        <td>${escapeHtml(log.entityType)}: ${escapeHtml(log.entityId)}</td>
        <td><span class="admin-audit-status ${status.toLowerCase()}">${escapeHtml(status)}</span></td>
      </tr>
    `;
  }).join('');

  const total = pagination?.totalElements ?? items.length;
  setText('#adminAuditPagination', `Showing ${items.length} of ${total} entries`);
  renderAuditDetail(items[0]);
}

function bindAdminAuditActions() {
  $all('[data-admin-audit-id]').forEach((row) => {
    row.addEventListener('click', async () => {
      $all('[data-admin-audit-id]').forEach((item) => item.classList.toggle('active', item === row));
      setStatus('#adminStatus', 'Loading audit detail...');
      try {
        const detail = await apiRequest(`/admin/audit-logs/${row.dataset.adminAuditId}`);
        renderAuditDetail(detail);
        setStatus('#adminStatus', '');
      } catch (error) {
        setStatus('#adminStatus', error.message, true);
      }
    });
  });
}

async function loadAdminUsers() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const users = await apiPage('/admin/users', { size: 50 });
    const customerUsers = (users.items || []).filter((user) => user.role === 'CUSTOMER');

    adminUsersCache = customerUsers;
    adminUsersPagination = {
      ...(users.pagination || {}),
      totalElements: customerUsers.length,
    };
    refreshAdminUserTable();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdminStaff() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const [summary, users] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/users', { size: 50 }),
    ]);

    setText('#adminUsers', summary.totalUsers);
    setText('#adminLots', summary.activeParkingLots);
    setText('#adminPending', summary.pendingApprovals);
    setText('#adminRevenue', money(summary.revenue));

    adminStaffCache = (users.items || []).filter((user) => user.role === 'STAFF');
    adminStaffPagination = {
      ...(users.pagination || {}),
      totalElements: adminStaffCache.length,
    };
    refreshAdminStaffTable();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdminRefunds() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const [summary, refunds] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/refunds'),
    ]);

    setText('#adminUsers', summary.totalUsers);
    setText('#adminLots', summary.activeParkingLots);
    setText('#adminPending', summary.pendingApprovals);
    setText('#adminRevenue', money(summary.revenue));

    renderAdminRefunds(refunds.items || [], refunds.pagination);
    bindAdminRefundActions();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdminFinance() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const [summary, commissions] = await Promise.all([
      apiRequest('/admin/finance/commissions/summary'),
      apiPage('/admin/finance/commissions', { size: 500, sort: 'createdAt,desc' }),
    ]);

    setText('#adminFinanceGross', money(summary.grossAmount, summary.currency || 'VND'));
    setText('#adminFinanceCommission', money(summary.commissionAmount, summary.currency || 'VND'));
    setText('#adminFinancePlatform', money(summary.staffNetAmount, summary.currency || 'VND'));
    setText('#adminFinancePayable', money(summary.payableAmount, summary.currency || 'VND'));
    adminFinanceCommissionItems = commissions.items || [];
    renderAdminCommissions(adminFinanceCommissionItems);
    setStatus('#adminStatus', '');
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdminLots() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const [summary, pendingLots] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/parking-lots/pending'),
    ]);

    setText('#adminUsers', summary.totalUsers);
    setText('#adminLots', summary.activeParkingLots);
    setText('#adminPending', summary.pendingApprovals);
    setText('#adminRevenue', money(summary.revenue));
    renderAdminLots(pendingLots.items || []);
    bindAdminApprovalActions();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdminAuditLogs() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const [summary, logs] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/audit-logs'),
    ]);

    setText('#adminUsers', summary.totalUsers);
    setText('#adminLots', summary.activeParkingLots);
    setText('#adminPending', summary.pendingApprovals);
    setText('#adminRevenue', money(summary.revenue));
    renderAdminAuditLogs(logs.items || [], logs.pagination);
    bindAdminAuditActions();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdminBookings() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    let bookings = await apiPage('/admin/bookings', adminBookingSearchParams('bookingCode'));
    const hasSearch = Boolean(adminBookingQueryParams().search);
    if (hasSearch && !bookings.items.length) {
      bookings = await apiPage('/admin/bookings', adminBookingSearchParams('plateNumber'));
    }

    adminBookingsCache = bookings.items || [];
    renderAdminBookings(adminBookingsCache, bookings.pagination);
    bindAdminBookingActions();
    setStatus('#adminStatus', '');
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdminRequests() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const [summary, requests] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/parking-lots/update-requests', {
        size: 50,
        sort: 'createdAt,desc',
      }),
    ]);

    setText('#adminLots', summary.activeParkingLots);
    setText('#adminRevenue', money(summary.revenue));
    adminRequestsCache = requests.items || [];
    adminRequestsPagination = requests.pagination || null;
    renderAdminRequests(adminRequestsCache, adminRequestsPagination);
    bindAdminRequestActions();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

function dashboardNumber(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function dashboardCount(value) {
  return new Intl.NumberFormat('en-US').format(dashboardNumber(value));
}

async function safeAdminPage(path, params = {}) {
  try {
    return await apiPage(path, params);
  } catch {
    return { items: [], pagination: null };
  }
}

async function loadAdminDashboardBookingExceptions() {
  const exceptionStatuses = ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'EXPIRED', 'NO_SHOW'];
  const pages = await Promise.all(exceptionStatuses.map((status) => safeAdminPage('/admin/bookings', {
    size: 8,
    sort: 'updatedAt,desc',
    status,
  })));

  return pages
    .flatMap((result) => result.items || [])
    .sort((a, b) => (parseDate(b.updatedAt || b.createdAt)?.getTime() || 0) - (parseDate(a.updatedAt || a.createdAt)?.getTime() || 0))
    .slice(0, 8);
}

function adminPerformanceAmount(value) {
  const amount = Number(value?.amount ?? value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function adminPerformanceValueLabel(value, currency = 'VND') {
  return adminDashboardPerformanceMetric === 'revenue'
    ? money(value, currency)
    : dashboardCount(value);
}

function adminPerformanceRangeLabel(range = adminDashboardPerformanceRange) {
  if (range === '7') {
    return 'Last 7 days';
  }
  if (range === '30') {
    return 'Last 30 days';
  }
  return 'Today';
}

function adminPerformanceTotal(performance) {
  return (performance?.buckets || []).reduce((sum, bucket) => sum + adminPerformanceAmount(bucket.value), 0);
}

function renderDashboardBars(selector, buckets = [], colorClass = 'admin', currency = 'VND') {
  const element = $(selector);
  if (!element) {
    return;
  }

  const normalizedBuckets = buckets.map((bucket) => ({
    label: bucket.label,
    value: adminPerformanceAmount(bucket.value),
  }));
  const max = Math.max(1, ...normalizedBuckets.map((bucket) => bucket.value));
  const hasActivity = normalizedBuckets.some((bucket) => bucket.value > 0);

  element.classList.toggle('is-revenue', adminDashboardPerformanceMetric === 'revenue');
  element.classList.toggle('is-daily', adminDashboardPerformanceRange !== 'today');
  element.classList.toggle('is-range-7', adminDashboardPerformanceRange === '7');
  element.classList.toggle('is-range-30', adminDashboardPerformanceRange === '30');
  element.classList.toggle('is-empty-chart', !hasActivity);

  element.innerHTML = normalizedBuckets.map((bucket) => `
    <span class="${escapeHtml(colorClass)}${hasActivity ? '' : ' is-empty'}" style="--bar-height: ${Math.max(18, Math.round((bucket.value / max) * 100))}%">
      <em>${escapeHtml(adminPerformanceValueLabel(bucket.value, currency))}</em>
      <small>${escapeHtml(bucket.label)}</small>
    </span>
  `).join('') + (!hasActivity
    ? `<strong class="dashboard-chart-empty-label">No ${adminDashboardPerformanceMetric === 'revenue' ? 'revenue' : 'booking'} data</strong>`
    : '');
}

async function renderAdminPerformanceChart(summary = adminDashboardSummaryCache) {
  const range = adminDashboardPerformanceRange;
  const bookingsQuery = new URLSearchParams({ metric: 'bookings', range });
  const revenueQuery = new URLSearchParams({ metric: 'revenue', range });

  try {
    const [bookingsPerformance, revenuePerformance] = await Promise.all([
      apiRequest(`/admin/dashboard/performance?${bookingsQuery.toString()}`),
      apiRequest(`/admin/dashboard/performance?${revenueQuery.toString()}`),
    ]);
    const selectedPerformance = adminDashboardPerformanceMetric === 'revenue' ? revenuePerformance : bookingsPerformance;
    renderDashboardBars(
      '#adminPerformanceChart',
      selectedPerformance.buckets || [],
      'admin',
      selectedPerformance.currency || revenuePerformance.currency || 'VND'
    );
    setText('#adminPerformanceRangeLabel', adminPerformanceRangeLabel(range));
    setText('#adminPerfBookings', dashboardCount(adminPerformanceTotal(bookingsPerformance)));
    setText('#adminPerfRevenue', money(adminPerformanceTotal(revenuePerformance), revenuePerformance.currency || 'VND'));
  } catch (error) {
    renderDashboardBars('#adminPerformanceChart', [], 'admin');
    setText('#adminPerformanceRangeLabel', adminPerformanceRangeLabel(range));
    setText('#adminPerfBookings', dashboardCount(summary.todayBookings));
    setText('#adminPerfRevenue', money(summary.revenue));
    setStatus('#adminStatus', error.message, true);
  }
}

function renderAdminDashboardStaffQueue(staffPending = []) {
  renderList('#adminStaffQueue', staffPending.slice(0, 5), (staff) => `
    <article class="dashboard-person-row">
      <span class="admin-user-avatar">${escapeHtml(userInitials(staff))}</span>
      <div>
        <strong>${escapeHtml(userDisplayName(staff))}</strong>
        <small>${escapeHtml(staff.email || staff.phone || shortAccountId(staff.id, 'STF'))}</small>
      </div>
      <span class="dashboard-row-actions">
        <button type="button" class="success" title="Approve staff" data-admin-staff-command="approve" data-staff-id="${escapeHtml(staff.id)}">
          <span class="material-symbols-outlined" aria-hidden="true">check</span>
        </button>
        <button type="button" class="danger" title="Reject staff" data-admin-staff-command="reject" data-staff-id="${escapeHtml(staff.id)}" data-staff-version="${escapeHtml(staff.version)}">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </span>
    </article>
  `, 'No staff accounts are waiting for approval.');
}

function renderAdminDashboardLotQueue(pendingLots = []) {
  renderList('#adminLotQueue', pendingLots.slice(0, 5), (lot) => `
    <article class="dashboard-lot-row">
      <div>
        <strong>${escapeHtml(lot.name || 'Unnamed parking lot')}</strong>
        <small>${escapeHtml(lot.address || 'No address')}</small>
      </div>
      <span class="dashboard-row-actions">
        <button type="button" class="success" title="Approve parking lot" data-admin-parking-command="approve" data-parking-lot-id="${escapeHtml(lot.id)}">
          <span class="material-symbols-outlined" aria-hidden="true">check</span>
        </button>
        <button type="button" class="danger" title="Reject parking lot" data-admin-parking-command="reject" data-parking-lot-id="${escapeHtml(lot.id)}">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </span>
    </article>
  `, 'No parking lots are waiting for approval.');
}

function bookingExceptionLabel(booking) {
  const status = String(booking.status || '').toUpperCase();
  if (status === 'PENDING_APPROVAL') {
    return 'Approval waiting';
  }
  if (status === 'PENDING_PAYMENT') {
    return 'Payment pending';
  }
  if (status === 'EXPIRED') {
    return 'Auto expired';
  }
  if (status === 'NO_SHOW') {
    return 'No show';
  }
  return dashboardStatusText(status);
}

function dashboardStatusText(status) {
  return String(status || 'UNKNOWN').replaceAll('_', ' ');
}

function renderAdminDashboardExceptions(bookings = []) {
  renderList('#adminExceptionQueue', bookings.slice(0, 6), (booking) => `
    <article class="dashboard-booking-row">
      <span class="dashboard-booking-mark ${escapeHtml(bookingStatusClass(booking.status))}"></span>
      <div>
        <strong>${escapeHtml(booking.bookingCode || shortAccountId(booking.id, 'BKG'))}</strong>
        <small>${escapeHtml(booking.plateNumber || booking.vehicleId || 'Vehicle')} · ${escapeHtml(booking.parkingLotName || booking.parkingLotId || 'Parking lot')}</small>
        <em>${escapeHtml(formatDateTime(booking.updatedAt || booking.createdAt))} · ${escapeHtml(adminParkingDuration(booking))}</em>
      </div>
      <span class="dashboard-status-pill ${escapeHtml(bookingStatusClass(booking.status))}">${escapeHtml(bookingExceptionLabel(booking))}</span>
    </article>
  `, 'No booking exceptions need review.');
}

function renderAdminDashboardAudit(logs = []) {
  renderList('#adminRecentAudit', logs.slice(0, 6), (log) => `
    <article class="dashboard-audit-row">
      <span>${escapeHtml(auditActorInitials(log))}</span>
      <div>
        <strong>${escapeHtml(log.action || 'Audit action')}</strong>
        <small>${escapeHtml(auditActor(log))} · ${escapeHtml(log.entityType || 'System')} ${escapeHtml(log.entityId || '')}</small>
      </div>
      <time>${escapeHtml(formatDateTime(log.createdAt))}</time>
    </article>
  `, 'No audit logs found.');
}

function bindAdminDashboardActions() {
  bindAdminStaffActions();
  bindAdminApprovalActions();
}

function bindAdminDashboardControls() {
  if (adminDashboardControlsBound) {
    return;
  }
  adminDashboardControlsBound = true;

  document.addEventListener('click', async (event) => {
    const metricButton = event.target.closest?.('[data-admin-performance-metric]');
    if (!metricButton) {
      return;
    }

    adminDashboardPerformanceMetric = metricButton.dataset.adminPerformanceMetric || 'bookings';
    $all('[data-admin-performance-metric]').forEach((item) => item.classList.toggle('active', item === metricButton));
    await renderAdminPerformanceChart();
  });

  document.addEventListener('click', async (event) => {
    const rangeButton = event.target.closest?.('[data-admin-performance-range]');
    if (!rangeButton) {
      return;
    }

    adminDashboardPerformanceRange = rangeButton.dataset.adminPerformanceRange || 'today';
    $all('[data-admin-performance-range]').forEach((item) => item.classList.toggle('active', item === rangeButton));
    await renderAdminPerformanceChart();
  });
}

async function loadAdminDashboard() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  bindAdminDashboardControls();

  try {
    const [
      summary,
      users,
      pendingLots,
      exceptionBookings,
      audits,
    ] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/users', { size: 100, sort: 'createdAt,desc' }),
      safeAdminPage('/admin/parking-lots/pending', { size: 20, sort: 'updatedAt,desc' }),
      loadAdminDashboardBookingExceptions(),
      safeAdminPage('/admin/audit-logs', { size: 6, sort: 'createdAt,desc' }),
    ]);

    const userItems = users.items || [];
    const pendingStaff = userItems.filter((user) => user.role === 'STAFF' && statusClass(user.status) === 'pending');
    const pendingLotItems = pendingLots.items || [];
    adminDashboardSummaryCache = summary;

    setText('#adminLiveTime', `Synced · ${formatTime(new Date())}`);
    setText('#adminDashTotalUsers', dashboardCount(summary.totalUsers));
    setText('#adminDashActiveStaff', dashboardCount(summary.activeStaff));
    setText('#adminDashActiveLots', dashboardCount(summary.activeParkingLots));
    setText('#adminDashPending', dashboardCount(summary.pendingApprovals));
    setText('#adminDashPendingSub', `Staff ${dashboardCount(pendingStaff.length)} · Lots ${dashboardCount(pendingLotItems.length)}`);
    setText('#adminDashTodayBookings', dashboardCount(summary.todayBookings));
    setText('#adminDashRevenue', money(summary.revenue));
    setText('#adminPerfBookings', dashboardCount(summary.todayBookings));
    setText('#adminPerfRevenue', money(summary.revenue));

    adminUsersCache = userItems;
    adminUsersPagination = users.pagination || null;
    adminStaffCache = userItems.filter((user) => user.role === 'STAFF');

    renderAdminDashboardStaffQueue(pendingStaff);
    renderAdminDashboardLotQueue(pendingLotItems);
    renderAdminDashboardExceptions(exceptionBookings);
    renderAdminDashboardAudit(audits.items || []);
    await renderAdminPerformanceChart(summary);
    bindAdminDashboardActions();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdmin() {
  await loadAdminDashboard();
}

async function reloadAdminPage() {
  if (page === 'admin-finance' || page === 'admin-refunds') {
    await loadAdminFinance();
    return;
  }

  if (page === 'admin-lots') {
    await loadAdminLots();
    return;
  }

  if (page === 'admin-audit') {
    await loadAdminAuditLogs();
    return;
  }

  if (page === 'admin-bookings') {
    await loadAdminBookings();
    return;
  }

  if (page === 'admin-requests') {
    await loadAdminRequests();
    return;
  }

  if (page === 'admin-staff') {
    await loadAdminStaff();
    return;
  }

  if (page === 'admin-users') {
    await loadAdminUsers();
    return;
  }

  if (page === 'admin') {
    await loadAdminDashboard();
    return;
  }

  await loadAdmin();
}

function bindAdminApprovalActions() {
  $all('[data-admin-fill-lot]').forEach((button) => {
    button.addEventListener('click', () => {
      const form = $('#parkingCommandForm');
      if (form) {
        form.querySelector('[name="parkingLotId"]').value = button.dataset.adminFillLot;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  $all('[data-admin-parking-command]').forEach((button) => {
    button.addEventListener('click', async () => {
      const parkingLotId = button.dataset.parkingLotId;
      const action = button.dataset.adminParkingCommand;
      const reason = action === 'reject' ? 'Rejected by admin from approval queue' : null;
      setStatus('#adminStatus', `${action === 'approve' ? 'Approving' : 'Rejecting'} parking lot...`);

      try {
        await apiRequest(`/admin/parking-lots/${parkingLotId}/${action}`, {
          method: 'POST',
          body: reason ? jsonBody({ reason }) : undefined,
        });
        setStatus('#adminStatus', 'Parking command completed.');
        await reloadAdminPage();
      } catch (error) {
        setStatus('#adminStatus', error.message, true);
      }
    });
  });
}

function bindAdminForms() {
  $('#staffCreateForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    closeStaffModal();
    setStatus('#adminStatus', 'Creating staff account...');
    try {
      await apiRequest('/admin/staff', {
        method: 'POST',
        body: jsonBody(formData(form)),
      });
      form.reset();
      updateStaffCreatePreview();
      setStatus('#adminStatus', 'Staff account created.');
      await reloadAdminPage();
    } catch (error) {
      setStatus('#adminStatus', error.message, true);
      openStaffModal();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  $('#parkingCommandForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    const reasonActions = new Set(['reject', 'suspend', 'reject-closure']);
    setStatus('#adminStatus', 'Sending parking command...');
    try {
      await apiRequest(`/admin/parking-lots/${data.parkingLotId}/${data.action}`, {
        method: 'POST',
        body: reasonActions.has(data.action)
          ? jsonBody({ reason: data.reason || 'Admin action', expectedVersion: data.expectedVersion ? Number(data.expectedVersion) : null })
          : undefined,
      });
      setStatus('#adminStatus', 'Parking command completed.');
      await reloadAdminPage();
    } catch (error) {
      setStatus('#adminStatus', error.message, true);
    }
  });

  $('#refundForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#adminStatus', 'Creating refund...');
    try {
      await apiRequest(`/admin/payments/${data.paymentId}/refund`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: jsonBody({ amount: Number(data.amount), reason: data.reason }),
      });
      setStatus('#adminStatus', 'Refund created.');
      closeRefundModal();
      event.currentTarget.reset();
      await reloadAdminPage();
    } catch (error) {
      setStatus('#adminStatus', error.message, true);
    }
  });
}

bindLogout();

if (page === 'auth') {
  initAuth();
}

if (page === 'confirm-registration') {
  initConfirmRegistration();
}

if (page !== 'auth' && page !== 'confirm-registration') {
  startSessionGuard();
}

if (page?.startsWith('admin')) {
  ensureAdminRequestNavLink();
}

if (page === 'admin-users') {
  bindAdminUserControls();
  bindAdminForms();
  loadAdminUsers();
}

if (page === 'admin') {
  bindAdminForms();
  loadAdminDashboard();
}

if (page === 'admin-staff') {
  bindAdminStaffControls();
  bindAdminForms();
  loadAdminStaff();
}

if (page === 'admin-finance' || page === 'admin-refunds') {
  bindAdminFinanceControls();
  bindAdminCommissionDetailModal();
  bindAdminForms();
  loadAdminFinance();
}

if (page === 'admin-lots') {
  loadAdminLots();
}

if (page === 'admin-requests') {
  bindAdminRequestControls();
  loadAdminRequests();
}

if (page === 'admin-audit') {
  loadAdminAuditLogs();
}

if (page === 'admin-bookings') {
  bindAdminBookingControls();
  loadAdminBookings();
}
