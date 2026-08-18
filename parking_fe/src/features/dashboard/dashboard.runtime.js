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
    return 'Pending';
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
    const canActivate = userStatusClass === 'suspended' || userStatusClass === 'pending' || userStatusClass === 'locked';
    const toggleStatus = canActivate ? 'ACTIVE' : 'SUSPENDED';
    const toggleTitle = canActivate ? 'Approve / Activate account' : 'Suspend account';
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
            <button type="button" class="${escapeHtml(toggleClass)}" title="${escapeHtml(toggleTitle)}" data-admin-update-user-status="${escapeHtml(user.id)}" data-admin-user-status="${escapeHtml(toggleStatus)}" data-admin-user-version="${escapeHtml(user.version)}">
              <svg viewBox="0 0 24 24" aria-hidden="true">${toggleIcon}</svg>
            </button>
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
    return 'Admin approved customer account';
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
        <td colspan="7">
          <div class="empty-state">No bookings found.</div>
        </td>
      </tr>
    `;
    return;
  }

  element.innerHTML = items.map((booking) => {
    const statusClassName = bookingStatusClass(booking.status);
    const paymentClassName = paymentStatusClass(booking.paymentStatus);
    const paymentAmount = booking.total ? money(booking.total.amount, booking.total.currency || 'VND') : '-';

    return `
      <tr>
        <td><strong>${escapeHtml(booking.bookingCode || booking.id)}</strong><span>${escapeHtml(booking.id)}</span></td>
        <td><strong>Vehicle</strong><span>${escapeHtml(booking.vehicleId)}</span></td>
        <td>${escapeHtml(booking.parkingLotId)}</td>
        <td><strong>${escapeHtml(formatDate(booking.startTime))} ${escapeHtml(formatTime(booking.startTime))}</strong><span>${escapeHtml(formatDate(booking.endTime))} ${escapeHtml(formatTime(booking.endTime))}</span></td>
        <td><span class="admin-booking-status ${escapeHtml(statusClassName)}">${escapeHtml(booking.status)}</span></td>
        <td><strong class="${paymentClassName === 'refunded' ? 'muted' : ''}">${escapeHtml(paymentAmount)}</strong><span class="admin-booking-payment ${escapeHtml(paymentClassName)}">${escapeHtml(booking.paymentStatus || 'UNPAID')}</span></td>
        <td>
          <button type="button" class="admin-booking-action" data-admin-booking-detail="${escapeHtml(booking.id)}" aria-label="View booking details">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function bindAdminBookingActions() {
  $all('[data-admin-booking-detail]').forEach((button) => {
    button.addEventListener('click', async () => {
      setStatus('#adminStatus', 'Loading booking detail...');
      try {
        const detail = await apiRequest(`/admin/bookings/${button.dataset.adminBookingDetail}`);
        setStatus('#adminStatus', `Booking ${detail.bookingCode || detail.id}: ${detail.status}`);
      } catch (error) {
        setStatus('#adminStatus', error.message, true);
      }
    });
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
    const [summary, bookings] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/bookings'),
    ]);

    setText('#adminUsers', summary.totalUsers);
    setText('#adminLots', summary.activeParkingLots);
    setText('#adminPending', summary.pendingApprovals);
    setText('#adminRevenue', money(summary.revenue));
    renderAdminBookings(bookings.items || [], bookings.pagination);
    bindAdminBookingActions();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function loadAdmin() {
  const current = await requireRole('ADMIN');
  if (!current) {
    return;
  }

  try {
    const [summary, users, pendingLots, bookings, refunds] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/users'),
      apiPage('/admin/parking-lots/pending'),
      apiPage('/admin/bookings'),
      apiPage('/admin/refunds'),
    ]);

    setText('#adminUsers', summary.totalUsers);
    setText('#adminLots', summary.activeParkingLots);
    setText('#adminPending', summary.pendingApprovals);
    setText('#adminRevenue', money(summary.revenue));

    adminUsersCache = users.items || [];
    adminUsersPagination = users.pagination || null;
    refreshAdminUserTable();

    renderAdminLots(pendingLots.items || []);

    renderList('#adminBookingList', bookings.items, (booking) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(booking.bookingCode || booking.id)}</h3>
          <p>${escapeHtml(booking.startTime)} to ${escapeHtml(booking.endTime)}</p>
        </div>
        <span class="pill">${escapeHtml(booking.status)}</span>
      </article>
    `);

    renderAdminRefunds(refunds.items || [], refunds.pagination);

    bindAdminApprovalActions();
    bindAdminRefundActions();
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
}

async function reloadAdminPage() {
  if (page === 'admin-refunds') {
    await loadAdminRefunds();
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

  if (page === 'admin-staff') {
    await loadAdminStaff();
    return;
  }

  if (page === 'admin-users' || page === 'admin') {
    await loadAdminUsers();
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

if (page === 'admin') {
  window.location.replace('/admin-users.html');
}

if (page === 'admin-users') {
  bindAdminUserControls();
  bindAdminForms();
  loadAdminUsers();
}

if (page === 'admin-staff') {
  bindAdminStaffControls();
  bindAdminForms();
  loadAdminStaff();
}

if (page === 'admin-refunds') {
  bindAdminRefundControls();
  bindAdminForms();
  loadAdminRefunds();
}

if (page === 'admin-lots') {
  loadAdminLots();
}

if (page === 'admin-audit') {
  loadAdminAuditLogs();
}

if (page === 'admin-bookings') {
  loadAdminBookings();
}
