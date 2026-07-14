import { Outlet } from 'react-router-dom';
import { NavHeader } from './NavHeader';

export function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
