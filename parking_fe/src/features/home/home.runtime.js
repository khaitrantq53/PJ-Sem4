import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  apiRequest,
  clearSession,
  getStoredAccount,
  saveSession,
  searchParkingLots,
} from '../../services/api.js';

const SUGGESTED_LOT_LIMIT = 6;
const SEARCH_RADIUS_KM = 5;
const HANOI_CENTER = { lat: 21.0278, lng: 105.8342 };
const MAP_LAYERS = [
  {
    id: 'standard',
    label: 'Standard map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
  },
  {
    id: 'light',
    label: 'Light map',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
      subdomains: 'abcd',
    },
  },
];
const HANOI_SUGGESTED_COORDINATES = [
  { lat: 21.0287, lng: 105.8521 },
  { lat: 21.0358, lng: 105.8150 },
  { lat: 21.0245, lng: 105.8412 },
  { lat: 21.0067, lng: 105.8431 },
  { lat: 21.0410, lng: 105.8477 },
  { lat: 21.0194, lng: 105.7901 },
];

const demoLot = {
  id: 'sample-financial-plaza',
  name: 'Financial District Plaza',
  address: 'Hoan Kiem, Ha Noi',
  latitude: 21.0287,
  longitude: 105.8521,
  status: 'ACTIVE',
  price: 28000,
  distance: '0.2 km',
  eta: '4 min',
  rating: 4.8,
  reviews: 128,
  priceBands: [
    { label: '06:00 - 10:00', price: 28000 },
    { label: '10:00 - 17:00', price: 32000 },
    { label: '17:00 - 22:00', price: 36000 },
  ],
  tags: ['Demo lot', 'Covered parking', 'Booking ready'],
  image: '/assets/garage-premium.svg',
};

const state = {
  activeId: null,
  filter: null,
  lots: [],
  loadError: null,
  searchLocation: null,
  usingDemo: false,
  userLocation: null,
};

const mapState = {
  layerIndex: 1,
  map: null,
  markers: new Map(),
  searchMarker: null,
  searchRadius: null,
  ready: false,
  tileLayer: null,
};

