import { PageShell } from '../../components/PageShell.jsx';

const confirmBookingPage = {
  title: 'ParkFinder | Secure Checkout',
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
          <a href="/">Find Parking</a>
          <a class="active" href="/customer.html">Reservations</a>
          <a href="/staff.html">Dashboard</a>
        </nav>

        <div class="top-actions detail-top-actions">
          <a class="avatar-link" href="/auth.html" aria-label="Sign in">
            <img src="/assets/garage-premium.svg" alt="" />
          </a>
        </div>
      </header>

      <main class="checkout-page checkout-redesign-page">
        <form class="checkout-grid checkout-redesign-grid" id="confirmBookingForm">
          <section class="checkout-main-column">
            <a class="return-link" href="/" id="returnLink">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 4 1.4 1.4L8.8 10H20v2H8.8l4.6 4.6L12 18 5 11l7-7Z" />
              </svg>
              Return to search
            </a>

            <div class="checkout-title-row">
              <h1>Confirm your booking</h1>
              <div class="checkout-hold-pill">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13 3a9 9 0 1 0 8.9 10H20a7 7 0 1 1-7-8V3Zm-1 4h2v6h5v2h-7V7Z" />
                </svg>
                Your slot is held for 10:00 minutes
              </div>
            </div>

            <div class="checkout-alert" id="availabilityAlert">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
              </svg>
              <div>
                <strong>Limited Availability:</strong>
                <span id="availableCapacity">Checking available spots for your selected time.</span>
              </div>
            </div>

            <section class="checkout-parking-card checkout-selected-lot">
              <div class="checkout-card-image">
                <img src="/assets/garage-premium.svg" alt="Selected parking garage" />
              </div>
              <div class="checkout-card-body">
                <div>
                  <div class="checkout-card-head">
                    <h2 id="lotName">Loading parking lot</h2>
                    <span id="lotStatus">Loading</span>
                  </div>
                  <p>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                    </svg>
                    <span id="lotAddress">Loading address...</span>
                  </p>
                </div>

                <div class="checkout-time-grid">
                  <label>
                    <span>Check In</span>
                    <input id="startTime" name="startTime" type="datetime-local" required />
                  </label>
                  <label>
                    <span>Check Out</span>
                    <input id="endTime" name="endTime" type="datetime-local" required />
                  </label>
                </div>
              </div>
            </section>

            <section class="checkout-options-card">
              <h3>Vehicle Details</h3>
              <label class="checkout-select-wrap">
                <select id="vehicleId" name="vehicleId" required>
                  <option value="">Loading vehicles...</option>
                </select>
                <span class="checkout-default-badge">Default</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 10 5 5 5-5H7Z" />
                </svg>
              </label>
            </section>

            <section class="checkout-options-card">
              <h3>Delivery Method</h3>
              <select class="checkout-native-select" id="deliveryMethod" name="deliveryMethod" required>
                <option value="SELF_DROP_OFF">Self drop off</option>
                <option value="PICKUP">Pickup</option>
              </select>
              <div class="checkout-delivery-grid" data-checkout-delivery-options>
                <label class="checkout-delivery-card active">
                  <input type="radio" name="deliveryMethodChoice" value="SELF_DROP_OFF" checked />
                  <span class="checkout-option-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 11h14l-1.5-4.5A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.9 1.5L5 11Zm-1 2v5h2v-2h12v2h2v-5H4Z" />
                    </svg>
                  </span>
                  <strong>Self drop-off</strong>
                  <small>Park it yourself</small>
                </label>
                <label class="checkout-delivery-card">
                  <input type="radio" name="deliveryMethodChoice" value="PICKUP" />
                  <span class="checkout-option-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.3-3.3 1.4-1.4L11 13.2l4.9-4.9 1.4 1.4L11 16Z" />
                    </svg>
                  </span>
                  <strong>Pickup (Valet)</strong>
                  <small>We park for you</small>
                </label>
              </div>
            </section>

            <section class="checkout-options-card">
              <h3>Additional Services</h3>
              <div class="checkout-extra-grid" id="additionalServicesGrid">
                <div class="checkout-empty-services">Loading additional services...</div>
              </div>
            </section>
          </section>

          <aside class="checkout-side-column">
            <section class="checkout-price-card">
              <h3>Price Summary</h3>
              <div class="price-lines">
                <div><span>Parking fee</span><strong id="parkingFee">-</strong></div>
                <div><span>Service fee</span><strong id="serviceFee">-</strong></div>
                <div><span>Platform fee</span><strong id="platformFee">-</strong></div>
                <div><span>Pickup fee</span><strong id="pickupFee">-</strong></div>
                <div><span>Tax</span><strong id="tax">-</strong></div>
                <div><span>Discount</span><strong id="discount">-</strong></div>
                <div class="price-total"><span>Total Amount</span><strong id="totalPrice">-</strong></div>
              </div>

              <div class="checkout-promo-row">
                <input id="promotionCode" name="promotionCode" placeholder="Promo code" />
                <button type="button">Apply</button>
              </div>

              <input id="paymentMethod" name="paymentMethod" type="hidden" value="QR" />

              <button class="checkout-confirm-button" id="confirmButton" type="submit">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17 9V7a5 5 0 0 0-10 0v2H5v13h14V9h-2Zm-8 0V7a3 3 0 0 1 6 0v2H9Z" />
                </svg>
                Confirm Booking
              </button>
              <p class="secure-note">
                Secured by Enterprise SSL Encryption
              </p>
            </section>
          </aside>
        </form>
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

export function ConfirmBookingPage(props) {
  return <PageShell {...props} page={confirmBookingPage} />;
}
