import { PageShell } from '../components/PageShell.jsx';
import { legacyPages } from '../pages/legacyPages.js';
import { getCurrentPageName, runtimeLoaders } from './routes.js';

function ensureDefaultParkingConfig() {
  window.PARKING_CONFIG = window.PARKING_CONFIG || {
    googleMapsApiKey: '',
    googleMapsMapId: '',
    defaultMapCenter: { lat: 21.0278, lng: 105.8342 },
    defaultMapZoom: 13,
  };
}

function loadRuntimeConfig() {
  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-parking-config]');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = '/config.js';
    script.async = true;
    script.dataset.parkingConfig = 'true';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}

async function beforeRuntimeLoad(pageName) {
  ensureDefaultParkingConfig();

  if (pageName === 'index.html') {
    await loadRuntimeConfig();
    ensureDefaultParkingConfig();
  }
}

export default function App() {
  const pageName = getCurrentPageName();
  const page = legacyPages[pageName] || legacyPages['index.html'];

  return (
    <PageShell
      beforeRuntimeLoad={() => beforeRuntimeLoad(pageName)}
      page={page}
      runtimeLoader={runtimeLoaders[pageName]}
    />
  );
}
