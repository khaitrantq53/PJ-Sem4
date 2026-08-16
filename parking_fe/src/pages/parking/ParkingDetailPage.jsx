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
                <span class="detail-zone" id="detailZone">Downtown Core</span>
                <span class="detail-status-pill" id="galleryBadge">Loading</span>
                <span class="detail-id-pill">ID: <span id="lotId">-</span></span>
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

              <div class="detail-system-meta">
                <span>Version: <strong id="lotVersion">-</strong></span>
                <span>Updated: <strong id="lotUpdated">-</strong></span>
              </div>
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
                      <tbody>
                        <tr>
                          <td>Car</td>
                          <td id="pricingCarRate">Loading</td>
                        </tr>
                        <tr>
                          <td>Electric car</td>
                          <td id="pricingElectricRate">Loading</td>
                        </tr>
                        <tr>
                          <td>Motorbike</td>
                          <td id="pricingMotorbikeRate">Loading</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3>Capacity Status</h3>
                  <div class="capacity-panel">
                    <div class="capacity-topline">
                      <span>Total Capacity</span>
                      <strong>Backend availability pending</strong>
                    </div>
                    <div class="capacity-bar" aria-hidden="true"><span></span></div>
                    <div class="capacity-mini-grid">
                      <div><strong>Car</strong><span>Use availability API</span></div>
                      <div><strong>EV</strong><span>Use availability API</span></div>
                      <div><strong>Bike</strong><span>Use availability API</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="detail-section">
              <div class="detail-two-column">
                <div>
                  <h2>Amenities & Services</h2>
                  <div class="amenity-grid">
                    <div class="amenity-item">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10v9h2l-4 11H5l2-20Zm2 2L7.5 20h6l2.9-8H15V4H9Zm2 2h2v3h-2V6Z" /></svg>
                      EV Charging
                    </div>
                    <div class="amenity-item">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z" /></svg>
                      24/7 Security
                    </div>
                    <div class="amenity-item">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-1 2h2v5h4l4 7-1.7 1-3.4-6H13v3h-2V7Z" /></svg>
                      Handicap Access
                    </div>
                    <div class="amenity-item">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a2 2 0 0 1 2 2v18H5V4a2 2 0 0 1 2-2Zm2 9 3-4 3 4h-2v5h-2v-5H9Z" /></svg>
                      Elevator
                    </div>
                    <div class="amenity-item">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12H6a3 3 0 0 1-3-3V6Z" /></svg>
                      Touchless Pay
                    </div>
                    <div class="amenity-item">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18.5 8.5 15a5 5 0 0 1 7 0L12 18.5Zm0-5a8 8 0 0 0-5.7 2.4l-1.4-1.4a10 10 0 0 1 14.2 0l-1.4 1.4A8 8 0 0 0 12 13.5Z" /></svg>
                      Free WiFi
                    </div>
                  </div>
                </div>

                <div>
                  <h2>Operating Hours</h2>
                  <div class="hours-list">
                    <div><span>Monday - Friday</span><strong>24 Hours</strong></div>
                    <div><span>Saturday</span><strong>24 Hours</strong></div>
                    <div><span>Sunday</span><strong class="closed">Closed</strong></div>
                  </div>
                </div>
              </div>
            </section>

            <section class="detail-section">
              <h2>Policies & Instructions</h2>
              <div class="detail-policy-box">
                <ul>
                  <li>License plate recognition is used for smoother entry.</li>
                  <li>Please keep your booking code available when checking in.</li>
                  <li>Overtime and extension rules are calculated by backend booking APIs.</li>
                  <li>Cancellation/refund rules should follow the active parking policy.</li>
                </ul>
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
                  <span class="booking-unit">Base rate / hour</span>
                </div>
                <div class="booking-availability">
                  <span id="detailStatus">Loading</span>
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
