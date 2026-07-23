import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { toast } from '../lib/toast';
import { GoldButton } from './atoms';

// First-login walkthrough: three setup steps in a centered modal (welcome,
// GW2 API key, dps.report import), then a spotlight tour that navigates
// the real app and highlights each nav destination. Completion (or skip —
// either way) is stamped server-side so it only ever auto-opens once.
//
// Replay: anything can dispatch `gw2logs:replay-tour` on window (the
// Account page has a link) to reopen it without touching server state.

export const REPLAY_TOUR_EVENT = 'gw2logs:replay-tour';

interface SpotlightStep {
  kind: 'spotlight';
  target: string; // [data-tour=…] selector value
  route: string;
  title: string;
  body: string;
}

const TOUR_STEPS: SpotlightStep[] = [
  {
    kind: 'spotlight',
    target: 'dashboard',
    route: '/',
    title: 'Dashboard',
    body: "Your week at a glance — logs uploaded, average squad DPS, clears, and the guild's recent activity. This is home.",
  },
  {
    kind: 'spotlight',
    target: 'raids',
    route: '/raids',
    title: 'Raids',
    body: 'Browse every raid wing and boss. Each opens into Rankings (per-boss DPS ladders), Statistics (elite-spec benchmarks, Normal and CM), and All Reports (the full log list) — scoped to just that area.',
  },
  {
    kind: 'spotlight',
    target: 'fractals',
    route: '/fractals',
    title: 'Fractals',
    body: 'The same Rankings, Statistics, and All Reports, grouped by fractal challenge-mode instance instead of raid wing.',
  },
  {
    kind: 'spotlight',
    target: 'groups',
    route: '/groups',
    title: 'Groups',
    body: 'Your raid statics: schedules, RSVP signups, weekly clear tracking, roster readiness, attendance history, and Discord raid-night reminders.',
  },
  {
    kind: 'spotlight',
    target: 'characters',
    route: '/characters',
    title: 'Characters',
    body: 'Sync characters from your GW2 account (or add them manually) and assign a build to each equipment tab — your groups use this to check role coverage.',
  },
  {
    kind: 'spotlight',
    target: 'upload',
    route: '/upload',
    title: 'Upload logs',
    body: 'Drop arcdps .zevtc files here and they’re parsed into full fight reports. Attach them to a group to power its clears and attendance.',
  },
];

// Setup phase comes first: 0=welcome, 1=api key, 2=dps.report; then tour
// steps are indexed from SETUP_STEPS onward, and the last index is the
// finish screen.
const SETUP_STEPS = 3;
const TOTAL = SETUP_STEPS + TOUR_STEPS.length + 1;

export function OnboardingTour() {
  const { user, refresh } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const openedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (user && user.onboardedAt === null && openedForUser.current !== user.id) {
      openedForUser.current = user.id;
      setStep(0);
      setOpen(true);
    }
  }, [user]);

  useEffect(() => {
    const onReplay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(REPLAY_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, onReplay);
  }, []);

  const finish = useCallback(() => {
    setOpen(false);
    if (user && user.onboardedAt === null) {
      api.completeOnboarding().then(refresh).catch(() => {});
    }
  }, [user, refresh]);

  // Route changes for spotlight steps happen as an effect of the step
  // index so back/next both land on the right page.
  const tourIndex = step - SETUP_STEPS;
  const spotlight = tourIndex >= 0 && tourIndex < TOUR_STEPS.length ? TOUR_STEPS[tourIndex] : null;
  useEffect(() => {
    if (open && spotlight) navigate(spotlight.route);
  }, [open, spotlight, navigate]);

  if (!open || !user) return null;

  const next = () => setStep((s) => Math.min(s + 1, TOTAL - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {spotlight ? (
        <SpotlightFrame step={spotlight} index={tourIndex} count={TOUR_STEPS.length} onNext={next} onBack={back} onSkip={finish} />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'oklch(0.08 0.01 250 / 72%)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            animation: 'fadeIn .3s ease both',
          }}
        >
          <div
            key={step}
            style={{
              width: 'min(560px, 100%)',
              borderRadius: 0,
              border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
              background: 'linear-gradient(165deg, var(--color-surface) 0%, var(--color-surface) 70%)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,.7), 0 0 60px -30px color-mix(in srgb, var(--color-accent) 40%, transparent)',
              padding: '34px 36px 28px',
              animation: 'tourCardIn .38s cubic-bezier(.2,.9,.3,1.2) both',
            }}
          >
            {step === 0 && <WelcomeStep username={user.discordUsername} />}
            {step === 1 && <ApiKeyStep linkedAccount={user.gw2AccountName} onLinked={refresh} />}
            {step === 2 && <DpsReportStep />}
            {step === TOTAL - 1 && <FinishStep />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 26 }}>
              <button onClick={finish} className="u-btn-ghost" style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-50)', padding: '8px 10px', borderRadius: 0 }}>
                Skip tour
              </button>
              <ProgressDots step={step} />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {step > 0 && step < TOTAL - 1 && (
                  <button onClick={back} className="u-btn-ghost" style={{ font: '600 12.5px var(--font-sans)', color: 'var(--text-70)', padding: '9px 16px', borderRadius: 0, border: '1px solid var(--border)' }}>
                    Back
                  </button>
                )}
                {step === TOTAL - 1 ? (
                  <GoldButton onClick={finish}>Start raiding</GoldButton>
                ) : (
                  <GoldButton onClick={next}>{step === 0 ? 'Take the tour' : 'Next'}</GoldButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, marginLeft: 8 }} aria-label={`Step ${step + 1} of ${TOTAL}`}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          style={{
            width: i === step ? 16 : 6,
            height: 6,
            borderRadius: 0,
            background: i === step ? 'var(--gold)' : i < step ? 'color-mix(in srgb, var(--color-accent) 45%, transparent)' : 'color-mix(in srgb, var(--color-text) 20%, transparent)',
            transition: 'all .25s ease',
          }}
        />
      ))}
    </div>
  );
}

function StepTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <>
      <div style={{ font: '700 10.5px var(--font-sans)', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
        {eyebrow}
      </div>
      <div style={{ font: '800 22px var(--font-sans)', letterSpacing: '-.3px', marginBottom: 10 }}>{title}</div>
      {children && <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-70)', lineHeight: 1.55 }}>{children}</div>}
    </>
  );
}

function WelcomeStep({ username }: { username: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          margin: '0 auto 18px',
          borderRadius: 0,
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-600))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: '800 28px var(--font-sans)',
          color: 'var(--color-bg)',
          boxShadow: '0 8px 30px color-mix(in srgb, var(--color-accent) 45%, transparent)',
          animation: 'tourLogoFloat 3s ease-in-out infinite',
        }}
      >
        H
      </div>
      <StepTitle eyebrow="Welcome" title={`Glad you're here, ${username}`}>
        HeroPanel turns your squad's arcdps logs into fight reports, leaderboards, and raid-night planning. Two quick
        setup steps, then a 60-second tour of what lives where.
      </StepTitle>
    </div>
  );
}

function ApiKeyStep({ linkedAccount, onLinked }: { linkedAccount: string | null; onLinked: () => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    if (!key.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.linkGw2(key.trim());
      toast.success(`Linked ${res.gw2AccountName}`);
      setKey('');
      onLinked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to link key');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <StepTitle eyebrow="Step 1 · Recommended" title="Link your GW2 account">
        An API key ties your logs to your account name, unlocks character sync, and puts your parses on the
        leaderboards under your name. Create one at{' '}
        <a href="https://account.arena.net/applications" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontWeight: 600 }}>
          account.arena.net/applications
        </a>{' '}
        with the <b>account</b>, <b>characters</b> and <b>builds</b> permissions.
      </StepTitle>
      {linkedAccount ? (
        <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 0, background: 'var(--good-dim)', color: 'var(--good)', font: '600 13px var(--font-sans)' }}>
          ✓ Linked as {linkedAccount}
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Paste your API key…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && link()}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 12.5,
                padding: '10px 14px',
                borderRadius: 0,
                fontFamily: 'var(--font-mono)',
              }}
            />
            <GoldButton onClick={link} disabled={busy || !key.trim()}>
              {busy ? 'Checking…' : 'Link'}
            </GoldButton>
          </div>
          {error && <div style={{ marginTop: 8, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{error}</div>}
          <div style={{ marginTop: 10, font: '400 11px var(--font-sans)', color: 'var(--text-50)' }}>
            You can skip this and link later from your Account page.
          </div>
        </div>
      )}
    </div>
  );
}

