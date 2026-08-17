import { PageShell } from '../../components/PageShell.jsx';

const homePage = {
  title: 'ParkFinder | Home',
  bodyClass: '',
  pageKey: 'home',
  markup: `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="/" aria-label="ParkFinder">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M7 20V4h7.1c3.4 0 5.9 2.3 5.9 5.6s-2.5 5.7-5.9 5.7h-3.7V20H7Zm3.4-7.8h3.4c1.6 0 2.8-1 2.8-2.6S15.4 7 13.8 7h-3.4v5.2Z" />
            </svg>
          </span>
          <span>ParkFinder</span>
        </a>

        <div class="top-actions">
          <a class="ghost-button" href="/auth.html">Sign in</a>
        </div>
      </header>

      <main class="home-layout">
        <section class="results-panel" aria-label="Parking lot list">
          <form class="home-search-panel" id="filterForm">
            <div class="search-main-row">
              <label class="input-group search-field">
                <svg class="search-field-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m21 20.1-4.7-4.7a7.5 7.5 0 1 0-1.1 1.1l4.7 4.7 1.1-1.1ZM4.5 10.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
                </svg>
                <input id="addressInput" name="address" type="search" autocomplete="off" placeholder="Find parking lots near you" data-no-smooth-input="true" />
              </label>

              <div class="search-inline-actions">
                <button class="primary-button" type="submit">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m21 20.1-4.7-4.7a7.5 7.5 0 1 0-1.1 1.1l4.7 4.7 1.1-1.1ZM4.5 10.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
                  </svg>
                  Search
                </button>
                <button class="ghost-button" type="button" id="nearMeButton">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.9 3A9 9 0 0 0 13 3.1V1h-2v2.1A9 9 0 0 0 3.1 11H1v2h2.1A9 9 0 0 0 11 20.9V23h2v-2.1A9 9 0 0 0 20.9 13H23v-2h-2.1ZM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
                  </svg>
                  Near me
                </button>
              </div>
            </div>

            <div class="search-advanced-panel" id="searchAdvancedPanel" aria-hidden="true">
              <div class="field-row">
                <label class="input-group">
                  <span>Vehicle type</span>
                  <select id="vehicleTypeInput" name="vehicleType">
                    <option value="CAR">Car</option>
                    <option value="MOTORBIKE">Motorbike</option>
                  </select>
                </label>
                <label class="input-group">
                  <span>Service</span>
                  <select id="serviceInput" name="service">
                    <option value="">Any service</option>
                    <option value="EV Charging">EV Charging</option>
                    <option value="Car Wash">Car Wash</option>
                  </select>
                </label>
              </div>

              <div class="quick-filters" aria-label="Quick filters">
                <button type="button" data-filter="open">Open now</button>
              </div>
            </div>
          </form>

          <div class="parking-list" id="parkingList" aria-live="polite"></div>
        </section>

        <section class="map-stage" aria-label="Parking lot map">
          <div class="google-map" id="googleMap"></div>
          <div class="map-loader" id="mapLoader">Loading OpenStreetMap</div>

          <div class="map-controls" aria-label="Map controls">
            <button type="button" id="locateMapButton" aria-label="Current location">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.9 3A9 9 0 0 0 13 3.1V1h-2v2.1A9 9 0 0 0 3.1 11H1v2h2.1A9 9 0 0 0 11 20.9V23h2v-2.1A9 9 0 0 0 20.9 13H23v-2h-2.1ZM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
              </svg>
            </button>
            <button class="primary-map-button" type="button" id="mapTypeButton" aria-label="Switch map layer" title="Switch map layer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 2 9 5-9 5-9-5 9-5Zm-5 9.1-4 2.2 9 5 9-5-4-2.2-5 2.8-5-2.8Zm0 5-4 2.2 9 5 9-5-4-2.2-5 2.8-5-2.8Z" />
              </svg>
            </button>
          </div>
        </section>
      </main>
    </div>
  `,
};

export function HomePage(props) {
  return <PageShell {...props} page={homePage} />;
}
