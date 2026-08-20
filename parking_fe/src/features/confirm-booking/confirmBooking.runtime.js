import {
  apiRequest,
  getParkingLotDetail,
  getParkingLotServices,
  jsonBody,
  searchParkingLots,
} from '../../services/api.js';

const previewLot = {
  id: 'sample-financial-plaza',
  name: 'Metro Central Plaza',
  address: '452 Broadway, New York, NY 10013',
  status: 'ACTIVE',
};

const elements = {
  form: document.querySelector('#confirmBookingForm'),
  returnLink: document.querySelector('#returnLink'),
  lotName: document.querySelector('#lotName'),
  lotStatus: document.querySelector('#lotStatus'),
  lotAddress: document.querySelector('#lotAddress'),
  startTime: document.querySelector('#startTime'),
  endTime: document.querySelector('#endTime'),
  vehicleId: document.querySelector('#vehicleId'),
  deliveryMethod: document.querySelector('#deliveryMethod'),
  paymentMethod: document.querySelector('#paymentMethod'),
  promotionCode: document.querySelector('#promotionCode'),
  selectedPaymentLabel: document.querySelector('#selectedPaymentLabel'),
  availableCapacity: document.querySelector('#availableCapacity'),
  additionalServicesGrid: document.querySelector('#additionalServicesGrid'),
  deliveryChoices: document.querySelectorAll('input[name="deliveryMethodChoice"]'),
  paymentChoices: document.querySelectorAll('input[name="paymentMethodChoice"]'),
  parkingFee: document.querySelector('#parkingFee'),
  serviceFee: document.querySelector('#serviceFee'),
  pickupFee: document.querySelector('#pickupFee'),
  discount: document.querySelector('#discount'),
  platformFee: document.querySelector('#platformFee'),
  tax: document.querySelector('#tax'),
  totalPrice: document.querySelector('#totalPrice'),
  confirmButton: document.querySelector('#confirmButton'),
};

let currentLot = null;
let previewTimer = null;
const PAID_SERVICE_PRICES = {
  'car wash': 10000,
  'ev charging': 50000,
};
const initialServiceIds = new Set(new URLSearchParams(window.location.search).getAll('serviceIds'));

function getParkingLotId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('parkingLotId') || params.get('id');
}

function getQueryDate(name) {
  const value = new URLSearchParams(window.location.search).get(name);
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeServiceName(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s/_-]+/g, ' ');
}

function formatServiceName(value) {
  const name = String(value || '').trim();
  if (!name) {
    return 'Additional service';
  }

  const normalized = normalizeServiceName(name);
  if (normalized.includes('ev') || normalized.includes('electric')) {
    return 'EV Charging';
  }

  if (normalized.includes('wash')) {
    return 'Car Wash';
  }

  return name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPaidSelectableService(service) {
  return Object.prototype.hasOwnProperty.call(PAID_SERVICE_PRICES, normalizeServiceName(formatServiceName(service?.name)));
}

function serviceDisplayPrice(service) {
  const configuredPrice = PAID_SERVICE_PRICES[normalizeServiceName(formatServiceName(service?.name))];
  return Number.isFinite(configuredPrice) ? configuredPrice : Number(service?.price || 0);
}

function setButtonState(label, disabled = false) {
  elements.confirmButton.disabled = disabled;
  elements.confirmButton.textContent = label;
}

function formatMoney(money) {
  if (!money || money.amount === undefined || money.amount === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency || 'VND',
    maximumFractionDigits: 2,
  }).format(Number(money.amount));
}

function formatOptionalMoney(money) {
  const amount = Number(money?.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return '-';
  }

  return formatMoney(money);
}

