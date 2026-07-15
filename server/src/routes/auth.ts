import { randomBytes } from 'node:crypto';
import { Router, type Request } from 'express';
import { prisma } from '../db.js';
import { discordAuthorizeUrl, discordAvatarUrl, exchangeCodeForToken, fetchDiscordUser } from '../lib/discord.js';
import { clearSessionCookie, createSession, destroySession, setSessionCookie } from '../lib/session.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const authRouter = Router();

const STATE_COOKIE = 'gw2logs_oauth_state';

// Comma-separated Discord user ids that should always be admins — read
// fresh on every login rather than cached at startup, so updating .env and
// restarting the API is enough to promote someone, no DB access needed.
// Whoever's in this list gets forced to isAdmin:true on every login; anyone
// not in the list keeps whatever isAdmin value they already have (default
// false, or whatever an existing admin set for them from the admin panel) —
// login never demotes someone the panel promoted by hand.
function isBootstrapAdmin(discordId: string): boolean {
  const ids = (process.env.ADMIN_DISCORD_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  return ids.includes(discordId);
}

function redirectUri(req: Request): string {
  return process.env.DISCORD_REDIRECT_URI ?? `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;
}

authRouter.get('/discord', (req, res) => {
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/' });
  res.redirect(discordAuthorizeUrl(state, redirectUri(req)));
});

authRouter.get('/discord/callback', async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: '/' });

  if (!code || typeof code !== 'string' || !state || state !== expectedState) {
    res.status(400).send('Invalid or expired sign-in attempt — please try again from the login page.');
    return;
  }

  try {
    const accessToken = await exchangeCodeForToken(code, redirectUri(req));
    const discordUser = await fetchDiscordUser(accessToken);

    const bootstrapAdmin = isBootstrapAdmin(discordUser.id);
    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        discordUsername: discordUser.username,
        discordAvatar: discordAvatarUrl(discordUser),
        ...(bootstrapAdmin ? { isAdmin: true } : {}),
      },
      create: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordAvatarUrl(discordUser),
        isAdmin: bootstrapAdmin,
      },
    });

    const token = await createSession(user.id);
    setSessionCookie(res, token);
    res.redirect('/account');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discord sign-in failed';
    res.status(502).send(message);
  }
});

authRouter.get('/me', asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  const { gw2ApiKeyEnc: _gw2ApiKeyEnc, ...safe } = req.user;

  // Aggregate pending join-request count across every group this user
  // leads/subleads, so the nav badge doesn't need its own round trip.
  const managed = await prisma.groupMember.findMany({
    where: { userId: req.user.id, role: { in: ['leader', 'subleader'] } },
    select: { group: { select: { _count: { select: { requests: true } } } } },
  });
  const pendingGroupRequests = managed.reduce((sum, m) => sum + m.group._count.requests, 0);

  res.json({ ...safe, pendingGroupRequests });
}));

authRouter.post('/logout', asyncHandler(async (req, res) => {
  await destroySession(req);
  clearSessionCookie(res);
  res.json({ ok: true });
}));
