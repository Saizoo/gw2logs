import { randomBytes } from 'node:crypto';
import { Router, type Request } from 'express';
import { prisma } from '../db.js';
import { discordAuthorizeUrl, discordAvatarUrl, exchangeCodeForToken, fetchDiscordUser } from '../lib/discord.js';
import { clearSessionCookie, createSession, destroySession, setSessionCookie } from '../lib/session.js';

export const authRouter = Router();

const STATE_COOKIE = 'gw2logs_oauth_state';

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

    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: { discordUsername: discordUser.username, discordAvatar: discordAvatarUrl(discordUser) },
      create: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordAvatarUrl(discordUser),
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

authRouter.get('/me', (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  const { gw2ApiKeyEnc: _gw2ApiKeyEnc, ...safe } = req.user;
  res.json(safe);
});

authRouter.post('/logout', async (req, res) => {
  await destroySession(req);
  clearSessionCookie(res);
  res.json({ ok: true });
});
