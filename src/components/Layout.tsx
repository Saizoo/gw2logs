import { Outlet, useLocation } from 'react-router-dom';
import { NavHeader } from './NavHeader';
import { ToastHost } from './ToastHost';

export function Layout() {
  const location = useLocation();
  return (
    <div style={{ minHeight: '100vh' }}>
      <NavHeader />
      <main key={location.pathname} style={{ animation: 'fadeIn 0.35s ease both', maxWidth: 1280, margin: '0 auto', padding: '32px 32px 80px' }}>
        <Outlet />
      </main>
      <ToastHost />
    </div>
  );
}
