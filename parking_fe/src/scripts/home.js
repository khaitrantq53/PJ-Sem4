import { searchParkingLots } from './api.js';

const sampleLots = [
  {
    id: 'sample-financial-plaza',
    name: 'Financial District Plaza',
    address: 'Hoan Kiem, Ha Noi',
    latitude: 21.0287,
    longitude: 105.8521,
    status: 'ACTIVE',
    price: 28000,
    distance: '0.2 km',
    walk: '4 min walk',
    tags: ['High availability', 'Covered parking', '24/7 cameras'],
    image: './src/assets/garage-premium.svg',
  },
  {
    id: 'sample-mission-bay',
    name: 'Mission Bay Open Lot',
    address: 'Ba Dinh, Ha Noi',
    latitude: 21.0367,
    longitude: 105.8342,
    status: 'ACTIVE',
    price: 18000,
    distance: '0.8 km',
    walk: '9 min walk',
    tags: ['Outdoor lot', 'Motorbike', 'Fast payment'],
    image: './src/assets/open-lot.svg',
  },
  {
    id: 'sample-union-square',
    name: 'Union Square Garage',
    address: 'Dong Da, Ha Noi',
    latitude: 21.0124,
    longitude: 105.8272,
    status: 'ACTIVE',
    price: 24000,
    distance: '1.1 km',
    walk: '15 min walk',
    tags: ['EV charging', 'Security', 'Reservable'],
    image: './src/assets/building-garage.svg',
  },
];

const state = {
  activeId: null,
  filter: null,
  lots: [],
  usingFallback: false,
  userLocation: null,
};

const mapState = {
  customMarkerClass: null,
  infoWindow: null,
  isSatellite: false,
  map: null,
  markers: new Map(),
  ready: false,
  scriptPromise: null,
};

const elements = {
  topSearchForm: document.querySelector('#topSearchForm'),
  topSearch: document.querySelector('#topSearch'),
  filterForm: document.querySelector('#filterForm'),
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
    './src/assets/garage-premium.svg',
    './src/assets/open-lot.svg',
    './src/assets/building-garage.svg',
  ];

  return images[index % images.length];
}

