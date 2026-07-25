import { STRIKE_CATALOG } from '../data/catalog';
import { CatalogOverview } from '../components/CatalogOverview';

// /strikes — strike missions, surfaced as "Raid Encounters". Same scoped
// links as the raids overview.
export default function StrikesPage() {
  return (
    <CatalogOverview
      catalog={STRIKE_CATALOG}
      title="Raid Encounters"
      subtitle="Strike missions by release — jump into rankings, statistics, or the full report list"
    />
  );
}
