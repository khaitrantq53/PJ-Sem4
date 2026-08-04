import {
  apiPage,
  apiRequest,
  clearSession,
  getStoredAccount,
  jsonBody,
  saveSession,
} from '../../services/api.js';

const page = document.body.dataset.page;

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
  return user.email || user.phone || user.id || 'Unknown user';
}

function userInitials(user) {
  const label = userDisplayName(user).replace(/@.*/, '');
  const pieces = label.split(/[.\-_\s]+/).filter(Boolean);
  const initials = pieces.length > 1
    ? `${pieces[0][0]}${pieces[1][0]}`
    : label.slice(0, 2);

  return initials.toUpperCase();
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

  return '/customer.html';
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

async function initAuth() {
  initTabs();
  initPasswordToggle();

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
      saveSession(auth);
      window.location.href = pathForRole(auth.account?.role);
    } catch (error) {
      setStatus('#authStatus', error.message, true);
    }
  });

  $('#registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#registerStatus', 'Creating account...');

    try {
      const auth = await apiRequest('/auth/customers/register', {
        method: 'POST',
        body: jsonBody(formData(event.currentTarget)),
      });
      saveSession(auth);
      window.location.href = '/customer.html';
    } catch (error) {
      setStatus('#registerStatus', error.message, true);
    }
  });
}

