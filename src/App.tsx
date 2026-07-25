import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlannerPage from './pages/PlannerPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import ComparePage from './pages/ComparePage';
import LogDetailPage from './pages/LogDetailPage';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CharactersPage from './pages/CharactersPage';
import EncountersPage from './pages/EncountersPage';
import StrikesPage from './pages/StrikesPage';
import FractalsPage from './pages/FractalsPage';
import BenchmarksPage from './pages/BenchmarksPage';
import MyGroupsPage from './pages/MyGroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import AdminPage from './pages/AdminPage';
import PrivacyPage from './pages/PrivacyPage';

// Redirect that carries the query string across — the old paths are linked
// from elsewhere on the web with ?boss=/?encounter= etc.
function RedirectPreserve({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />

        {/* Area catalogs + scoped views */}
        <Route path="/raids" element={<EncountersPage />} />
        <Route path="/strikes" element={<StrikesPage />} />
        <Route path="/fractals" element={<FractalsPage />} />
        <Route path="/rankings" element={<LeaderboardPage />} />
        <Route path="/statistics" element={<BenchmarksPage />} />
        <Route path="/reports" element={<LogsPage />} />

        {/* Old paths → new IA (query preserved) */}
        <Route path="/encounters" element={<RedirectPreserve to="/raids" />} />
        <Route path="/benchmarks" element={<RedirectPreserve to="/statistics" />} />
        <Route path="/leaderboards" element={<RedirectPreserve to="/rankings" />} />
        <Route path="/logs" element={<RedirectPreserve to="/reports" />} />

        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/players/:name" element={<PlayerProfilePage />} />
        <Route path="/groups" element={<MyGroupsPage />} />
        <Route path="/groups/:id" element={<GroupDetailPage />} />
        <Route path="/groups/:id/:tab" element={<GroupDetailPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/logs/:id" element={<LogDetailPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
