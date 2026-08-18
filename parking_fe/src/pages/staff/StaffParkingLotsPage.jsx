import { PageShell } from '../../components/PageShell.jsx';
import { createStaffPage } from './staffLayout.js';

const editIcon = '<span class="material-symbols-outlined" aria-hidden="true">edit</span>';
const serviceIcon = '<span class="material-symbols-outlined" aria-hidden="true">local_car_wash</span>';

const parkingLotsContent = `
  <header class="staff-lots-header">
    <div>
      <div class="staff-lots-kicker">
        <span class="staff-lot-state" id="staffLotSelectedStatus">Active</span>
        <span id="staffLotSelectedId">ID: -</span>
      </div>
      <h1 id="staffLotSelectedName">My Parking Lot</h1>
      <p id="staffLotSelectedDescription">Manage the parking facility assigned to this staff account.</p>
    </div>
    <button class="staff-lots-edit-button" type="button" data-action="open-staff-lot-modal">${editIcon}<span>Edit Details</span></button>
  </header>

  <span class="status-line staff-status-line" id="staffLotsStatus"></span>

  <div class="staff-lot-overview-layout">
    <div class="staff-lot-overview-main">
      <section class="staff-lot-section">
        <h2>Basic Information</h2>
        <div class="staff-basic-info-grid">
          <div><span>Parking Name</span><strong id="staffBasicName">-</strong></div>
          <div><span>Address</span><strong id="staffBasicAddress">-</strong></div>
          <div><span>Latitude</span><strong class="mono" id="staffBasicLatitude">-</strong></div>
          <div><span>Longitude</span><strong class="mono" id="staffBasicLongitude">-</strong></div>
          <div class="wide"><span>Description</span><p id="staffBasicDescription">-</p></div>
        </div>
      </section>

      <section class="staff-lot-section staff-lot-gallery-section">
        <h2>Parking Lot Images</h2>
        <div class="staff-lot-gallery" id="staffLotImageGallery">
          <div class="empty-state">No approved images yet.</div>
        </div>
      </section>

      <section class="staff-lot-section">
        <h2>Hourly Rates</h2>
        <div class="staff-hourly-rates-list" id="staffHourlyRates">
          <div class="empty-state">No pricing rules yet.</div>
        </div>
      </section>

    </div>

    <aside class="staff-lot-overview-aside">
      <section class="staff-lot-section staff-capacity-section">
        <h2>Slot Capacity</h2>
        <div class="staff-capacity-summary">
          <span>Total Slots</span>
          <strong id="staffCapacityTotal">0</strong>
        </div>
        <div class="staff-capacity-breakdown">
          <div>
            <span><i class="car-available"></i> Car available</span>
            <strong><em id="staffCapacityCarAvailable">0</em></strong>
          </div>
          <div>
            <span><i class="car-booked"></i> Car booked</span>
            <strong><em id="staffCapacityCarBooked">0</em></strong>
          </div>
          <div>
            <span><i class="motorbike-available"></i> Motorbike available</span>
            <strong><em id="staffCapacityMotorbikeAvailable">0</em></strong>
          </div>
          <div>
            <span><i class="motorbike-booked"></i> Motorbike booked</span>
            <strong><em id="staffCapacityMotorbikeBooked">0</em></strong>
          </div>
        </div>
      </section>

      <section class="staff-lot-section staff-amenities-section">
        <h2>Amenities</h2>
        <div class="staff-amenities-chips" id="staffAmenities">
          <span>${serviceIcon} No amenities yet</span>
        </div>
      </section>
    </aside>
  </div>

  <div class="staff-lot-modal hidden" id="staffLotEditModal" aria-hidden="true">
    <div class="staff-lot-modal-card" role="dialog" aria-modal="true" aria-labelledby="staffLotEditTitle">
      <div class="staff-lot-modal-head">
        <h2 id="staffLotEditTitle">Edit Parking Lot Details</h2>
        <button type="button" data-action="close-staff-lot-modal" aria-label="Close edit parking lot modal">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
        </button>
      </div>

      <form class="staff-lot-edit-form" id="staffParkingLotForm">
        <div class="staff-lot-modal-body">
          <div class="staff-lot-form-main-stack">
            <section class="staff-lot-form-section">
              <h3>Basic Information</h3>
              <div class="staff-lot-field-stack">
                <label class="staff-popup-field"><span>Parking Name</span><input name="name" type="text" required /></label>
                <label class="staff-popup-field"><span>Address</span><input name="address" type="text" required /></label>
                <div class="staff-popup-two-grid">
                  <label class="staff-popup-field"><span>Latitude</span><input name="latitude" type="text" /></label>
                  <label class="staff-popup-field"><span>Longitude</span><input name="longitude" type="text" /></label>
                </div>
                <label class="staff-popup-field"><span>Description</span><textarea name="description" rows="3"></textarea></label>
              </div>
            </section>

            <section class="staff-lot-form-section staff-popup-images-section">
              <div class="staff-popup-section-title-row">
                <div>
                  <h3>Parking Lot Images</h3>
                  <p>Upload up to 3 images for admin review.</p>
                </div>
                <button class="staff-image-upload-button" type="button" data-action="select-staff-lot-images">
                  <span class="material-symbols-outlined" aria-hidden="true">upload</span>
                  Upload Images
                </button>
              </div>
              <input id="staffLotImageInput" name="images" type="file" accept="image/*" multiple hidden />
              <div class="staff-lot-image-preview" id="staffLotImagePreview">
                <span>No images selected</span>
              </div>
            </section>

          </div>

          <div class="staff-lot-form-side-stack">
            <section class="staff-lot-form-section staff-popup-capacity-section">
              <h3>Slot Capacity</h3>
              <div class="staff-lot-capacity-fields">
                <label class="staff-popup-field"><span>Car slots</span><input name="capacity_car" type="number" min="0" step="1" /></label>
                <label class="staff-popup-field"><span>Motorbike slots</span><input name="capacity_motorbike" type="number" min="0" step="1" /></label>
              </div>
            </section>

            <section class="staff-lot-form-section staff-popup-amenities-section">
              <h3>Amenities</h3>
              <div class="staff-amenity-checklist">
                <label><input name="amenity_EV Charging" type="checkbox" /><span>EV Charging<small>+ ₫50,000 / booking</small></span></label>
                <label><input name="amenity_Camera/Security" type="checkbox" /><span>Camera/Security</span></label>
                <label><input name="amenity_Covered Parking" type="checkbox" /><span>Covered Parking</span></label>
                <label><input name="amenity_Valet" type="checkbox" /><span>Valet</span></label>
                <label><input name="amenity_Car Wash" type="checkbox" /><span>Car Wash<small>+ ₫10,000 / booking</small></span></label>
                <label><input name="amenity_24/7 Access" type="checkbox" /><span>24/7 Access</span></label>
              </div>
            </section>

            <section class="staff-lot-form-section staff-popup-rates-section">
              <h3>Hourly Rates</h3>
              <div class="staff-lot-rate-edit-list">
                <div class="staff-popup-rate-group">
                  <h4>Car</h4>
                  <div class="staff-popup-rate-row">
                    <label class="staff-popup-field"><span>Day (07:00-17:00)</span><div class="staff-money-input"><em>₫</em><input name="price_car_day" type="number" min="0" step="1000" /></div></label>
                    <label class="staff-popup-field"><span>Evening (17:00-22:00)</span><div class="staff-money-input"><em>₫</em><input name="price_car_evening" type="number" min="0" step="1000" /></div></label>
                  </div>
                  <label class="staff-popup-field staff-night-rate"><span>Night (22:00-07:00)</span><div class="staff-money-input"><em>₫</em><input name="price_car_night" type="number" min="0" step="1000" /></div></label>
                </div>
                <div class="staff-popup-rate-group">
                  <h4>Motorbike</h4>
                  <div class="staff-popup-rate-row">
                    <label class="staff-popup-field"><span>Day (07:00-17:00)</span><div class="staff-money-input"><em>₫</em><input name="price_motorbike_day" type="number" min="0" step="1000" /></div></label>
                    <label class="staff-popup-field"><span>Evening (17:00-22:00)</span><div class="staff-money-input"><em>₫</em><input name="price_motorbike_evening" type="number" min="0" step="1000" /></div></label>
                  </div>
                  <label class="staff-popup-field staff-night-rate"><span>Night (22:00-07:00)</span><div class="staff-money-input"><em>₫</em><input name="price_motorbike_night" type="number" min="0" step="1000" /></div></label>
                </div>
              </div>
            </section>
          </div>

        </div>

        <div class="staff-lot-modal-actions">
          <button type="button" class="staff-lot-secondary-button" data-action="close-staff-lot-modal">Cancel</button>
          <button class="staff-lot-save-button" id="staffParkingLotSubmitButton" type="submit"><span id="staffParkingLotSubmitLabel">Save Changes</span></button>
        </div>
      </form>
    </div>
  </div>
`;

const staffParkingLotsPage = createStaffPage({
  activeNav: 'lots',
  content: parkingLotsContent,
  contentClass: 'staff-lots-content',
  pageClass: 'staff-lots-page',
  pageKey: 'staff-lots',
  sideFooterAction: `<button class="staff-export-button" type="button" data-action="open-staff-lot-modal">${editIcon}Edit Information</button>`,
  sideFooterHref: '/staff-bookings.html',
  sideFooterLabel: 'New Booking',
  title: 'ParkFinder Staff | Parking Lots',
});

export function StaffParkingLotsPage(props) {
  return <PageShell {...props} page={staffParkingLotsPage} />;
}
