import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function SearchBar({ width = 220, defaultValue = '' }: { width?: number; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  const inputStyle: CSSProperties = {
    width,
    padding: '7px 12px',
    background: 'var(--bg-chip)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    font: '400 12px var(--font-sans)',
    color: 'var(--text)',
    outline: 'none',
  };

  return (
    <form onSubmit={onSubmit}>
      <input
        style={inputStyle}
        placeholder="Search player, guild, boss…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}
