import { PageShell } from '../../components/PageShell.jsx';

const confirmRegistrationPage = {
  title: 'Confirm Account | ParkFinder',
  bodyClass: 'login-page',
  pageKey: 'confirm-registration',
  markup: `<main class="login-shell confirm-registration-shell">
      <section class="login-brand-panel">
        <div class="login-map-art" aria-hidden="true"></div>
        <div class="login-brand-content">
          <a class="login-brand" href="/" aria-label="ParkFinder">
            <span class="login-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 20V4h7.1c3.4 0 5.9 2.3 5.9 5.6s-2.5 5.7-5.9 5.7h-3.7V20H7Zm3.4-7.8h3.4c1.6 0 2.8-1 2.8-2.6S15.4 7 13.8 7h-3.4v5.2Z" />
              </svg>
            </span>
            <span>ParkFinder</span>
          </a>
          <div class="login-brand-copy">
            <h1>Confirm your customer account.</h1>
            <p>Use the verification code sent to your email to activate parking access.</p>
          </div>
        </div>
      </section>

      <section class="login-form-panel">
        <a class="login-mobile-brand" href="/" aria-label="ParkFinder">
          <span class="login-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 20V4h7.1c3.4 0 5.9 2.3 5.9 5.6s-2.5 5.7-5.9 5.7h-3.7V20H7Zm3.4-7.8h3.4c1.6 0 2.8-1 2.8-2.6S15.4 7 13.8 7h-3.4v5.2Z" />
            </svg>
          </span>
          <span>ParkFinder</span>
        </a>

        <div class="login-card">
          <header class="login-header">
            <h2>Enter verification code</h2>
            <p>Check your email inbox and type the code below.</p>
          </header>

          <form class="login-form" id="confirmRegistrationForm">
            <label class="login-field">
              <span>Email Address</span>
              <div class="login-input-wrap">
                <input id="confirmEmail" name="email" type="email" autocomplete="email" placeholder="name@gmail.com" required />
              </div>
            </label>
            <label class="login-field">
              <span>Verification Code</span>
              <div class="login-input-wrap">
                <input id="confirmOtp" name="otp" inputmode="numeric" maxlength="12" minlength="4" autocomplete="one-time-code" placeholder="6-digit code" required />
              </div>
            </label>
            <button class="login-submit" type="submit">
              <span>Confirm Account</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9.2 16.2-4-4L3.8 13.6l5.4 5.4L20.5 7.7l-1.4-1.4-9.9 9.9Z" />
              </svg>
            </button>
            <button class="confirm-resend-button" type="button" data-confirm-resend>Send new code</button>
            <div class="status-line" id="confirmStatus"></div>
          </form>

          <footer class="login-footer">
            <span>Already confirmed?</span>
            <a href="/auth.html">Sign in</a>
          </footer>
        </div>
      </section>
    </main>`,
};

export function ConfirmRegistrationPage(props) {
  return <PageShell {...props} page={confirmRegistrationPage} />;
}
