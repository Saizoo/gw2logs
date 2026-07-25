import { useNavigate } from 'react-router';
import type { CompareCandidate } from '../hooks/useComparePicker';

export function ComparePickerBar({ selected, onClear }: { selected: CompareCandidate[]; onClear: () => void }) {
  const navigate = useNavigate();
  if (selected.length === 0) return null;

  const ready = selected.length === 2;

  return (
    <div style={{ position: 'sticky', bottom: 16, zIndex: 20, display: 'flex', justifyContent: 'center', marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 10px 10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px) saturate(140%)',
          border: '1px solid var(--gold-dim)',
          boxShadow: '0 12px 32px rgba(0,0,0,.45)',
        }}
      >
        <div style={{ font: '600 12.5px var(--font-sans)', color: 'var(--text-80)' }}>
          {selected.map((c) => c.label).join(' vs ')}
          {!ready && ' — pick one more to compare'}
        </div>
        <button onClick={onClear} style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)', padding: '4px 8px' }}>
          Clear
        </button>
        <button
          disabled={!ready}
          onClick={() => {
            const [a, b] = selected;
            navigate(
              `/compare?logIdA=${encodeURIComponent(a.logId)}&accountA=${encodeURIComponent(a.account)}&logIdB=${encodeURIComponent(b.logId)}&accountB=${encodeURIComponent(b.account)}`,
            );
          }}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            font: '700 12px var(--font-sans)',
            background: ready ? 'var(--gold-grad)' : 'var(--bg-chip)',
            color: ready ? 'var(--gold-fg)' : 'var(--text-50)',
          }}
        >
          Compare
        </button>
      </div>
    </div>
  );
}

export function CompareCheckbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      title={checked ? `Remove ${label} from comparison` : `Add ${label} to comparison`}
      aria-label={checked ? `Remove ${label} from comparison` : `Add ${label} to comparison`}
      style={{
        width: 18,
        height: 18,
        borderRadius: 'var(--radius-md)',
        flex: 'none',
        border: `1.5px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
        background: checked ? 'var(--gold-grad)' : 'transparent',
      }}
    />
  );
}