const elements = {
  filterForm: document.querySelector('#filterForm'),
  searchCard: document.querySelector('#filterForm'),
  searchAdvancedPanel: document.querySelector('#searchAdvancedPanel'),
  addressInput: document.querySelector('#addressInput'),
  vehicleTypeInput: document.querySelector('#vehicleTypeInput'),
  maxPriceInput: document.querySelector('#maxPriceInput'),
  startTimeInput: document.querySelector('#startTimeInput'),
  endTimeInput: document.querySelector('#endTimeInput'),
  refreshButton: document.querySelector('#refreshButton'),
  nearMeButton: document.querySelector('#nearMeButton'),
  quickFilters: document.querySelectorAll('.quick-filters button'),
  parkingList: document.querySelector('#parkingList'),
  googleMap: document.querySelector('#googleMap'),
  mapLoader: document.querySelector('#mapLoader'),
  locateMapButton: document.querySelector('#locateMapButton'),
  mapTypeButton: document.querySelector('#mapTypeButton'),
  resultCount: document.querySelector('#resultCount'),
  apiStatus: document.querySelector('#apiStatus'),
  topActions: document.querySelector('.top-actions'),
};

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) {
    return 'Contact';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

function formatDateTimeForApi(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function getImageForIndex(index) {
  const images = [
    '/assets/garage-premium.svg',
    '/assets/open-lot.svg',
    '/assets/building-garage.svg',
  ];

  return images[index % images.length];
}

function mapBackendLot(lot, index) {
  const backendLatitude = parseCoordinate(lot.latitude);
  const backendLongitude = parseCoordinate(lot.longitude);
  const fallbackCoordinate = getHanoiSuggestedCoordinate(index);
  const hasVietnamCoordinate = isVietnamCoordinate(backendLatitude, backendLongitude);
  const latitude = hasVietnamCoordinate ? backendLatitude : fallbackCoordinate.lat;
  const longitude = hasVietnamCoordinate ? backendLongitude : fallbackCoordinate.lng;
  const price = normalizeMoneyValue(lot.hourlyRate ?? lot.price);
  const distanceKm = getLotDistanceKm(lot, latitude, longitude, index);

  return {
    id: lot.id,
    name: lot.name || 'Unnamed parking lot',
    address: lot.address || 'Address not updated',
    status: lot.status || 'ACTIVE',
    price,
    distance: formatDistanceKm(distanceKm),
    eta: formatArrivalMinutes(getEstimatedArrivalMinutes(distanceKm, index)),
    rating: getLotRating(lot, index),
    reviews: getLotReviewCount(lot, index),
    priceBands: getPriceBands(lot, price, index),
    tags: [
      lot.status === 'ACTIVE' ? 'Accepting vehicles' : lot.status,
      'Reservable',
      hasVietnamCoordinate ? 'Has coordinates' : 'Ha Noi area',
    ],
    image: getImageForIndex(index),
    latitude,
    longitude,
  };
}

function getHanoiSuggestedCoordinate(index) {
  return HANOI_SUGGESTED_COORDINATES[index % HANOI_SUGGESTED_COORDINATES.length];
}

function isVietnamCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= 8
    && latitude <= 24
    && longitude >= 102
    && longitude <= 110
  );
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeMoneyValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getLotDistanceKm(lot, latitude, longitude, index) {
  const backendDistance = Number(lot.distanceKm);
  if (Number.isFinite(backendDistance) && backendDistance >= 0) {
    return backendDistance;
  }

  const origin = state.searchLocation || state.userLocation;
  const distanceKm = origin && hasCoordinates({ latitude, longitude })
    ? calculateDistanceKm(origin.lat, origin.lng, latitude, longitude)
    : null;

  return Number.isFinite(distanceKm)
    ? distanceKm
    : 0.4 + index * 0.35;
}

function formatDistanceKm(distanceKm) {
  const number = Number(distanceKm);
  return Number.isFinite(number) ? `${number.toFixed(1)} km` : '-';
}

function getEstimatedArrivalMinutes(distanceKm, index) {
  const number = Number(distanceKm);
  if (!Number.isFinite(number)) {
    return Math.max(5, 6 + index * 3);
  }

  const averageUrbanSpeedKmh = 18;
  return Math.max(3, Math.round((number / averageUrbanSpeedKmh) * 60));
}

function formatArrivalMinutes(minutes) {
  const number = Number(minutes);
  if (!Number.isFinite(number)) {
    return '-';
  }

  return `${Math.round(number)} min`;
}

function getLotRating(lot, index) {
  const rating = Number(lot.averageRating ?? lot.rating ?? lot.reviewAverage);
  if (Number.isFinite(rating) && rating > 0) {
    return Math.min(5, rating).toFixed(1);
  }

  return (4.6 + (index % 4) * 0.1).toFixed(1);
}

function getLotReviewCount(lot, index) {
  const reviews = Number(lot.reviewCount ?? lot.reviews ?? lot.totalReviews);
  if (Number.isFinite(reviews) && reviews >= 0) {
    return Math.round(reviews);
  }

  return 86 + index * 17;
}

function getPriceBands(lot, basePrice, index) {
  const sourceBands = lot.priceBands || lot.pricingBands || lot.pricing?.bands;

  if (Array.isArray(sourceBands) && sourceBands.length) {
    return sourceBands
      .map((band) => ({
        label: band.label || band.timeRange || `${band.startTime || '--:--'} - ${band.endTime || '--:--'}`,
        price: normalizeMoneyValue(band.price ?? band.hourlyRate ?? band.rate),
      }))
      .filter((band) => band.price);
  }

  if (!basePrice) {
    return [];
  }

  const peakStep = 2000 + index * 500;

  return [
    { label: '06:00 - 10:00', price: basePrice },
    { label: '10:00 - 17:00', price: basePrice + peakStep },
    { label: '17:00 - 22:00', price: basePrice + peakStep * 2 },
  ];
}

function calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function defaultVehicleTypeForTimeSearch() {
  if (!elements.vehicleTypeInput.value && (elements.startTimeInput.value || elements.endTimeInput.value)) {
    elements.vehicleTypeInput.value = 'CAR';
  }
}

function getQueryFromForm() {
  const address = elements.addressInput.value.trim();
  const startTime = formatDateTimeForApi(elements.startTimeInput.value);
  const endTime = formatDateTimeForApi(elements.endTimeInput.value);
  let vehicleType = elements.vehicleTypeInput.value;

  if (!vehicleType && (startTime || endTime)) {
    vehicleType = 'CAR';
    elements.vehicleTypeInput.value = vehicleType;
  }

  const query = {
    vehicleType,
    maxPrice: elements.maxPriceInput.value,
    startTime,
    endTime,
  };

  if (state.searchLocation && normalizeSearchText(address) === state.searchLocation.query) {
    query.latitude = state.searchLocation.lat;
    query.longitude = state.searchLocation.lng;
    query.maxDistanceKm = SEARCH_RADIUS_KM;
  } else if (state.userLocation && !address) {
    query.latitude = state.userLocation.lat;
    query.longitude = state.userLocation.lng;
    query.maxDistanceKm = SEARCH_RADIUS_KM;
  } else if (address) {
    query.address = address;
  }

  return query;
}

function normalizeSearchText(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function applyQuickFilter(query) {
  if (state.filter === 'cheap') {
    query.maxPrice = query.maxPrice || '30000';
  }

  if (state.filter === 'ev') {
    query.vehicleType = 'ELECTRIC_CAR';
    elements.vehicleTypeInput.value = 'ELECTRIC_CAR';
  }

  return query;
}

function setStatus(text, offline = false) {
  if (!elements.apiStatus) {
    return;
  }

  elements.apiStatus.textContent = text;
  elements.apiStatus.classList.toggle('offline', offline);
}

function setSearchAdvancedExpanded(expanded) {
  if (!elements.searchCard || !elements.searchAdvancedPanel) {
    return;
  }

  const isExpanded = elements.searchCard.classList.contains('expanded');

  if (expanded === isExpanded) {
    return;
  }

  elements.searchCard.classList.toggle('expanded', expanded);
  elements.searchAdvancedPanel.setAttribute('aria-hidden', expanded ? 'false' : 'true');

  if (expanded) {
    elements.searchAdvancedPanel.style.height = '0px';
    window.requestAnimationFrame(() => {
      elements.searchAdvancedPanel.style.height = `${elements.searchAdvancedPanel.scrollHeight}px`;
    });
    return;
  }

  elements.searchAdvancedPanel.style.height = `${elements.searchAdvancedPanel.scrollHeight}px`;
  window.requestAnimationFrame(() => {
    elements.searchAdvancedPanel.style.height = '0px';
  });
}

function syncAddressInputState() {
  elements.addressInput.classList.toggle('has-value', Boolean(elements.addressInput.value.trim()));
}

function getAccountLabel(account) {
  return account?.email || account?.phone || account?.id || 'Customer';
}

function getAccountEmail(account) {
  return account?.email || account?.phone || 'customer@example.com';
}

function getAccountContact(account) {
  return account?.email || account?.phone || 'Email not updated';
}

function getAccountDisplayName(account) {
  const label = account?.fullName
    || account?.name
    || account?.displayName
    || account?.email?.replace(/@.*/, '')
    || account?.phone
    || 'Customer';

  return String(label)
    .split(/[._-]+/)
    .filter(Boolean)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(' ');
}

function getAccountInitials(account) {
  const label = getAccountDisplayName(account).replace(/@.*/, '');
  const pieces = label.split(/[.\-_\s]+/).filter(Boolean);
  const initials = pieces.length > 1
    ? `${pieces[0][0]}${pieces[1][0]}`
    : label.slice(0, 2);

  return initials.toUpperCase();
}

function getAccountMenuItems(account) {
  if (account?.role === 'ADMIN') {
    return [
      { href: '/admin-users.html', icon: accountMenuIcons.dashboard, label: 'User Management' },
      { href: '/admin-staff.html', icon: accountMenuIcons.users, label: 'Staff Management' },
      { href: '/admin-bookings.html', icon: accountMenuIcons.book, label: 'Bookings' },
    ];
  }

  if (account?.role === 'STAFF') {
    return [
      { href: '/staff.html', icon: accountMenuIcons.dashboard, label: 'Staff Dashboard' },
      { href: '/staff-parking-lots.html', icon: accountMenuIcons.vehicles, label: 'Parking Lots' },
      { href: '/staff-bookings.html', icon: accountMenuIcons.book, label: 'Bookings' },
    ];
  }

  return [
    { href: '/customer.html', icon: accountMenuIcons.dashboard, label: 'Active Bookings' },
    { href: '/customer-vehicles.html', icon: accountMenuIcons.vehicles, label: 'Vehicles' },
    { href: '/customer-profile.html', icon: accountMenuIcons.user, label: 'My Profile' },
  ];
}

const accountMenuIcons = {
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17ZM7.5 4A.5.5 0 0 0 7 4.5V17.1c.2-.1.3-.1.5-.1H18V4H7.5ZM4 4h1v18H4V4Z" /></svg>',
  card: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 4h16V7H4v2Zm0 3v5h16v-5H4Zm2 2h5v2H6v-2Z" /></svg>',
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z" /></svg>',
  life: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.3 6.3-3 3A3.9 3.9 0 0 0 12 10a3.9 3.9 0 0 0-3.3 1.3l-3-3A8 8 0 0 1 18.3 8.3ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm-8-4c0-.8.1-1.5.3-2.2l3 3A3.9 3.9 0 0 0 8.6 16l-3 3A8 8 0 0 1 4 12Zm4.3 6.3 3-3A3.9 3.9 0 0 0 12 16a3.9 3.9 0 0 0 3.3-1.3l3 3A8 8 0 0 1 8.3 18.3ZM18.4 19l-3-3A3.9 3.9 0 0 0 16 12c0-.3 0-.5-.1-.8l3-3A8 8 0 0 1 18.4 19Z" /></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h9v2H6v14h7v2H4V3Zm12.6 5.4L20.2 12l-3.6 3.6-1.4-1.4 1.2-1.2H10v-2h6.4l-1.2-1.2 1.4-1.4Z" /></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" /></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19.4 13.5.1-1.5-.1-1.5 2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A8 8 0 0 0 7 6L4.6 5 2.6 8.5l2 1.5-.1 1.5.1 1.5-2 1.5 2 3.5L7 17a8 8 0 0 0 2.6 1.5L10 21h4l.4-2.5A8 8 0 0 0 17 17l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" /></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z" /></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 13c-3.3 0-6 1.7-6 3.8V20h12v-3.2C14 14.7 11.3 13 8 13Zm8.5 1c-.9 0-1.8.2-2.6.5a4 4 0 0 1 2.1 3.4V20h6v-2.6c0-1.9-2.5-3.4-5.5-3.4Z" /></svg>',
  vehicles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a2 2 0 0 1 2 2v5h-2v-2H4v2H2v-5a2 2 0 0 1 2-2h1Zm2.1 0h9.8l-1.1-3.2a.8.8 0 0 0-.8-.6H9a.8.8 0 0 0-.8.6L7.1 11ZM6 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" /></svg>',
};

function renderSignedInHeader(account) {
  if (!elements.topActions) {
    return;
  }

  const accountName = getAccountDisplayName(account);
  const accountContact = getAccountContact(account);
  const initials = getAccountInitials(account);
  const menuItems = getAccountMenuItems(account);

  elements.topActions.innerHTML = `
    <div class="account-menu" data-account-menu>
      <button class="account-menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" data-account-menu-trigger>
        <span class="account-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
      </button>

      <div class="account-menu-content" role="menu" aria-hidden="true" data-account-menu-content>
        <div class="account-menu-label">
          <span class="account-avatar large" aria-hidden="true">${escapeHtml(initials)}</span>
          <span>
            <strong>${escapeHtml(accountName)}</strong>
            <small>${escapeHtml(accountContact)}</small>
          </span>
        </div>
        <hr />
        ${menuItems.map((item) => `<a class="account-menu-item" role="menuitem" href="${item.href}">${item.icon}<span>${escapeHtml(item.label)}</span></a>`).join('')}
        <hr />
        <button class="account-menu-item destructive" type="button" role="menuitem" data-action="logout">${accountMenuIcons.logout}<span>Log out</span></button>
      </div>
    </div>
  `;

  const menu = elements.topActions.querySelector('[data-account-menu]');
  const trigger = elements.topActions.querySelector('[data-account-menu-trigger]');
  const content = elements.topActions.querySelector('[data-account-menu-content]');

  const closeOnOutsideClick = (event) => {
    if (!menu?.contains(event.target)) {
      setOpen(false);
    }
  };

  const setOpen = (open) => {
    menu?.classList.toggle('open', open);
    trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
    content?.setAttribute('aria-hidden', open ? 'false' : 'true');

    if (open) {
      window.setTimeout(() => {
        document.addEventListener('click', closeOnOutsideClick);
      }, 0);
    } else {
      document.removeEventListener('click', closeOnOutsideClick);
    }
  };

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(!menu?.classList.contains('open'));
  });

  content?.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="logout"]')) {
      setOpen(false);
    }
  });

  elements.topActions.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
    clearSession();
    window.location.href = '/auth.html';
  });
}

