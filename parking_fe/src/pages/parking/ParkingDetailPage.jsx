import { PageShell } from '../../components/PageShell.jsx';

const parkingDetailPage = {
  title: 'ParkFinder | Premium Parking Details',
  bodyClass: '',
  pageKey: '',
  markup: `
    <div class="app-shell flow">
      <header class="topbar detail-topbar">
        <a class="brand" href="/" aria-label="ParkFinder">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>ParkFinder</span>
        </a>

        <nav class="nav-links" aria-label="Primary navigation">
          <a class="active" href="/">Find Parking</a>
          <a href="/customer.html">Reservations</a>
          <a href="/staff.html">Dashboard</a>
        </nav>

        <div class="top-actions detail-top-actions">
          <a class="avatar-link" href="/auth.html" aria-label="Sign in">
            <img src="/assets/garage-premium.svg" alt="" />
          </a>
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
              <div class="detail-two-column">
                <div>
                  <h3>Hourly Rates by Vehicle</h3>
                  <div class="detail-table-wrap">
                    <table class="detail-table detail-rate-table">
                      <tbody id="pricingRulesBody">
                        <tr>
                          <td>Loading pricing rules</td>
                          <td>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3>Amenities & Services</h3>
                  <div class="amenity-grid" id="amenityGrid">
                    <div class="amenity-item">Loading amenities</div>
                  </div>
                </div>
              </div>
            </section>

            <section class="detail-section detail-reviews">
              <h2>Reviews & Ratings</h2>
              <div class="review-layout">
                <div class="review-score-card">
                  <strong>4.9</strong>
                  <div aria-hidden="true">*****</div>
                  <span>Reviews API pending</span>
                </div>
                <div class="review-list">
                  <article>
                    <div><strong>Customer review</strong><span>Sample</span></div>
                    <p>Review data exists in the database, but this public detail page still needs a public reviews endpoint.</p>
                  </article>
                  <article>
                    <div><strong>Parking experience</strong><span>Sample</span></div>
                    <p>The current page uses backend parking lot identity, address, coordinates, status, hourly rate, and update metadata.</p>
                  </article>
                </div>
              </div>
            </section>
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

              <div class="booking-duration">
                <h3>Select Duration</h3>
                <div class="booking-time-picker" data-booking-picker="checkin">
                  <button class="booking-time-card" type="button" data-booking-picker-trigger="checkin">
                  <span>Check-in</span>
                  <strong id="bookingCheckIn">Today, 2:00 PM</strong>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z" />
                  </svg>
                  </button>
                  <div class="booking-picker-popover" data-booking-picker-popover="checkin">
                    <label>
                      <span>Date</span>
                      <input id="bookingCheckInDate" type="date" />
                    </label>
                    <label>
                      <span>Time</span>
                      <input id="bookingCheckInTime" type="time" step="900" />
                    </label>
                  </div>
                </div>
                <div class="booking-time-picker" data-booking-picker="checkout">
                  <button class="booking-time-card" type="button" data-booking-picker-trigger="checkout">
                  <span>Check-out</span>
                  <strong id="bookingCheckOut">Today, 6:00 PM</strong>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z" />
                  </svg>
                  </button>
                  <div class="booking-picker-popover" data-booking-picker-popover="checkout">
                    <label>
                      <span>Date</span>
                      <input id="bookingCheckOutDate" type="date" />
                    </label>
                    <label>
                      <span>Time</span>
                      <input id="bookingCheckOutTime" type="time" step="900" />
                    </label>
                  </div>
                </div>
              </div>

              <div class="booking-price-breakdown">
                <div><span id="bookingParkingFeeLabel">Parking Fee (4 hrs)</span><strong id="bookingParkingFee">-</strong></div>
                <div><span>Service Fee</span><strong id="bookingServiceFee">-</strong></div>
                <div><span>Discount</span><strong id="bookingDiscount">-</strong></div>
                <div><span>Tax</span><strong id="bookingTax">-</strong></div>
                <div class="booking-total-row"><span>Total Amount</span><strong id="bookingTotal">-</strong></div>
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
                Free cancellation up to 1 hour before check-in.
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
