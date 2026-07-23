import { Link } from 'react-router-dom';
import { api, type OverviewEncounter } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { bossBgPath } from '../data/gw2-data';
import { groupImage, type CatalogBoss, type CatalogGroup } from '../data/catalog';
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
  const bg = bossBgPath(boss.name);
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid color-mix(in srgb, var(--color-text) 11%, transparent)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {bg && <ArtImg src={bg} style={{ opacity: 0.5 }} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 30%, transparent) 0%, color-mix(in srgb, var(--color-surface) 88%, transparent) 60%, color-mix(in srgb, var(--color-surface) 97%, transparent) 100%)' }} />
      <div style={{ position: 'relative', padding: '14px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ font: '800 15px var(--font-sans)', letterSpacing: '-.2px' }}>{boss.name}</div>
          {boss.hasCm && (
            <span
              style={{
                font: '800 9px var(--font-sans)',
                letterSpacing: '.5px',
                padding: '2px 6px',
                color: 'var(--gold)',
                background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
              }}
            >
              CM
            </span>
          )}
        </div>
        <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)' }}>
          {enc ? (
            <>
              {enc.kills}/{enc.logCount} kills
              {enc.bestParse ? ` · best ${enc.bestParse.dps.toLocaleString()} dps` : ''}
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

      {catalog.map((group) => {
        const img = groupImage(group);
        return (
          <section key={group.name} style={{ marginBottom: 30 }}>
            {/* Wing / instance banner: art + name + wing-scoped links */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid color-mix(in srgb, var(--color-text) 11%, transparent)',
                background: 'var(--color-surface)',
                marginBottom: 14,
              }}
            >
              {img && <ArtImg src={img} style={{ opacity: 0.45, objectPosition: 'center 35%' }} />}
              <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-surface) 92%, transparent) 0%, color-mix(in srgb, var(--color-surface) 70%, transparent) 60%, color-mix(in srgb, var(--color-surface) 92%, transparent) 100%)' }} />
              <div style={{ position: 'relative', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <h2 style={{ font: '800 18px var(--font-sans)', letterSpacing: '-.2px' }}>{group.name}</h2>
                <ScopeLinks scope="wing" value={group.name} includeRankings={false} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {group.bosses.map((b) => (
                <BossCard key={b.name} boss={b} enc={byName.get(b.name)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
