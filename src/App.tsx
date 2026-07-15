import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlannerPage from './pages/PlannerPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import GuildsIndexPage from './pages/GuildsIndexPage';
import GuildPage from './pages/GuildPage';
import ComparePage from './pages/ComparePage';
import LogDetailPage from './pages/LogDetailPage';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CharactersPage from './pages/CharactersPage';
import MyGroupsPage from './pages/MyGroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/leaderboards" element={<LeaderboardPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/players/:name" element={<PlayerProfilePage />} />
        <Route path="/guilds" element={<GuildsIndexPage />} />
        <Route path="/guilds/:tag" element={<GuildPage />} />
        <Route path="/groups" element={<MyGroupsPage />} />
        <Route path="/groups/:id" element={<GroupDetailPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/logs/:id" element={<LogDetailPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
