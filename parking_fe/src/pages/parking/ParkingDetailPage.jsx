import { PageShell } from '../../components/PageShell.jsx';

const parkingDetailPage = {
  title: 'ParkFinder | Premium Parking Details',
  bodyClass: '',
  pageKey: 'parking-detail',
  markup: `
    <div class="app-shell flow">
      <header class="topbar detail-topbar">
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

      <main class="parking-detail-page">
        <section class="detail-content-grid detail-shell-grid">
          <div class="detail-info-column">
            <header class="detail-heading-block detail-hero-copy">
              <div class="detail-meta-row">
                <span class="detail-status-pill" id="galleryBadge">Loading</span>
              </div>

              <h1 id="lotName">Loading parking lot</h1>

              <div class="detail-address-row">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                </svg>
                <address id="lotAddress">Loading address...</address>
              </div>

              <div class="detail-address-row">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 2 4.2 9.8L22 14l-9.8 2.2L10 22l-2.2-5.8L2 14l5.8-2.2L12 2Z" />
                </svg>
                <span id="lotCoordinates">Not provided</span>
              </div>

              <p id="lotDescription">Loading details...</p>

            </header>

            <section class="detail-gallery" aria-label="Parking gallery">
              <div class="detail-gallery-main">
                <img src="/assets/garage-premium.svg" alt="Parking facility" />
              </div>
              <div class="detail-gallery-side">
                <div class="gallery-tile">
                  <img src="/assets/building-garage.svg" alt="Parking entrance" />
                </div>
                <button class="gallery-tile gallery-view-all" type="button" aria-label="View all photos">
                  <img src="/assets/open-lot.svg" alt="" />
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z" />
                    </svg>
                    View All
                  </span>
                </button>
              </div>
            </section>

            <section class="detail-section detail-pricing-capacity">
              <h2>Pricing & Capacity</h2>
              <div class="detail-rate-wide">
                <h3>Hourly Rates by Vehicle</h3>
                <div class="detail-hourly-rates-list staff-hourly-rates-list" id="pricingRulesBody">
                  <div class="empty-state">Loading pricing rules</div>
                </div>
              </div>
            </section>

            <div class="detail-lower-grid">
              <section class="detail-section detail-amenities">
                <div>
                  <h3>Amenities & Services</h3>
                  <div class="amenity-grid" id="amenityGrid">
                    <div class="amenity-item">Loading amenities</div>
                  </div>
                </div>
              </section>

              <section class="detail-section detail-reviews">
                <h3>Reviews & Ratings</h3>
                <div class="review-layout">
                  <div class="review-score-card">
                    <strong id="reviewAverage">-</strong>
                    <div id="reviewStars" aria-hidden="true">-----</div>
                    <span id="reviewCount">No reviews yet</span>
                  </div>
                  <div class="review-list" id="reviewList">
                    <article>
                      <div><strong>Loading reviews</strong><span>Please wait</span></div>
                      <p>Reviews from completed parking sessions will appear here.</p>
                    </article>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <aside class="booking-column">
            <div class="booking-card detail-booking-card">
              <div class="booking-topline">
                <div>
                  <span class="booking-price" id="baseHourlyRate">Loading</span>
                </div>
                <div class="booking-availability">
                  <small id="detailSpotHint">24 standard spots left</small>
                </div>
              </div>

              <div class="booking-hold-info">
                <span class="material-symbols-outlined" aria-hidden="true">timer</span>
                <div>
                  <strong>20-minute check-in window</strong>
                  <small>Your spot is held after booking. Staff must check you in before it expires.</small>
                </div>
              </div>

              <div class="booking-vehicle">
                <label for="bookingVehicleId">Vehicle</label>
                <select id="bookingVehicleId">
                  <option value="">Loading your vehicles</option>
                </select>
              </div>

              <div class="booking-services">
                <h3>Additional Services</h3>
                <div class="booking-service-options" id="bookingServiceOptions">
                  <div class="booking-service-empty">Loading services</div>
                </div>
              </div>

              <button class="booking-confirm" id="bookButton" type="button">
                Book Now
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m13.2 5.3 5.7 5.7H3v2h15.9l-5.7 5.7 1.4 1.4L22.7 12l-8.1-8.1-1.4 1.4Z" />
                </svg>
              </button>

              <p>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 17h2v-6h-2v6Zm0-8h2V7h-2v2Zm1-7a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
                </svg>
                This booking expires automatically if staff does not check you in within 20 minutes.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <footer class="detail-footer">
        <div>
          <strong>ParkFinder</strong>
          <span>2024 ParkFinder Inc. All rights reserved.</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Support</a>
          <a href="#">For Partners</a>
        </nav>
      </footer>
    </div>
  `,
};

export function ParkingDetailPage(props) {
  return <PageShell {...props} page={parkingDetailPage} />;
}
