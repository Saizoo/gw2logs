import { RAID_CATALOG } from '../data/catalog';
import { CatalogOverview } from '../components/CatalogOverview';

// /raids — the raid catalog (wings → bosses). Each boss deep-links into its
// scoped Rankings / Statistics / All Reports; each wing header into the
// wing-scoped Statistics / All Reports.
export default function EncountersPage() {
  return (
    <CatalogOverview
      catalog={RAID_CATALOG}
      title="Raids"
      subtitle="Every raid wing and boss — jump into rankings, statistics, or the full report list"
    />
  );
}