async function hydrateHomeAuth() {
  const storedAccount = getStoredAccount();

  if (!storedAccount) {
    return;
  }

  renderSignedInHeader(storedAccount);

  try {
    const currentAccount = await apiRequest('/auth/me');
    let hydratedAccount = currentAccount;

    if (currentAccount.role === 'CUSTOMER') {
      try {
        const customerProfile = await apiRequest('/customers/me');
        hydratedAccount = {
          ...currentAccount,
          ...customerProfile,
          role: currentAccount.role,
          status: currentAccount.status,
        };
      } catch (profileError) {
        hydratedAccount = currentAccount;
      }
    }

    saveSession({ account: hydratedAccount });
    renderSignedInHeader(hydratedAccount);
  } catch (error) {
    // Keep the locally saved session visible when the backend is temporarily unavailable.
  }
}

function render() {
  const lots = state.lots;
  elements.parkingList.innerHTML = '';
  elements.parkingList.classList.toggle('parking-stack-list', lots.length > 1);
  elements.parkingList.style.setProperty('--stack-count', lots.length);

  if (!lots.length) {
    elements.parkingList.innerHTML = state.loadError
      ? `<div class="empty-state">${escapeHtml(state.loadError)}</div>`
      : '<div class="empty-state">No matching parking lots found in the backend.</div>';
    if (elements.resultCount) {
      elements.resultCount.textContent = '0 parking lots';
    }
    renderMapMarkers();
    return;
  }

  if (!state.activeId) {
    state.activeId = lots[0].id;
  }

  if (elements.resultCount) {
    elements.resultCount.textContent = state.usingDemo
      ? `${lots.length} demo parking lot`
      : `${lots.length} suggested parking lots`;
  }

  lots.forEach((lot, index) => {
    elements.parkingList.appendChild(createParkingCard(lot, index, lots.length));
  });

  renderMapMarkers();
}