function moneyAmount(money) {
  const amount = Number(money?.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function formatServicePrice(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Free';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatVndAmount(value) {
  const amount = Number(value);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTimeForInput(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function seedTimes() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setHours(end.getHours() + 4);

  const queryStart = getQueryDate('startTime');
  const queryEnd = getQueryDate('endTime');
  const seededStart = queryStart || start;
  const seededEnd = queryEnd && queryEnd > seededStart ? queryEnd : end;

  elements.startTime.value = formatDateTimeForInput(seededStart);
  elements.endTime.value = formatDateTimeForInput(seededEnd);
}

function renderLot(lot) {
  currentLot = lot;
  setText(elements.lotName, lot.name || 'Unnamed parking lot');
  setText(elements.lotStatus, lot.status || '-');
  setText(elements.lotAddress, lot.address || 'Address not available');
  updateReturnLink();
}

function updateReturnLink() {
  if (currentLot?.id && !String(currentLot.id).startsWith('sample-')) {
    const returnUrl = new URL('/parking-detail.html', window.location.origin);
    returnUrl.searchParams.set('id', currentLot.id);

    if (elements.startTime.value) {
      returnUrl.searchParams.set('startTime', toIso(elements.startTime.value));
    }

    if (elements.endTime.value) {
      returnUrl.searchParams.set('endTime', toIso(elements.endTime.value));
    }

    getSelectedServiceIds().forEach((serviceId) => {
      returnUrl.searchParams.append('serviceIds', serviceId);
    });

    elements.returnLink.href = `${returnUrl.pathname}${returnUrl.search}`;
  }
}

function renderAvailability(availableCapacity) {
  if (!elements.availableCapacity) {
    return;
  }

  if (availableCapacity === undefined || availableCapacity === null) {
    setText(elements.availableCapacity, 'Checking available spots for your selected time.');
    return;
  }

  const available = Number(availableCapacity);
  if (!Number.isFinite(available)) {
    setText(elements.availableCapacity, 'Availability is being calculated.');
    return;
  }

  setText(
    elements.availableCapacity,
    available <= 0
      ? 'No spots remaining for your selected time.'
      : `${available} spots remaining for your selected time.`,
  );
}

function renderPriceBreakdown(preview) {
  const priceBreakdown = preview?.priceBreakdown;
  const selectedServiceFee = getSelectedServiceFeeAmount();
  setText(elements.parkingFee, formatMoney(priceBreakdown?.parkingFee));
  if (selectedServiceFee > 0) {
    setText(elements.serviceFee, formatVndAmount(selectedServiceFee));
  } else if (priceBreakdown?.serviceFee && Number(priceBreakdown.serviceFee.amount) > 0) {
    setText(elements.serviceFee, formatMoney(priceBreakdown.serviceFee));
  } else {
    renderSelectedServiceFee();
  }
  setText(elements.pickupFee, formatOptionalMoney(priceBreakdown?.pickupFee));
  setText(elements.discount, formatOptionalMoney(priceBreakdown?.discount));
  setText(elements.platformFee, formatOptionalMoney(priceBreakdown?.platformFee));
  setText(elements.tax, formatOptionalMoney(priceBreakdown?.tax));
  if (selectedServiceFee > 0 && priceBreakdown) {
    const total = moneyAmount(priceBreakdown.parkingFee)
      + selectedServiceFee
      + moneyAmount(priceBreakdown.pickupFee)
      + moneyAmount(priceBreakdown.platformFee)
      + moneyAmount(priceBreakdown.tax)
      - moneyAmount(priceBreakdown.discount);
    setText(elements.totalPrice, formatVndAmount(total));
  } else {
    setText(elements.totalPrice, formatMoney(priceBreakdown?.total));
  }
  renderAvailability(preview?.availableCapacity);
}

function getSelectedServiceIds() {
  return [...document.querySelectorAll('input[name="serviceIds"]:checked')]
    .map((input) => input.value)
    .filter(Boolean);
}

function getSelectedServiceFeeAmount() {
  return [...document.querySelectorAll('input[name="serviceIds"]:checked')]
    .reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);
}

function renderSelectedServiceFee() {
  const amount = getSelectedServiceFeeAmount();
  setText(elements.serviceFee, amount > 0 ? formatVndAmount(amount) : '-');
}

function buildBookingRequest() {
  const payload = {
    parkingLotId: currentLot?.id,
    vehicleId: elements.vehicleId.value,
    startTime: toIso(elements.startTime.value),
    endTime: toIso(elements.endTime.value),
    deliveryMethod: elements.deliveryMethod.value,
    serviceIds: getSelectedServiceIds(),
    promotionCode: elements.promotionCode.value.trim() || null,
    paymentMethod: elements.paymentMethod?.value || 'BANK_TRANSFER',
  };

  if (!payload.parkingLotId || String(payload.parkingLotId).startsWith('sample-')) {
    throw new Error('Open this page from a backend parking lot before confirming.');
  }

  if (!payload.vehicleId) {
    throw new Error('Select a vehicle before confirming.');
  }

  if (!payload.startTime || !payload.endTime) {
    throw new Error('Select a valid check-in and check-out time.');
  }

  return payload;
}

async function loadLot() {
  const parkingLotId = getParkingLotId();

  if (parkingLotId && !parkingLotId.startsWith('sample-')) {
    renderLot(await getParkingLotDetail(parkingLotId));
    await loadAdditionalServices();
    return;
  }

  if (!parkingLotId) {
    try {
      const page = await searchParkingLots({ size: 1 });
      if (page.items[0]) {
        renderLot(page.items[0]);
        await loadAdditionalServices();
        return;
      }
    } catch (error) {
      // Keep the checkout visible with preview data.
    }
  }

  renderLot(previewLot);
  await loadAdditionalServices();
}

function renderAdditionalServices(services = []) {
  if (!elements.additionalServicesGrid) {
    return;
  }

  const additionalServices = services
    .filter((service) => service.active !== false && isPaidSelectableService(service));

  if (!additionalServices.length) {
    elements.additionalServicesGrid.innerHTML = '<div class="checkout-empty-services">No additional services from this parking lot.</div>';
    renderSelectedServiceFee();
    return;
  }

  elements.additionalServicesGrid.innerHTML = additionalServices.map((service) => `
    <label class="checkout-extra-option ${initialServiceIds.has(String(service.id)) ? 'active' : ''}">
      <input type="checkbox" name="serviceIds" value="${escapeHtml(service.id)}" data-price="${escapeHtml(serviceDisplayPrice(service))}" ${initialServiceIds.has(String(service.id)) ? 'checked' : ''} />
      <span>
        <strong>${escapeHtml(formatServiceName(service.name))}</strong>
        <small>Provided by this parking lot</small>
      </span>
      <b>${escapeHtml(formatServicePrice(serviceDisplayPrice(service)))}</b>
    </label>
  `).join('');

  elements.additionalServicesGrid.querySelectorAll('input[name="serviceIds"]').forEach((input) => {
    input.addEventListener('change', () => {
      input.closest('.checkout-extra-option')?.classList.toggle('active', input.checked);
      renderSelectedServiceFee();
      updateReturnLink();
      schedulePreview();
    });
  });

  renderSelectedServiceFee();
}

async function loadAdditionalServices() {
  if (!currentLot?.id || String(currentLot.id).startsWith('sample-')) {
    renderAdditionalServices([]);
    return;
  }

  try {
    renderAdditionalServices(await getParkingLotServices(currentLot.id));
  } catch (error) {
    if (elements.additionalServicesGrid) {
      elements.additionalServicesGrid.innerHTML = '<div class="checkout-empty-services">Unable to load additional services.</div>';
    }
  }
}

async function loadVehicles() {
  try {
    const vehicles = await apiRequest('/customer/vehicles');
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== 'INACTIVE');

    if (!activeVehicles.length) {
      elements.vehicleId.innerHTML = '<option value="">No active vehicles found</option>';
      setButtonState('Add a vehicle first', true);
      return;
    }

    elements.vehicleId.innerHTML = activeVehicles.map((vehicle) => `
      <option value="${vehicle.id}" ${vehicle.defaultVehicle ? 'selected' : ''}>
        ${vehicle.plateNumber} - ${vehicle.vehicleType}
      </option>
    `).join('');
  } catch (error) {
    elements.vehicleId.innerHTML = '<option value="">Sign in to load vehicles</option>';
    setButtonState('Sign in to continue', true);
  }
}

async function refreshPreview() {
  if (!currentLot || elements.confirmButton.disabled) {
    return;
  }

  try {
    const payload = buildBookingRequest();
    const preview = await apiRequest('/customer/bookings/preview', {
      method: 'POST',
      body: jsonBody(payload),
    });
    renderPriceBreakdown(preview);
    setButtonState('Confirm Booking');
  } catch (error) {
    renderPriceBreakdown(null);
  }
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 350);
}

