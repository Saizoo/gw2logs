import { Link } from 'react-router-dom';
import { api, type OverviewEncounter } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { bossImage, type CatalogBoss, type CatalogGroup } from '../data/catalog';
import { ArtImg, PageHeader } from './atoms';

// Shared Raids / Fractals landing: the curated catalog grouped by wing /
// instance, each boss card deep-linking into its scoped Rankings / Statistics
// / All Reports. Log counts + best parse are layered on from the encounters
// overview where they exist; areas with no logs still render (with a "no logs
// yet" note) so the catalog is always complete.

function scopeQ(kind: 'boss' | 'wing', value: string): string {
  return `${kind}=${encodeURIComponent(value)}`;
}

// The accent link cluster shared by wing headers and boss cards. Wings get no
// Rankings (rankings are boss-only).
function ScopeLinks({ scope, value, includeRankings }: { scope: 'boss' | 'wing'; value: string; includeRankings: boolean }) {
  const q = scopeQ(scope, value);
  const links = [
    ...(includeRankings ? [{ label: 'Rankings', to: `/rankings?${q}` }] : []),
    { label: 'Statistics', to: `/statistics?${q}` },
    { label: 'All Reports', to: `/reports?${q}` },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {links.map((l) => (
        <Link
          key={l.label}
          to={l.to}
          style={{ font: '700 11.5px var(--font-sans)', letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--gold)' }}
        >
          {l.label} →
        </Link>
      ))}
    </div>
  );
}

function BossCard({ boss, enc }: { boss: CatalogBoss; enc?: OverviewEncounter }) {
  const bg = bossImage(boss.name);
  return (
    <div
      className="u-card-link"
      style={{
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Poster: boss art under a bottom scrim, name pinned to the corner, CM
          chip top-right — the same treatment as the Encounters mega-menu. */}
      <div style={{ position: 'relative', height: 104 }}>
        {bg && <ArtImg src={bg} />}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.86) 6%, rgba(0,0,0,.28) 48%, transparent 78%)' }} />
        {boss.hasCm && (
          <span style={{ position: 'absolute', top: 9, right: 9, font: '800 9px var(--font-sans)', letterSpacing: '.4px', padding: '2px 7px', borderRadius: 999, color: 'var(--gold)', background: 'color-mix(in srgb, var(--color-accent) 22%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)' }}>
            CM
          </span>
        )}
        <div style={{ position: 'absolute', left: 13, right: 13, bottom: 10, font: '800 15px var(--font-sans)', letterSpacing: '-.2px', color: 'var(--on-art)', textShadow: '0 1px 3px rgba(0,0,0,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {boss.name}
        </div>
      </div>
      <div style={{ padding: '12px 15px 13px', display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-55)' }}>
          {enc ? (
            <>
              <span style={{ color: 'var(--text-80)', fontWeight: 700 }}>{enc.kills}/{enc.logCount}</span> kills
              {enc.bestParse ? <> · best <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{enc.bestParse.dps.toLocaleString()}</span> dps</> : ''}
            </>
          ) : (
            'No logs yet'
          )}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <ScopeLinks scope="boss" value={boss.name} includeRankings />
        </div>
      </div>
    </div>
  );
}

export function CatalogOverview({
  catalog,
  title,
  subtitle,
}: {
  catalog: CatalogGroup[];
  title: string;
  subtitle: string;
}) {
  const { data: wings } = useApiQuery(() => api.encountersOverview(), []);
  const byName = new Map<string, OverviewEncounter>();
  for (const w of wings ?? []) for (const e of w.encounters) byName.set(e.fightName, e);

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />

      {catalog.map((group) => (
        <section key={group.name} style={{ marginBottom: 28 }}>
          {/* Wing / instance header: label + rule + wing-scoped links, matching
              the Encounters mega-menu. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 13, flexWrap: 'wrap' }}>
            <h2 style={{ font: '700 12px var(--font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-60)', whiteSpace: 'nowrap' }}>{group.name}</h2>
            <div style={{ flex: 1, minWidth: 20, height: 1, background: 'var(--border-faint)' }} />
            <ScopeLinks scope="wing" value={group.name} includeRankings={false} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
            {group.bosses.map((b) => (
              <BossCard key={b.name} boss={b} enc={byName.get(b.name)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