function getMapFocusLabel() {
  if (state.searchLocation) {
    return state.searchLocation.label;
  }

  if (state.userLocation) {
    return 'Current location';
  }

  return 'Central area';
}

function createParkingCard(lot, index = 0, count = 1) {
  const card = document.createElement('article');
  const targetScale = Math.max(0.94, 1 - (count - index - 1) * 0.012);
  const priceBands = Array.isArray(lot.priceBands) ? lot.priceBands : [];
  card.className = `parking-card parking-stack-tone-${index % 6}${lot.id === state.activeId ? ' active' : ''}`;
  card.tabIndex = 0;
  card.dataset.id = lot.id;
  card.dataset.cardIndex = String(index + 1);
  card.style.setProperty('--stack-index', index);
  card.style.setProperty('--stack-scale', targetScale.toFixed(3));

  card.innerHTML = `
    <div class="parking-visual">
      <img src="${lot.image}" alt="Illustration for ${escapeHtml(lot.name)}" />
    </div>
    <div class="parking-body">
      <div class="parking-title-row">
        <h2>${escapeHtml(lot.name)}</h2>
        <div class="price">${lot.price ? formatCurrency(lot.price) : 'Contact'}<span>/hour</span></div>
      </div>
      <div class="parking-meta-row">
        <span class="rating-badge" aria-label="Rating ${escapeHtml(lot.rating)} out of 5">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2Z" />
          </svg>
          ${escapeHtml(lot.rating)} <small>(${escapeHtml(lot.reviews)} reviews)</small>
        </span>
        <span class="eta-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5h-2v6l5 3 .9-1.6-3.9-2.3V7Z" />
          </svg>
          ${escapeHtml(lot.eta)} to arrive
        </span>
      </div>
      <div class="parking-address">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
        </svg>
        <span>${escapeHtml(lot.address)}</span>
      </div>
      <div class="route-summary">
        <span>From current location</span>
        <strong>${escapeHtml(lot.distance)} - ${escapeHtml(lot.eta)}</strong>
      </div>
      ${priceBands.length ? `
        <div class="price-schedule" aria-label="Price by time">
          ${priceBands.map((band) => `
            <div>
              <span>${escapeHtml(band.label)}</span>
              <strong>${formatCurrency(band.price)}<small>/h</small></strong>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="parking-tags">
        ${lot.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="card-actions">
        <button class="primary-button" type="button" data-action="select">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h14a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2Zm0 2v10.8l4-2 4 2 4-2 2 1V6H5Zm3 3h8v2H8V9Zm0 4h6v2H8v-2Z" />
          </svg>
          Book now
        </button>
        <button class="directions-button" type="button" aria-label="Get directions" data-action="directions">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2 9 9-9 9-9-9 9-9Zm0 2.8L5.8 11 12 17.2l6.2-6.2L12 4.8ZM11 7h2v4h3l-4 4-4-4h3V7Z" />
          </svg>
        </button>
      </div>
    </div>
  `;

  card.addEventListener('click', () => selectLot(lot.id));
  card.querySelector('[data-action="select"]').addEventListener('click', (event) => {
    event.stopPropagation();
    window.location.href = `/parking-detail.html?id=${encodeURIComponent(lot.id)}`;
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectLot(lot.id);
    }
  });

  return card;
}

function shortPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'P';
  }

  if (number >= 1000) {
    return `${Math.round(number / 1000)}k`;
  }

  return String(number);
}

