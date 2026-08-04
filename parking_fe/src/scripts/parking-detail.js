import { getParkingLotDetail, searchParkingLots } from './api.js';

const previewLot = {
  id: 'sample-financial-plaza',
  name: 'Skyline Plaza Underground Parking',
  address: '452 Metropolitan Way, Financial District',
  latitude: 21.0287,
  longitude: 105.8521,
  status: 'ACTIVE',
  description: 'The Skyline Plaza parking facility offers premier, secure underground parking in the heart of the city. It is designed for drivers who prioritize safety, convenience, and a clear arrival flow.',
  version: 1,
  updatedAt: new Date().toISOString(),
};

let currentLot = null;

const elements = {
  status: document.querySelector('#detailStatus'),
  galleryBadge: document.querySelector('#galleryBadge'),
  lotName: document.querySelector('#lotName'),
  lotAddress: document.querySelector('#lotAddress'),
  lotDescription: document.querySelector('#lotDescription'),
  lotId: document.querySelector('#lotId'),
  lotStatus: document.querySelector('#lotStatus'),
  lotVersion: document.querySelector('#lotVersion'),
  lotUpdated: document.querySelector('#lotUpdated'),
  lotCoordinates: document.querySelector('#lotCoordinates'),
  bookingLotName: document.querySelector('#bookingLotName'),
  bookingAddress: document.querySelector('#bookingAddress'),
  bookingMeta: document.querySelector('#bookingMeta'),
  summaryStatus: document.querySelector('#summaryStatus'),
  summaryCoordinates: document.querySelector('#summaryCoordinates'),
  bookButton: document.querySelector('#bookButton'),
  directionsButton: document.querySelector('#directionsButton'),
};

function getLotId() {
  return new URLSearchParams(window.location.search).get('id');
}

function parseCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasCoordinates(lot) {
  return parseCoordinate(lot?.latitude) !== null && parseCoordinate(lot?.longitude) !== null;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatCoordinates(lot) {
  return hasCoordinates(lot)
    ? `${Number(lot.latitude).toFixed(6)}, ${Number(lot.longitude).toFixed(6)}`
    : 'Not provided';
}

function normalizeLot(lot) {
  return {
    ...lot,
    latitude: parseCoordinate(lot.latitude),
    longitude: parseCoordinate(lot.longitude),
    name: lot.name || 'Unnamed parking lot',
    address: lot.address || 'Address not available',
    status: lot.status || '-',
    description: lot.description || 'This parking lot is available in the ParkFinder network. Public backend data currently includes identity, address, coordinates, status, version, and update time.',
  };
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function renderDetail(lot, mode = 'Online') {
  currentLot = normalizeLot(lot);
  const coordinates = formatCoordinates(currentLot);

  setText(elements.lotName, currentLot.name);
  setText(elements.lotAddress, currentLot.address);
  setText(elements.lotDescription, currentLot.description);
  setText(elements.lotId, currentLot.id || '-');
  setText(elements.lotStatus, currentLot.status);
  setText(elements.lotVersion, currentLot.version ?? '-');
  setText(elements.lotUpdated, formatDate(currentLot.updatedAt));
  setText(elements.lotCoordinates, coordinates);
  setText(elements.bookingLotName, currentLot.name);
  setText(elements.bookingAddress, currentLot.address);
  setText(elements.summaryStatus, currentLot.status);
  setText(elements.summaryCoordinates, coordinates);
  setText(elements.status, currentLot.status === 'ACTIVE' ? 'Available Now' : currentLot.status);
  setText(elements.galleryBadge, currentLot.status === 'ACTIVE' ? 'Premium Spot' : currentLot.status);
  setText(elements.bookingMeta, mode);

  elements.status?.classList.toggle('offline', mode !== 'Online');
}

async function loadDetail() {
  const id = getLotId();

  if (id && !id.startsWith('sample-')) {
    const lot = await getParkingLotDetail(id);
    renderDetail(lot, 'Public detail');
    return;
  }

  if (!id) {
    try {
      const page = await searchParkingLots({ size: 1 });
      if (page.items[0]) {
        renderDetail(page.items[0], 'Public detail');
        return;
      }
    } catch (error) {
      // Fall through to preview data when the public list endpoint is unavailable.
    }
  }

  renderDetail(previewLot, 'Preview data');
}

function bindActions() {
  elements.bookButton?.addEventListener('click', () => {
    const target = currentLot?.id ? `/confirm-booking.html?parkingLotId=${encodeURIComponent(currentLot.id)}` : '/confirm-booking.html';
    window.location.href = target;
  });

  elements.directionsButton?.addEventListener('click', () => {
    if (hasCoordinates(currentLot)) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${currentLot.latitude},${currentLot.longitude}`, '_blank');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentLot?.address || 'parking')}`, '_blank');
  });
}

bindActions();
loadDetail().catch((error) => {
  setText(elements.status, error.message);
  elements.status?.classList.add('offline');
  renderDetail(previewLot, 'Preview data');
});
