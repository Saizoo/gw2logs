import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo, Avatar } from '../components/atoms';
import { SearchBar } from '../components/SearchBar';
import { SEARCH_RESULTS } from '../data/gw2-data';

type Tab = 'All' | 'Players' | 'Guilds' | 'Bosses';
const TABS: Tab[] = ['All', 'Players', 'Guilds', 'Bosses'];

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || SEARCH_RESULTS.query;
  const [tab, setTab] = useState<Tab>('All');

  const showPlayers = tab === 'All' || tab === 'Players';
  const showGuilds = tab === 'All' || tab === 'Guilds';
  const showBosses = tab === 'All' || tab === 'Bosses';

  const results = useMemo(() => SEARCH_RESULTS, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)',
        }}
      >
        <Logo />
        <SearchBar width={340} defaultValue={query} />
        <Avatar />
      </header>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '22px 28px 0' }}>
        <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-45)', marginBottom: 14 }}>
          Results for "<span style={{ color: 'var(--gold)' }}>{query}</span>" across players, guilds, and bosses
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 13px',
                background: tab === t ? 'var(--gold)' : 'var(--bg-chip)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                font: tab === t ? '600 12px var(--font-sans)' : '500 12px var(--font-sans)',
                color: tab === t ? '#14120f' : 'var(--text-60)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 28px 40px' }}>
        {showPlayers && (
          <>
            <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Players
            </div>
            {results.players.map((p) => (
              <Link
                key={p.name}
                to={`/players/${encodeURIComponent(p.name)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.color, flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)' }}>
                    {p.guild} · {p.spec}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{p.rating}</div>
                  <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-35)' }}>rating</div>
                </div>
              </Link>
            ))}
          </>
        )}

        {showGuilds && (
          <>
            <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '20px 0 10px' }}>
              Guilds
            </div>
            {results.guilds.map((g) => (
              <Link
                key={g.name}
                to={`/guilds/${encodeURIComponent(g.name)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8, flex: 'none',
                    background: 'repeating-linear-gradient(115deg,rgba(224,180,88,.3) 0 5px,rgba(224,180,88,.1) 5px 10px)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>
                    {g.name} <span style={{ color: 'var(--gold)' }}>{g.tag}</span>
                  </div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)' }}>{g.members} members</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{g.rating}</div>
                  <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-35)' }}>rating</div>
                </div>
              </Link>
            ))}
          </>
        )}

        {showBosses && (
          <>
            <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '20px 0 10px' }}>
              Bosses
            </div>
            {results.bosses.map((b) => (
              <Link
                key={b.name}
                to={`/encounters/${encodeURIComponent(b.name)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold-dim)', flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{b.name}</div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)' }}>{b.wing}</div>
                </div>
                {b.cm && (
                  <span style={{ font: '600 10px var(--font-sans)', padding: '2px 8px', background: 'var(--gold-dim)', color: 'var(--gold)', borderRadius: 4 }}>
                    CM
                  </span>
                )}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
