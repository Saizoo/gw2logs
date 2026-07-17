import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type GroupClears, type GroupDetail, type RaidSignup, type SignupStatus } from '../../lib/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { toast } from '../../lib/toast';
import { Card, GoldButton } from '../../components/atoms';
import { DURATION_OPTIONS_MINS, WEEKDAYS, formatDurationMins, formatSchedule } from '../../data/schedule';
import { SIGNUP_META, inputStyle, signupDateLabel, smallBtnStyle, upcomingRaidDates } from './shared';

// Overview tab: the "raid night" surface — schedule, RSVP signups, weekly
// clears, and (for managers) the Discord reminder settings.
export default function OverviewTab({ group, groupId, onGroupChanged }: { group: GroupDetail; groupId: string; onGroupChanged: () => void }) {
  const { user } = useCurrentUser();
  const isMember = group.myRole !== null;
  const { data: clears } = useApiQuery(
    () => (isMember ? api.groupClears(groupId) : Promise.resolve(null)),
    [groupId, isMember],
  );
  // Signups get their own reload nonce so an RSVP click refreshes just
  // this data instead of re-fetching the whole page.
  const [signupNonce, setSignupNonce] = useState(0);
  const { data: signups } = useApiQuery(
    () => (isMember ? api.groupSignups(groupId) : Promise.resolve(null)),
    [groupId, isMember, signupNonce],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <RaidScheduleCard group={group} groupId={groupId} canManage={group.canManage} onSaved={onGroupChanged} />

      {isMember && signups && user && (
        <RaidSignupsCard
          group={group}
          signups={signups}
          myUserId={user.id}
          onSet={async (date, status) => {
            try {
              await api.setSignup(groupId, date, status);
              setSignupNonce((n) => n + 1);
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : 'Failed to update signup');
            }
          }}
        />
      )}

      {isMember && clears && <WeeklyClearsCard clears={clears} />}

      {group.canManage && <DiscordRemindersCard groupId={groupId} />}
    </div>
  );
}

