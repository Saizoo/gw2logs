import { FRACTAL_CATALOG } from '../data/catalog';
import { CatalogOverview } from '../components/CatalogOverview';

// /fractals — the fractal CM catalog (instances → bosses), same scoped links
// as the raids overview.
export default function FractalsPage() {
  return (
    <CatalogOverview
      catalog={FRACTAL_CATALOG}
      title="Fractals"
      subtitle="Fractal challenge modes by instance — rankings, statistics, and the full report list"
    />
  );
}
