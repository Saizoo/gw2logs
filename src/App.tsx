import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import EncountersIndexPage from './pages/EncountersIndexPage';
import EncounterPage from './pages/EncounterPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import GuildPage from './pages/GuildPage';
import ComparePage from './pages/ComparePage';
import LogDetailPage from './pages/LogDetailPage';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/LoginPage';
import SearchResultsPage from './pages/SearchResultsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/search" element={<SearchResultsPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/encounters" replace />} />
        <Route path="/encounters" element={<EncountersIndexPage />} />
        <Route path="/encounters/:bossName" element={<EncounterPage />} />
        <Route path="/leaderboards" element={<LeaderboardPage />} />
        <Route path="/players/:name" element={<PlayerProfilePage />} />
        <Route path="/guilds" element={<GuildPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/logs/:id" element={<LogDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