function bindEvents() {
  elements.deliveryChoices.forEach((choice) => {
    choice.addEventListener('change', () => {
      if (!choice.checked) {
        return;
      }

      elements.deliveryMethod.value = choice.value;
      document.querySelectorAll('.checkout-delivery-card').forEach((card) => {
        card.classList.toggle('active', card.contains(choice));
      });
      elements.deliveryMethod.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  elements.paymentChoices.forEach((choice) => {
    choice.addEventListener('change', () => {
      if (!choice.checked) {
        return;
      }

      elements.paymentMethod.value = choice.value;
      document.querySelectorAll('.checkout-payment-card').forEach((card) => {
        card.classList.toggle('active', card.contains(choice));
      });
      elements.paymentMethod.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  [
    elements.vehicleId,
    elements.startTime,
    elements.endTime,
    elements.deliveryMethod,
    elements.paymentMethod,
    elements.promotionCode,
  ].forEach((element) => element.addEventListener('change', schedulePreview));

  [elements.startTime, elements.endTime].forEach((element) => element.addEventListener('change', updateReturnLink));

  elements.promotionCode.addEventListener('input', schedulePreview);
  elements.paymentMethod?.addEventListener('change', () => {
    if (!elements.selectedPaymentLabel || !elements.paymentMethod.options) {
      return;
    }

    setText(elements.selectedPaymentLabel, elements.paymentMethod.options[elements.paymentMethod.selectedIndex].text);
  });

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setButtonState('Processing...', true);

    try {
      const payload = buildBookingRequest();
      const booking = await apiRequest('/customer/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` },
        body: jsonBody(payload),
      });

      setButtonState(`Booking ${booking.bookingCode || 'created'}`, true);
      window.setTimeout(() => {
        window.location.href = '/customer.html#bookings';
      }, 900);
    } catch (error) {
      setButtonState(error.message, false);
    }
  });
}

seedTimes();
bindEvents();
Promise.all([loadLot(), loadVehicles()])
  .then(refreshPreview)
  .catch(() => {
    setButtonState('Unable to load checkout', true);
  });