function DpsReportStep() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startImport() {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.importDpsReport(token.trim());
      setStarted(true);
      toast.success('Import started — progress shows on your Account page');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start import');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <StepTitle eyebrow="Step 2 · Optional" title="Bring your dps.report history">
        Already been uploading to dps.report? Paste your <b>user token</b> (found in the arcdps uploader or on
        dps.report) and your past logs are imported here — reports, leaderboards and benchmarks included. This also
        lives on your Account page if you'd rather do it later.
      </StepTitle>
      <div style={{ marginTop: 18 }}>
        {started ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 0, background: 'var(--good-dim)', color: 'var(--good)', font: '600 13px var(--font-sans)' }}>
            ✓ Import running — check your Account page for progress
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="dps.report user token…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startImport()}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 12.5,
                  padding: '10px 14px',
                  borderRadius: 0,
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <GoldButton onClick={startImport} disabled={busy || !token.trim()}>
                {busy ? 'Starting…' : 'Import'}
              </GoldButton>
            </div>
            {error && <div style={{ marginTop: 8, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function FinishStep() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div aria-hidden style={{ font: '800 40px var(--font-sans)', marginBottom: 12, animation: 'tourLogoFloat 3s ease-in-out infinite' }}>
        ⚔️
      </div>
      <StepTitle eyebrow="All set" title="Go get some kills">
        Upload a log and watch the dashboard light up. Everything you just saw is one click from the nav bar —
        and you can replay this tour anytime from your Account page.
      </StepTitle>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spotlight phase: dims the app, cuts a glowing hole around the nav item
// for the current step, and pins the explanation card beneath it.
// ---------------------------------------------------------------------------

function SpotlightFrame({
  step,
  index,
  count,
  onNext,
  onBack,
  onSkip,
}: {
  step: SpotlightStep;
  index: number;
  count: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // The route just changed; give the page a beat to paint before measuring.
    const t = setTimeout(measure, 60);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [step]);

  const pad = 7;
  const cardTop = rect ? rect.bottom + 18 : undefined;
  const cardLeft = rect ? Math.max(20, Math.min(rect.left + rect.width / 2 - 190, window.innerWidth - 400)) : undefined;

  return (
    <>
      {/* Dim layer with a cutout: the hole is a fixed div whose enormous
          box-shadow paints the dimming everywhere except itself. Falls back
          to a plain dim layer when the target isn't on screen (mobile). */}
      {rect ? (
        <div
          style={{
            position: 'fixed',
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: 0,
            boxShadow: '0 0 0 9999px oklch(0.08 0.01 250 / 72%)',
            border: '2px solid color-mix(in srgb, var(--color-accent) 80%, transparent)',
            animation: 'tourPulse 2s ease-in-out infinite',
            transition: 'top .3s ease, left .3s ease, width .3s ease, height .3s ease',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'oklch(0.08 0.01 250 / 72%)' }} />
      )}

      <div
        key={step.target}
        style={{
          position: 'fixed',
          top: cardTop ?? '30%',
          left: cardLeft ?? '50%',
          transform: cardLeft === undefined ? 'translateX(-50%)' : undefined,
          width: 380,
          maxWidth: 'calc(100vw - 40px)',
          borderRadius: 0,
          border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
          background: 'linear-gradient(165deg, var(--color-surface) 0%, var(--color-surface) 70%)',
          boxShadow: '0 24px 60px -16px rgba(0,0,0,.7)',
          padding: '20px 22px 16px',
          animation: 'tourCardIn .32s cubic-bezier(.2,.9,.3,1.15) both',
        }}
      >
        <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
          Tour · {index + 1} of {count}
        </div>
        <div style={{ font: '800 17px var(--font-sans)', letterSpacing: '-.2px', marginBottom: 6 }}>{step.title}</div>
        <div style={{ font: '400 12.5px var(--font-sans)', color: 'var(--text-70)', lineHeight: 1.55 }}>{step.body}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={onSkip} className="u-btn-ghost" style={{ font: '600 11px var(--font-sans)', color: 'var(--text-50)', padding: '7px 9px', borderRadius: 0 }}>
            End tour
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onBack} className="u-btn-ghost" style={{ font: '600 12px var(--font-sans)', color: 'var(--text-70)', padding: '8px 14px', borderRadius: 0, border: '1px solid var(--border)' }}>
              Back
            </button>
            <GoldButton onClick={onNext}>{index === count - 1 ? 'Finish' : 'Next'}</GoldButton>
          </div>
        </div>
      </div>
    </>
  );
}
