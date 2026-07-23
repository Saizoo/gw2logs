import { Link, Outlet, useLocation } from 'react-router-dom';
import { NavHeader } from './NavHeader';
import { ToastHost } from './ToastHost';
import { OnboardingTour } from './OnboardingTour';
import { AnnouncementBanner } from './AnnouncementBanner';

export function Layout() {
  const location = useLocation();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavHeader />
      <AnnouncementBanner />
      <main key={location.pathname} style={{ flex: 1, animation: 'fadeIn 0.35s ease both', width: '100%', maxWidth: 1440, margin: '0 auto', padding: '32px 32px 60px' }}>
        <Outlet />
      </main>
      <footer style={{ borderTop: '2px solid var(--border)', marginTop: 'auto' }}>
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            padding: '18px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            font: '400 12px var(--font-sans)',
            color: 'var(--text-55)',
          }}
        >
          <span>gw2logs — Guild Wars 2 combat log analytics</span>
          <Link to="/privacy" style={{ color: 'var(--text-70)', fontWeight: 600 }}>
            Privacy Promise
          </Link>
        </div>
      </footer>
      <ToastHost />
      <OnboardingTour />
    </div>
  );
}
