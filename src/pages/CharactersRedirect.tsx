import { Navigate } from 'react-router';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { LoadingState } from '../components/QueryStates';

// The standalone characters page moved into the player profile's Characters
// tab. This keeps the old /characters URL working: signed-in users with a
// linked account land on their own profile's Characters tab; everyone else
// goes to the account page to link first.
export default function CharactersRedirect() {
  const { user, loading } = useCurrentUser();
  if (loading) return <LoadingState label="Loading…" />;
  if (user?.gw2AccountName) {
    return <Navigate to={`/players/${encodeURIComponent(user.gw2AccountName)}?tab=characters`} replace />;
  }
  return <Navigate to="/account" replace />;
}
