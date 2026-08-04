import { apiRequest, getParkingLotDetail, jsonBody, searchParkingLots } from '../../services/api.js';

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

function getParkingLotId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('parkingLotId') || params.get('id');
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
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

  elements.startTime.value = formatDateTimeForInput(start);
  elements.endTime.value = formatDateTimeForInput(end);
}

function renderLot(lot) {
  currentLot = lot;
  setText(elements.lotName, lot.name || 'Unnamed parking lot');
  setText(elements.lotStatus, lot.status || '-');
  setText(elements.lotAddress, lot.address || 'Address not available');

  if (lot.id && !String(lot.id).startsWith('sample-')) {
    elements.returnLink.href = `/parking-detail.html?id=${encodeURIComponent(lot.id)}`;
  }
}

function renderPriceBreakdown(priceBreakdown) {
  setText(elements.parkingFee, formatMoney(priceBreakdown?.parkingFee));
  setText(elements.serviceFee, formatMoney(priceBreakdown?.serviceFee));
  setText(elements.pickupFee, formatMoney(priceBreakdown?.pickupFee));
  setText(elements.discount, formatMoney(priceBreakdown?.discount));
  setText(elements.platformFee, formatMoney(priceBreakdown?.platformFee));
  setText(elements.tax, formatMoney(priceBreakdown?.tax));
  setText(elements.totalPrice, formatMoney(priceBreakdown?.total));
}

function buildBookingRequest() {
  const payload = {
    parkingLotId: currentLot?.id,
    vehicleId: elements.vehicleId.value,
    startTime: toIso(elements.startTime.value),
    endTime: toIso(elements.endTime.value),
    deliveryMethod: elements.deliveryMethod.value,
    serviceIds: [],
    promotionCode: elements.promotionCode.value.trim() || null,
    paymentMethod: elements.paymentMethod.value,
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
    return;
  }

  if (!parkingLotId) {
    try {
      const page = await searchParkingLots({ size: 1 });
      if (page.items[0]) {
        renderLot(page.items[0]);
        return;
      }
    } catch (error) {
      // Keep the checkout visible with preview data.
    }
  }

  renderLot(previewLot);
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
    renderPriceBreakdown(preview.priceBreakdown);
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
  [
    elements.vehicleId,
    elements.startTime,
    elements.endTime,
    elements.deliveryMethod,
    elements.paymentMethod,
    elements.promotionCode,
  ].forEach((element) => element.addEventListener('change', schedulePreview));

  elements.promotionCode.addEventListener('input', schedulePreview);
  elements.paymentMethod.addEventListener('change', () => {
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
