import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../components/atoms';

// Plain-language privacy promise, grounded in how the site actually stores and
// handles data. Edit EFFECTIVE below for your deployment.
const EFFECTIVE = 'July 23, 2026';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader title="Privacy Promise" subtitle="What we collect, what we don't, and the controls you have." />

      <p style={lead}>
        gw2logs is a place to upload, parse, and share Guild Wars 2 combat logs. This page explains — in plain
        language — exactly what we collect, what we don&apos;t, how it&apos;s protected, and the controls you have. No
        dark patterns, no surprises.
      </p>

      <Section title="What we collect, and why">
        <Bullet label="Your Discord identity">
          When you sign in with Discord we receive only your Discord <b>ID, username, and avatar</b> (the{' '}
          <code style={code}>identify</code> scope). We do <b>not</b> receive your email, your messages, or your list
          of servers.
        </Bullet>
        <Bullet label="Your Guild Wars 2 API key (optional)">
          If you link it, we use it to read your <b>account name, characters, and guilds</b> to attribute your logs
          and power group features. You choose the key&apos;s permissions, and you can unlink it any time.
        </Bullet>
        <Bullet label="Combat logs you upload">
          We parse each log and store the <b>structured results</b> — character/account names, professions, DPS and
          boon/healing numbers, mechanics, subgroups, and timings.
        </Bullet>
        <Bullet label="Groups you create or join">
          Group names, raid/fractal schedules, memberships, and (if you add one) a Discord webhook URL.
        </Bullet>
        <Bullet label="A session cookie">
          To keep you signed in — plus optional addon tokens if you use the desktop / Nexus companion.
        </Bullet>
      </Section>

      <Section title="What we don't collect">
        <Bullet>
          <b>No email and no password</b> — sign-in goes through Discord, so we never see or store either.
        </Bullet>
        <Bullet>
          <b>No third-party analytics or advertising trackers.</b> We don&apos;t sell or rent your data to anyone.
        </Bullet>
        <Bullet>
          <b>We don&apos;t keep your original log file.</b> Uploaded <code style={code}>.zevtc</code> files are parsed
          in memory and discarded — only the structured results (and the file&apos;s name) are stored.
        </Bullet>
      </Section>

      <Section title="How we protect it">
        <Bullet>
          <b>GW2 API keys and Discord webhook URLs are encrypted at rest</b> (AES-256-GCM).
        </Bullet>
        <Bullet>
          <b>Session and addon tokens are never stored in plain form</b> — only a one-way hash, so a database leak
          can&apos;t be replayed as a live login.
        </Bullet>
        <Bullet>Traffic is served over HTTPS, with security headers and access controls on every authenticated action.</Bullet>
      </Section>

      <Section title="What's public — and how you control it">
        <p style={para}>
          This is a log-sharing site, so <b>uploads are public by default</b> — that&apos;s the point of leaderboards
          and profiles. Your names and numbers appear on rankings and your profile unless you change the settings on
          your <Link to="/account" style={link}>account page</Link>. You&apos;re always in control:
        </p>
        <Bullet label="Hide my name">
          Masks your account and character names everywhere they&apos;d appear, while still showing your numbers
          anonymously.
        </Bullet>
        <Bullet label="Private profile">Your profile page becomes visible only to you (and admins).</Bullet>
        <Bullet label="Private logs">
          Keeps a specific log off public browsing and locks its detail page to you, admins, and any group it&apos;s
          attached to. For honesty: a private log&apos;s numbers still contribute to <b>anonymous, aggregate</b>{' '}
          statistics — privating it removes it from public browsing and locks the page, but the anonymized numbers
          still count. Pair it with &ldquo;Hide my name&rdquo; if you don&apos;t want your names shown anywhere.
        </Bullet>
        <Bullet label="Delete or reassign your own logs">Any time, from the log&apos;s page.</Bullet>
      </Section>

      <Section title="Who can see your data">
        <Bullet><b>Anyone</b>, for public logs and public profiles.</Bullet>
        <Bullet><b>Your group&apos;s members</b>, for logs attached to that group.</Bullet>
        <Bullet label="Site admins">
          Can view and manage all content — including private logs — for moderation, support, and abuse prevention.
          We keep this access to what&apos;s needed to run the site.
        </Bullet>
        <Bullet label="Third parties, only when you choose to involve them">
          the official <b>Guild Wars 2 API</b> (using your key), <b>dps.report</b> (only if you import your existing
          logs from it), and <b>Discord</b> (for sign-in, and for any webhook your group configures).
        </Bullet>
      </Section>

      <Section title="Delete everything, any time">
        <p style={para}>
          You can permanently delete your account from your <Link to="/account" style={link}>account page</Link>. It
          removes your Discord sign-in, GW2 API key, settings, sessions and addon tokens, and <b>erases your account
          and character names from every log</b> (the anonymized numbers stay so shared squad logs aren&apos;t
          broken). Logs you uploaded become anonymous, and any group you lead is handed to another member. This
          can&apos;t be undone.
        </p>
      </Section>

      <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-50)', marginTop: 28, borderTop: '2px solid var(--border)', paddingTop: 14 }}>
        Effective {EFFECTIVE}.
      </div>
    </div>
  );
}

const lead = { font: '400 15px/1.7 var(--font-sans)', color: 'var(--text-80)', margin: '0 0 8px' } as const;
const para = { font: '400 13.5px/1.7 var(--font-sans)', color: 'var(--text-70)', margin: '0 0 10px' } as const;
const code = { font: '600 12px var(--font-mono)', background: 'var(--bg-chip)', padding: '1px 5px', borderRadius: 'var(--radius-md)' } as const;
const link = { color: 'var(--gold)', fontWeight: 600 } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ font: '800 17px var(--font-sans)', letterSpacing: '-.01em', margin: '0 0 12px', paddingBottom: 8, borderBottom: '2px solid var(--color-accent)', display: 'inline-block' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullet({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 11, marginBottom: 11 }}>
      <span aria-hidden style={{ width: 6, height: 6, marginTop: 8, flex: 'none', background: 'var(--gold)' }} />
      <div style={{ font: '400 13.5px/1.65 var(--font-sans)', color: 'var(--text-70)' }}>
        {label && <b style={{ color: 'var(--text)' }}>{label}. </b>}
        {children}
      </div>
    </div>
  );
}