async function loadCustomer() {
  const current = await requireRole('CUSTOMER');
  if (!current) {
    return;
  }

  const prefilledParkingLotId = new URLSearchParams(window.location.search).get('parkingLotId');
  if (prefilledParkingLotId && $('#bookingParkingLotId')) {
    $('#bookingParkingLotId').value = prefilledParkingLotId;
  }

  try {
    const [profile, vehicles, bookings, lots] = await Promise.all([
      apiRequest('/customers/me'),
      apiRequest('/customer/vehicles'),
      apiPage('/customer/bookings'),
      apiPage('/public/parking-lots', { size: 20 }),
    ]);

    setText('#profileName', profile.fullName || 'Customer');
    setText('#profileEmail', profile.email || profile.phone || '-');
    setText('#vehicleCount', vehicles.length);
    setText('#bookingCount', bookings.pagination.totalElements);
    setText('#lotCount', lots.pagination.totalElements);

    renderList('#vehicleList', vehicles, (vehicle) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(vehicle.plateNumber)}</h3>
          <p>${escapeHtml(vehicle.vehicleType)} - ${escapeHtml(vehicle.brand || 'No brand')} - ${escapeHtml(vehicle.color || 'No color')}</p>
        </div>
        <div class="pill-row">
          ${vehicle.defaultVehicle ? '<span class="pill">Default</span>' : ''}
          <span class="pill">${escapeHtml(vehicle.status)}</span>
        </div>
      </article>
    `);

    renderList('#bookingList', bookings.items, (booking) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(booking.bookingCode || booking.id)}</h3>
          <p>${escapeHtml(booking.startTime)} to ${escapeHtml(booking.endTime)}</p>
        </div>
        <div class="pill-row">
          <span class="pill">${escapeHtml(booking.status)}</span>
          <span class="pill">${money(booking.total)}</span>
        </div>
      </article>
    `);

    renderList('#parkingPicker', lots.items, (lot) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(lot.name)}</h3>
          <p>${escapeHtml(lot.address)}</p>
        </div>
        <button class="ghost-button" type="button" data-fill-lot="${escapeHtml(lot.id)}">Use</button>
      </article>
    `);

    $all('[data-fill-lot]').forEach((button) => {
      button.addEventListener('click', () => {
        $('#bookingParkingLotId').value = button.dataset.fillLot;
      });
    });
  } catch (error) {
    setStatus('#customerStatus', error.message, true);
  }
}

function bindCustomerForms() {
  $('#profileForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#customerStatus', 'Updating profile...');
    try {
      await apiRequest('/customers/me', {
        method: 'PATCH',
        body: jsonBody(formData(event.currentTarget)),
      });
      setStatus('#customerStatus', 'Profile updated.');
      await loadCustomer();
    } catch (error) {
      setStatus('#customerStatus', error.message, true);
    }
  });

  $('#vehicleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    data.defaultVehicle = Boolean(data.defaultVehicle);
    setStatus('#customerStatus', 'Saving vehicle...');
    try {
      await apiRequest('/customer/vehicles', {
        method: 'POST',
        body: jsonBody(data),
      });
      event.currentTarget.reset();
      setStatus('#customerStatus', 'Vehicle saved.');
      await loadCustomer();
    } catch (error) {
      setStatus('#customerStatus', error.message, true);
    }
  });

  $('#bookingForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    data.startTime = toIso(data.startTime);
    data.endTime = toIso(data.endTime);
    data.serviceIds = [];
    setStatus('#customerStatus', 'Creating booking...');
    try {
      const booking = await apiRequest('/customer/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: jsonBody(data),
      });
      setStatus('#customerStatus', `Booking ${booking.bookingCode || booking.id} created.`);
      await loadCustomer();
    } catch (error) {
      setStatus('#customerStatus', error.message, true);
    }
  });
}

async function loadStaff() {
  const current = await requireRole('STAFF');
  if (!current) {
    return;
  }

  try {
    const [summary, lots, bookings] = await Promise.all([
      apiRequest('/staff/dashboard/summary'),
      apiPage('/staff/parking-lots'),
      apiPage('/staff/bookings'),
    ]);

    setText('#staffAvailable', summary.available);
    setText('#staffReserved', summary.reserved);
    setText('#staffOverdue', summary.overdue);
    setText('#staffRevenue', money(summary.revenue, summary.currency || 'VND'));

    renderList('#staffLotList', lots.items, (lot) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(lot.name)}</h3>
          <p>${escapeHtml(lot.address)}</p>
        </div>
        <div class="pill-row">
          <span class="pill">${escapeHtml(lot.status)}</span>
          <button class="ghost-button" type="button" data-select-lot="${escapeHtml(lot.id)}">Configure</button>
        </div>
      </article>
    `);

    renderList('#staffBookingList', bookings.items, (booking) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(booking.bookingCode || booking.id)}</h3>
          <p>${escapeHtml(booking.startTime)} to ${escapeHtml(booking.endTime)}</p>
        </div>
        <span class="pill">${escapeHtml(booking.status)}</span>
      </article>
    `);

    $all('[data-select-lot]').forEach((button) => {
      button.addEventListener('click', () => {
        $all('[name="parkingLotId"]').forEach((input) => {
          input.value = button.dataset.selectLot;
        });
      });
    });
  } catch (error) {
    setStatus('#staffStatus', error.message, true);
  }
}

function bindStaffForms() {
  $('#staffLotForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#staffStatus', 'Creating parking lot...');
    try {
      await apiRequest('/staff/parking-lots', {
        method: 'POST',
        body: jsonBody(formData(event.currentTarget)),
      });
      event.currentTarget.reset();
      setStatus('#staffStatus', 'Parking lot created as draft.');
      await loadStaff();
    } catch (error) {
      setStatus('#staffStatus', error.message, true);
    }
  });

  $('#capacityForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#staffStatus', 'Updating capacity...');
    try {
      await apiRequest(`/staff/parking-lots/${data.parkingLotId}/capacities/${data.vehicleType}`, {
        method: 'PUT',
        body: jsonBody({ totalCapacity: Number(data.totalCapacity), version: data.version ? Number(data.version) : null }),
      });
      setStatus('#staffStatus', 'Capacity updated.');
    } catch (error) {
      setStatus('#staffStatus', error.message, true);
    }
  });

  $('#pricingForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#staffStatus', 'Saving pricing rule...');
    try {
      await apiRequest(`/staff/parking-lots/${data.parkingLotId}/pricing-rules`, {
        method: 'PUT',
        body: jsonBody({
          vehicleType: data.vehicleType,
          hourlyRate: Number(data.hourlyRate),
          active: data.active === 'on',
          version: data.version ? Number(data.version) : null,
        }),
      });
      setStatus('#staffStatus', 'Pricing rule saved.');
    } catch (error) {
      setStatus('#staffStatus', error.message, true);
    }
  });

  $('#serviceForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#staffStatus', 'Creating service...');
    try {
      await apiRequest(`/staff/parking-lots/${data.parkingLotId}/services`, {
        method: 'POST',
        body: jsonBody({
          name: data.name,
          price: Number(data.price),
          active: data.active === 'on',
          version: data.version ? Number(data.version) : null,
        }),
      });
      setStatus('#staffStatus', 'Service created.');
    } catch (error) {
      setStatus('#staffStatus', error.message, true);
    }
  });

  $('#policyForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#staffStatus', 'Saving policy...');
    try {
      await apiRequest(`/staff/parking-lots/${data.parkingLotId}/policies`, {
        method: 'PUT',
        body: jsonBody({
          policyKey: data.policyKey,
          policyValue: data.policyValue,
          version: data.version ? Number(data.version) : null,
        }),
      });
      setStatus('#staffStatus', 'Policy saved.');
    } catch (error) {
      setStatus('#staffStatus', error.message, true);
    }
  });

  $('#promotionForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#staffStatus', 'Creating promotion...');
    try {
      await apiRequest(`/staff/parking-lots/${data.parkingLotId}/promotions`, {
        method: 'POST',
        body: jsonBody({
          code: data.code,
          name: data.name,
          discountAmount: Number(data.discountAmount),
          active: data.active === 'on',
          startsAt: toIso(data.startsAt),
          endsAt: toIso(data.endsAt),
          version: data.version ? Number(data.version) : null,
        }),
      });
      setStatus('#staffStatus', 'Promotion created.');
    } catch (error) {
      setStatus('#staffStatus', error.message, true);
    }
  });
}

let adminUsersCache = [];
let adminUsersPagination = null;
let adminStaffCache = [];
let adminStaffPagination = null;

function filteredAdminUsers() {
  const search = normalizeFilterValue($('#adminUserSearch')?.value);
  const role = $('#adminRoleFilter')?.value || '';
  const status = $('#adminStatusFilter')?.value || '';

  return adminUsersCache.filter((user) => {
    const haystack = normalizeFilterValue([
      user.id,
      user.email,
      user.phone,
      user.role,
      user.status,
    ].join(' '));

    return (!search || haystack.includes(search))
      && (!role || user.role === role)
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
        <td colspan="6">
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

    return `
      <tr class="${escapeHtml(userStatusClass)}">
        <td>
          <div class="admin-user-cell">
            <span class="admin-user-avatar${mutedAvatar}">${escapeHtml(userInitials(user))}</span>
            <div>
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(user.phone || user.email || 'No contact')}</span>
            </div>
          </div>
        </td>
        <td>${escapeHtml(user.id)}</td>
        <td><span class="admin-role-badge ${escapeHtml(String(user.role || '').toLowerCase())}">${escapeHtml(user.role || 'USER')}</span></td>
        <td><span class="admin-user-status ${escapeHtml(userStatusClass)}">${escapeHtml(statusName)}</span></td>
        <td>${escapeHtml(formatDate(user.updatedAt || user.createdAt))}</td>
        <td>
          <div class="admin-user-row-actions">
            <button type="button" title="Edit status" data-admin-fill-user="${escapeHtml(user.id)}" data-admin-user-status="${escapeHtml(statusName)}" data-admin-user-version="${escapeHtml(user.version)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5 0 9 5.5 9 7s-4 7-9 7-9-5.5-9-7 4-7 9-7Zm0 2c-3.7 0-6.8 3.8-7 5 .2 1.2 3.3 5 7 5s6.8-3.8 7-5c-.2-1.2-3.3-5-7-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>
            </button>
            <button type="button" title="Copy user ID" data-admin-copy-user="${escapeHtml(user.id)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1Zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H8V7h11v14Z" /></svg>
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
  $('#adminRoleFilter')?.addEventListener('change', refreshAdminUserTable);
  $('#adminStatusFilter')?.addEventListener('change', refreshAdminUserTable);
}

