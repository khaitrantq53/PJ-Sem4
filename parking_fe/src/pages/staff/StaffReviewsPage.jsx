import { PageShell } from '../../components/PageShell.jsx';
import { createStaffPage } from './staffLayout.js';

const reviewsContent = `
  <header class="staff-bookings-head staff-reviews-head">
    <div>
      <p data-account-role>Staff</p>
      <h1>Reviews</h1>
      <span id="staffReviewsLotName">Customer reviews for your parking lot.</span>
    </div>
  </header>

  <span class="status-line staff-status-line" id="staffReviewsStatus"></span>

  <section class="staff-review-page-metrics">
    <article>
      <span>Average Rating</span>
      <strong id="staffReviewsAverage">0.0</strong>
      <small id="staffReviewsAverageStars">★★★★★</small>
    </article>
    <article>
      <span>Total Reviews</span>
      <strong id="staffReviewsTotal">0</strong>
      <small>Completed booking feedback</small>
    </article>
    <article>
      <span>5-Star Reviews</span>
      <strong id="staffReviewsFiveStar">0</strong>
      <small>Highest customer rating</small>
    </article>
    <article>
      <span>Latest Review</span>
      <strong id="staffReviewsLatest">-</strong>
      <small>Most recent feedback</small>
    </article>
  </section>

  <section class="staff-review-page-card">
    <div class="staff-review-page-toolbar">
      <div>
        <h2>Customer Review History</h2>
        <span id="staffReviewsCountLabel">All reviews from your assigned lot.</span>
      </div>
      <div class="staff-review-page-filters">
        <label>
          <span class="sr-only">Search reviews</span>
          <input id="staffReviewSearch" type="search" placeholder="Search customer, booking, comment" />
        </label>
        <select id="staffReviewRatingFilter" aria-label="Filter by rating">
          <option value="">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>
    </div>

    <div class="staff-review-page-list" id="staffAllReviewList"></div>
  </section>
`;

const staffReviewsPage = createStaffPage({
  activeNav: 'reviews',
  content: reviewsContent,
  contentClass: 'staff-reviews-content',
  pageClass: 'staff-reviews-page',
  pageKey: 'staff-reviews',
  sideFooterHref: '/staff-parking-lots.html',
  sideFooterLabel: 'My Parking Lot',
  title: 'ParkFinder Staff | Reviews',
});

export function StaffReviewsPage(props) {
  return <PageShell {...props} page={staffReviewsPage} />;
}
