import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function SearchBar({ width = '100%', defaultValue = '' }: { width?: number | string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} style={{ position: 'relative', width }}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <circle cx="11" cy="11" r="7" stroke="var(--text-55)" strokeWidth="2" />
        <line x1="21" y1="21" x2="16.2" y2="16.2" stroke="var(--text-55)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search logs, players…"
        className="nav-search"
        style={{
          width: '100%',
          background: 'oklch(0.1 0.012 250 / 70%)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '9px 14px 9px 38px',
          color: 'var(--text)',
          fontSize: 13,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
        }}
      />
    </form>
  );
}