function bindAdminUserActions() {
  $all('[data-admin-fill-user]').forEach((button) => {
    button.addEventListener('click', () => {
      const form = $('#userStatusForm');
      if (!form) {
        return;
      }

      form.querySelector('[name="userId"]').value = button.dataset.adminFillUser;
      form.querySelector('[name="status"]').value = button.dataset.adminUserStatus || 'ACTIVE';
      form.querySelector('[name="expectedVersion"]').value = button.dataset.adminUserVersion || '';
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
}

function filteredAdminStaff() {
  const search = normalizeFilterValue($('#adminStaffSearch')?.value);
  const status = $('#adminStaffStatusFilter')?.value || '';

  return adminStaffCache.filter((staff) => {
    const haystack = normalizeFilterValue([
      staff.id,
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
  const isPending = statusClass(statusName) === 'pending';

  if (isPending) {
    return `
      <button class="admin-staff-approve" type="button" data-admin-staff-command="approve" data-staff-id="${escapeHtml(staff.id)}">
        Approve
      </button>
      <button class="admin-staff-reject" type="button" data-admin-staff-command="reject" data-staff-id="${escapeHtml(staff.id)}" data-staff-version="${escapeHtml(staff.version)}">
        Reject
      </button>
    `;
  }

  return `
    <button type="button" title="Copy staff ID" data-admin-copy-staff="${escapeHtml(staff.id)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1Zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H8V7h11v14Z" /></svg>
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

    return `
      <tr class="${escapeHtml(staffStatusClass)}">
        <td>
          <div class="admin-staff-member">
            <span class="admin-staff-avatar${mutedAvatar}">${escapeHtml(userInitials(staff))}</span>
            <div>
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(staff.phone || staff.email || 'No contact')}</span>
            </div>
          </div>
        </td>
        <td>${escapeHtml(staff.id)}</td>
        <td><span class="admin-staff-lot-chip">No assigned lots in admin API</span></td>
        <td><span class="admin-staff-status ${escapeHtml(staffStatusClass)}">${escapeHtml(statusName)}</span></td>
        <td><div class="admin-staff-actions">${staffActions(staff)}</div></td>
      </tr>
    `;
  }).join('');

  if (cards) {
    cards.innerHTML = items.map((staff) => {
      const statusName = staff.status || 'ACTIVE';
      const staffStatusClass = statusClass(statusName);
      return `
        <article class="admin-staff-card ${escapeHtml(staffStatusClass)}">
          <div class="admin-staff-card-head">
            <div class="admin-staff-member">
              <span class="admin-staff-avatar">${escapeHtml(userInitials(staff))}</span>
              <div>
                <strong>${escapeHtml(userDisplayName(staff))}</strong>
                <span>${escapeHtml(staff.id)}</span>
              </div>
            </div>
            <span class="admin-staff-status ${escapeHtml(staffStatusClass)}">${escapeHtml(statusName)}</span>
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

function openStaffModal() {
  const modal = $('#staffModal');
  if (!modal) {
    return;
  }

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

function bindAdminStaffControls() {
  $('#adminStaffSearch')?.addEventListener('input', refreshAdminStaffTable);
  $('#adminStaffStatusFilter')?.addEventListener('change', refreshAdminStaffTable);

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
}

function bindAdminStaffActions() {
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

  const activeCount = items.filter((booking) => ['CHECKED_IN', 'OVERDUE', 'CONFIRMED'].includes(booking.status)).length;
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
    const [summary, users] = await Promise.all([
      apiRequest('/admin/dashboard/summary'),
      apiPage('/admin/users'),
    ]);

    setText('#adminUsers', summary.totalUsers);
    setText('#adminLots', summary.activeParkingLots);
    setText('#adminPending', summary.pendingApprovals);
    setText('#adminRevenue', money(summary.revenue));

    adminUsersCache = users.items || [];
    adminUsersPagination = users.pagination || null;
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
    setStatus('#adminStatus', 'Creating staff account...');
    try {
      await apiRequest('/admin/staff', {
        method: 'POST',
        body: jsonBody(formData(event.currentTarget)),
      });
      event.currentTarget.reset();
      closeStaffModal();
      setStatus('#adminStatus', 'Staff account created.');
      await reloadAdminPage();
    } catch (error) {
      setStatus('#adminStatus', error.message, true);
    }
  });

  $('#userStatusForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#adminStatus', 'Updating user status...');
    try {
      await apiRequest(`/admin/users/${data.userId}/status`, {
        method: 'PATCH',
        body: jsonBody({
          status: data.status,
          reason: data.reason,
          expectedVersion: data.expectedVersion ? Number(data.expectedVersion) : null,
        }),
      });
      setStatus('#adminStatus', 'User status updated.');
      await reloadAdminPage();
    } catch (error) {
      setStatus('#adminStatus', error.message, true);
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

if (page === 'customer') {
  bindCustomerForms();
  loadCustomer();
}

if (page === 'staff') {
  bindStaffForms();
  loadStaff();
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