function RaidScheduleCard({
  group,
  groupId,
  canManage,
  onSaved,
}: {
  group: GroupDetail;
  groupId: string;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<string[]>(group.raidDays);
  const [startTime, setStartTime] = useState(group.raidStartTime ?? '');
  const [durationMins, setDurationMins] = useState<number | ''>(group.raidDurationMins ?? '');
  const [timezone, setTimezone] = useState(group.raidTimezone ?? '');
  const [saving, setSaving] = useState(false);

  if (!canManage) {
    const summary = formatSchedule(group);
    return (
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 6 }}>Raid Schedule</div>
        <div style={{ font: '400 13px var(--font-sans)', color: summary ? 'var(--text-80)' : 'var(--text-55)' }}>
          {summary ?? 'No schedule set yet.'}
        </div>
      </Card>
    );
  }

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateGroup(groupId, {
        raidDays: days,
        raidStartTime: startTime || null,
        raidDurationMins: durationMins === '' ? null : durationMins,
        raidTimezone: timezone.trim() || null,
      });
      toast.success('Raid schedule updated');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 12 }}>Raid Schedule</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {WEEKDAYS.map((d) => {
          const active = days.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                font: '600 12px var(--font-sans)',
                background: active ? 'var(--gold-grad)' : 'var(--bg-chip)',
                color: active ? 'var(--gold-fg)' : 'var(--text-65)',
                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Start time
          </span>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Duration
          </span>
          <select
            value={durationMins}
            onChange={(e) => setDurationMins(e.target.value ? Number(e.target.value) : '')}
            style={inputStyle}
          >
            <option value="">—</option>
            {DURATION_OPTIONS_MINS.map((m) => (
              <option key={m} value={m}>
                {formatDurationMins(m)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Timezone
          </span>
          <input
            placeholder="e.g. EST, UTC"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{ ...inputStyle, width: 110 }}
          />
        </label>
      </div>
      <GoldButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save schedule'}
      </GoldButton>
    </Card>
  );
}

function RaidSignupsCard({
  group,
  signups,
  myUserId,
  onSet,
}: {
  group: GroupDetail;
  signups: RaidSignup[];
  myUserId: string;
  onSet: (date: string, status: SignupStatus | null) => void;
}) {
  const dates = upcomingRaidDates(group.raidDays, 3, group.resolvedTimezone);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const shown = openDate && dates.includes(openDate) ? openDate : dates[0];

  if (dates.length === 0) {
    return (
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 6 }}>Raid Signups</div>
        <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)' }}>
          Set raid days in the schedule above and members can RSVP for each raid night here.
        </div>
      </Card>
    );
  }

  const byUser = new Map(signups.filter((s) => s.date === shown).map((s) => [s.userId, s.status]));
  const counts = { in: 0, late: 0, out: 0 } as Record<SignupStatus, number>;
  for (const status of byUser.values()) counts[status]++;
  const noReply = group.members.length - byUser.size;
  const mine = byUser.get(myUserId) ?? null;

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Raid Signups</div>
        {group.raidStartTime && (
          <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)' }}>
            {group.raidStartTime}
            {group.raidTimezone ? ` ${group.raidTimezone}` : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {dates.map((d) => {
            const active = d === shown;
            return (
              <button
                key={d}
                onClick={() => setOpenDate(d)}
                className={active ? undefined : 'u-chip'}
                style={{
                  padding: '5px 12px',
                  borderRadius: 14,
                  font: '600 11.5px var(--font-sans)',
                  background: active ? 'oklch(0.78 0.14 85 / 18%)' : 'oklch(1 0 0 / 4%)',
                  color: active ? 'var(--gold)' : 'var(--text-60)',
                  border: `1px solid ${active ? 'oklch(0.78 0.14 85 / 35%)' : 'var(--border)'}`,
                }}
              >
                {signupDateLabel(d, group.resolvedTimezone)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-faint)', flexWrap: 'wrap' }}>
        <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-62)' }}>Your status:</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(SIGNUP_META) as SignupStatus[]).map((s) => {
            const meta = SIGNUP_META[s];
            const active = mine === s;
            return (
              <button
                key={s}
                onClick={() => onSet(shown, active ? null : s)}
                title={active ? 'Click again to clear your RSVP' : undefined}
                className={active ? undefined : 'u-chip'}
                style={{
                  padding: '6px 16px',
                  borderRadius: 16,
                  font: '700 12px var(--font-sans)',
                  background: active ? meta.bg : 'oklch(1 0 0 / 4%)',
                  color: active ? meta.color : 'var(--text-60)',
                  border: `1px solid ${active ? `color-mix(in oklab, ${meta.color} 40%, transparent)` : 'var(--border)'}`,
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <div style={{ font: '500 11.5px var(--font-sans)', color: 'var(--text-55)', marginLeft: 'auto' }}>
          {counts.in} in · {counts.late} late · {counts.out} out · {noReply} no reply
        </div>
      </div>

      <div style={{ padding: '10px 20px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {group.members.map((m) => {
          const status = byUser.get(m.userId);
          const meta = status ? SIGNUP_META[status] : null;
          return (
            <span
              key={m.userId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 14,
                font: '600 11px var(--font-sans)',
                background: meta ? meta.bg : 'oklch(1 0 0 / 3%)',
                color: meta ? meta.color : 'var(--text-50)',
                border: `1px solid ${meta ? `color-mix(in oklab, ${meta.color} 30%, transparent)` : 'var(--border)'}`,
              }}
            >
              {m.account ?? m.username}
              <span style={{ font: '700 9px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', opacity: 0.85 }}>
                {meta ? meta.label : '—'}
              </span>
            </span>
          );
        })}
      </div>
    </Card>
  );
}

const REMINDER_LEAD_OPTIONS = [
  { mins: 30, label: '30 minutes before' },
  { mins: 60, label: '1 hour before' },
  { mins: 120, label: '2 hours before' },
  { mins: 240, label: '4 hours before' },
  { mins: 720, label: '12 hours before' },
];

function DiscordRemindersCard({ groupId }: { groupId: string }) {
  const [nonce, setNonce] = useState(0);
  const { data: settings } = useApiQuery(() => api.groupReminders(groupId), [groupId, nonce]);
  const [webhookInput, setWebhookInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      setWebhookInput('');
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return null;

  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 4 }}>Discord Reminders</div>
      <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)', marginBottom: 12 }}>
        Posts the signup tally to a channel before each raid night. Create a webhook in Discord under
        Channel Settings → Integrations, then paste its URL here.
      </div>

      {settings.webhookConfigured ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 14,
              font: '600 11.5px var(--font-sans)',
              background: 'var(--good-dim)',
              color: 'var(--good)',
            }}
          >
            ✓ Webhook connected
          </span>
          <button
            className="u-btn-ghost"
            disabled={busy}
            onClick={() => run(() => api.testGroupReminder(groupId), 'Test reminder sent — check the channel')}
            style={smallBtnStyle}
          >
            Send test
          </button>
          <button
            className="u-btn-ghost"
            disabled={busy}
            onClick={() => run(() => api.setGroupReminders(groupId, { webhookUrl: null }), 'Webhook removed')}
            style={{ ...smallBtnStyle, color: 'var(--bad)' }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder="https://discord.com/api/webhooks/…"
            value={webhookInput}
            onChange={(e) => setWebhookInput(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <GoldButton
            disabled={busy || !webhookInput.trim()}
            onClick={() => run(() => api.setGroupReminders(groupId, { webhookUrl: webhookInput.trim() }), 'Webhook saved')}
          >
            Save
          </GoldButton>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-62)' }}>Remind</div>
        <select
          value={settings.reminderMins}
          disabled={busy}
          onChange={(e) =>
            run(() => api.setGroupReminders(groupId, { reminderMins: Number(e.target.value) }), 'Reminder time updated')
          }
          style={{ ...inputStyle, padding: '7px 10px' }}
        >
          {REMINDER_LEAD_OPTIONS.map((o) => (
            <option key={o.mins} value={o.mins}>
              {o.label}
            </option>
          ))}
          {!REMINDER_LEAD_OPTIONS.some((o) => o.mins === settings.reminderMins) && (
            <option value={settings.reminderMins}>{settings.reminderMins} minutes before</option>
          )}
        </select>
      </div>
    </Card>
  );
}

// Shorten "Wing 5 — Hall of Chains" to "W5 · Hall of Chains" so the matrix

function shortWing(wing: string): string {
  const m = wing.match(/^Wing (\d+) — (.+)$/);
  return m ? `W${m[1]} · ${m[2]}` : wing;
}

function WeeklyClearsCard({ clears }: { clears: GroupClears }) {
  const all = clears.wings.flatMap((w) => w.encounters);
  const done = all.filter((e) => e.killedThisWeek).length;
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Weekly Clears</div>
        <div style={{ font: '700 12px var(--font-mono)', color: done === all.length && all.length > 0 ? 'var(--good)' : 'var(--gold)' }}>
          {done}/{all.length}
        </div>
        <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginLeft: 'auto' }}>
          Resets Monday 07:30 UTC
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {clears.wings.map(({ wing, encounters }) => (
          <div key={wing} style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ font: '700 11.5px var(--font-sans)', color: 'var(--text-62)', width: 190, flex: 'none' }}>{shortWing(wing)}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 240 }}>
              {encounters.map((enc) => {
                const chip = (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 9px',
                      borderRadius: 14,
                      font: '600 11px var(--font-sans)',
                      background: enc.killedThisWeek ? 'var(--good-dim)' : 'oklch(1 0 0 / 4%)',
                      color: enc.killedThisWeek ? 'var(--good)' : 'var(--text-50)',
                      border: `1px solid ${enc.killedThisWeek ? 'color-mix(in oklab, var(--good) 30%, transparent)' : 'var(--border)'}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span aria-hidden style={{ font: '800 10px var(--font-sans)' }}>{enc.killedThisWeek ? '✓' : '·'}</span>
                    {enc.fightName}
                    {enc.cmThisWeek && (
                      <span style={{ font: '800 8.5px var(--font-sans)', letterSpacing: '.4px', padding: '1px 4px', borderRadius: 4, background: 'oklch(0.78 0.14 85 / 18%)', color: 'var(--gold)' }}>
                        CM
                      </span>
                    )}
                  </span>
                );
                return enc.lastKill ? (
                  <Link key={enc.fightName} to={`/logs/${enc.lastKill.logId}`} className="u-chip" title={`Last kill ${new Date(enc.lastKill.date).toLocaleDateString()}`} style={{ borderRadius: 14 }}>
                    {chip}
                  </Link>
                ) : (
                  <span key={enc.fightName} title="Never killed by this group">{chip}</span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Coverage buckets for a standard 10-player squad: two of each boon source
// and two healers. qdps/qheal both count as quickness sources (same for
// alacrity) — what matters for comp-building is "who can bring the boon",
