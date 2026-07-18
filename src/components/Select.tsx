import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

// A themed, accessible replacement for a native <select>. The native
// element can't render an image inside an option or restyle its dropdown
// popup (that's drawn by the OS), so anywhere we want spec icons or a look
// that matches the rest of the app, we use this instead.
//
// The open panel renders in a portal on <body> with fixed positioning
// anchored to the trigger — so it's never clipped or hidden by an
// ancestor's overflow/stacking context (Cards, tables, z-indexed rows).
//
// Behaviour parity with <select>: click to open, click an option or press
// Enter to choose, Escape/outside-click to close, ↑/↓ to move the
// highlight, Home/End to jump, and type-ahead on a letter key. Options may
// carry a `group` label to render section headers.

export interface SelectOption {
  value: string;
  label: string;
  /** Optional secondary line under the label (e.g. category · weapons). */
  sublabel?: string;
  /** Optional leading icon URL (e.g. a spec icon). */
  icon?: string;
  /** Optional accent color for the icon frame / selected tint. */
  accent?: string;
  /** Optional group heading — a header renders before the first option of
   *  each new group (options should be pre-sorted by group). */
  group?: string;
}

interface PanelPos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  autoFocus,
  ariaLabel,
  style,
  panelWidth,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
  /** Force the panel width (defaults to matching the trigger). */
  panelWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const typeahead = useRef({ term: '', at: 0 });
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  // Anchor the fixed-position panel to the trigger, flipping above it when
  // there's more room up than down. Recomputed on open, scroll and resize.
  const reposition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < 300 && spaceAbove > spaceBelow;
    setPos({
      left: rect.left,
      width: panelWidth ?? rect.width,
      top: flip ? undefined : rect.bottom + 6,
      bottom: flip ? window.innerHeight - rect.top + 6 : undefined,
      maxHeight: Math.min(320, (flip ? spaceAbove : spaceBelow) - 14),
    });
  }, [panelWidth]);

  useEffect(() => {
    if (autoFocus) setOpen(true);
  }, [autoFocus]);

  useLayoutEffect(() => {
    if (!open) return;
    setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
    reposition();
  }, [open, options, value, reposition]);

  // Keep the panel glued to the trigger while the page scrolls or resizes.
  useEffect(() => {
    if (!open) return;
    const handler = () => reposition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (open) optionRefs.current[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  // Close on outside click — check both the trigger and the portalled panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setHighlight(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlight(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (options[highlight]) choose(options[highlight].value);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const now = Date.now();
          typeahead.current.term = now - typeahead.current.at < 700 ? typeahead.current.term + e.key : e.key;
          typeahead.current.at = now;
          const term = typeahead.current.term.toLowerCase();
          const idx = options.findIndex((o) => o.label.toLowerCase().startsWith(term));
          if (idx >= 0) setHighlight(idx);
        }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="u-select-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          width: '100%',
          minHeight: 38,
          padding: '7px 11px',
          borderRadius: 10,
          background: 'var(--bg-input)',
          border: `1px solid ${open ? 'oklch(0.78 0.14 85 / 60%)' : 'var(--border)'}`,
          boxShadow: open ? '0 0 0 3px oklch(0.78 0.14 85 / 14%)' : 'none',
          color: 'var(--text)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          font: '500 12.5px var(--font-sans)',
          textAlign: 'left',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
      >
        {selected?.icon && (
          <img src={selected.icon} alt="" width={20} height={20} style={{ objectFit: 'contain', flex: 'none' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
        )}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--text)' : 'var(--text-55)' }}>
          {selected?.label ?? placeholder}
        </span>
        <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}>
          <path d="M1 1l4.5 4.5L10 1" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          id={listId}
          role="listbox"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            zIndex: 3000,
            width: pos.width,
            maxHeight: pos.maxHeight,
            overflowY: 'auto',
            padding: 5,
            borderRadius: 12,
            background: 'oklch(0.17 0.016 255 / 98%)',
            border: '1px solid oklch(1 0 0 / 12%)',
            boxShadow: '0 18px 44px -14px rgba(0,0,0,.7), 0 2px 8px rgba(0,0,0,.4)',
            backdropFilter: 'blur(6px)',
            animation: 'selectPop .14s cubic-bezier(.2,.9,.3,1.2) both',
            transformOrigin: pos.bottom != null ? 'bottom center' : 'top center',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '10px 12px', font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>No options</div>
          )}
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHigh = i === highlight;
            const showGroup = opt.group && opt.group !== options[i - 1]?.group;
            return (
              <div key={opt.value || `__${i}`}>
                {showGroup && (
                  <div style={{ padding: '8px 10px 4px', font: '700 9.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>
                    {opt.group}
                  </div>
                )}
                <div
                  ref={(el) => { optionRefs.current[i] = el; }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isHigh ? 'oklch(0.78 0.14 85 / 14%)' : isSelected ? 'oklch(1 0 0 / 5%)' : 'transparent',
                    transition: 'background .1s ease',
                  }}
                >
                  {opt.icon !== undefined && (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'oklch(0.13 0.01 250 / 70%)',
                        border: `1px solid ${opt.accent ? `color-mix(in oklab, ${opt.accent} 45%, transparent)` : 'oklch(1 0 0 / 10%)'}`,
                      }}
                    >
                      {opt.icon && (
                        <img src={opt.icon} alt="" width={18} height={18} style={{ objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                      )}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `${isSelected ? 700 : 500} 12.5px var(--font-sans)`, color: isSelected ? 'var(--gold)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </div>
                    {opt.sublabel && (
                      <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flex: 'none' }}>
                      <path d="M2.5 7.5l3 3 6-7" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