function mapBackendLot(lot, index) {
  const latitude = parseCoordinate(lot.latitude);
  const longitude = parseCoordinate(lot.longitude);

  return {
    id: lot.id,
    name: lot.name || 'Unnamed parking lot',
    address: lot.address || 'Address not updated',
    status: lot.status || 'ACTIVE',
    price: lot.hourlyRate || lot.price || null,
    distance: lot.distanceKm ? `${Number(lot.distanceKm).toFixed(1)} km` : `${(0.4 + index * 0.35).toFixed(1)} km`,
    walk: `${Math.max(4, 5 + index * 3)} min walk`,
    tags: [
      lot.status === 'ACTIVE' ? 'Accepting vehicles' : lot.status,
      'Reservable',
      latitude !== null && longitude !== null ? 'Has coordinates' : 'Verified address',
    ],
    image: getImageForIndex(index),
    latitude,
    longitude,
  };
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getQueryFromForm() {
  const query = {
    address: elements.addressInput.value.trim(),
    vehicleType: elements.vehicleTypeInput.value,
    maxPrice: elements.maxPriceInput.value,
    startTime: formatDateTimeForApi(elements.startTimeInput.value),
    endTime: formatDateTimeForApi(elements.endTimeInput.value),
  };

  if (state.userLocation && !query.address) {
    query.latitude = state.userLocation.lat;
    query.longitude = state.userLocation.lng;
    query.maxDistanceKm = 5;
  }

  return query;
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
  elements.apiStatus.textContent = text;
  elements.apiStatus.classList.toggle('offline', offline);
}

function render() {
  const lots = state.lots;
  elements.parkingList.innerHTML = '';

  if (!lots.length) {
    elements.parkingList.innerHTML = '<div class="empty-state">No matching parking lots found.</div>';
    elements.resultCount.textContent = '0 parking lots';
    renderMapMarkers();
    return;
  }

  if (!state.activeId) {
    state.activeId = lots[0].id;
  }

  elements.resultCount.textContent = state.usingFallback
    ? `${lots.length} suggested parking lots`
    : `${lots.length} parking lots from the system`;

  elements.mapFocus.textContent = elements.addressInput.value.trim() || 'Central area';

  lots.forEach((lot) => {
    elements.parkingList.appendChild(createParkingCard(lot));
  });

  renderMapMarkers();
}

function createParkingCard(lot) {
  const card = document.createElement('article');
  card.className = `parking-card${lot.id === state.activeId ? ' active' : ''}`;
  card.tabIndex = 0;
  card.dataset.id = lot.id;

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
          View details
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

function selectLot(id) {
  state.activeId = id;
  document.querySelectorAll('.parking-card').forEach((element) => {
    element.classList.toggle('active', element.dataset.id === id);
  });

  updateMarkerSelection();

  const lot = state.lots.find((candidate) => candidate.id === id);
  if (lot && mapState.map && hasCoordinates(lot)) {
    mapState.map.panTo({ lat: lot.latitude, lng: lot.longitude });
    openInfoWindow(lot);
  }
}

async function loadLots(source = 'form') {
  setStatus('Connecting');

  try {
    const page = await searchParkingLots(applyQuickFilter(getQueryFromForm()));
    state.usingFallback = page.items.length === 0;
    state.lots = page.items.length ? page.items.map(mapBackendLot) : sampleLots;
    state.activeId = state.lots[0]?.id || null;
    setStatus(page.items.length ? 'Online' : 'No data yet', page.items.length === 0);
  } catch (error) {
    state.usingFallback = true;
    state.lots = sampleLots;
    state.activeId = state.lots[0].id;
    setStatus('Offline', true);
  }

  if (source === 'near-me') {
    elements.mapFocus.textContent = 'Current location';
  }

  render();
}

function getMapConfig() {
  const config = window.PARKING_CONFIG || {};
  return {
    apiKey: config.googleMapsApiKey || '',
    mapId: config.googleMapsMapId || '',
    center: config.defaultMapCenter || { lat: 21.0278, lng: 105.8342 },
    zoom: Number(config.defaultMapZoom || 13),
  };
}

function setMapLoader(text, error = false) {
  elements.mapLoader.textContent = text;
  elements.mapLoader.classList.toggle('error', error);
  elements.mapLoader.classList.toggle('hidden', !text);
}

function loadGoogleMaps() {
  const config = getMapConfig();

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!config.apiKey) {
    return Promise.reject(new Error('Missing GOOGLE_MAPS_API_KEY'));
  }

  if (mapState.scriptPromise) {
    return mapState.scriptPromise;
  }

  mapState.scriptPromise = new Promise((resolve, reject) => {
    const callbackName = `initParkingGoogleMaps_${Date.now()}`;
    const script = document.createElement('script');
    const url = new URL('https://maps.googleapis.com/maps/api/js');

    url.searchParams.set('key', config.apiKey);
    url.searchParams.set('callback', callbackName);
    url.searchParams.set('v', 'weekly');

    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    script.src = url.toString();
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error('Cannot load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return mapState.scriptPromise;
}

async function initGoogleMap() {
  setMapLoader('Loading Google Maps');

  try {
    await loadGoogleMaps();
    const config = getMapConfig();
    mapState.map = new google.maps.Map(elements.googleMap, {
      center: config.center,
      clickableIcons: true,
      disableDefaultUI: true,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      mapId: config.mapId || undefined,
      mapTypeControl: false,
      mapTypeId: 'roadmap',
      streetViewControl: false,
      zoom: config.zoom,
      zoomControl: false,
    });
    mapState.infoWindow = new google.maps.InfoWindow();
    mapState.ready = true;
    setMapLoader('');
    renderMapMarkers();
  } catch (error) {
    setMapLoader('Google Maps API key is not configured', true);
  }
}

function getCustomMarkerClass() {
  if (mapState.customMarkerClass) {
    return mapState.customMarkerClass;
  }

  mapState.customMarkerClass = class ParkingMarker extends google.maps.OverlayView {
    constructor(lot, onClick) {
      super();
      this.lot = lot;
      this.position = new google.maps.LatLng(lot.latitude, lot.longitude);
      this.element = document.createElement('button');
      this.element.type = 'button';
      this.element.className = 'parking-map-marker';
      this.element.dataset.id = lot.id;
      this.element.setAttribute('aria-label', `Select ${lot.name}`);
      this.element.innerHTML = `<span>${lot.price ? shortPrice(lot.price) : 'P'}</span><small>${lot.status === 'ACTIVE' ? 'ON' : 'OFF'}</small>`;
      this.element.addEventListener('click', () => onClick(lot.id));
    }

    onAdd() {
      this.getPanes().overlayMouseTarget.appendChild(this.element);
    }

    draw() {
      const projection = this.getProjection();
      const point = projection.fromLatLngToDivPixel(this.position);

      if (point) {
        this.element.style.left = `${point.x}px`;
        this.element.style.top = `${point.y}px`;
      }
    }

    onRemove() {
      this.element.remove();
    }

    setActive(active) {
      this.element.classList.toggle('active', active);
    }
  };

  return mapState.customMarkerClass;
}

function renderMapMarkers() {
  if (!mapState.ready || !mapState.map) {
    return;
  }

  mapState.markers.forEach((marker) => marker.setMap(null));
  mapState.markers.clear();

  const Marker = getCustomMarkerClass();
  const positionedLots = state.lots.filter(hasCoordinates);

  positionedLots.forEach((lot) => {
    const marker = new Marker(lot, selectLot);
    marker.setMap(mapState.map);
    marker.setActive(lot.id === state.activeId);
    mapState.markers.set(lot.id, marker);
  });

  focusMapOnLots(positionedLots);
}

function updateMarkerSelection() {
  mapState.markers.forEach((marker, id) => {
    marker.setActive(id === state.activeId);
  });
}

function focusMapOnLots(lots) {
  if (!mapState.map) {
    return;
  }

  if (!lots.length) {
    mapState.map.setCenter(getMapConfig().center);
    mapState.map.setZoom(getMapConfig().zoom);
    return;
  }

  if (lots.length === 1) {
    mapState.map.setCenter({ lat: lots[0].latitude, lng: lots[0].longitude });
    mapState.map.setZoom(15);
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  lots.forEach((lot) => bounds.extend({ lat: lot.latitude, lng: lot.longitude }));
  mapState.map.fitBounds(bounds, 96);
}

function openInfoWindow(lot) {
  if (!mapState.infoWindow || !mapState.map || !hasCoordinates(lot)) {
    return;
  }

  mapState.infoWindow.setContent(`
    <div class="parking-info-window">
      <strong>${escapeHtml(lot.name)}</strong>
      <span>${escapeHtml(lot.address)}</span>
      <span>${lot.price ? `${formatCurrency(lot.price)}/hour` : 'Contact for pricing'}</span>
    </div>
  `);
  mapState.infoWindow.setPosition({ lat: lot.latitude, lng: lot.longitude });
  mapState.infoWindow.open(mapState.map);
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
    elements.addressInput.value = '';
    elements.topSearch.value = '';
    if (mapState.map) {
      mapState.map.panTo(location);
      mapState.map.setZoom(15);
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
    loadLots();
  });

  elements.topSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.addressInput.value = elements.topSearch.value;
    loadLots('top-search');
  });

  elements.refreshButton.addEventListener('click', () => loadLots('refresh'));

  elements.nearMeButton.addEventListener('click', locateUser);
  elements.locateMapButton.addEventListener('click', locateUser);
  elements.zoomInButton.addEventListener('click', () => {
    if (mapState.map) {
      mapState.map.setZoom((mapState.map.getZoom() || getMapConfig().zoom) + 1);
    }
  });
  elements.zoomOutButton.addEventListener('click', () => {
    if (mapState.map) {
      mapState.map.setZoom((mapState.map.getZoom() || getMapConfig().zoom) - 1);
    }
  });
  elements.mapTypeButton.addEventListener('click', () => {
    if (mapState.map) {
      mapState.isSatellite = !mapState.isSatellite;
      mapState.map.setMapTypeId(mapState.isSatellite ? 'satellite' : 'roadmap');
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
initGoogleMap();
loadLots('initial');