function selectLot(id, options = {}) {
  state.activeId = id;
  document.querySelectorAll('.parking-card').forEach((element) => {
    element.classList.toggle('active', element.dataset.id === id);
  });

  if (options.revealCard) {
    revealParkingCard(id);
  }

  updateMarkerSelection();

  const lot = state.lots.find((candidate) => candidate.id === id);
  if (lot && mapState.map && hasCoordinates(lot)) {
    mapState.map.panTo([lot.latitude, lot.longitude]);
    openInfoWindow(lot);
  }
}

function revealParkingCard(id) {
  const card = Array.from(document.querySelectorAll('.parking-card'))
    .find((element) => element.dataset.id === id);

  if (!card || !elements.parkingList) {
    return;
  }

  const targetTop = getCardScrollTop(card);

  elements.parkingList.scrollTo({
    behavior: 'smooth',
    top: targetTop,
  });

  card.classList.remove('map-selected');
  window.requestAnimationFrame(() => {
    card.classList.add('map-selected');
  });
  window.setTimeout(() => {
    card.classList.remove('map-selected');
  }, 900);
}

function getCardScrollTop(card) {
  const listRect = elements.parkingList.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const listStyle = window.getComputedStyle(elements.parkingList);
  const topPadding = Number.parseFloat(listStyle.paddingTop) || 0;
  const topInset = Math.max(10, topPadding);
  const currentTop = elements.parkingList.scrollTop;
  const rawTarget = currentTop + cardRect.top - listRect.top - topInset;
  const maxScrollTop = elements.parkingList.scrollHeight - elements.parkingList.clientHeight;

  return Math.max(0, Math.min(rawTarget, maxScrollTop));
}

