import {
  apiPage,
  apiRequest,
  clearSession,
  getStoredAccount,
  jsonBody,
  saveSession,
} from './api.js';

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

function bindLogout() {
  $all('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', () => {
      clearSession();
      window.location.href = '/auth.html';
    });
  });
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
      const role = auth.account?.role;
      window.location.href = role === 'ADMIN' ? '/admin.html' : role === 'STAFF' ? '/staff.html' : '/customer.html';
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
  await loadIdentity();
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
  await loadIdentity();

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

async function loadAdmin() {
  await loadIdentity();

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

    renderList('#adminUserList', users.items, (user) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(user.email || user.phone || user.id)}</h3>
          <p>${escapeHtml(user.role)} - ${escapeHtml(user.status)}</p>
        </div>
        <span class="pill">v${escapeHtml(user.version)}</span>
      </article>
    `);

    renderList('#adminPendingLots', pendingLots.items, (lot) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(lot.name)}</h3>
          <p>${escapeHtml(lot.address)}</p>
        </div>
        <span class="pill">${escapeHtml(lot.status)}</span>
      </article>
    `);

    renderList('#adminBookingList', bookings.items, (booking) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(booking.bookingCode || booking.id)}</h3>
          <p>${escapeHtml(booking.startTime)} to ${escapeHtml(booking.endTime)}</p>
        </div>
        <span class="pill">${escapeHtml(booking.status)}</span>
      </article>
    `);

    renderList('#adminRefundList', refunds.items, (refund) => `
      <article class="data-row">
        <div>
          <h3>${escapeHtml(refund.id)}</h3>
          <p>${escapeHtml(refund.status || 'Pending')}</p>
        </div>
        <span class="pill">${money(refund.amount)}</span>
      </article>
    `);
  } catch (error) {
    setStatus('#adminStatus', error.message, true);
  }
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
      setStatus('#adminStatus', 'Staff account created.');
      await loadAdmin();
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
      await loadAdmin();
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
      await loadAdmin();
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
      await loadAdmin();
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
  bindAdminForms();
  loadAdmin();
}
