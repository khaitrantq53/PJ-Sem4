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
  walk: '4 min walk',
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
  highContrast: false,
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
  zoomInButton: document.querySelector('#zoomInButton'),
  zoomOutButton: document.querySelector('#zoomOutButton'),
  locateMapButton: document.querySelector('#locateMapButton'),
  mapTypeButton: document.querySelector('#mapTypeButton'),
  resultCount: document.querySelector('#resultCount'),
  apiStatus: document.querySelector('#apiStatus'),
  mapFocus: document.querySelector('#mapFocus'),
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

  return {
    id: lot.id,
    name: lot.name || 'Unnamed parking lot',
    address: lot.address || 'Address not updated',
    status: lot.status || 'ACTIVE',
    price: lot.hourlyRate || lot.price || null,
    distance: getLotDistanceLabel(lot, latitude, longitude, index),
    walk: `${Math.max(4, 5 + index * 3)} min walk`,
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

function getLotDistanceLabel(lot, latitude, longitude, index) {
  if (lot.distanceKm) {
    return `${Number(lot.distanceKm).toFixed(1)} km`;
  }

  const origin = state.searchLocation || state.userLocation;
  const distanceKm = origin && hasCoordinates({ latitude, longitude })
    ? calculateDistanceKm(origin.lat, origin.lng, latitude, longitude)
    : null;

  return Number.isFinite(distanceKm)
    ? `${distanceKm.toFixed(1)} km`
    : `${(0.4 + index * 0.35).toFixed(1)} km`;
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

function getQueryFromForm() {
  const address = elements.addressInput.value.trim();
  const query = {
    vehicleType: elements.vehicleTypeInput.value,
    maxPrice: elements.maxPriceInput.value,
    startTime: formatDateTimeForApi(elements.startTimeInput.value),
    endTime: formatDateTimeForApi(elements.endTimeInput.value),
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

function getAccountInitials(account) {
  const label = getAccountLabel(account).replace(/@.*/, '');
  const pieces = label.split(/[.\-_\s]+/).filter(Boolean);
  const initials = pieces.length > 1
    ? `${pieces[0][0]}${pieces[1][0]}`
    : label.slice(0, 2);

  return initials.toUpperCase();
}

function renderSignedInHeader(account) {
  if (!elements.topActions) {
    return;
  }

  elements.topActions.innerHTML = `
    <a class="avatar-button home-avatar-link" href="/customer.html" title="${escapeHtml(getAccountLabel(account))}">
      ${escapeHtml(getAccountInitials(account))}
    </a>
    <button class="ghost-button" type="button" data-action="logout">Logout</button>
  `;

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
    saveSession({ account: currentAccount });
    renderSignedInHeader(currentAccount);
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

  elements.mapFocus.textContent = getMapFocusLabel();

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
      <div class="parking-address">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
        </svg>
        <span>${escapeHtml(lot.address)} - ${escapeHtml(lot.distance)} - ${escapeHtml(lot.walk)}</span>
      </div>
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

  const targetTop = getCardFlowTop(card);
  const stickyOffset = elements.parkingList.classList.contains('parking-stack-list')
    ? getStickyOffset(card)
    : 0;

  elements.parkingList.scrollTo({
    behavior: 'smooth',
    top: Math.max(0, targetTop - stickyOffset),
  });

  card.classList.remove('map-selected');
  window.requestAnimationFrame(() => {
    card.classList.add('map-selected');
  });
  window.setTimeout(() => {
    card.classList.remove('map-selected');
  }, 900);
}

function getCardFlowTop(card) {
  const siblings = Array.from(elements.parkingList.querySelectorAll('.parking-card'));
  const cardIndex = siblings.indexOf(card);

  if (cardIndex <= 0) {
    return 0;
  }

  return siblings.slice(0, cardIndex).reduce((total, sibling) => {
    const style = window.getComputedStyle(sibling);
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;

    return total + sibling.offsetHeight + marginBottom;
  }, 0);
}

function getStickyOffset(card) {
  const index = Number(card.dataset.cardIndex || 1) - 1;

  return 12 + Math.max(0, index) * 22;
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

  if (source === 'near-me') {
    elements.mapFocus.textContent = 'Current location';
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

async function initOpenStreetMap() {
  setMapLoader('Loading OpenStreetMap');

  try {
    const config = getMapConfig();
    mapState.map = L.map(elements.googleMap, {
      attributionControl: true,
      zoomControl: false,
    }).setView([config.center.lat, config.center.lng], config.zoom);

    mapState.tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapState.map);

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

    marker.on('click', () => selectLot(lot.id, { revealCard: true }));
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
  const content = `
    <div class="parking-info-window">
      <strong>${escapeHtml(lot.name)}</strong>
      <span>${escapeHtml(lot.address)}</span>
      <span>${lot.price ? `${formatCurrency(lot.price)}/hour` : 'Contact for pricing'}</span>
    </div>
  `;

  if (marker) {
    marker.bindPopup(content, {
      className: 'parking-leaflet-popup',
      closeButton: false,
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

  elements.refreshButton?.addEventListener('click', () => loadLots('refresh'));

  elements.nearMeButton.addEventListener('click', locateUser);
  elements.locateMapButton.addEventListener('click', locateUser);
  elements.zoomInButton.addEventListener('click', () => {
    if (mapState.map) {
      mapState.map.zoomIn();
    }
  });
  elements.zoomOutButton.addEventListener('click', () => {
    if (mapState.map) {
      mapState.map.zoomOut();
    }
  });
  elements.mapTypeButton.addEventListener('click', () => {
    if (mapState.map) {
      mapState.highContrast = !mapState.highContrast;
      elements.googleMap.classList.toggle('osm-high-contrast', mapState.highContrast);
    }
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