async function resolveAddressSearch() {
  const address = elements.addressInput.value.trim();

  if (!address) {
    state.searchLocation = null;
    renderSearchTarget();
    return true;
  }

  const query = normalizeSearchText(address);

  if (state.searchLocation?.query === query) {
    return true;
  }

  setStatus('Locating address');
  setMapLoader('Locating address');

  try {
    const location = await geocodeAddress(address);
    state.searchLocation = {
      ...location,
      query,
      label: address,
    };
    state.userLocation = null;
    state.loadError = null;
    renderSearchTarget();
    setMapLoader('');

    if (mapState.map) {
      mapState.map.setView([location.lat, location.lng], 14);
    }

    return true;
  } catch (error) {
    state.searchLocation = null;
    state.lots = [];
    state.activeId = null;
    state.usingDemo = false;
    state.loadError = `Cannot locate "${address}". Try a more specific address in Ha Noi.`;
    setStatus('Address not found', true);
    setMapLoader('', false);
    renderSearchTarget();
    render();
    return false;
  }
}

async function geocodeAddress(address) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'vn');
  url.searchParams.set('accept-language', 'vi,en');
  url.searchParams.set('q', buildGeocodeQuery(address));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed with ${response.status}`);
  }

  const results = await response.json();
  const match = Array.isArray(results) ? results[0] : null;
  const lat = parseCoordinate(match?.lat);
  const lng = parseCoordinate(match?.lon);

  if (!match || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Address not found');
  }

  return {
    lat,
    lng,
    label: match.display_name,
  };
}

function buildGeocodeQuery(address) {
  const normalized = normalizeSearchText(address);
  const alreadyHasLocationScope = /\b(ha noi|hanoi|hà nội|viet nam|việt nam|vietnam)\b/i.test(normalized);

  return alreadyHasLocationScope ? address : `${address}, Hà Nội, Việt Nam`;
}

async function loadLots(source = 'form') {
  if (source !== 'near-me') {
    const searchReady = await resolveAddressSearch();

    if (!searchReady) {
      return;
    }
  }

  setStatus('Connecting');

  try {
    const page = await searchParkingLots(applyQuickFilter({
      ...getQueryFromForm(),
      size: SUGGESTED_LOT_LIMIT,
    }));
    const suggestedLots = page.items.slice(0, SUGGESTED_LOT_LIMIT);
    state.loadError = null;
    state.usingDemo = suggestedLots.length === 0 && !hasActiveSearchScope();
    state.lots = suggestedLots.length
      ? suggestedLots.map(mapBackendLot)
      : state.usingDemo ? [demoLot] : [];
    state.activeId = state.lots[0]?.id || null;
    setStatus(suggestedLots.length ? 'Online' : 'Demo data', suggestedLots.length === 0);
  } catch (error) {
    state.loadError = `Cannot load parking lots from backend: ${error.message}`;
    state.lots = [];
    state.activeId = null;
    state.usingDemo = false;
    setStatus('Offline', true);
  }

  render();
}

function hasActiveSearchScope() {
  return Boolean(
    state.searchLocation
    || state.userLocation
    || elements.addressInput.value.trim()
    || state.filter
    || elements.vehicleTypeInput.value
    || elements.maxPriceInput.value
    || elements.startTimeInput.value
    || elements.endTimeInput.value,
  );
}

function getMapConfig() {
  const config = window.PARKING_CONFIG || {};
  return {
    center: config.defaultMapCenter || HANOI_CENTER,
    zoom: Number(config.defaultMapZoom || 13),
  };
}

function setMapLoader(text, error = false) {
  elements.mapLoader.textContent = text;
  elements.mapLoader.classList.toggle('error', error);
  elements.mapLoader.classList.toggle('hidden', !text);
}

function createMapTileLayer(layerConfig) {
  return L.tileLayer(layerConfig.url, layerConfig.options);
}

function updateMapLayerButton() {
  if (!elements.mapTypeButton) {
    return;
  }

  const currentLayer = MAP_LAYERS[mapState.layerIndex] || MAP_LAYERS[0];
  const nextLayer = MAP_LAYERS[(mapState.layerIndex + 1) % MAP_LAYERS.length];
  elements.mapTypeButton.title = `Switch to ${nextLayer.label}`;
  elements.mapTypeButton.setAttribute('aria-label', `Switch to ${nextLayer.label}`);
  elements.mapTypeButton.dataset.mapLayer = currentLayer.id;
}

function setMapLayer(layerIndex) {
  if (!mapState.map) {
    return;
  }

  const nextIndex = layerIndex % MAP_LAYERS.length;
  const nextLayer = MAP_LAYERS[nextIndex];

  if (mapState.tileLayer) {
    mapState.tileLayer.remove();
  }

  mapState.layerIndex = nextIndex;
  mapState.tileLayer = createMapTileLayer(nextLayer).addTo(mapState.map);
  updateMapLayerButton();
}

function cycleMapLayer() {
  setMapLayer(mapState.layerIndex + 1);
}

async function initOpenStreetMap() {
  setMapLoader('Loading OpenStreetMap');

  try {
    const config = getMapConfig();
    mapState.map = L.map(elements.googleMap, {
      attributionControl: true,
      zoomControl: false,
    }).setView([config.center.lat, config.center.lng], config.zoom);

    setMapLayer(mapState.layerIndex);

    mapState.ready = true;
    setMapLoader('');
    renderMapMarkers();
  } catch (error) {
    setMapLoader(`Cannot load OpenStreetMap: ${error.message}`, true);
  }
}

function createParkingIcon(lot, active = false) {
  return L.divIcon({
    className: 'parking-map-marker-shell',
    html: `
      <button class="parking-map-marker${active ? ' active' : ''}" type="button" aria-label="Select ${escapeHtml(lot.name)}">
        <span>${lot.price ? shortPrice(lot.price) : 'P'}</span>
        <small>${lot.status === 'ACTIVE' ? 'ON' : 'OFF'}</small>
      </button>
    `,
    iconAnchor: [48, 56],
    iconSize: [96, 56],
    popupAnchor: [0, -52],
  });
}

function createSearchIcon() {
  return L.divIcon({
    className: 'search-map-marker-shell',
    html: `
      <span class="search-map-marker" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
        </svg>
      </span>
    `,
    iconAnchor: [18, 42],
    iconSize: [36, 42],
  });
}

function renderSearchTarget() {
  if (mapState.searchMarker) {
    mapState.searchMarker.remove();
    mapState.searchMarker = null;
  }

  if (mapState.searchRadius) {
    mapState.searchRadius.remove();
    mapState.searchRadius = null;
  }

  if (!mapState.ready || !mapState.map || !state.searchLocation) {
    return;
  }

  const position = [state.searchLocation.lat, state.searchLocation.lng];
  mapState.searchRadius = L.circle(position, {
    className: 'search-radius-circle',
    color: '#0A0A0A',
    fillColor: '#FFFAF0',
    fillOpacity: 0.22,
    opacity: 0.42,
    radius: SEARCH_RADIUS_KM * 1000,
    weight: 2,
  }).addTo(mapState.map);

  mapState.searchMarker = L.marker(position, {
    icon: createSearchIcon(),
    interactive: false,
    keyboard: false,
    zIndexOffset: 1000,
  }).addTo(mapState.map);
}

function renderMapMarkers() {
  if (!mapState.ready || !mapState.map) {
    return;
  }

  mapState.markers.forEach((marker) => marker.remove());
  mapState.markers.clear();

  const positionedLots = state.lots.filter(hasCoordinates);

  positionedLots.forEach((lot) => {
    const marker = L.marker([lot.latitude, lot.longitude], {
      icon: createParkingIcon(lot, lot.id === state.activeId),
    }).addTo(mapState.map);

    marker.on('click', () => {
      selectLot(lot.id, { revealCard: true });
      marker.openPopup();
    });
    mapState.markers.set(lot.id, marker);
  });

  renderSearchTarget();
  focusMapOnLots(positionedLots);
}

function updateMarkerSelection() {
  mapState.markers.forEach((marker, id) => {
    const lot = state.lots.find((candidate) => candidate.id === id);

    if (lot) {
      marker.setIcon(createParkingIcon(lot, id === state.activeId));
    }
  });
}

function focusMapOnLots(lots) {
  if (!mapState.map) {
    return;
  }

  if (state.searchLocation && mapState.searchRadius) {
    mapState.map.fitBounds(mapState.searchRadius.getBounds(), {
      maxZoom: 15,
      padding: [72, 72],
    });
    return;
  }

  if (!lots.length) {
    const config = getMapConfig();
    mapState.map.setView([config.center.lat, config.center.lng], config.zoom);
    return;
  }

  if (lots.length === 1) {
    mapState.map.setView([lots[0].latitude, lots[0].longitude], 15);
    return;
  }

  const bounds = L.latLngBounds(lots.map((lot) => [lot.latitude, lot.longitude]));
  mapState.map.fitBounds(bounds, {
    maxZoom: 15,
    padding: [96, 96],
  });
}

function openInfoWindow(lot) {
  if (!mapState.map || !hasCoordinates(lot)) {
    return;
  }

  const marker = mapState.markers.get(lot.id);
  const isActive = lot.status === 'ACTIVE';
  const content = `
    <div class="parking-info-window">
      <div class="parking-popup-head">
        <span class="parking-popup-pin">P</span>
        <div>
          <strong>${escapeHtml(lot.name)}</strong>
          <div class="parking-popup-chips">
            <span class="parking-popup-status ${isActive ? 'is-open' : 'is-offline'}">
              ${isActive ? 'Open now' : 'Offline'}
            </span>
            <span class="parking-popup-chip">
              ${lot.price ? `${formatCurrency(lot.price)}/h` : 'Contact'}
            </span>
            <span class="parking-popup-chip">
              ${lot.eta ? `${escapeHtml(lot.eta)} to arrive` : 'Nearby'}
            </span>
          </div>
        </div>
      </div>
      <p>${escapeHtml(lot.address)}</p>
    </div>
  `;

  if (marker) {
    marker.bindPopup(content, {
      className: 'parking-leaflet-popup',
      closeButton: false,
      offset: [0, -4],
    }).openPopup();
  }
}

function hasCoordinates(lot) {
  return Number.isFinite(lot.latitude) && Number.isFinite(lot.longitude);
}

function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      reject,
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  });
}

async function locateUser() {
  try {
    const location = await requestCurrentPosition();
    state.userLocation = location;
    state.searchLocation = null;
    elements.addressInput.value = '';
    syncAddressInputState();
    renderSearchTarget();
    if (mapState.map) {
      mapState.map.setView([location.lat, location.lng], 15);
    }
    await loadLots('near-me');
  } catch (error) {
    setStatus('Could not get current location', true);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return entities[character];
  });
}

function bindEvents() {
  elements.filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setSearchAdvancedExpanded(true);
    loadLots();
  });

  elements.addressInput.addEventListener('input', () => {
    syncAddressInputState();

    if (elements.addressInput.value.trim()) {
      return;
    }

    state.searchLocation = null;
    renderSearchTarget();
    setSearchAdvancedExpanded(false);
  });

  [elements.startTimeInput, elements.endTimeInput].forEach((input) => {
    input.addEventListener('input', defaultVehicleTypeForTimeSearch);
    input.addEventListener('change', defaultVehicleTypeForTimeSearch);
  });

  elements.refreshButton?.addEventListener('click', () => loadLots('refresh'));

  elements.nearMeButton.addEventListener('click', locateUser);
  elements.locateMapButton.addEventListener('click', locateUser);
  elements.mapTypeButton.addEventListener('click', () => {
    cycleMapLayer();
  });

  elements.quickFilters.forEach((button) => {
    button.addEventListener('click', () => {
      const nextFilter = button.dataset.filter;
      state.filter = state.filter === nextFilter ? null : nextFilter;
      elements.quickFilters.forEach((item) => {
        item.classList.toggle('active', item.dataset.filter === state.filter);
      });
      loadLots('quick-filter');
    });
  });
}

bindEvents();
syncAddressInputState();
hydrateHomeAuth();
initOpenStreetMap();
loadLots('initial');
